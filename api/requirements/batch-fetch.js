/**
 * /api/requirements/batch-fetch.js
 * Vercel Serverless Function — Batch Live-Source Verification
 *
 * Runs up to 6 parallel structured extractions per batch, utilizing in-memory
 * 1-hour cache and strict domain adapters with silent Supabase fallback.
 *
 * POST body: { requirements: [ { id, source_url, ...storedData }, ... ] }
 * Response:  { requirements: [ ...processedWithProvenance ], summary: { total, verified, cached, fallback } }
 */

import { executeExtraction } from './scraperEngine.js';

const MAX_CONCURRENT = 6;

async function pMap(array, mapper, concurrency = MAX_CONCURRENT) {
  const results = new Array(array.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < array.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await mapper(array[idx], idx);
      } catch (err) {
        results[idx] = {
          ...array[idx],
          provenance: {
            source_url: array[idx]?.source_url,
            method: 'supabase_fallback',
            status: 'FAILED',
            error: err.message,
          },
        };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, array.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { requirements = [] } = req.body || {};

  if (!Array.isArray(requirements) || requirements.length === 0) {
    return res.status(200).json({ requirements: [], summary: { total: 0, verified: 0, cached: 0, fallback: 0 } });
  }

  const startTs = Date.now();

  const processed = await pMap(
    requirements,
    async (reqItem) => {
      const { id, source_url, ...storedData } = reqItem;
      if (!source_url) {
        return {
          ...reqItem,
          provenance: {
            source_url: null,
            method: 'supabase_fallback',
            status: 'NO_SOURCE_URL',
            confidence: 0,
          },
        };
      }

      return await executeExtraction({
        requirementId: id,
        source_url,
        storedData: reqItem,
      });
    },
    MAX_CONCURRENT
  );

  const summary = {
    total: processed.length,
    verified: processed.filter((r) => r.provenance?.status === 'VERIFIED').length,
    cached: processed.filter((r) => r.provenance?.method === 'cached').length,
    changed: processed.filter((r) => r.diff?.diff_status === 'CHANGED').length,
    fallback: processed.filter((r) => r.provenance?.method === 'supabase_fallback').length,
    elapsed_ms: Date.now() - startTs,
  };

  return res.status(200).json({ requirements: processed, summary });
}
