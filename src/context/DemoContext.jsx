import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  DEMO_BUSINESS, DEMO_REQUIREMENTS, DEMO_BUSINESS_REQUIREMENTS,
  DEMO_PROFILES, DEMO_BUSINESS_RICO, DEMO_BUSINESS_GRANDVIEW,
  DEMO_BUSINESS_REQUIREMENTS_RICO, DEMO_BUSINESS_REQUIREMENTS_GRANDVIEW
} from '../utils/demoData';
import { getDaysLeft } from '../utils/formatters';
import { enrichDemoRequirements } from '../services/requirementsFetcher';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [isDemo, setIsDemo] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState('rico');
  const [demoBusiness, setDemoBusiness] = useState(DEMO_BUSINESS_RICO);
  const [activeRawRequirements, setActiveRawRequirements] = useState(DEMO_BUSINESS_REQUIREMENTS_RICO);
  const [addedRequirements, setAddedRequirements] = useState([]);
  // Holds live-enriched versions of the catalog requirements (source_url verified)
  const [liveEnrichedReqs, setLiveEnrichedReqs] = useState({});
  const enrichedProfileRef = useRef(null);

  // ── Per-profile city session persistence ─────────────────────────────
  // Stores any city changes the user makes per profile so switching back
  // doesn't lose them. Keyed by profileId → { cities, country }
  const [profileCityOverrides, setProfileCityOverrides] = useState({});

  // Enrich business requirements with computed daysLeft + backward-compat flat fields
  const baseDemoRequirements = activeRawRequirements.map((br) => {
    const req = br.requirement || DEMO_REQUIREMENTS.find(r => r.id === br.requirement_id) || {};
    // Overlay any live-scraped data from the enrichment pass
    const liveReq = liveEnrichedReqs[br.id] || {};
    return {
      ...br,
      daysLeft: getDaysLeft(br.expiry_date),
      license_type: req.legacy_type_id || req.requirement_name || '',
      license_number: br.license_number || '',
      issuing_authority: br.issuing_authority || req.issuing_agency || '',
      issue_date: null,
      confidence_score: br.extracted_via_ocr ? 90 : 0,
      renewal_portal_url: req.source_url || '',
      // Merge live-enriched requirement data (e.g. updated description, verified date)
      requirement: { ...req, ...liveReq },
      _scrape: liveReq._scrape,
    };
  });

  const demoBusinessRequirements = [...baseDemoRequirements, ...addedRequirements];

  // ── Live Enrichment Effect ────────────────────────────────────────────
  // When in demo mode and the active profile changes, kick off a background
  // live-scrape pass against the requirement catalog. Results are stored in
  // liveEnrichedReqs keyed by BR id. On any failure, the stored demo data
  // is used transparently — no UI errors, no visible change.
  useEffect(() => {
    if (!isDemo || activeRawRequirements.length === 0) return;
    // Avoid redundant scrapes for the same profile in the same session
    const profileKey = `${activeProfileId}-${activeRawRequirements.length}`;
    if (enrichedProfileRef.current === profileKey) return;
    enrichedProfileRef.current = profileKey;

    let cancelled = false;
    enrichDemoRequirements(activeRawRequirements).then(enriched => {
      if (cancelled) return;
      const map = {};
      enriched.forEach(br => {
        if (br._scrape || br.requirement?._scrape) {
          // Store the enriched requirement fields keyed by BR id
          map[br.id] = { ...br.requirement, _scrape: br._scrape };
        }
      });
      setLiveEnrichedReqs(map);
    }).catch(() => {
      // Silent — demo data is already showing correctly without enrichment
    });
    return () => { cancelled = true; };
  }, [isDemo, activeProfileId, activeRawRequirements]);



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
    const cleanTypeName = typeName.toLowerCase().trim();

    setAddedRequirements((prev) => {
      const existingIdx = prev.findIndex(r =>
        (r.license_type || '').toLowerCase().trim() === cleanTypeName ||
        (r.requirement?.requirement_name || '').toLowerCase().trim() === cleanTypeName
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          status: daysLeft !== null && daysLeft < 0 ? 'expired' : 'satisfied',
          license_number: fields.license_number || updated[existingIdx].license_number,
          issuing_authority: authority || updated[existingIdx].issuing_authority,
          expiry_date: expiryDate,
          daysLeft: daysLeft,
          extracted_via_ocr: true,
          confidence_score: 90,
        };
        return updated;
      }

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
      return [newBr, ...prev];
    });
  };

  const updateDemoRequirement = (id, updates) => {
    setAddedRequirements((prev) => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...updates };
        return updated;
      }
      return prev;
    });

    setActiveRawRequirements((prev) => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...updates };
        return updated;
      }
      return prev;
    });
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
      updateDemoRequirement,
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
