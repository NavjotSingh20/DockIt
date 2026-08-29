/**
 * /api/pdf-proxy.js
 * Vercel Serverless Function — PDF Template Fetch Proxy
 *
 * Solves client-side browser CORS and Mixed-Content (HTTP/HTTPS) restrictions
 * when fetching official government PDF templates (e.g. IRS, NYC, LA County).
 *
 * GET /api/pdf-proxy?url=<encoded_url>
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.query || {};

  if (!url) {
    return res.status(400).json({ error: 'Missing required "url" query parameter' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol');
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  // Security: only allow pdf file extension or trusted domains
  const isPdf = parsedUrl.pathname.toLowerCase().endsWith('.pdf');
  const isTrustedDomain = [
    'irs.gov',
    'nyc.gov',
    'lacounty.gov',
    'mcdonline.nic.in',
    'fssai.gov.in',
    'gst.gov.in',
  ].some(d => parsedUrl.hostname.toLowerCase().includes(d));

  if (!isPdf && !isTrustedDomain) {
    return res.status(403).json({ error: 'Forbidden: URL must be a PDF or from a trusted government domain' });
  }

  try {
    const upstreamRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DockIt-Proxy/1.0',
        Accept: 'application/pdf,application/octet-stream,*/*',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({
        error: `Upstream government server responded with HTTP ${upstreamRes.status} ${upstreamRes.statusText}`,
      });
    }

    const buffer = await upstreamRes.arrayBuffer();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', buffer.byteLength);

    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error(`[api/pdf-proxy] Error fetching ${url}:`, err);
    return res.status(502).json({
      error: `Failed to fetch upstream PDF: ${err.message}`,
    });
  }
}

