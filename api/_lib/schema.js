/**
 * api/_lib/schema.js
 * Normalized schema definitions, provenance tracking, and change detection.
 * (Moved to _lib so Vercel does not treat it as a Serverless Function)
 */

export const ExtractionStatus = {
  VERIFIED: 'VERIFIED',
  NOT_PARSEABLE: 'NOT_PARSEABLE',
  ROBOTS_BLOCKED: 'ROBOTS_BLOCKED',
  TIMEOUT: 'TIMEOUT',
  FAILED: 'FAILED',
  UNABLE_TO_VERIFY: 'UNABLE_TO_VERIFY',
  STORED_FALLBACK: 'STORED_FALLBACK',
};

export const ExtractionMethod = {
  HEADLESS_DOM: 'headless_dom',
  CHEERIO_STRUCTURED: 'cheerio_structured',
  CACHED: 'cached',
  SUPABASE_FALLBACK: 'supabase_fallback',
};

/**
 * Creates a normalized requirement extraction object adhering to the unified schema.
 */
export function createNormalizedRequirement({
  fee_min = null,
  fee_max = null,
  currency = 'USD',
  processing_time = null,
  renewal_cycle_months = null,
  required_documents = [],
  application_url = null,
  issuing_agency = null,
  requirement_name = null,
  source_url = null,
  extraction_method = ExtractionMethod.CHEERIO_STRUCTURED,
  confidence = 0.0,
  status = ExtractionStatus.VERIFIED,
  raw_extract = {},
}) {
  return {
    fee_min: fee_min !== null ? Number(fee_min) : null,
    fee_max: fee_max !== null ? Number(fee_max) : (fee_min !== null ? Number(fee_min) : null),
    currency: currency || 'USD',
    processing_time: processing_time || null,
    renewal_cycle_months: renewal_cycle_months !== null ? Number(renewal_cycle_months) : null,
    required_documents: Array.isArray(required_documents) ? required_documents : [],
    application_url: application_url || null,
    issuing_agency: issuing_agency || null,
    requirement_name: requirement_name || null,
    source_url: source_url || null,
    extraction_timestamp: new Date().toISOString(),
    extraction_method,
    confidence: Number(confidence) || 0.0,
    status,
    raw_extract: raw_extract || {},
  };
}

/**
 * Computes difference between stored Supabase data and newly extracted live data.
 * Does NOT overwrite blindly — flags differences as CHANGED with full provenance.
 */
export function detectChanges(storedData = {}, liveData = {}) {
  const diffs = [];
  let isChanged = false;

  // Compare fees
  if (liveData.fee_min !== null && storedData.fee_min !== null && storedData.fee_min !== undefined) {
    const storedFee = Number(storedData.fee_min);
    const liveFee = Number(liveData.fee_min);
    if (storedFee !== liveFee) {
      diffs.push({
        field: 'fee_min',
        stored: storedFee,
        live: liveFee,
        pct_change: storedFee > 0 ? ((liveFee - storedFee) / storedFee) * 100 : 100,
      });
      isChanged = true;
    }
  }

  if (liveData.fee_max !== null && storedData.fee_max !== null && storedData.fee_max !== undefined) {
    const storedFeeMax = Number(storedData.fee_max);
    const liveFeeMax = Number(liveData.fee_max);
    if (storedFeeMax !== liveFeeMax) {
      diffs.push({
        field: 'fee_max',
        stored: storedFeeMax,
        live: liveFeeMax,
      });
      isChanged = true;
    }
  }

  // Compare processing time
  if (liveData.processing_time && storedData.processing_time && liveData.processing_time !== storedData.processing_time) {
    diffs.push({
      field: 'processing_time',
      stored: storedData.processing_time,
      live: liveData.processing_time,
    });
    isChanged = true;
  }

  // Compare renewal cycle
  if (liveData.renewal_cycle_months !== null && storedData.renewal_cycle_months !== null && storedData.renewal_cycle_months !== undefined) {
    const storedRenewal = Number(storedData.renewal_cycle_months);
    const liveRenewal = Number(liveData.renewal_cycle_months);
    if (storedRenewal !== liveRenewal) {
      diffs.push({
        field: 'renewal_cycle_months',
        stored: storedRenewal,
        live: liveRenewal,
      });
      isChanged = true;
    }
  }

  return {
    diff_status: isChanged ? 'CHANGED' : 'MATCHED',
    is_changed: isChanged,
    diffs,
    stored_snapshot: {
      fee_min: storedData.fee_min,
      fee_max: storedData.fee_max,
      processing_time: storedData.processing_time,
      renewal_cycle_months: storedData.renewal_cycle_months,
      last_verified_date: storedData.last_verified_date,
    },
    live_snapshot: {
      fee_min: liveData.fee_min,
      fee_max: liveData.fee_max,
      processing_time: liveData.processing_time,
      renewal_cycle_months: liveData.renewal_cycle_months,
      extraction_timestamp: liveData.extraction_timestamp,
    },
  };
}
