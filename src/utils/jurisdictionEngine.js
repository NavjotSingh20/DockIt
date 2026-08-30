/**
 * jurisdictionEngine.js
 *
 * Core engine for multi-jurisdiction compliance and Smart-Diff permit resolution.
 * Handles parsing, hierarchical filtering (Federal -> State -> Municipal),
 * business domain cross-compatibility, and dynamic fallbacks for any city/state.
 */

// ── 1. Country & State Geography Reference ──────────────────────────────────
const US_STATE_CODES = {
  'al': 'Alabama', 'ak': 'Alaska', 'az': 'Arizona', 'ar': 'Arkansas', 'ca': 'California',
  'co': 'Colorado', 'ct': 'Connecticut', 'de': 'Delaware', 'fl': 'Florida', 'ga': 'Georgia',
  'hi': 'Hawaii', 'id': 'Idaho', 'il': 'Illinois', 'in': 'Indiana', 'ia': 'Iowa',
  'ks': 'Kansas', 'ky': 'Kentucky', 'la': 'Louisiana', 'me': 'Maine', 'md': 'Maryland',
  'ma': 'Massachusetts', 'mi': 'Michigan', 'mn': 'Minnesota', 'ms': 'Mississippi', 'mo': 'Missouri',
  'mt': 'Montana', 'ne': 'Nebraska', 'nv': 'Nevada', 'nh': 'New Hampshire', 'nj': 'New Jersey',
  'nm': 'New Mexico', 'ny': 'New York', 'nc': 'North Carolina', 'nd': 'North Dakota', 'oh': 'Ohio',
  'ok': 'Oklahoma', 'or': 'Oregon', 'pa': 'Pennsylvania', 'ri': 'Rhode Island', 'sc': 'South Carolina',
  'sd': 'South Dakota', 'tn': 'Tennessee', 'tx': 'Texas', 'ut': 'Utah', 'vt': 'Vermont',
  'va': 'Virginia', 'wa': 'Washington', 'wv': 'West Virginia', 'wi': 'Wisconsin', 'wy': 'Wyoming',
  'dc': 'District of Columbia'
};

const INDIA_STATES = [
  'maharashtra', 'delhi', 'nct', 'karnataka', 'tamil nadu', 'west bengal', 'telangana',
  'gujarat', 'rajasthan', 'uttar pradesh', 'kerala', 'punjab', 'haryana', 'bihar', 'odisha',
  'chandigarh'
];

/**
 * Parses a city string into structured jurisdiction metadata:
 * e.g. "Los Angeles, CA" -> { city: "Los Angeles", state: "CA", stateName: "California", country: "USA" }
 */
export function parseJurisdiction(cityStr) {
  if (!cityStr || typeof cityStr !== 'string') {
    return { city: '', state: '', stateName: '', country: 'USA' };
  }

  const raw = cityStr.trim();
  const lower = raw.toLowerCase();

  // Check India first
  const isIndia = INDIA_STATES.some(s => lower.includes(s)) ||
    lower.includes('mumbai') || lower.includes('pune') || lower.includes('bangalore') ||
    lower.includes('bengaluru') || lower.includes('chennai') || lower.includes('kolkata') ||
    lower.includes('hyderabad') || lower.includes('ahmedabad') || lower.includes('india');

  if (isIndia) {
    const parts = raw.split(',').map(s => s.trim());
    let stateName = parts[1] || '';
    if (!stateName) {
      if (lower.includes('delhi')) stateName = 'Delhi';
      else if (lower.includes('chandigarh')) stateName = 'Chandigarh';
      else if (lower.includes('mumbai') || lower.includes('pune')) stateName = 'Maharashtra';
      else if (lower.includes('chennai')) stateName = 'Tamil Nadu';
      else if (lower.includes('kolkata')) stateName = 'West Bengal';
      else if (lower.includes('hyderabad')) stateName = 'Telangana';
      else if (lower.includes('bangalore') || lower.includes('bengaluru')) stateName = 'Karnataka';
      else if (lower.includes('ahmedabad')) stateName = 'Gujarat';
      else stateName = 'Maharashtra';
    }
    return {
      city: parts[0] || raw,
      state: stateName,
      stateName: stateName,
      country: 'India'
    };
  }

  // Parse US City, State
  const parts = raw.split(',').map(s => s.trim());
  const cityName = parts[0] || raw;
  let stateAbbr = (parts[1] || '').toUpperCase();
  let stateName = US_STATE_CODES[stateAbbr.toLowerCase()] || stateAbbr;

  // If state was given as full name e.g. "California"
  if (!US_STATE_CODES[stateAbbr.toLowerCase()]) {
    const foundCode = Object.keys(US_STATE_CODES).find(code => US_STATE_CODES[code].toLowerCase() === parts[1]?.toLowerCase());
    if (foundCode) {
      stateAbbr = foundCode.toUpperCase();
      stateName = US_STATE_CODES[foundCode];
    }
  }

  return {
    city: cityName,
    state: stateAbbr || 'NY',
    stateName: stateName || 'New York',
    country: 'USA'
  };
}

