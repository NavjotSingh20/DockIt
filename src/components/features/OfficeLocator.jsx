import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Phone, Clock, MapPin } from 'lucide-react';

const OFFICE_LOCATIONS = {
  India: {
    FSSAI: { name: 'FSSAI Regional Office (West)', address: 'Central Facility Building, APMC Fruit Market, Sector-19, Vashi, Navi Mumbai - 400703', lat: 19.0754, lng: 73.0011, phone: '022-27882247', hours: 'Mon-Fri: 10:00 AM - 5:30 PM', website: 'https://foscos.fssai.gov.in' },
    FIRE_NOC: { name: 'Mumbai Fire Brigade Headquarters', address: 'Byculla, Mumbai - 400008', lat: 18.9774, lng: 72.8339, phone: '022-23076111', hours: 'Mon-Sat: 10:00 AM - 5:30 PM', website: 'https://mumbaimunicipal.gov.in' },
    TRADE_LICENSE: { name: 'BMC (Brihatmumbai Municipal Corporation) Headquarters', address: 'Mahapalika Marg, Fort, Mumbai - 400001', lat: 18.9401, lng: 72.8353, phone: '022-22620251', hours: 'Mon-Sat: 9:30 AM - 5:30 PM', website: 'https://portal.mcgm.gov.in' },
    SHOP_ESTABLISHMENT: { name: 'Maharashtra Labour Commissioner Office', address: 'Kamgar Bhavan, Bandra Kurla Complex, Mumbai - 400051', lat: 19.0607, lng: 72.8624, phone: '022-26573733', hours: 'Mon-Fri: 10:00 AM - 5:30 PM', website: 'https://mahashramm.gov.in' },
    EATING_HOUSE: { name: 'Mumbai City Police Commissioner Office', address: 'Crawford Market, Mumbai - 400001', lat: 18.9463, lng: 72.8335, phone: '022-22620826', hours: 'Mon-Sat: 10:00 AM - 5:00 PM', website: 'https://mumbaipolice.gov.in' },
    GST: { name: 'GST Seva Kendra Mumbai', address: 'Nariman Point, Mumbai - 400021', lat: 18.9276, lng: 72.8210, phone: '1800-103-4786', hours: 'Mon-Fri: 10:00 AM - 5:00 PM', website: 'https://www.gst.gov.in' },
  },
  USA: {
    BUSINESS_LICENSE: { name: 'NYC Department of Consumer and Worker Protection', address: '42 Broadway, New York, NY 10004', lat: 40.7061, lng: -74.0125, phone: '212-487-4444', hours: 'Mon-Fri: 9:00 AM - 5:00 PM', website: 'https://www1.nyc.gov/site/dca/index.page' },
    HEALTH_PERMIT: { name: 'NYC Department of Health and Mental Hygiene', address: '125 Worth St, New York, NY 10013', lat: 40.7153, lng: -74.0028, phone: '311', hours: 'Mon-Fri: 9:00 AM - 5:00 PM', website: 'https://www1.nyc.gov/site/doh/index.page' },
    SALES_TAX: { name: 'New York State Dept of Taxation and Finance', address: '290 Broadway, New York, NY 10007', lat: 40.7145, lng: -74.0042, phone: '518-485-2889', hours: 'Mon-Fri: 8:30 AM - 4:30 PM', website: 'https://www.tax.ny.gov' },
    FIRE_PERMIT: { name: 'FDNY (Fire Department of New York) Headquarters', address: '9 MetroTech Center, Brooklyn, NY 11201', lat: 40.6942, lng: -73.9844, phone: '718-999-2000', hours: 'Mon-Fri: 9:00 AM - 5:00 PM', website: 'https://www1.nyc.gov/site/fdny/index.page' },
    FDA_REG: { name: 'FDA Regional Office New York', address: '158-15 Liberty Ave, Jamaica, NY 11433', lat: 40.7011, lng: -73.7963, phone: '718-340-7000', hours: 'Mon-Fri: 8:00 AM - 4:30 PM', website: 'https://www.fda.gov' },
  }
};

export default function OfficeLocator({ licenseType }) {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  
  const country = localStorage.getItem('country') || 'USA';
  const countryLocations = OFFICE_LOCATIONS[country] || OFFICE_LOCATIONS.USA;
  const office = countryLocations[licenseType] || countryLocations.BUSINESS_LICENSE || Object.values(countryLocations)[0];

  useEffect(() => {
    let map, L;
    const init = async () => {
      try {
        L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');
        if (!mapRef.current || map) return;

        // Fix default icon paths
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        map = L.map(mapRef.current, { zoomControl: true }).setView([office.lat, office.lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([office.lat, office.lng]).addTo(map);
        marker.bindPopup(`<strong>${office.name}</strong><br>${office.address}`).openPopup();
        setMapReady(true);
      } catch (e) { console.warn('Map init failed:', e); }
    };
    init();
    return () => { if (map) map.remove(); };
  }, [licenseType, office]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div ref={mapRef} style={{ height: 280, width: '100%' }} className="bg-gray-100" />
      {!mapReady && (
        <div className="flex items-center justify-center" style={{ height: 280 }}>
          <div className="text-gray-400 text-sm">Loading map…</div>
        </div>
      )}
      <div className="p-5 space-y-3">
        <h4 className="font-bold text-gray-900">{office.name}</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start gap-2"><MapPin size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />{office.address}</div>
          {office.phone && <div className="flex items-center gap-2"><Phone size={15} className="text-blue-500 flex-shrink-0" />{office.phone}</div>}
          {office.hours && <div className="flex items-center gap-2"><Clock size={15} className="text-blue-500 flex-shrink-0" />{office.hours}</div>}
        </div>
        <div className="flex gap-2 pt-2">
          <a href={`https://maps.google.com/?q=${office.lat},${office.lng}`} target="_blank" rel="noopener noreferrer"
            className="btn-secondary flex-1 text-sm py-2">📍 Get Directions</a>
          <a href={office.website} target="_blank" rel="noopener noreferrer"
            className="btn-primary flex-1 text-sm py-2"><ExternalLink size={14} /> Official Portal</a>
        </div>
      </div>
    </div>
  );
}
