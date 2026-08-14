import { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, AlertTriangle, CheckCircle2, Clock, AlertCircle,
  Globe, TrendingUp, ChevronRight, Info
} from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../hooks/useAuth';
import { getBusinessRequirements } from '../services/supabase';
import { calculateComplianceScore, getLicenseSummary } from '../utils/complianceScore';
import { getCityCoordinates } from '../utils/cityCoordinates';
import { getDaysLeft } from '../utils/formatters';

// ─── Status color config ────────────────────────────────────────────────────
const GRADE_CONFIG = {
  A: { color: '#22c55e', bg: 'bg-green-500',  text: 'text-green-700',  lightBg: 'bg-green-50',  border: 'border-green-200', label: 'Fully Compliant',    emoji: '✅' },
  B: { color: '#3b82f6', bg: 'bg-blue-500',   text: 'text-blue-700',   lightBg: 'bg-blue-50',   border: 'border-blue-200',  label: 'Mostly Compliant',   emoji: '🔵' },
  C: { color: '#f59e0b', bg: 'bg-amber-500',  text: 'text-amber-700',  lightBg: 'bg-amber-50',  border: 'border-amber-200', label: 'Needs Attention',    emoji: '⚠️' },
  D: { color: '#ef4444', bg: 'bg-red-500',    text: 'text-red-700',    lightBg: 'bg-red-50',    border: 'border-red-200',   label: 'Critical Action Req.', emoji: '🔴' },
  '—': { color: '#9ca3af', bg: 'bg-gray-400',  text: 'text-gray-600',   lightBg: 'bg-gray-50',   border: 'border-gray-200',  label: 'No Data Yet',        emoji: '⬜' },
};