// ── 2. Business Category Domain Grouping ────────────────────────────────────
export const BUSINESS_DOMAINS = {
  food_service: ['restaurant', 'food_truck', 'cafe', 'bakery', 'bar', 'catering', 'food_vendor'],
  personal_care: ['salon', 'spa', 'barber', 'nail_salon', 'tattoo'],
  healthcare: ['clinic', 'pharmacy', 'dental', 'diagnostic'],
  retail_trade: ['retail', 'clothing', 'electronics', 'grocery'],
  construction: ['contractor', 'builder', 'electrician', 'plumber'],
  education: ['coaching', 'school', 'tutoring', 'academy'],
  industrial: ['manufacturing', 'factory', 'warehouse']
};

export function getBusinessDomain(businessType = '') {
  const lower = businessType.toLowerCase().trim();
  for (const [domain, types] of Object.entries(BUSINESS_DOMAINS)) {
    if (types.includes(lower) || types.some(t => lower.includes(t))) {
      return domain;
    }
  }
  return 'general';
}

export function areBusinessTypesCompatible(typeA = '', typeB = '') {
  if (!typeA || !typeB) return true;
  const a = typeA.toLowerCase().trim();
  const b = typeB.toLowerCase().trim();
  return a === b || a === 'all' || b === 'all';
}

// ── 3. Requirement Jurisdiction Matching ─────────────────────────────────────
/**
 * Evaluates whether a requirement applies to a business operating in a set of cities.
 */
export function isRequirementApplicable(req, operatingCities = [], businessType = '') {
  if (!req) return false;

  // 1. Business Domain Compatibility
  if (!areBusinessTypesCompatible(req.business_type, businessType)) {
    return false;
  }

  const parsedCities = operatingCities.map(c => parseJurisdiction(c));
  if (parsedCities.length === 0) return true;

  const primaryCountry = parsedCities[0].country;
  const reqJurisdiction = parseJurisdiction(req.city || '');
  const level = (req.jurisdiction_level || 'city').toLowerCase();

  // 2. Federal Level
  if (level === 'federal' || (req.city && req.city.toLowerCase().includes('federal'))) {
    // Country must match
    const reqIsIndia = req.country === 'India' ||
      (req.city || '').toLowerCase().includes('mumbai') ||
      (req.city || '').toLowerCase().includes('india') ||
      (req.issuing_agency || '').toLowerCase().includes('india') ||
      (req.issuing_agency || '').toLowerCase().includes('iprs') ||
      (req.issuing_agency || '').toLowerCase().includes('ppl') ||
      (req.issuing_agency || '').toLowerCase().includes('gst') ||
      (req.requirement_name || '').toLowerCase().includes('pan') ||
      reqJurisdiction.country === 'India';
    return (primaryCountry === 'India') === reqIsIndia;
  }

  // 3. State Level
  if (level === 'state') {
    return parsedCities.some(pc => {
      if (pc.country !== reqJurisdiction.country) return false;
      const pcStateLower = pc.state.toLowerCase();
      const pcStateNameLower = pc.stateName.toLowerCase();
      const reqCityLower = (req.city || '').toLowerCase();
      const reqAgencyLower = (req.issuing_agency || '').toLowerCase();

      return reqCityLower.includes(pcStateLower) ||
        reqCityLower.includes(pcStateNameLower) ||
        reqAgencyLower.includes(pcStateLower) ||
        reqAgencyLower.includes(pcStateNameLower);
    });
  }

  // 4. City / Municipal Level
  if (level === 'city') {
    return parsedCities.some(pc => {
      const pcCityLower = pc.city.toLowerCase();
      const reqCityLower = (req.city || '').toLowerCase();
      return reqCityLower.includes(pcCityLower) || pcCityLower.includes(reqCityLower.split(',')[0].trim());
    });
  }

  return true;
}

