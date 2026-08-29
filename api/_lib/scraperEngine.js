/**
 * api/_lib/scraperEngine.js
 * High-performance, Robots.txt-compliant, Headless-capable Live Extraction Engine.
 * (Moved to _lib so Vercel does not treat it as a Serverless Function)
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

// ── In-Memory Engine Caches ──────────────────────────────────────────────────
const extractionCache = new Map();
const robotsTxtCache = new Map();

export const scrapeHealth = {
  total_attempts: 0,
  cache_hit_count: 0,
  success_count: 0,
  fallback_count: 0,
  robots_blocked_count: 0,
  recent_logs: [],
};

function logEngineEvent(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  scrapeHealth.recent_logs.unshift(entry);
  if (scrapeHealth.recent_logs.length > 50) scrapeHealth.recent_logs.pop();
  console.log(`[scraperEngine] [${level.toUpperCase()}] ${message}`, meta);
}

// ── Robots.txt Compliance Engine ─────────────────────────────────────────────
async function checkRobotsAllowed(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const origin = parsed.origin;
    const now = Date.now();

    let robots = robotsTxtCache.get(origin);
    if (!robots || now - robots.cachedAt > ROBOTS_CACHE_TTL_MS) {
      const robotsUrl = `${origin}/robots.txt`;
      logEngineEvent('info', `Fetching robots.txt for compliance verification`, { origin });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        const res = await fetch(robotsUrl, {
          headers: { 'User-Agent': 'DockItComplianceBot/1.0 (+https://dockit.app/bot)' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const txt = res.ok ? await res.text() : '';
        const parser = robotsParser(robotsUrl, txt);
        robots = { parser, cachedAt: now };
        robotsTxtCache.set(origin, robots);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        // On robots.txt fetch error, default to permissive parsing for government portals
        robots = { parser: robotsParser(robotsUrl, ''), cachedAt: now };
        robotsTxtCache.set(origin, robots);
      }
    }

    const isAllowed = robots.parser.isAllowed(urlStr, 'DockItComplianceBot/1.0') ?? true;
    return isAllowed;
  } catch (err) {
    return true; // Fallback to allowed on malformed URL
  }
}

// ── Dynamic JS Headless Browser Fallback ────────────────────────────────────
async function executeHeadlessFetch(urlStr) {
  logEngineEvent('info', 'Attempting headless dynamic JS rendering fallback', { urlStr });
  try {
    let puppeteer;
    try {
      puppeteer = (await import('puppeteer')).default || (await import('puppeteer'));
    } catch (e) {
      puppeteer = (await import('puppeteer-core')).default || (await import('puppeteer-core'));
    }

    if (!puppeteer) throw new Error('Puppeteer unavailable in runtime');

    let executablePath;
    let launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];

    // 1. Try @sparticuz/chromium (Serverless Linux / Vercel runtime)
    try {
      const chromiumModule = await import('@sparticuz/chromium');
      const chromium = chromiumModule.default || chromiumModule;
      if (chromium && typeof chromium.executablePath === 'function') {
        const sparticuzPath = await chromium.executablePath();
        if (sparticuzPath && fs.existsSync(sparticuzPath)) {
          executablePath = sparticuzPath;
          launchArgs = chromium.args || launchArgs;
        }
      }
    } catch (e) {
      // Not on serverless Linux
    }

    // 2. Local OS Chrome / Edge fallbacks (Windows / macOS / Dev Linux)
    if (!executablePath) {
      const localCandidates = [
        process.env.CHROME_PATH,
        process.env.PUPPETEER_EXECUTABLE_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      ].filter(Boolean);

      for (const p of localCandidates) {
        if (fs.existsSync(p)) {
          executablePath = p;
          break;
        }
      }
    }

    const browser = await puppeteer.launch({
      executablePath: executablePath || undefined,
      headless: 'new',
      args: launchArgs,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DockItBot/1.0'
    );

    await page.goto(urlStr, { waitUntil: 'domcontentloaded', timeout: HEADLESS_TIMEOUT_MS });
    const content = await page.content();
    await browser.close();

    return content;
  } catch (err) {
    logEngineEvent('warn', 'Headless rendering fallback failed or unsupported', {
      error: err.message,
    });
    return null;
  }
}

// ── Core Extraction Engine Executor ──────────────────────────────────────────
export async function executeExtraction(reqItem) {
  scrapeHealth.total_attempts++;
  const { id, source_url, ...storedData } = reqItem;

  if (!source_url) {
    logEngineEvent('warn', 'Missing source_url, falling back to stored Supabase requirement', { id });
    scrapeHealth.fallback_count++;
    return {
      ...storedData,
      id,
      diff: { diff_status: 'MATCHED', is_changed: false, diffs: [] },
      provenance: {
        source_url: null,
        extracted_at: new Date().toISOString(),
        method: ExtractionMethod.SUPABASE_FALLBACK,
        confidence: 1.0,
        status: ExtractionStatus.STORED_FALLBACK,
      },
    };
  }

  // 1. Check in-memory 1-hour cache
  const cached = extractionCache.get(source_url);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    scrapeHealth.cache_hit_count++;
    logEngineEvent('info', 'Serving extraction from 1-hour in-memory cache', { source_url });
    const diff = detectChanges(storedData, cached.data);
    return {
      ...storedData,
      ...cached.data,
      id,
      diff,
      provenance: {
        source_url,
        extracted_at: cached.data.extraction_timestamp,
        method: ExtractionMethod.CACHED,
        confidence: cached.data.confidence,
        status: cached.data.status,
      },
    };
  }

  // 2. Resolve Domain-Specific Adapter (Enforcing NO REGEX GUESSING)
  const adapter = resolveAdapter(source_url);
  if (!adapter) {
    logEngineEvent('warn', 'No verified domain adapter registered for URL, using stored Supabase values', {
      source_url,
    });
    scrapeHealth.fallback_count++;
    return {
      ...storedData,
      id,
      diff: { diff_status: 'MATCHED', is_changed: false, diffs: [] },
      provenance: {
        source_url,
        extracted_at: new Date().toISOString(),
        method: ExtractionMethod.SUPABASE_FALLBACK,
        confidence: 0.0,
        status: ExtractionStatus.UNABLE_TO_VERIFY,
        reason: 'No verified domain adapter registered for target portal',
      },
    };
  }

  // 3. Verify Robots.txt Compliance
  const allowed = await checkRobotsAllowed(source_url);
  if (!allowed) {
    scrapeHealth.robots_blocked_count++;
    logEngineEvent('error', 'Extraction blocked by site robots.txt policy', { source_url });
    return {
      ...storedData,
      id,
      diff: { diff_status: 'MATCHED', is_changed: false, diffs: [] },
      provenance: {
        source_url,
        extracted_at: new Date().toISOString(),
        method: ExtractionMethod.SUPABASE_FALLBACK,
        confidence: 0.0,
        status: ExtractionStatus.ROBOTS_BLOCKED,
        reason: 'Target portal robots.txt restricts automated verification',
      },
    };
  }

  // 4. Attempt Fast Cheerio Fetch
  let extracted = null;
  let methodUsed = ExtractionMethod.CHEERIO_STRUCTURED;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FAST_FETCH_TIMEOUT_MS);

    const res = await fetch(source_url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DockItBot/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text();
      extracted = adapter.extract(html, source_url, ExtractionMethod.CHEERIO_STRUCTURED);
    }
  } catch (err) {
    logEngineEvent('warn', 'Fast fetch timed out or failed, attempting headless dynamic rendering', {
      error: err.message,
    });
  }

  // 5. If Fast Fetch returned NOT_PARSEABLE or failed, attempt Headless rendering fallback
  if (!extracted || extracted.status === ExtractionStatus.NOT_PARSEABLE) {
    const headlessHtml = await executeHeadlessFetch(source_url);
    if (headlessHtml) {
      methodUsed = ExtractionMethod.HEADLESS_DOM;
      extracted = adapter.extract(headlessHtml, source_url, ExtractionMethod.HEADLESS_DOM);
    }
  }

  // 6. Handle Extraction Results with Transparent Supabase Fallback
  if (!extracted || extracted.status !== ExtractionStatus.VERIFIED || extracted.confidence < 0.5) {
    scrapeHealth.fallback_count++;
    logEngineEvent('warn', 'Live extraction unverified or parse failure, maintaining stored Supabase values', {
      source_url,
      status: extracted?.status || 'FAILED',
    });

    return {
      ...storedData,
      id,
      diff: { diff_status: 'MATCHED', is_changed: false, diffs: [] },
      provenance: {
        source_url,
        extracted_at: new Date().toISOString(),
        method: ExtractionMethod.SUPABASE_FALLBACK,
        confidence: extracted?.confidence || 0.0,
        status: extracted?.status || ExtractionStatus.FAILED,
        reason: extracted?.raw_extract?.reason || 'Portal DOM structure modified or unverified',
      },
    };
  }

  // 7. Successful Extraction: Cache and compute diff against stored Supabase data
  scrapeHealth.success_count++;
  extractionCache.set(source_url, { data: extracted, cachedAt: Date.now() });

  const diff = detectChanges(storedData, extracted);
  logEngineEvent('info', `Successful live verification [${diff.diff_status}]`, {
    source_url,
    diff_status: diff.diff_status,
  });

  return {
    ...storedData,
    ...extracted,
    id,
    diff,
    provenance: {
      source_url,
      extracted_at: extracted.extraction_timestamp,
      method: methodUsed,
      confidence: extracted.confidence,
      status: extracted.status,
    },
  };
}
