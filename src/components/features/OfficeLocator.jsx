import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Phone, Clock, MapPin } from 'lucide-react';

const OFFICE_LOCATIONS = {
  FSSAI: { name: 'FSSAI State Office Karnataka', address: 'No. 4, 80 Feet Road, Koramangala, Bengaluru - 560034', lat: 12.9279, lng: 77.6271, phone: '080-25535996', hours: 'Mon-Fri: 10:00 AM - 5:00 PM', website: 'https://foscos.fssai.gov.in' },
  FIRE_NOC: { name: 'Karnataka State Fire & Emergency HQ', address: 'Nrupathunga Road, Bengaluru - 560001', lat: 12.9716, lng: 77.5946, phone: '080-22250601', hours: 'Mon-Sat: 10:00 AM - 5:30 PM', website: 'https://ksfe.karnataka.gov.in' },
  TRADE_LICENSE: { name: 'BBMP Head Office', address: 'N R Square, Hudson Circle, Bengaluru - 560002', lat: 12.9763, lng: 77.5929, phone: '080-22660000', hours: 'Mon-Sat: 9:30 AM - 5:30 PM', website: 'https://bbmptax.karnataka.gov.in' },
  SHOP_ESTABLISHMENT: { name: 'Karnataka Labour Department', address: 'Karmika Bhavana, Dairy Circle, Bengaluru - 560029', lat: 12.9249, lng: 77.6154, phone: '080-29751212', hours: 'Mon-Fri: 10:00 AM - 5:30 PM', website: 'https://labour.karnataka.gov.in' },
  EATING_HOUSE: { name: "Bengaluru City Police Commissioner's Office", address: 'Infantry Road, Bengaluru - 560001', lat: 12.9784, lng: 77.6058, phone: '080-22942222', hours: 'Mon-Sat: 10:00 AM - 5:00 PM', website: 'https://bengalurupolice.karnataka.gov.in' },
  GST: { name: 'GST Seva Kendra Bengaluru', address: 'BMTC Complex, Shivajinagar, Bengaluru - 560001', lat: 12.9850, lng: 77.6011, phone: '1800-103-4786', hours: 'Mon-Fri: 10:00 AM - 5:00 PM', website: 'https://www.gst.gov.in' },
};

export default function OfficeLocator({ licenseType }) {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const office = OFFICE_LOCATIONS[licenseType] || OFFICE_LOCATIONS.TRADE_LICENSE;

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
  }, [licenseType]);

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
          <div className="flex items-center gap-2"><Phone size={15} className="text-blue-500 flex-shrink-0" />{office.phone}</div>
          <div className="flex items-center gap-2"><Clock size={15} className="text-blue-500 flex-shrink-0" />{office.hours}</div>
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