// ── 4. Dynamic Fallback Permit Synthesizer for ANY City/State ────────────────
/**
 * Automatically synthesizes standard statutory requirements if a city has no pre-scraped rows in DB.
 */
export function synthesizeCityRequirements(cityStr, businessType = 'restaurant') {
  const { city, state, stateName, country } = parseJurisdiction(cityStr);
  const domain = getBusinessDomain(businessType);

  if (country === 'India') {
    const list = [
      {
        id: `synth-in-fed-gst`,
        business_type: businessType,
        city: 'Federal / All Cities',
        jurisdiction_level: 'federal',
        requirement_name: 'GST Registration',
        issuing_agency: 'GST Council of India',
        fee_min: 0,
        fee_max: 0,
        renewal_cycle_months: null,
        processing_time: '3-7 business days',
        description: 'Mandatory Goods & Services Tax registration for commercial operations in India.',
        source_url: 'https://www.gst.gov.in'
      },
      {
        id: `synth-in-state-shop-${state}`,
        business_type: businessType,
        city: `${city}, ${stateName}`,
        jurisdiction_level: 'state',
        requirement_name: `${stateName} Shop & Establishment Registration`,
        issuing_agency: `${stateName} Labour Department`,
        fee_min: 500,
        fee_max: 2500,
        renewal_cycle_months: 12,
        processing_time: '7-14 business days',
        description: `Statutory labor and commercial establishment registration under the ${stateName} Shops & Establishments Act.`,
        source_url: 'https://labour.gov.in'
      },
      {
        id: `synth-in-city-trade-${city}`,
        business_type: businessType,
        city: `${city}, ${stateName}`,
        jurisdiction_level: 'city',
        requirement_name: `${city} Municipal Trade License`,
        issuing_agency: `${city} Municipal Corporation`,
        fee_min: 3000,
        fee_max: 15000,
        renewal_cycle_months: 12,
        processing_time: '14-21 business days',
        description: `Commercial operating trade license issued by the ${city} Municipal Corporation.`,
        source_url: 'https://municipalcorporation.gov.in'
      }
    ];

    if (domain === 'food_service') {
      list.push(
        {
          id: `synth-in-state-fssai-${state}`,
          business_type: businessType,
          city: `${city}, ${stateName}`,
          jurisdiction_level: 'state',
          requirement_name: `${stateName} FSSAI Food Safety License / Registration`,
          issuing_agency: `Food Safety and Standards Authority of India (${stateName} State / FoSCoS)`,
          fee_min: 2000,
          fee_max: 7500,
          renewal_cycle_months: 12,
          processing_time: '7-14 business days',
          description: `Premises-specific food safety license for operating units in ${stateName}.`,
          source_url: 'https://foscos.fssai.gov.in'
        },
        {
          id: `synth-in-state-fire-${state}`,
          business_type: businessType,
          city: `${city}, ${stateName}`,
          jurisdiction_level: 'state',
          requirement_name: `${stateName} Fire Safety NOC`,
          issuing_agency: `${stateName} Fire & Emergency Services`,
          fee_min: 1500,
          fee_max: 8000,
          renewal_cycle_months: 12,
          processing_time: '14-30 business days',
          description: 'Fire department premises clearance confirming fire safety installations.',
          source_url: 'https://firenoc.gov.in'
        }
      );
    }
    return list;
  }

  // ── USA Synthesis ──
  const list = [
    {
      id: `synth-us-fed-ein`,
      business_type: businessType,
      city: 'Federal / All Cities',
      jurisdiction_level: 'federal',
      requirement_name: 'Employer Identification Number (EIN)',
      issuing_agency: 'IRS (Internal Revenue Service)',
      fee_min: 0,
      fee_max: 0,
      renewal_cycle_months: null,
      processing_time: 'Instant online',
      description: 'Federal Employer Identification Number for business taxes and employee payroll.',
      source_url: 'https://www.irs.gov'
    },
    {
      id: `synth-us-state-salestax-${state}`,
      business_type: businessType,
      city: `${city}, ${state}`,
      jurisdiction_level: 'state',
      requirement_name: `${stateName} Sales Tax Permit / Seller's Authority`,
      issuing_agency: `${stateName} Department of Revenue / Taxation`,
      fee_min: 0,
      fee_max: 50,
      renewal_cycle_months: null,
      processing_time: '3-7 business days',
      description: `State authorization for collecting and remitting retail sales tax within the State of ${stateName}.`,
      source_url: 'https://tax.gov'
    },
    {
      id: `synth-us-city-btrc-${city}`,
      business_type: businessType,
      city: `${city}, ${state}`,
      jurisdiction_level: 'city',
      requirement_name: `City of ${city} General Business License`,
      issuing_agency: `${city} City Finance & License Division`,
      fee_min: 50,
      fee_max: 250,
      renewal_cycle_months: 12,
      processing_time: '5-10 business days',
      description: `Municipal business operating certificate and tax registration required for ${city}.`,
      source_url: 'https://cityhall.gov'
    }
  ];

  if (domain === 'food_service') {
    list.push(
      {
        id: `synth-us-city-health-${city}`,
        business_type: businessType,
        city: `${city}, ${state}`,
        jurisdiction_level: 'city',
        requirement_name: `${city} / ${state} County Public Health Food Permit`,
        issuing_agency: `${city} / County Department of Public Health`,
        fee_min: 250,
        fee_max: 650,
        renewal_cycle_months: 12,
        processing_time: '14-30 business days',
        description: `Operational health department permit ensuring sanitary preparation and food facility safety in ${city}.`,
        source_url: 'https://publichealth.gov'
      },
      {
        id: `synth-us-state-foodcert-${state}`,
        business_type: businessType,
        city: `${city}, ${state}`,
        jurisdiction_level: 'state',
        requirement_name: `${stateName} Food Protection Manager / Food Handler Certification`,
        issuing_agency: `${stateName} Health & Safety Board`,
        fee_min: 15,
        fee_max: 150,
        renewal_cycle_months: 36,
        processing_time: '1-3 business days',
        description: `State-accredited food safety manager certification required for supervisory kitchen staff in ${stateName}.`,
        source_url: 'https://foodsafety.gov'
      }
    );
  }

  return list;
}