// ─── SVG pin icon factory ───────────────────────────────────────────────────
function makePinSvg(color, grade) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)"/>
      </filter>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z"
        fill="${color}" filter="url(#shadow)"/>
      <circle cx="18" cy="17" r="10" fill="white" opacity="0.95"/>
      <text x="18" y="22" text-anchor="middle" font-size="11" font-weight="800"
        font-family="system-ui, -apple-system, sans-serif" fill="${color}">${grade}</text>
    </svg>
  `;
}

// ─── Per-city status computation ────────────────────────────────────────────
function computeCityStatus(cityName, allBusinessRequirements) {
  // Match requirements whose linked `requirement.city` matches this operating city
  const cityBrs = allBusinessRequirements.filter(br => {
    const reqCity = (br.requirement?.city || '').toLowerCase();
    const reqLevel = br.requirement?.jurisdiction_level;
    const targetCity = cityName.toLowerCase();
    const targetCityFirstWord = targetCity.split(',')[0].trim();
    return reqLevel !== 'federal' && (
      reqCity === targetCity ||
      reqCity.includes(targetCityFirstWord) ||
      targetCity.includes(reqCity.split(',')[0].trim())
    );
  });

  // Enrich with daysLeft if needed
  const enriched = cityBrs.map(br => ({
    ...br,
    daysLeft: br.daysLeft ?? getDaysLeft(br.expiry_date),
  }));

  if (enriched.length === 0) {
    return { score: null, grade: '—', summary: null, brs: [] };
  }

  const scoreData = calculateComplianceScore(enriched);
  const summary = getLicenseSummary(enriched);
  return { ...scoreData, summary, brs: enriched };
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function JurisdictionMap() {
  const { business } = useOutletContext();
  const { isDemo, demoBusiness, demoBusinessRequirements } = useDemo();
  const { user } = useAuth();
  const navigate = useNavigate();

  const activeBiz = isDemo ? demoBusiness : business;
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const [allBrs, setAllBrs] = useState([]);
  const [loadingBrs, setLoadingBrs] = useState(true);
  const [cityData, setCityData] = useState([]); // { city, coords, status }
  const [unmappedCities, setUnmappedCities] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);

  // Derive operating cities
  const rawCities = activeBiz?.cities?.length > 0
    ? activeBiz.cities
    : [activeBiz?.city ? `${activeBiz.city}, ${activeBiz.state || ''}`.trim().replace(/,\s*$/, '') : 'New York, NY'];
  const operatingCities = Array.from(new Set(rawCities));

  // ── Load business requirements ────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoadingBrs(true);

    if (isDemo) {
      setAllBrs(demoBusinessRequirements || []);
      setLoadingBrs(false);
      return;
    }

    if (!business?.id) {
      setLoadingBrs(false);
      return;
    }

    getBusinessRequirements(business.id)
      .then(data => { if (mounted) { setAllBrs(data || []); setLoadingBrs(false); } })
      .catch(() => { if (mounted) setLoadingBrs(false); });

    return () => { mounted = false; };
  }, [isDemo, demoBusinessRequirements, business?.id]);

  // ── Resolve coordinates for all cities ───────────────────────────────────
  useEffect(() => {
    if (loadingBrs) return;

    async function resolveCities() {
      const resolved = [];
      const unresolved = [];

      for (const city of operatingCities) {
        const coords = await getCityCoordinates(city);
        const status = computeCityStatus(city, allBrs);

        if (coords) {
          resolved.push({ city, coords, status });
        } else {
          unresolved.push({ city, status });
        }
      }

      setCityData(resolved);
      setUnmappedCities(unresolved);
    }

    resolveCities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingBrs, allBrs, JSON.stringify(operatingCities)]);

  // ── Init Leaflet map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (cityData.length === 0) return;

    let L;
    const initMap = async () => {
      try {
        L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        if (!mapRef.current) return;

        // Clean up previous instance
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        markersRef.current = [];

        // Determine initial view
        const firstCity = cityData[0];
        const initialView = [firstCity.coords.lat, firstCity.coords.lng];
        const zoom = cityData.length === 1 ? 10 : 4;

        const map = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: true,
        }).setView(initialView, zoom);

        mapInstanceRef.current = map;

        // Dark-styled tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(map);

        // Add markers
        const bounds = [];
        cityData.forEach(({ city, coords, status }) => {
          bounds.push([coords.lat, coords.lng]);
          const cfg = GRADE_CONFIG[status.grade] || GRADE_CONFIG['—'];

          const icon = L.divIcon({
            html: makePinSvg(cfg.color, status.grade),
            className: '',
            iconSize: [36, 44],
            iconAnchor: [18, 44],
            popupAnchor: [0, -44],
          });

          const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);

          // Build popup HTML
          const summary = status.summary;
          const popupHtml = `
            <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 4px;">
              <div style="font-weight: 800; font-size: 15px; margin-bottom: 6px; color: #0f172a;">${city}</div>
              <div style="display: inline-block; background: ${cfg.color}22; color: ${cfg.color}; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 20px; border: 1px solid ${cfg.color}44; margin-bottom: 8px;">
                Grade ${status.grade} — ${cfg.label}
              </div>
              ${summary ? `
                <div style="font-size: 12px; color: #475569; margin-bottom: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                  ${summary.satisfied > 0 ? `<span>✅ ${summary.satisfied} satisfied</span>` : ''}
                  ${summary.needed > 0 ? `<span>📋 ${summary.needed} needed</span>` : ''}
                  ${summary.expiringMonth > 0 ? `<span>⏰ ${summary.expiringMonth} expiring</span>` : ''}
                  ${summary.expired > 0 ? `<span>🔴 ${summary.expired} lapsed</span>` : ''}
                  ${summary.inProgress > 0 ? `<span>🔄 ${summary.inProgress} in-progress</span>` : ''}
                  ${summary.total === 0 ? '<span style="grid-column: span 2; color: #94a3b8;">No tracked requirements yet</span>' : ''}
                </div>
              ` : '<div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">No tracked requirements yet</div>'}
              <a href="/requirements" style="display: block; text-align: center; background: #6366f1; color: white; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700; text-decoration: none; margin-top: 4px;">
                View Requirements →
              </a>
            </div>
          `;

          marker.bindPopup(popupHtml, {
            maxWidth: 260,
            className: 'dockit-popup',
          });

          marker.on('click', () => {
            setSelectedCity({ city, status });
          });

          markersRef.current.push(marker);
        });

        // Fit bounds if multiple cities
        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [60, 60] });
        }

        setMapReady(true);
      } catch (err) {
        console.error('Map init error:', err);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cityData)]);

  // ── Summary stats for top bar ─────────────────────────────────────────────
  const overallStats = useMemo(() => {
    const totalBrs = allBrs.length;
    const satisfied = allBrs.filter(br => br.status === 'satisfied').length;
    const expired = allBrs.filter(br => br.status === 'expired').length;
    const needed = allBrs.filter(br => br.status === 'needed').length;
    const expiringSoon = allBrs.filter(br => {
      const d = br.daysLeft ?? getDaysLeft(br.expiry_date);
      return d !== null && d >= 0 && d <= 30 && br.status !== 'expired';
    }).length;
    return { totalBrs, satisfied, expired, needed, expiringSoon };
  }, [allBrs]);

  const isLoading = loadingBrs || (cityData.length === 0 && unmappedCities.length === 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-3xl border border-rule p-6 shadow-card"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-accent/10 rounded-2xl flex items-center justify-center">
              <Globe size={22} className="text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-ink">Jurisdiction Map</h1>
              <p className="text-sm text-ink-muted mt-0.5">
                Live compliance status across your operating cities
              </p>
            </div>
          </div>

          {/* Quick stats */}
          {!isLoading && allBrs.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Satisfied', value: overallStats.satisfied, color: 'text-settled', bg: 'bg-settled/10' },
                { label: 'Needed', value: overallStats.needed, color: 'text-ink-muted', bg: 'bg-base' },
                { label: 'Expiring', value: overallStats.expiringSoon, color: 'text-caution', bg: 'bg-caution/10' },
                { label: 'Lapsed', value: overallStats.expired, color: 'text-danger', bg: 'bg-danger/10' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl px-3 py-2 flex items-center gap-2`}>
                  <span className={`text-xl font-black ${color}`}>{value}</span>
                  <span className="text-xs text-ink-faint font-semibold font-display">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* City badges */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-rule/50">
          <span className="text-xs text-ink-faint font-display font-semibold uppercase tracking-wide self-center mr-1">Operating in:</span>
          {operatingCities.map(city => {
            const data = cityData.find(d => d.city === city);
            const cfg = data ? (GRADE_CONFIG[data.status.grade] || GRADE_CONFIG['—']) : GRADE_CONFIG['—'];
            return (
              <span
                key={city}
                className={`text-xs font-bold font-display px-3 py-1.5 rounded-xl border ${cfg.lightBg} ${cfg.text} ${cfg.border} flex items-center gap-1.5`}
              >
                <span>{cfg.emoji}</span>
                {city}
                {data && <span className="font-black">· {data.status.grade}</span>}
              </span>
            );
          })}
        </div>
      </motion.div>

      {/* Map Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-surface rounded-3xl border border-rule overflow-hidden shadow-card"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
            <div className="text-sm text-ink-muted font-display">Resolving city coordinates…</div>
          </div>
        ) : cityData.length > 0 ? (
          <>
            <div
              ref={mapRef}
              style={{ height: 480, width: '100%' }}
              className="bg-gray-900"
            />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          // All cities failed to resolve — show only list view
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
            <MapPin size={32} className="text-ink-faint" />
            <div className="text-sm text-ink-muted">Could not plot any cities on the map — see the list below.</div>
          </div>
        )}
      </motion.div>

      {/* Selected City Detail Panel */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`rounded-3xl border-2 p-6 shadow-card ${GRADE_CONFIG[selectedCity.status.grade]?.lightBg || 'bg-surface'} ${GRADE_CONFIG[selectedCity.status.grade]?.border || 'border-rule'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={18} className="text-accent" />
                  <h2 className="text-xl font-bold font-display text-ink">{selectedCity.city}</h2>
                </div>
                {selectedCity.status.grade !== '—' && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {selectedCity.status.summary && [
                      { key: 'satisfied',    label: 'Satisfied',   icon: CheckCircle2, color: 'text-settled' },
                      { key: 'needed',       label: 'Needed',      icon: AlertCircle,  color: 'text-ink-muted' },
                      { key: 'inProgress',   label: 'In Progress', icon: Clock,        color: 'text-accent' },
                      { key: 'expired',      label: 'Lapsed',      icon: AlertTriangle, color: 'text-danger' },
                    ].map(({ key, label, icon: Icon, color }) => {
                      const val = selectedCity.status.summary[key];
                      if (!val) return null;
                      return (
                        <div key={key} className="bg-surface rounded-xl px-3 py-2 border border-rule flex items-center gap-2">
                          <Icon size={14} className={color} />
                          <span className={`text-sm font-bold ${color}`}>{val}</span>
                          <span className="text-xs text-ink-faint font-display">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  to="/requirements"
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  View Requirements <ChevronRight size={15} />
                </Link>
                <button
                  onClick={() => setSelectedCity(null)}
                  className="btn-secondary text-sm px-3 py-2"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* City Cards Row */}
      {!isLoading && (cityData.length > 0 || unmappedCities.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          {/* Mapped cities */}
          {cityData.map(({ city, status }) => {
            const cfg = GRADE_CONFIG[status.grade] || GRADE_CONFIG['—'];
            const summary = status.summary;
            return (
              <div
                key={city}
                className={`rounded-3xl border-2 p-5 shadow-card cursor-pointer transition-all hover:shadow-lg ${cfg.lightBg} ${cfg.border}`}
                onClick={() => setSelectedCity({ city, status })}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black font-display text-sm shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    >
                      {status.grade}
                    </div>
                    <div>
                      <div className="font-bold text-ink text-sm leading-snug">{city}</div>
                      <div className={`text-xs font-semibold font-display ${cfg.text}`}>{cfg.label}</div>
                    </div>
                  </div>
                  {status.score !== null && (
                    <div className={`text-2xl font-black font-display ${cfg.text}`}>{status.score}%</div>
                  )}
                </div>

                {summary && summary.total > 0 ? (
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-ink-muted mb-3">
                    {summary.satisfied > 0 && <span className="flex items-center gap-1"><span className="text-green-500">✓</span> {summary.satisfied} satisfied</span>}
                    {summary.needed > 0 && <span className="flex items-center gap-1"><span>📋</span> {summary.needed} needed</span>}
                    {summary.expiringMonth > 0 && <span className="flex items-center gap-1"><span className="text-amber-500">⏰</span> {summary.expiringMonth} expiring</span>}
                    {summary.expired > 0 && <span className="flex items-center gap-1 text-danger font-semibold"><span>🔴</span> {summary.expired} lapsed</span>}
                  </div>
                ) : (
                  <p className="text-xs text-ink-faint italic mb-3">No requirements tracked yet for this city. Visit My Requirements to add them.</p>
                )}

                <Link
                  to="/requirements"
                  onClick={e => e.stopPropagation()}
                  className={`inline-flex items-center gap-1 text-xs font-bold font-display ${cfg.text} hover:underline`}
                >
                  View Requirements <ChevronRight size={12} />
                </Link>
              </div>
            );
          })}

          {/* Unmapped cities */}
          {unmappedCities.map(({ city, status }) => (
            <div
              key={city}
              className="rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  <Info size={18} className="text-gray-500" />
                </div>
                <div>
                  <div className="font-bold text-ink text-sm">{city}</div>
                  <div className="text-xs text-ink-faint font-display">Location not yet mapped</div>
                </div>
              </div>
              <p className="text-xs text-ink-faint leading-relaxed mb-3">
                We couldn't resolve coordinates for this city. Compliance data is still tracked normally —
                it just won't appear as a map marker.
              </p>
              {status.summary && status.summary.total > 0 && (
                <div className="text-xs text-ink-muted mb-2">
                  {status.summary.total} requirement{status.summary.total !== 1 ? 's' : ''} tracked · Grade {status.grade}
                </div>
              )}
              <Link to="/requirements" className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline">
                View Requirements <ChevronRight size={12} />
              </Link>
            </div>
          ))}
        </motion.div>
      )}

      {/* Empty state — no business profile */}
      {!isLoading && operatingCities.length === 0 && (
        <div className="bg-surface rounded-3xl border border-rule p-10 text-center">
          <Globe size={40} className="mx-auto text-ink-faint mb-3" />
          <h3 className="text-lg font-bold font-display text-ink">No operating cities found</h3>
          <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
            Complete your business onboarding to see your jurisdiction compliance map.
          </p>
          <Link to="/settings" className="btn-primary mt-4 inline-flex">Go to Settings</Link>
        </div>
      )}
    </div>
  );
}
