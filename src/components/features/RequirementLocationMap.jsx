import { useEffect, useRef, useState } from 'react';
import { MapPin, Building2, Phone, Clock, ExternalLink, Globe, Navigation, ShieldCheck } from 'lucide-react';
import { getDeptLocations, DEPT_TYPE_CONFIG } from '../../utils/deptLocations';
import { getCityCoordinates } from '../../utils/cityCoordinates';

const GRADE_COLORS = {
  active: '#22c55e',
  satisfied: '#22c55e',
  payment_recorded: '#3b82f6',
  in_progress: '#f59e0b',
  expiring: '#f59e0b',
  expired: '#ef4444',
  needed: '#6b7280',
  unknown: '#6b7280',
};

function makeLocationPin(color, label) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
      <filter id="pinShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
      </filter>
      <path d="M17 0C7.61 0 0 7.61 0 17c0 12.8 17 25 17 25s17-12.2 17-25C34 7.61 26.39 0 17 0z"
        fill="${color}" filter="url(#pinShadow)"/>
      <circle cx="17" cy="16" r="9" fill="#ffffff" opacity="0.95"/>
      <text x="17" y="20" text-anchor="middle" font-size="10" font-weight="900"
        font-family="system-ui, -apple-system, sans-serif" fill="${color}">${label || '★'}</text>
    </svg>
  `;
}

export default function RequirementLocationMap({ license, requirement, business }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);

  const reqObj = requirement || license?.requirement || {};
  const cityStr = reqObj.city || business?.cities?.[0] || business?.city || 'New York, NY';
  const agencyName = reqObj.issuing_agency || license?.issuing_authority || 'Issuing Authority';
  const status = license?.status || 'needed';
  const pinColor = GRADE_COLORS[status] || GRADE_COLORS.unknown;

  useEffect(() => {
    let isMounted = true;

    async function resolveLocation() {
      // 1. Try matching known government agency office locations for this city
      const depts = getDeptLocations(cityStr);
      let matchedDept = null;

      if (depts && depts.length > 0) {
        const agencyLower = agencyName.toLowerCase();
        matchedDept = depts.find(d => 
          agencyLower.includes(d.name.toLowerCase().split('—')[0].trim()) ||
          d.name.toLowerCase().includes(agencyLower) ||
          d.issues.toLowerCase().includes((reqObj.requirement_name || '').toLowerCase())
        );

        if (!matchedDept) {
          // Fallback to first department in this city if generic
          matchedDept = depts[0];
        }
      }

      if (matchedDept) {
        if (isMounted) {
          setLocationInfo({
            type: 'agency',
            name: matchedDept.name,
            address: matchedDept.address,
            phone: matchedDept.phone,
            url: matchedDept.url || reqObj.source_url,
            lat: matchedDept.lat,
            lng: matchedDept.lng,
            city: cityStr,
            tag: 'Official Issuing Office'
          });
        }
        return;
      }

      // 2. Otherwise resolve city center / operating premises
      const coords = await getCityCoordinates(cityStr);
      if (coords && isMounted) {
        setLocationInfo({
          type: 'city',
          name: `${business?.business_name || 'Operating Unit'} · ${cityStr}`,
          address: business?.address ? `${business.address}, ${cityStr}` : `${cityStr} Municipal Jurisdiction`,
          phone: business?.phone,
          url: reqObj.source_url,
          lat: coords.lat,
          lng: coords.lng,
          city: cityStr,
          tag: 'Operating Jurisdiction'
        });
      }
    }

    resolveLocation();
    return () => { isMounted = false; };
  }, [cityStr, agencyName, reqObj.requirement_name, reqObj.source_url, business]);

  useEffect(() => {
    if (!locationInfo || !mapRef.current) return;

    let L;
    const initMap = async () => {
      try {
        L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        if (!mapRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapRef.current, {
          zoomControl: true,
          scrollWheelZoom: false,
          attributionControl: true,
        }).setView([locationInfo.lat, locationInfo.lng], 14);

        mapInstanceRef.current = map;

        // 100% Free OpenStreetMap standard tile layer (no API key required watermark)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Marker with status color
        const isIndia = (business?.country === 'India' || reqObj?.country === 'India' || cityStr?.toLowerCase().includes('chandigarh') || cityStr?.toLowerCase().includes('delhi'));
        const currencySymbol = isIndia ? '₹' : '$';

        const icon = L.divIcon({
          html: makeLocationPin(pinColor, status === 'satisfied' ? '✓' : status === 'payment_recorded' ? currencySymbol : '!'),
          className: '',
          iconSize: [34, 42],
          iconAnchor: [17, 42],
          popupAnchor: [0, -42],
        });

        const marker = L.marker([locationInfo.lat, locationInfo.lng], { icon }).addTo(map);

        const popupHtml = `
          <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 4px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${locationInfo.name}
            </div>
            <div style="font-size: 10px; font-weight: 700; color: ${pinColor}; text-transform: uppercase; margin-bottom: 6px;">
              ${locationInfo.tag}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px; line-height: 1.3;">
              📍 ${locationInfo.address}
            </div>
            ${locationInfo.phone ? `<div style="font-size: 11px; color: #475569; margin-bottom: 6px;">📞 ${locationInfo.phone}</div>` : ''}
            <a href="https://maps.google.com/?q=${locationInfo.lat},${locationInfo.lng}" target="_blank" rel="noopener" style="display: block; text-align: center; background: #0f172a; color: #ffffff; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; text-decoration: none; margin-top: 6px;">
              Get Directions ↗
            </a>
          </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 280, className: 'dockit-popup' }).openPopup();
        setMapReady(true);
      } catch (err) {
        console.warn('RequirementLocationMap init error:', err);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locationInfo, pinColor, status]);

  if (!locationInfo) {
    return (
      <div className="bg-surface rounded-3xl border border-rule p-6 text-center text-ink-faint text-sm">
        Locating issuing jurisdiction coordinates…
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-3xl border border-rule overflow-hidden shadow-card">
      <div className="p-5 md:p-6 border-b border-rule flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
            <MapPin size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold font-display text-ink text-base md:text-lg">
                {locationInfo.type === 'agency' ? 'Issuing Agency Jurisdiction & Office' : 'Operating Premises Jurisdiction'}
              </h3>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-base border border-rule text-ink-muted">
                {locationInfo.tag}
              </span>
            </div>
            <p className="text-xs text-ink-faint mt-0.5 truncate max-w-lg">
              {locationInfo.name} · {locationInfo.city}
            </p>
          </div>
        </div>

        <a
          href={`https://maps.google.com/?q=${locationInfo.lat},${locationInfo.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-xs font-semibold px-3 py-2 flex items-center gap-1.5 shrink-0"
        >
          <Navigation size={13} /> Directions
        </a>
      </div>

      {/* Embedded Map */}
      <div className="relative">
        <div ref={mapRef} style={{ height: 320, width: '100%' }} className="bg-gray-100 dark:bg-zinc-900" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
            <div className="text-xs text-ink-muted font-display">Rendering interactive map…</div>
          </div>
        )}
      </div>

      {/* Location Details Footer */}
      <div className="p-5 bg-base/60 border-t border-rule grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-ink-muted">
        <div className="flex items-start gap-2">
          <MapPin size={14} className="text-accent flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed"><strong className="text-ink font-semibold">Address:</strong> {locationInfo.address}</span>
        </div>
        {locationInfo.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-accent flex-shrink-0" />
            <span><strong className="text-ink font-semibold">Phone:</strong> {locationInfo.phone}</span>
          </div>
        )}
        {locationInfo.url && (
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-accent flex-shrink-0" />
            <a
              href={locationInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent font-semibold hover:underline flex items-center gap-1 truncate"
            >
              Agency Web Portal <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
