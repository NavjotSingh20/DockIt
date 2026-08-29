/**
 * api/requirements/scraperEngine.js
 * High-performance, Robots.txt-compliant, Headless-capable Live Extraction Engine.
 *
 * Fallback Hierarchy:
 *  1. Fresh Cache (< 1 hr TTL)
 *  2. Live Extraction (robots.txt check -> Cheerio fast-path -> Headless rendering)
 *  3. Last Verified Supabase Value (if live extraction fails / NOT_PARSEABLE / timeout)
 *  4. Explicit UNABLE_TO_VERIFY (no wild guessing)
 */

import fs from 'fs';
import robotsParser from 'robots-parser';
import { resolveAdapter } from './adapters/index.js';
import {
  createNormalizedRequirement,
  detectChanges,
  ExtractionStatus,
  ExtractionMethod,
} from './schema.js';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
const ROBOTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hour TTL
const FAST_FETCH_TIMEOUT_MS = 4500;
const HEADLESS_TIMEOUT_MS = 12000;

// ── In-Memory Caches & Health Telemetry ──────────────────────────────────────
const urlCache = new Map();
const robotsCache = new Map();

export const scrapeHealth = {
  total_attempts: 0,
  success_count: 0,
  failed_count: 0,
  not_parseable_count: 0,
  robots_blocked_count: 0,
  timeout_count: 0,
  fallback_used_count: 0,
  cache_hit_count: 0,
  recent_logs: [],
};

function logHealthEvent(event) {
  scrapeHealth.recent_logs.unshift({
    timestamp: new Date().toISOString(),
    ...event,
  });
  if (scrapeHealth.recent_logs.length > 50) {
    scrapeHealth.recent_logs.pop();
  }
}

// ── 1. Robots.txt Checker ───────────────────────────────────────────────────
export async function checkRobotsTxt(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const origin = parsed.origin;
    const path = parsed.pathname || '/';

    const cached = robotsCache.get(origin);
    if (cached && Date.now() - cached.timestamp < ROBOTS_CACHE_TTL_MS) {
      const allowed = cached.parser.isAllowed(urlStr, 'DockIt-ComplianceBot') !== false;
      return { allowed, cached: true };
    }

    const robotsUrl = `${origin}/robots.txt`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'DockIt-ComplianceBot/2.0 (+https://dockit.in/bot)' },
      });
      clearTimeout(timer);

      if (res.status === 404) {
        // No robots.txt -> allowed by standard
        const parser = robotsParser(robotsUrl, '');
        robotsCache.set(origin, { timestamp: Date.now(), parser });
        return { allowed: true };
      }

      if (!res.ok) {
        // Other non-200 status -> treat as allowed with fallback
        const parser = robotsParser(robotsUrl, '');
        robotsCache.set(origin, { timestamp: Date.now(), parser });
        return { allowed: true };
      }

      const robotsTxt = await res.text();
      const parser = robotsParser(robotsUrl, robotsTxt);
      robotsCache.set(origin, { timestamp: Date.now(), parser });

      const isAllowed = parser.isAllowed(urlStr, 'DockIt-ComplianceBot') !== false;
      return { allowed: isAllowed };
    } catch (fetchErr) {
      clearTimeout(timer);
      return { allowed: true, warning: 'robots_fetch_timeout' };
    }
  } catch (err) {
    return { allowed: true };
  }
}