// ── 5. Smart-Diff Computation ────────────────────────────────────────────────
/**
 * Compares current business checklist against a newly expanded city.
 * Skips shared federal permits already held, skips state permits already held for that state,
 * and isolates the exact delta permits needed.
 */
export function computeSmartDiff(existingChecklist = [], newCityStr, businessType, catalog = []) {
  const newJurisdiction = parseJurisdiction(newCityStr);
  const domain = getBusinessDomain(businessType);

  // 1. Gather all candidates from catalog or dynamic synthesis
  let candidates = catalog.filter(req => isRequirementApplicable(req, [newCityStr], businessType));
  if (candidates.length === 0) {
    candidates = synthesizeCityRequirements(newCityStr, businessType);
  }

  // 2. Index existing permits
  const existingReqIds = new Set(existingChecklist.map(br => br.requirement_id || br.requirement?.id));
  const existingNames = new Set(existingChecklist.map(br => (br.requirement?.requirement_name || br.license_type || '').toLowerCase()));
  
  const hasFederalTaxId = existingChecklist.some(br => {
    const name = (br.requirement?.requirement_name || br.license_type || '').toLowerCase();
    const level = (br.requirement?.jurisdiction_level || '').toLowerCase();
    return level === 'federal' || name.includes('ein') || name.includes('gst') || name.includes('employer identification');
  });

  const delta = [];
  const shared = [];

  for (const candidate of candidates) {
    const candLevel = (candidate.jurisdiction_level || 'city').toLowerCase();
    const candNameLower = candidate.requirement_name.toLowerCase();

    // Already tracked by exact ID or exact name
    if (existingReqIds.has(candidate.id) || existingNames.has(candNameLower)) {
      shared.push(candidate);
      continue;
    }

    // Federal check (e.g. IRS EIN is shared across all US branches)
    if (candLevel === 'federal' && hasFederalTaxId) {
      shared.push(candidate);
      continue;
    }

    // New state or municipal permit needed
    delta.push(candidate);
  }

  return {
    deltaRequirements: delta,
    sharedRequirements: shared,
    summary: {
      newCity: newCityStr,
      deltaCount: delta.length,
      sharedCount: shared.length
    }
  };
}
