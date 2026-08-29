/**
 * /api/requirements/health.js
 * Scraper Health & Telemetry Endpoint
 *
 * Exposes real-time extraction statistics, success rates, failure classifications,
 * cache hit ratios, and recent execution logs.
 */

import { scrapeHealth } from '../_lib/scraperEngine.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const successRate =
    scrapeHealth.total_attempts > 0
      ? Math.round(((scrapeHealth.success_count + scrapeHealth.cache_hit_count) / scrapeHealth.total_attempts) * 100)
      : 100;

  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    metrics: {
      ...scrapeHealth,
      success_rate_pct: successRate,
    },
  });
}