// ── 2. Headless Browser Launcher (Serverless & Local Dev) ────────────────────
async function getPuppeteerBrowser() {
  const puppeteer = await import('puppeteer-core');

  // Check if running on Vercel AWS Lambda / Linux
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION;

  if (isServerless) {
    const chromium = await import('@sparticuz/chromium');
    const executablePath = await chromium.default.executablePath();
    return puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath,
      headless: chromium.default.headless,
    });
  }

  // Local development: find installed Chrome or Edge on Windows / macOS / Linux
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  let localExecutable = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      localExecutable = p;
      break;
    }
  }

  if (!localExecutable) {
    throw new Error('No local Chrome/Edge executable found for Puppeteer in dev environment');
  }

  return puppeteer.default.launch({
    executablePath: localExecutable,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
}

// ── 3. Headless Page Renderer ────────────────────────────────────────────────
export async function renderHeadless(urlStr, timeoutMs = HEADLESS_TIMEOUT_MS) {
  let browser = null;
  try {
    browser = await getPuppeteerBrowser();
    const page = await browser.newPage();

    // Optimize speed: block images, fonts, media, and CSS animations
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DockIt-ComplianceBot/2.0'
    );

    await page.goto(urlStr, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });

    // Wait 500ms for dynamic JS hydration if needed
    await new Promise((r) => setTimeout(r, 500));

    const html = await page.content();
    await browser.close();
    return { ok: true, html };
  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
    return { ok: false, error: err.message };
  }
}

// ── 4. Fast HTTP Fetch (Cheerio First-Pass) ──────────────────────────────────
async function fastFetch(urlStr, timeoutMs = FAST_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DockIt-ComplianceBot/2.0 (+https://dockit.in/bot)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return { ok: true, html };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err.name === 'AbortError' ? 'timeout' : err.message };
  }
}

// ── 5. Main Extraction Pipeline ──────────────────────────────────────────────
export async function executeExtraction({ requirementId, source_url, storedData = {} }) {
  scrapeHealth.total_attempts++;
  const startTs = Date.now();

  // Step 1: Check In-Memory Cache (1 hr TTL)
  const cachedEntry = urlCache.get(source_url);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
    scrapeHealth.cache_hit_count++;
    const cacheAgeSec = Math.round((Date.now() - cachedEntry.timestamp) / 1000);
    const diff = detectChanges(storedData, cachedEntry.data);

    logHealthEvent({
      requirementId,
      url: source_url,
      status: 'CACHE_HIT',
      elapsed_ms: Date.now() - startTs,
    });

    return {
      ...storedData,
      ...cachedEntry.data,
      diff,
      provenance: {
        source_url,
        extracted_at: cachedEntry.data.extraction_timestamp,
        method: ExtractionMethod.CACHED,
        confidence: cachedEntry.data.confidence,
        cache_age_sec: cacheAgeSec,
        status: cachedEntry.data.status,
      },
    };
  }

  // Step 2: Validate Domain Adapter (Strict No-Guessing Policy)
  const adapter = resolveAdapter(source_url);
  if (!adapter) {
    scrapeHealth.not_parseable_count++;
    scrapeHealth.fallback_used_count++;

    logHealthEvent({
      requirementId,
      url: source_url,
      status: 'NOT_PARSEABLE_UNSUPPORTED_DOMAIN',
      elapsed_ms: Date.now() - startTs,
    });

    return {
      ...storedData,
      diff: { diff_status: 'UNMODIFIED', is_changed: false, diffs: [] },
      provenance: {
        source_url,
        extracted_at: new Date().toISOString(),
        method: ExtractionMethod.SUPABASE_FALLBACK,
        confidence: 0,
        status: ExtractionStatus.NOT_PARSEABLE,
        reason: 'no_verified_domain_adapter',
      },
    };
  }

  // Step 3: Check Robots.txt
  const robotsResult = await checkRobotsTxt(source_url);
  if (!robotsResult.allowed) {
    scrapeHealth.robots_blocked_count++;
    scrapeHealth.fallback_used_count++;

    logHealthEvent({
      requirementId,
      url: source_url,
      status: 'ROBOTS_BLOCKED',
      elapsed_ms: Date.now() - startTs,
    });

    return {
      ...storedData,
      diff: { diff_status: 'UNMODIFIED', is_changed: false, diffs: [] },
      provenance: {
        source_url,
        extracted_at: new Date().toISOString(),
        method: ExtractionMethod.SUPABASE_FALLBACK,
        confidence: 0,
        status: ExtractionStatus.ROBOTS_BLOCKED,
        reason: 'disallowed_by_robots_txt',
      },
    };
  }

  // Step 4: Fast Cheerio HTTP Extraction
  let liveHtml = null;
  let extractionMethod = ExtractionMethod.CHEERIO_STRUCTURED;
  const fastResult = await fastFetch(source_url, FAST_FETCH_TIMEOUT_MS);

  if (fastResult.ok) {
    liveHtml = fastResult.html;
  }

  // Step 5: Test adapter against Cheerio HTML
  let extracted = null;
  if (liveHtml) {
    extracted = adapter.extract(liveHtml, source_url, ExtractionMethod.CHEERIO_STRUCTURED);
  }

  // Step 6: If fast Cheerio failed or returned NOT_PARSEABLE due to dynamic JS shell, escalate to Headless
  if (!extracted || extracted.status !== ExtractionStatus.VERIFIED || extracted.confidence < 0.8) {
    const headlessResult = await renderHeadless(source_url, HEADLESS_TIMEOUT_MS);
    if (headlessResult.ok) {
      extractionMethod = ExtractionMethod.HEADLESS_DOM;
      extracted = adapter.extract(headlessResult.html, source_url, ExtractionMethod.HEADLESS_DOM);
    }
  }

