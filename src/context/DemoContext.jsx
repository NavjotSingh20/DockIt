import { createContext, useContext, useState } from 'react';
import { DEMO_BUSINESS, DEMO_REQUIREMENTS, DEMO_BUSINESS_REQUIREMENTS } from '../utils/demoData';
import { getDaysLeft } from '../utils/formatters';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [isDemo, setIsDemo] = useState(false);

  // Enrich business requirements with computed daysLeft + backward-compat flat fields
  const demoBusinessRequirements = DEMO_BUSINESS_REQUIREMENTS.map((br) => {
    const req = br.requirement || {};
    return {
      ...br,
      daysLeft: getDaysLeft(br.expiry_date),
      // Backward-compat flat fields so existing UI components work
      license_type: req.legacy_type_id || req.requirement_name || '',
      license_number: br.license_number || '',
      issuing_authority: br.issuing_authority || req.issuing_agency || '',
      issue_date: null,
      confidence_score: br.extracted_via_ocr ? 90 : 0,
      renewal_portal_url: req.source_url || '',
    };
  });

  const enterDemo = () => {
    localStorage.setItem('cities', JSON.stringify(DEMO_BUSINESS.cities || []));
    setIsDemo(true);
  };
  const exitDemo = () => {
    localStorage.removeItem('cities');
    setIsDemo(false);
  };

  return (
    <DemoContext.Provider value={{
      isDemo,
      enterDemo,
      exitDemo,
      demoBusiness: DEMO_BUSINESS,
      demoRequirements: DEMO_REQUIREMENTS,
      demoBusinessRequirements,
      // Backward-compat alias — components that still read demoLicenses
      demoLicenses: demoBusinessRequirements,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
};
