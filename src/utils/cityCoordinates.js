/**
 * cityCoordinates.js
 * 
 * Returns { lat, lng } for a city string like "New York, NY" or "Mumbai, Maharashtra".
 *
 * Strategy (in order):
 *  1. Built-in lookup table for major cities (instant, no network)
 *  2. localStorage cache (instant after first lookup)
 *  3. Nominatim free geocoding API (https://nominatim.openstreetmap.org) — no key required
 *  4. Returns null if all fail — caller shows "location not yet mapped"
 */

const CACHE_KEY = 'dockit_city_coords_cache';
const CACHE_VERSION = 1;

// ─── Built-in coordinates for commonly seeded cities ───────────────────────
const BUILTIN_COORDS = {
  // USA
  'new york, ny':           { lat: 40.7128,  lng: -74.0060 },
  'new york':               { lat: 40.7128,  lng: -74.0060 },
  'los angeles, ca':        { lat: 34.0522,  lng: -118.2437 },
  'los angeles':            { lat: 34.0522,  lng: -118.2437 },
  'chicago, il':            { lat: 41.8781,  lng: -87.6298 },
  'chicago':                { lat: 41.8781,  lng: -87.6298 },
  'houston, tx':            { lat: 29.7604,  lng: -95.3698 },
  'houston':                { lat: 29.7604,  lng: -95.3698 },
  'phoenix, az':            { lat: 33.4484,  lng: -112.0740 },
  'phoenix':                { lat: 33.4484,  lng: -112.0740 },
  'philadelphia, pa':       { lat: 39.9526,  lng: -75.1652 },
  'san antonio, tx':        { lat: 29.4241,  lng: -98.4936 },
  'san diego, ca':          { lat: 32.7157,  lng: -117.1611 },
  'dallas, tx':             { lat: 32.7767,  lng: -96.7970 },
  'san jose, ca':           { lat: 37.3382,  lng: -121.8863 },
  'san francisco, ca':      { lat: 37.7749,  lng: -122.4194 },
  'san francisco':          { lat: 37.7749,  lng: -122.4194 },
  'austin, tx':             { lat: 30.2672,  lng: -97.7431 },
  'seattle, wa':            { lat: 47.6062,  lng: -122.3321 },
  'seattle':                { lat: 47.6062,  lng: -122.3321 },
  'denver, co':             { lat: 39.7392,  lng: -104.9903 },
  'boston, ma':             { lat: 42.3601,  lng: -71.0589 },
  'boston':                 { lat: 42.3601,  lng: -71.0589 },
  'miami, fl':              { lat: 25.7617,  lng: -80.1918 },
  'miami':                  { lat: 25.7617,  lng: -80.1918 },
  'atlanta, ga':            { lat: 33.7490,  lng: -84.3880 },
  'minneapolis, mn':        { lat: 44.9778,  lng: -93.2650 },
  'portland, or':           { lat: 45.5231,  lng: -122.6765 },
  'las vegas, nv':          { lat: 36.1699,  lng: -115.1398 },
  'nashville, tn':          { lat: 36.1627,  lng: -86.7816 },
  'washington, dc':         { lat: 38.9072,  lng: -77.0369 },
  'washington':             { lat: 38.9072,  lng: -77.0369 },
  'brooklyn, ny':           { lat: 40.6782,  lng: -73.9442 },
  // India
  'mumbai, maharashtra':    { lat: 19.0760,  lng: 72.8777 },
  'mumbai':                 { lat: 19.0760,  lng: 72.8777 },
  'delhi, delhi':           { lat: 28.7041,  lng: 77.1025 },
  'delhi':                  { lat: 28.7041,  lng: 77.1025 },
  'new delhi':              { lat: 28.6139,  lng: 77.2090 },
  'bengaluru, karnataka':   { lat: 12.9716,  lng: 77.5946 },
  'bangalore':              { lat: 12.9716,  lng: 77.5946 },
  'bengaluru':              { lat: 12.9716,  lng: 77.5946 },
  'hyderabad, telangana':   { lat: 17.3850,  lng: 78.4867 },
  'hyderabad':              { lat: 17.3850,  lng: 78.4867 },
  'pune, maharashtra':      { lat: 18.5204,  lng: 73.8567 },
  'pune':                   { lat: 18.5204,  lng: 73.8567 },
  'chennai, tamil nadu':    { lat: 13.0827,  lng: 80.2707 },
  'chennai':                { lat: 13.0827,  lng: 80.2707 },
  'kolkata, west bengal':   { lat: 22.5726,  lng: 88.3639 },
  'kolkata':                { lat: 22.5726,  lng: 88.3639 },
  'ahmedabad, gujarat':     { lat: 23.0225,  lng: 72.5714 },
  'jaipur, rajasthan':      { lat: 26.9124,  lng: 75.7873 },
  // Other major world cities
  'london':                 { lat: 51.5074,  lng: -0.1278 },
  'london, uk':             { lat: 51.5074,  lng: -0.1278 },
  'toronto':                { lat: 43.6532,  lng: -79.3832 },
  'toronto, ontario':       { lat: 43.6532,  lng: -79.3832 },
  'sydney':                 { lat: -33.8688, lng: 151.2093 },
  'sydney, nsw':            { lat: -33.8688, lng: 151.2093 },
  'singapore':              { lat: 1.3521,   lng: 103.8198 },
  'dubai':                  { lat: 25.2048,  lng: 55.2708 },
  'dubai, uae':             { lat: 25.2048,  lng: 55.2708 },
};

// ─── Cache helpers ──────────────────────────────────────────────────────────
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed.__version !== CACHE_VERSION) return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, __version: CACHE_VERSION }));
  } catch {
    // localStorage full — silently ignore
  }
}

// ─── Nominatim geocoder ─────────────────────────────────────────────────────
async function geocodeViaNominatim(cityStr) {
  try {
    const encoded = encodeURIComponent(cityStr);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=0`,
      {
        headers: {
          'User-Agent': 'DockIt-Compliance-Platform/1.0 (contact@dockit.app)'
        }
      }
    );
    if (!res.ok) return null;
    const results = await res.json();
    if (!results || results.length === 0) return null;
    const { lat, lon } = results[0];
    return { lat: parseFloat(lat), lng: parseFloat(lon) };
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────
/**
 * Returns { lat, lng } for a city string, or null if unknown.
 * Resolves instantly from built-in table or cache, else makes one Nominatim call.
 *
 * @param {string} cityStr  e.g. "New York, NY" or "Mumbai, Maharashtra"
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function getCityCoordinates(cityStr) {
  if (!cityStr) return null;
  const key = cityStr.toLowerCase().trim();

  // 1. Built-in lookup
  if (BUILTIN_COORDS[key]) return BUILTIN_COORDS[key];

  // Try first-word-only lookup (e.g. "Mumbai" from "Mumbai, Maharashtra")
  const firstWord = key.split(',')[0].trim();
  if (BUILTIN_COORDS[firstWord]) return BUILTIN_COORDS[firstWord];

  // 2. Cache check
  const cache = readCache();
  if (cache[key]) return cache[key];

  // 3. Nominatim geocoding (network call, cached after first success)
  const coords = await geocodeViaNominatim(cityStr);
  if (coords) {
    const updated = { ...cache, [key]: coords };
    writeCache(updated);
    return coords;
  }

  return null;
}