function getExtractedFields(extracted) {
  if (!extracted) return [];
  const fields = [];
  if (extracted.fee_min !== null || extracted.fee_max !== null) fields.push('fee');
  if (extracted.processing_time) fields.push('processing_time');
  if (extracted.renewal_cycle_months !== null) fields.push('renewal_cycle_months');
  if (Array.isArray(extracted.required_documents) && extracted.required_documents.length > 0) fields.push('required_documents');
  if (extracted.application_url) fields.push('application_url');
  if (extracted.issuing_agency) fields.push('issuing_agency');
  return fields;
}

  const elapsed = Date.now() - startTs;
  const extractedFields = extracted ? getExtractedFields(extracted) : [];

  // Step 7: Evaluate Extraction Result
  // RULE: 200 OK alone never counts as successful extraction.
  // A source is ONLY considered VERIFIED when at least one expected structured field is extracted.
  const isTrulyVerified =
    extracted &&
    extracted.status === ExtractionStatus.VERIFIED &&
    extracted.confidence > 0 &&
    extractedFields.length > 0;

  if (isTrulyVerified) {
    scrapeHealth.success_count++;

    // Cache successful extraction (1-hr TTL)
    urlCache.set(source_url, {
      timestamp: Date.now(),
      data: {
        ...extracted,
        fields_extracted: extractedFields,
      },
    });

    // Detect changes against stored data (DO NOT silently overwrite)
    const diff = detectChanges(storedData, extracted);

    logHealthEvent({
      requirementId,
      url: source_url,
      status: 'VERIFIED',
      method: extractionMethod,
      fields_extracted: extractedFields,
      diff_status: diff.diff_status,
      elapsed_ms: elapsed,
    });

    return {
      ...storedData,
      ...extracted,
      diff,
      last_verified_date: new Date().toISOString().slice(0, 10),
      provenance: {
        source_url,
        extracted_at: extracted.extraction_timestamp,
        method: extractionMethod,
        confidence: extracted.confidence,
        status: ExtractionStatus.VERIFIED,
        fields_extracted: extractedFields,
      },
    };
  }

  // Step 8: Fallback Hierarchy — Silently return last verified Supabase value
  scrapeHealth.not_parseable_count++;
  scrapeHealth.fallback_used_count++;

  const failureStatus =
    fastResult.error === 'timeout' ? ExtractionStatus.TIMEOUT : ExtractionStatus.NOT_PARSEABLE;

  logHealthEvent({
    requirementId,
    url: source_url,
    status: failureStatus,
    elapsed_ms: elapsed,
  });

  return {
    ...storedData,
    diff: { diff_status: 'UNMODIFIED', is_changed: false, diffs: [] },
    provenance: {
      source_url,
      extracted_at: new Date().toISOString(),
      method: ExtractionMethod.SUPABASE_FALLBACK,
      confidence: 0,
      status: failureStatus,
      reason: fastResult.error || 'structure_not_reliably_parseable',
    },
  };
}

