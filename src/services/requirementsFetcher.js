/**
 * requirementsFetcher.js
 * Client-side service that routes requirement data through the live-scrape
 * serverless function (with silent Supabase fallback).
 *
 * Rules:
 *  - NEVER fetches government pages directly (CORS + security reasons)
 *  - Calls /api/requirements/fetch (single) or /api/requirements/batch-fetch (multiple)
 *  - If the serverless call itself fails (network error, non-2xx), falls through
 *    to the stored Supabase data transparently — never throws or breaks UI
 *  - In demo mode: still calls live-scrape for realism, but uses demo data as
 *    the storedData payload (no Supabase write-back in demo)
 *  - Adds a _scrape meta field to every returned requirement for dev inspection
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SINGLE_ENDPOINT = `${API_BASE}/api/requirements/fetch`;
const BATCH_ENDPOINT = `${API_BASE}/api/requirements/batch-fetch`;
const CLIENT_TIMEOUT_MS = 6000; // client gives server a generous 6s before giving up

// ── Utility: fetch with client-side timeout ─────────────────────────────────
async function fetchWithClientTimeout(url, options, timeoutMs = CLIENT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Enrich a single requirement with live-scraped data.
 * Falls back to storedRequirement on any failure — never throws.
 *
 * @param {Object} storedRequirement - Full requirement row from Supabase / demoData
 * @returns {Promise<Object>} - Requirement with potentially updated fields + _scrape meta
 */
export async function enrichRequirement(storedRequirement) {
  if (!storedRequirement) return storedRequirement;

  // If no source_url, skip the scrape entirely — return as-is
  if (!storedRequirement.source_url) {
    return {
      ...storedRequirement,
      _scrape: { success: false, source: 'supabase_fallback', reason: 'no_source_url' },
    };
  }

  try {
    const res = await fetchWithClientTimeout(SINGLE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirementId: storedRequirement.id,
        source_url: storedRequirement.source_url,
        storedData: storedRequirement,
      }),
    });

    if (!res.ok) {
      console.warn(`[requirementsFetcher] Single fetch returned ${res.status} for req ${storedRequirement.id}`);
      return { ...storedRequirement, _scrape: { success: false, source: 'supabase_fallback', reason: `api_${res.status}` } };
    }

    const enriched = await res.json();
    return enriched;

  } catch (err) {
    // Network error or client timeout — silent fallback
    console.warn(`[requirementsFetcher] Single fetch client error for req ${storedRequirement.id}: ${err.message}`);
    return { ...storedRequirement, _scrape: { success: false, source: 'supabase_fallback', reason: err.message } };
  }
}

/**
 * Enrich a batch of requirements with live-scraped data.
 * Falls back per-requirement — a failure for one does NOT affect others.
 *
 * @param {Array<Object>} storedRequirements - Array of requirement rows
 * @returns {Promise<Array<Object>>} - Each requirement enriched (or kept as-is on failure)
 */
export async function enrichRequirements(storedRequirements) {
  if (!Array.isArray(storedRequirements) || storedRequirements.length === 0) {
    return storedRequirements;
  }

  // Split into requirements with and without source_url
  const withUrl = storedRequirements.filter(r => r.source_url);
  const withoutUrl = storedRequirements.filter(r => !r.source_url).map(r => ({
    ...r,
    _scrape: { success: false, source: 'supabase_fallback', reason: 'no_source_url' },
  }));

  if (withUrl.length === 0) return [...withoutUrl];

  try {
    const res = await fetchWithClientTimeout(BATCH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirements: withUrl }),
    });

    if (!res.ok) {
      console.warn(`[requirementsFetcher] Batch fetch returned ${res.status} — using all Supabase fallback`);
      return storedRequirements.map(r => ({
        ...r,
        _scrape: { success: false, source: 'supabase_fallback', reason: `api_${res.status}` },
      }));
    }

    const resData = await res.json();
    const results = resData.requirements || resData.results || [];
    const summary = resData.summary;
    console.debug(`[requirementsFetcher] Batch complete:`, summary);

    // Re-merge: map results back by id, fall back to stored for any missing
    const resultMap = new Map(results.map(r => [r.id, r]));
    const merged = storedRequirements.map(stored => resultMap.get(stored.id) || {
      ...stored,
      provenance: {
        source_url: stored.source_url,
        method: 'supabase_fallback',
        status: 'STORED_FALLBACK',
        reason: 'missing_from_batch_result',
      },
    });

    return [...merged, ...withoutUrl.filter(r => !resultMap.has(r.id))];

  } catch (err) {
    // Network error or client timeout — silent global fallback
    console.warn(`[requirementsFetcher] Batch client error: ${err.message} — using all Supabase fallback`);
    return storedRequirements.map(r => ({
      ...r,
      _scrape: { success: false, source: 'supabase_fallback', reason: err.message },
    }));
  }
}

/**
 * Helper used in demo mode: enriches demo requirements against live data
 * but never writes back to Supabase. Returns the enriched array.
 */
export async function enrichDemoRequirements(demoRequirements) {
  // Use actual catalog requirement rows (not business_requirement rows)
  // Extract the nested .requirement object if present
  const catalogRows = demoRequirements
    .map(br => br.requirement || br)
    .filter(Boolean);

  if (catalogRows.length === 0) return demoRequirements;

  const enrichedCatalog = await enrichRequirements(catalogRows);
  const catalogMap = new Map(enrichedCatalog.map(r => [r.id, r]));

  // Merge enriched catalog data back into the business_requirement rows
  return demoRequirements.map(br => {
    const reqId = br.requirement?.id || br.requirement_id;
    const enrichedReq = catalogMap.get(reqId);
    if (!enrichedReq) return br;
    return {
      ...br,
      requirement: enrichedReq,
      provenance: enrichedReq.provenance,
      diff: enrichedReq.diff,
      _scrape: enrichedReq._scrape,
    };
  });
}

