/**
 * /api/requirements/fetch.js
 * Vercel Serverless Function — Structured Live-Source Requirement Verification
 *
 * Strategy:
 *  1. Accepts { requirementId, source_url, storedData } in POST body
 *  2. Evaluates 1-hour in-memory cache
 *  3. Verifies robots.txt compliance
 *  4. Executes Fast Cheerio fetch -> Headless Chromium browser if dynamic JS needed
 *  5. Parses via site-specific domain adapter (NO REGEX GUESSING)
 *  6. Flags differences as CHANGED with full provenance (does not blindly overwrite)
 *  7. Silently falls back to last verified Supabase value on failure or timeout
 *
 * Response:
 *  {
 *    ...requirementFields,
 *    diff: { diff_status: 'MATCHED' | 'CHANGED', is_changed, diffs },
 *    provenance: { source_url, extracted_at, method, confidence, status }
 *  }
 */

import { executeExtraction } from './scraperEngine.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { requirementId, source_url, storedData = {} } = req.body || {};

  try {
    const result = await executeExtraction({
      requirementId,
      source_url,
      storedData,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error(`[requirements/fetch] FATAL_ERROR req=${requirementId}:`, err);
    // Unconditional silent fallback to Supabase stored data
    return res.status(200).json({
      ...storedData,
      diff: { diff_status: 'UNMODIFIED', is_changed: false, diffs: [] },
      provenance: {
        source_url,
        extracted_at: new Date().toISOString(),
        method: 'supabase_fallback',
        confidence: 0,
        status: 'FAILED',
        error: err.message,
      },
    });
  }
}
