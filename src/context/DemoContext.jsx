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

  // ── Per-profile city session persistence ─────────────────────────────
  // Stores any city changes the user makes per profile so switching back
  // doesn't lose them. Keyed by profileId → { cities, country }
  const [profileCityOverrides, setProfileCityOverrides] = useState({});

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
    // Snapshot current profile's city state before switching away from it
    setProfileCityOverrides(prev => ({
      ...prev,
      [activeProfileId]: {
        cities: demoBusiness.cities,
        country: demoBusiness.country,
      },
    }));

    setActiveProfileId(profileId);
    setAddedRequirements([]);
    const prof = DEMO_PROFILES.find(p => p.id === profileId) || DEMO_PROFILES[0];

    // Restore previously saved city state for this profile, or fall back to static defaults
    const savedOverride = profileCityOverrides[profileId];
    const restoredBusiness = savedOverride
      ? { ...prof.business, cities: savedOverride.cities, country: savedOverride.country }
      : prof.business;

    setDemoBusiness(restoredBusiness);
    setActiveRawRequirements(prof.requirements);
    localStorage.setItem('cities', JSON.stringify(restoredBusiness.cities || []));
    localStorage.setItem('country', restoredBusiness.country || 'USA');
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

  const addScannedDemoLicense = (fields) => {
    const expiryDate = fields.expiry_date || null;
    const daysLeft = getDaysLeft(expiryDate);
    const typeName = fields.license_type || 'Scanned Document';
    const authority = fields.issuing_authority || 'Government Authority';

    const newBr = {
      id: `demo-scanned-${Date.now()}`,
      business_id: demoBusiness.id || 'demo-001',
      requirement_id: `req-scanned-${Date.now()}`,
      status: daysLeft !== null && daysLeft < 0 ? 'expired' : 'satisfied',
      license_number: fields.license_number || 'N/A',
      issuing_authority: authority,
      expiry_date: expiryDate,
      issue_date: fields.issue_date || null,
      extracted_via_ocr: true,
      daysLeft: daysLeft,
      license_type: typeName,
      confidence_score: 90,
      renewal_portal_url: '',
      requirement: {
        id: `req-scanned-${Date.now()}`,
        requirement_name: typeName,
        issuing_agency: authority,
        business_type: demoBusiness.business_type || 'General',
        city: demoBusiness.cities?.[0] || 'New York, NY',
      }
    };
    setAddedRequirements((prev) => [newBr, ...prev]);
    return newBr;
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
      addScannedDemoLicense,
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
