/**
 * /api/requirements/reverify-scheduled.js
 * Scheduled Source Re-Verification Endpoint (Cron Job Compatible)
 *
 * Runs scheduled extraction across key active requirements, detecting when official
 * government information (fees, cycles, processing times) changes, recording differences
 * with CHANGED status flags and full provenance logs.
 *
 * GET / POST: triggers audit cycle and returns diff report
 */

import { executeExtraction } from './scraperEngine.js';

// Default monitored catalog of official statutory requirements
const MONITORED_REQUIREMENTS = [
  {
    id: 'nyc-mobile-food-vending',
    requirement_name: 'NYC Mobile Food Vending License',
    source_url: 'https://www.nyc.gov/site/doh/business/permits-licenses/mobile-food-vending-license.page',
    fee_min: 50,
    fee_max: 50,
    renewal_cycle_months: 24,
  },
  {
    id: 'irs-ein-federal',
    requirement_name: 'Employer Identification Number (EIN)',
    source_url: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
    fee_min: 0,
    fee_max: 0,
  },
  {
    id: 'mcd-health-trade-license',
    requirement_name: 'MCD General / Health Trade License',
    source_url: 'https://mcdonline.nic.in/',
    fee_min: 2000,
    fee_max: 5000,
    renewal_cycle_months: 12,
  },
  {
    id: 'fssai-state-license',
    requirement_name: 'FSSAI Food Business State License',
    source_url: 'https://foscos.fssai.gov.in/',
    fee_min: 2000,
    fee_max: 5000,
    renewal_cycle_months: 12,
  },
  {
    id: 'gstin-registration',
    requirement_name: 'GST Registration (GSTIN)',
    source_url: 'https://www.gst.gov.in/',
    fee_min: 0,
    fee_max: 0,
  },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const startTs = Date.now();
  const results = [];
  const changesDetected = [];

  for (const item of MONITORED_REQUIREMENTS) {
    try {
      const extracted = await executeExtraction({
        requirementId: item.id,
        source_url: item.source_url,
        storedData: item,
      });

      results.push(extracted);
      if (extracted.diff?.diff_status === 'CHANGED') {
        changesDetected.push({
          id: item.id,
          requirement_name: item.requirement_name,
          source_url: item.source_url,
          diffs: extracted.diff.diffs,
          provenance: extracted.provenance,
        });
      }
    } catch (err) {
      results.push({
        id: item.id,
        requirement_name: item.requirement_name,
        error: err.message,
        status: 'FAILED',
      });
    }
  }

  const elapsed = Date.now() - startTs;

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 'completed',
    total_audited: MONITORED_REQUIREMENTS.length,
    changes_detected_count: changesDetected.length,
    changes: changesDetected,
    elapsed_ms: elapsed,
    results,
  });
}

