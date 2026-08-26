import { createContext, useContext, useState } from 'react';
import {
  DEMO_BUSINESS, DEMO_REQUIREMENTS, DEMO_BUSINESS_REQUIREMENTS,
  DEMO_PROFILES, DEMO_BUSINESS_RICO, DEMO_BUSINESS_GRANDVIEW,
  DEMO_BUSINESS_REQUIREMENTS_RICO, DEMO_BUSINESS_REQUIREMENTS_GRANDVIEW
} from '../utils/demoData';
import { getDaysLeft } from '../utils/formatters';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [isDemo, setIsDemo] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState('rico'); // default to Rico's Curbside Kitchen for demo
  const [demoBusiness, setDemoBusiness] = useState(DEMO_BUSINESS_RICO);
  const [activeRawRequirements, setActiveRawRequirements] = useState(DEMO_BUSINESS_REQUIREMENTS_RICO);
  const [addedRequirements, setAddedRequirements] = useState([]);

  // Enrich business requirements with computed daysLeft + backward-compat flat fields
  const baseDemoRequirements = activeRawRequirements.map((br) => {
    const req = br.requirement || DEMO_REQUIREMENTS.find(r => r.id === br.requirement_id) || {};
    return {
      ...br,
      daysLeft: getDaysLeft(br.expiry_date),
      license_type: req.legacy_type_id || req.requirement_name || '',
      license_number: br.license_number || '',
      issuing_authority: br.issuing_authority || req.issuing_agency || '',
      issue_date: null,
      confidence_score: br.extracted_via_ocr ? 90 : 0,
      renewal_portal_url: req.source_url || '',
    };
  });

  const demoBusinessRequirements = [...baseDemoRequirements, ...addedRequirements];

  const switchDemoProfile = (profileId) => {
    setActiveProfileId(profileId);
    setAddedRequirements([]);
    const prof = DEMO_PROFILES.find(p => p.id === profileId) || DEMO_PROFILES[0];
    setDemoBusiness(prof.business);
    setActiveRawRequirements(prof.requirements);
    localStorage.setItem('cities', JSON.stringify(prof.business.cities || []));
    localStorage.setItem('country', prof.business.country || 'USA');
  };

  const addDemoRequirement = (req) => {
    const newBr = {
      id: `demo-added-${Date.now()}`,
      business_id: demoBusiness.id || 'demo-001',
      requirement_id: req.id,
      status: 'needed',
      license_number: 'PENDING-REGISTRATION',
      issuing_authority: req.issuing_agency || '',
      expiry_date: null,
      extracted_via_ocr: false,
      requirement: req,
      daysLeft: null,
      license_type: req.legacy_type_id || req.requirement_name || '',
      confidence_score: 0,
      renewal_portal_url: req.source_url || '',
    };
    setAddedRequirements((prev) => [...prev, newBr]);
  };

  const updateDemoBusiness = (updates) => {
    setDemoBusiness((prev) => {
      const next = { ...prev, ...updates };
      if (next.cities) {
        localStorage.setItem('cities', JSON.stringify(next.cities));
      }
      return next;
    });
  };

  const enterDemo = (profileId = 'rico') => {
    setIsDemo(true);
    switchDemoProfile(profileId);
  };

  const exitDemo = () => {
    localStorage.removeItem('cities');
    setIsDemo(false);
    setAddedRequirements([]);
  };

  return (
    <DemoContext.Provider value={{
      isDemo,
      enterDemo,
      exitDemo,
      activeProfileId,
      switchDemoProfile,
      demoProfiles: DEMO_PROFILES,
      addDemoRequirement,
      demoBusiness,
      updateDemoBusiness,
      demoRequirements: DEMO_REQUIREMENTS,
      demoBusinessRequirements,
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
