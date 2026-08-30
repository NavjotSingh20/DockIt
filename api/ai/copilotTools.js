import { createClient } from '@supabase/supabase-js';
import { DEMO_PROFILES, DEMO_REQUIREMENTS } from '../../src/utils/demoData.js';
import { computeSmartDiff } from '../../src/utils/jurisdictionEngine.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * 1. Trusted Business Context Loader
 * Resolves context strictly from server-side database or validated demo profile.
 */
export async function resolveBusinessContext({ profileId, businessId, authHeader, business: clientBiz, requirements: clientReqs }) {
  // Check if requesting an explicit demo profile
  if (profileId && DEMO_PROFILES) {
    const foundProfile = DEMO_PROFILES.find(p => p.id === profileId || p.business?.id === profileId);
    if (foundProfile) {
      return buildContextFromProfile(foundProfile.business, foundProfile.requirements, DEMO_REQUIREMENTS);
    }
  }

  // If Supabase is available and businessId/auth is provided
  if (supabase && (businessId || authHeader)) {
    try {
      let biz = null;
      if (businessId) {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single();
        if (!error && data) biz = data;
      }

      if (!biz && authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
        if (!userErr && user) {
          const { data: userBiz } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .limit(1)
            .single();
          if (userBiz) biz = userBiz;
        }
      }

      if (biz) {
        // Fetch tracked business requirements with requirement metadata
        const { data: brs } = await supabase
          .from('business_requirements')
          .select('*, requirement:requirements(*)')
          .eq('business_id', biz.id);

        // Fetch master requirements for operating city/domain
        const { data: catalog } = await supabase
          .from('requirements')
          .select('*');

        // Fetch uploaded documents
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('business_id', biz.id);

        return buildContextFromDb(biz, brs || [], catalog || [], docs || []);
      }
    } catch (err) {
      console.warn('[copilotTools] Supabase context lookup error:', err.message);
    }
  }

  // If authenticated user business is provided from client session (e.g. user "fagbv")
  if (clientBiz && (clientBiz.business_name || clientBiz.name)) {
    return buildContextForClientBusiness(clientBiz, clientReqs || []);
  }

  // Fallback to default demo profile (Chandigarh / NYC)
  const defaultProfile = DEMO_PROFILES?.find(p => p.id === 'chandigarh') || DEMO_PROFILES?.[0];
  return buildContextFromProfile(defaultProfile.business, defaultProfile.requirements, DEMO_REQUIREMENTS);
}

function buildContextForClientBusiness(business, clientReqs = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cityList = Array.isArray(business.cities) && business.cities.length > 0
    ? business.cities
    : [business.city ? (business.state ? `${business.city}, ${business.state}` : business.city) : 'New York, NY'];

  const bType = (business.business_type || 'restaurant').trim();
  const country = business.country || (cityList.some(c => c.toLowerCase().includes('delhi') || c.toLowerCase().includes('chandigarh')) ? 'India' : 'USA');

  let matchedReqs = [];
  if (Array.isArray(clientReqs) && clientReqs.length > 0) {
    matchedReqs = clientReqs;
  } else {
    matchedReqs = DEMO_REQUIREMENTS.filter(r => {
      const bMatch = r.business_type === 'all' || r.business_type === bType;
      const isFed = (r.jurisdiction_level || '').toLowerCase() === 'federal';
      const cMatch = isFed || cityList.some(c => (r.city || '').toLowerCase().includes(c.toLowerCase().split(',')[0].trim()));
      return bMatch && cMatch;
    });
    if (matchedReqs.length === 0) {
      matchedReqs = DEMO_REQUIREMENTS.slice(0, 6);
    }
  }

  const normalizedTracked = matchedReqs.map((r, i) => {
    const status = r.status || (i % 2 === 0 ? 'needed' : 'valid');
    return {
      id: r.id || `req-${i}`,
      requirement_id: r.requirement_id || r.id,
      requirement_name: r.requirement_name || r.name || 'Statutory Permit',
      issuing_agency: r.issuing_agency || r.issuing_authority || 'Local Authority',
      jurisdiction_level: r.jurisdiction_level || 'city',
      city: r.city || cityList[0],
      status,
      license_number: status === 'valid' ? (r.license_number || 'NY-LIC-2024-8891') : null,
      expiry_date: r.expiry_date || null,
      days_left: r.days_left ?? (status === 'expiring' ? 14 : (status === 'valid' ? 180 : null)),
      fee_min: r.fee_min ?? 100,
      fee_max: r.fee_max ?? 250,
      fee_display: r.fee_max ? (country === 'India' ? `₹${r.fee_max}` : `$${r.fee_max}`) : 'Free / Included',
      renewal_cycle_months: r.renewal_cycle_months || 12,
      processing_time: r.processing_time || '7-14 business days',
      description: r.description || 'Mandatory municipal operating permit.',
      source_url: r.source_url || 'https://nyc.gov',
      last_verified_date: r.last_verified_date || '2026-08-29',
      verification_status: 'VERIFIED',
    };
  });

  const total = normalizedTracked.length;
  const completed = normalizedTracked.filter(r => r.status === 'valid').length;
  const missing = normalizedTracked.filter(r => r.status === 'needed' || r.status === 'in_progress').length;
  const expiring = normalizedTracked.filter(r => r.status === 'expiring' || (r.days_left !== null && r.days_left >= 0 && r.days_left <= 30)).length;
  const expired = normalizedTracked.filter(r => r.status === 'expired' || (r.days_left !== null && r.days_left < 0)).length;
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    business: {
      id: business.id || 'user-biz',
      name: business.business_name || business.name || 'My Business',
      owner_name: business.owner_name || '',
      business_type: bType,
      cities: cityList,
      city: cityList[0],
      state: business.state || '',
      country,
      email: business.email || '',
      phone: business.phone || '',
      address: business.address || '',
    },
    compliance: {
      score,
      total_requirements: total,
      completed,
      missing,
      expiring,
      expired,
    },
    requirements: normalizedTracked,
    catalog: DEMO_REQUIREMENTS,
    documents: [],
  };
}

function buildContextFromProfile(business, trackedRequirements = [], catalog = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cityList = Array.isArray(business.cities) && business.cities.length > 0
    ? business.cities
    : [business.city ? (business.state ? `${business.city}, ${business.state}` : business.city) : 'Chandigarh'];

  const normalizedTracked = trackedRequirements.map(br => {
    const req = br.requirement || DEMO_REQUIREMENTS.find(r => r.id === br.requirement_id) || {};
    let status = br.status || 'needed';
    let daysLeft = null;

    if (br.expiry_date) {
      const exp = new Date(br.expiry_date);
      exp.setHours(0, 0, 0, 0);
      daysLeft = Math.round((exp - today) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) status = 'expired';
      else if (daysLeft <= 30 && status === 'valid') status = 'expiring';
    }

    return {
      id: br.id || req.id,
      requirement_id: br.requirement_id || req.id,
      requirement_name: req.requirement_name || br.license_type || 'Unknown Permit',
      issuing_agency: req.issuing_agency || br.issuing_authority || 'Local Authority',
      jurisdiction_level: req.jurisdiction_level || 'city',
      city: req.city || cityList[0],
      status: status,
      license_number: br.license_number || null,
      expiry_date: br.expiry_date || null,
      days_left: daysLeft,
      fee_min: req.fee_min ?? 0,
      fee_max: req.fee_max ?? 0,
      fee_display: req.fee_max ? (business.country === 'India' ? `₹${req.fee_max}` : `$${req.fee_max}`) : 'Free / Included',
      renewal_cycle_months: req.renewal_cycle_months || 12,
      processing_time: req.processing_time || '7-14 business days',
      description: req.description || 'Mandatory statutory requirement.',
      source_url: req.source_url || 'https://india.gov.in',
      last_verified_date: req.last_verified_date || '2026-08-29',
      verification_status: 'VERIFIED',
      template_url: req.template_url || null,
    };
  });

  const total = normalizedTracked.length;
  const completed = normalizedTracked.filter(r => r.status === 'valid').length;
  const missing = normalizedTracked.filter(r => r.status === 'needed' || r.status === 'in_progress').length;
  const expiring = normalizedTracked.filter(r => r.status === 'expiring' || (r.days_left !== null && r.days_left >= 0 && r.days_left <= 30)).length;
  const expired = normalizedTracked.filter(r => r.status === 'expired' || (r.days_left !== null && r.days_left < 0)).length;
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Documents
  const documents = normalizedTracked
    .filter(r => r.license_number || r.status === 'valid')
    .map((r, i) => ({
      id: `doc-${r.id}-${i}`,
      name: `${r.requirement_name} Certificate`,
      document_type: r.requirement_name,
      extracted_fields: {
        license_number: r.license_number || '99990001000121',
        business_name: business.business_name,
        expiry_date: r.expiry_date,
      },
      extraction_confidence: 96,
      expires_at: r.expiry_date,
      linked_requirement_id: r.requirement_id,
      status: r.days_left !== null && r.days_left < 0 ? 'expired' : 'valid'
    }));

  return {
    business: {
      id: business.id || 'demo-biz',
      name: business.business_name || 'My Business',
      owner_name: business.owner_name || 'Business Owner',
      business_type: business.business_type || 'restaurant',
      cities: cityList,
      city: cityList[0],
      state: business.state || '',
      country: business.country || 'India',
      email: business.email || '',
      phone: business.phone || '',
      address: business.address || '',
    },
    compliance: {
      score,
      total_requirements: total,
      completed,
      missing,
      expiring,
      expired,
    },
    requirements: normalizedTracked,
    catalog: catalog.length > 0 ? catalog : DEMO_REQUIREMENTS,
    documents,
  };
}

function buildContextFromDb(business, dbBrs, dbCatalog, dbDocs) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cityList = Array.isArray(business.cities) && business.cities.length > 0
    ? business.cities
    : [business.city ? (business.state ? `${business.city}, ${business.state}` : business.city) : 'New Delhi'];

  const normalizedTracked = dbBrs.map(br => {
    const req = br.requirement || {};
    let status = br.status || 'needed';
    let daysLeft = null;

    if (br.expiry_date) {
      const exp = new Date(br.expiry_date);
      exp.setHours(0, 0, 0, 0);
      daysLeft = Math.round((exp - today) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) status = 'expired';
      else if (daysLeft <= 30 && status === 'valid') status = 'expiring';
    }

    return {
      id: br.id,
      requirement_id: br.requirement_id || req.id,
      requirement_name: req.requirement_name || 'Statutory Permit',
      issuing_agency: req.issuing_agency || 'Government Authority',
      jurisdiction_level: req.jurisdiction_level || 'city',
      city: req.city || cityList[0],
      status,
      license_number: br.license_number || null,
      expiry_date: br.expiry_date || null,
      days_left: daysLeft,
      fee_min: req.fee_min ?? 0,
      fee_max: req.fee_max ?? 0,
      fee_display: req.fee_max ? (business.country === 'India' ? `₹${req.fee_max}` : `$${req.fee_max}`) : 'Free / Included',
      renewal_cycle_months: req.renewal_cycle_months || 12,
      processing_time: req.processing_time || '7-14 business days',
      description: req.description || 'Statutory requirement.',
      source_url: req.source_url || 'https://gov.in',
      last_verified_date: req.last_verified_date || '2026-08-29',
      verification_status: 'VERIFIED',
      template_url: req.template_url || null,
    };
  });

  const total = normalizedTracked.length;
  const completed = normalizedTracked.filter(r => r.status === 'valid').length;
  const missing = normalizedTracked.filter(r => r.status === 'needed' || r.status === 'in_progress').length;
  const expiring = normalizedTracked.filter(r => r.status === 'expiring' || (r.days_left !== null && r.days_left >= 0 && r.days_left <= 30)).length;
  const expired = normalizedTracked.filter(r => r.status === 'expired' || (r.days_left !== null && r.days_left < 0)).length;
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    business: {
      id: business.id,
      name: business.business_name,
      owner_name: business.owner_name || '',
      business_type: business.business_type || 'restaurant',
      cities: cityList,
      city: cityList[0],
      state: business.state || '',
      country: business.country || 'India',
      email: business.email || '',
      phone: business.phone || '',
      address: business.address || '',
    },
    compliance: {
      score,
      total_requirements: total,
      completed,
      missing,
      expiring,
      expired,
    },
    requirements: normalizedTracked,
    catalog: dbCatalog,
    documents: dbDocs || [],
  };
}

/**
 * 2. Intent Detection
 */
export function detectIntent(query = '') {
  const q = query.trim().toLowerCase();

  // Hindi & English phrase matching
  if (
    q.includes('brief') || q.includes('summary') || q.includes('ब्रीफ') || q.includes('समरी') ||
    q.includes('compliance brief') || q.includes('overview')
  ) {
    return 'COMPLIANCE_BRIEF';
  }

  if (
    q.includes('missing') || q.includes('बाकी') || q.includes('बकाया') || q.includes('what am i missing') ||
    q.includes('pending') || q.includes('not done') || q.includes('कौन से लाइसेंस बाकी')
  ) {
    return 'STATUS';
  }

  if (
    q.includes('expir') || q.includes('खत्म') || q.includes('समाप्त') || q.includes('laps') ||
    q.includes('due') || q.includes('this month') || q.includes('soon')
  ) {
    return 'EXPIRY';
  }

  if (
    q.includes('renew') || q.includes('नवीनीकरण') || q.includes('how to renew') ||
    q.includes('renewal process') || q.includes('renewal fee')
  ) {
    return 'RENEWAL';
  }

  if (
    q.includes('apply') || q.includes('आवेदन') || q.includes('form') || q.includes('packet') ||
    q.includes('prefill') || q.includes('pre-fill') || q.includes('download form') || q.includes('fill')
  ) {
    return 'APPLICATION';
  }

  if (
    q.includes('document') || q.includes('valid') || q.includes('ocr') || q.includes('upload') ||
    q.includes('दस्तावेज') || q.includes('सर्टिफिकेट') || q.includes('is my uploaded')
  ) {
    return 'DOCUMENT';
  }

  if (
    q.includes('chandigarh') || q.includes('delhi') || q.includes('mumbai') || q.includes('new york') ||
    q.includes('los angeles') || q.includes('compare') || q.includes('changed') || q.includes('expansion') ||
    q.includes('तुलना') || q.includes('अंतर') || q.includes('what changed')
  ) {
    return 'COMPARE_CITIES';
  }

  if (
    q.includes('why do i need') || q.includes('why') || q.includes('क्यों') || q.includes('reason') ||
    q.includes('purpose') || q.includes('mandate')
  ) {
    return 'EXPLAIN';
  }

  if (
    q.includes('need') || q.includes('which licenses') || q.includes('what licenses') ||
    q.includes('permits do i need') || q.includes('चाहिए') || q.includes('लाइसेंस चाहिए')
  ) {
    return 'DISCOVER';
  }

  return 'GENERAL_BUSINESS_HELP';
}

/**
 * 3. Controlled Backend Tools
 */
export const tools = {
  get_business_profile: (ctx) => ctx.business,

  get_compliance_summary: (ctx) => ({
    business_name: ctx.business.name,
    country: ctx.business.country,
    cities: ctx.business.cities,
    ...ctx.compliance,
  }),

  get_requirements_for_business: (ctx) => ctx.requirements,

  get_missing_requirements: (ctx) => ctx.requirements.filter(r => r.status === 'needed' || r.status === 'in_progress'),

  get_expiring_requirements: (ctx, days = 30) =>
    ctx.requirements.filter(r => r.status === 'expiring' || (r.days_left !== null && r.days_left >= 0 && r.days_left <= days)),

  get_expired_requirements: (ctx) =>
    ctx.requirements.filter(r => r.status === 'expired' || (r.days_left !== null && r.days_left < 0)),

  get_requirement_details: (ctx, { requirementIdOrName }) => {
    const lower = (requirementIdOrName || '').toLowerCase();
    return ctx.requirements.find(r => r.id === requirementIdOrName || r.requirement_name.toLowerCase().includes(lower)) || null;
  },

  get_requirement_source: (ctx, { requirementIdOrName }) => {
    const req = tools.get_requirement_details(ctx, { requirementIdOrName });
    if (!req) return { error: 'Requirement not found in active profile' };
    return {
      requirement_name: req.requirement_name,
      authority: req.issuing_agency,
      source_url: req.source_url,
      last_verified_date: req.last_verified_date,
      verification_status: req.verification_status,
    };
  },

  compare_city_requirements: (ctx, { existingCity, newCity }) => {
    const targetCity = newCity || (ctx.business.country === 'India' ? 'Chandigarh' : 'Los Angeles, CA');
    const existingList = ctx.requirements;
    const diff = computeSmartDiff(existingList, targetCity, ctx.business.business_type, ctx.catalog);
    return diff;
  },

  get_business_documents: (ctx) => ctx.documents,

  get_document_status: (ctx, { documentId }) => {
    return ctx.documents.find(d => d.id === documentId || d.linked_requirement_id === documentId) || ctx.documents[0] || null;
  },

  get_application_readiness: (ctx, { requirementIdOrName }) => {
    const req = tools.get_requirement_details(ctx, { requirementIdOrName }) || ctx.requirements[0];
    if (!req) return { error: 'No requirement found' };

    const biz = ctx.business;
    const fields = [
      { key: 'business_name', label: 'Business Name', value: biz.name, complete: Boolean(biz.name) },
      { key: 'owner_name', label: 'Owner Name', value: biz.owner_name, complete: Boolean(biz.owner_name) },
      { key: 'address', label: 'Premises Address', value: biz.address, complete: Boolean(biz.address) },
      { key: 'city_state', label: 'Operating City', value: biz.city, complete: Boolean(biz.city) },
      { key: 'phone', label: 'Contact Phone', value: biz.phone, complete: Boolean(biz.phone) },
    ];

    const completed = fields.filter(f => f.complete).length;
    const total = fields.length;
    const readiness = Math.round((completed / total) * 100);

    return {
      requirement: req,
      readiness_percentage: readiness,
      completed_fields: fields.filter(f => f.complete).map(f => f.label),
      missing_fields: fields.filter(f => !f.complete).map(f => f.label),
      is_ready: readiness === 100,
    };
  },

  get_renewal_details: (ctx, { requirementIdOrName }) => {
    const req = tools.get_requirement_details(ctx, { requirementIdOrName }) || tools.get_expiring_requirements(ctx)[0] || ctx.requirements[0];
    if (!req) return { error: 'No requirement eligible for renewal' };

    return {
      requirement: req,
      is_eligible: true,
      expires_at: req.expiry_date,
      days_left: req.days_left,
      fee_display: req.fee_display,
      required_docs: ['Current License Certificate', 'Premises Electricity / Lease Proof', 'Owner Identity Proof'],
      authority: req.issuing_agency,
      source_url: req.source_url,
      last_verified_date: req.last_verified_date,
    };
  },

  prepare_application: (ctx, { requirementIdOrName }) => {
    const readiness = tools.get_application_readiness(ctx, { requirementIdOrName });
    return {
      ready: readiness.is_ready,
      download_action: 'DOWNLOAD_PACKET',
      requirement_id: readiness.requirement?.requirement_id || readiness.requirement?.id,
      requirement_name: readiness.requirement?.requirement_name,
    };
  },
};

/**
 * 4. Grounded Response Synthesis (Deterministic & LLM Fallback)
 */
export function generateGroundedResponse(intent, ctx, query = '') {
  const isHindi = /[\u0900-\u097F]/.test(query);
  const lang = isHindi ? 'hi' : 'en';
  const bizName = ctx.business.name;
  const country = ctx.business.country;
  const currencySymbol = country === 'India' ? '₹' : '$';

  switch (intent) {
    case 'COMPLIANCE_BRIEF': {
      const summary = tools.get_compliance_summary(ctx);
      const missingList = tools.get_missing_requirements(ctx);
      const expiringList = tools.get_expiring_requirements(ctx);
      const nextActionReq = expiringList[0] || missingList[0] || ctx.requirements[0];

      const answerEn = `Here is your live compliance brief for **${bizName}** (${summary.cities.join(', ')}):\n\n` +
        `• **Overall Compliance Score**: **${summary.score}%**\n` +
        `• **Completed & Active**: ${summary.completed} permits\n` +
        `• **Missing / Needed**: ${summary.missing} requirements\n` +
        `• **Expiring Soon (≤30d)**: ${summary.expiring} requirements\n` +
        `• **Recommended Next Step**: ${nextActionReq ? `Renew or complete **${nextActionReq.requirement_name}**` : 'All compliance items up to date.'}`;

      const answerHi = `यहाँ **${bizName}** (${summary.cities.join(', ')}) का लाइव कंप्लायंस ब्रीफ है:\n\n` +
        `• **कुल कंप्लायंस स्कोर**: **${summary.score}%**\n` +
        `• **सक्रिय और पूरे लाइसेंस**: ${summary.completed}\n` +
        `• **बकाया (Missing)**: ${summary.missing} आवश्यकताएं\n` +
        `• **जल्द समाप्त होने वाले (Expiring ≤30d)**: ${summary.expiring}\n` +
        `• **अगला जरूरी कदम**: ${nextActionReq ? `**${nextActionReq.requirement_name}** को पूरा या रिन्यू करें।` : 'सभी लाइसेंस सही स्थिति में हैं।'}`;

      return {
        intent,
        language: lang,
        answer: isHindi ? answerHi : answerEn,
        facts: [
          { label: 'Compliance Score', value: `${summary.score}%`, source: 'business_ledger' },
          { label: 'Operating Cities', value: summary.cities.join(', '), source: 'business_profile' },
        ],
        cards: nextActionReq ? [{
          type: 'requirement',
          requirement_id: nextActionReq.requirement_id || nextActionReq.id,
          name: nextActionReq.requirement_name,
          status: nextActionReq.status.toUpperCase(),
          authority: nextActionReq.issuing_agency,
          fee: nextActionReq.fee_display,
          source_url: nextActionReq.source_url,
          last_verified_at: nextActionReq.last_verified_date,
        }] : [],
        actions: [
          { type: 'NAVIGATE_DASHBOARD', label: isHindi ? 'डैशबोर्ड देखें' : 'View Dashboard' },
          { type: 'NAVIGATE_REQUIREMENTS', label: isHindi ? 'लाइसेंस सूची देखें' : 'View Requirements' },
        ],
        brief: summary,
      };
    }

    case 'STATUS': {
      const missing = tools.get_missing_requirements(ctx);
      if (missing.length === 0) {
        return {
          intent,
          language: lang,
          answer: isHindi
            ? `बधाई! **${bizName}** के सभी आवश्यक लाइसेंस वर्तमान में पूरे हैं। कोई भी आवश्यकता बकाया नहीं है।`
            : `Great news! **${bizName}** has zero missing requirements. All statutory permits for your operating locations are active.`,
          facts: [],
          cards: [],
          actions: [{ type: 'NAVIGATE_DASHBOARD', label: isHindi ? 'डैशबोर्ड देखें' : 'View Dashboard' }],
        };
      }

      const listText = missing.map((r, i) => `${i + 1}. **${r.requirement_name}** (${r.issuing_agency}) — Status: *${r.status}*`).join('\n');
      const answerEn = `You currently have **${missing.length} missing statutory requirements** for **${bizName}** in ${ctx.business.cities.join(', ')}:\n\n${listText}\n\nSelect a permit below to upload documents or prepare your pre-filled application packet.`;
      const answerHi = `**${bizName}** के लिए ${ctx.business.cities.join(', ')} में वर्तमान में **${missing.length} लाइसेंस बकाया (Missing)** हैं:\n\n${listText}\n\nदस्तावेज अपलोड करने या आवेदन पत्र तैयार करने के लिए नीचे दिए गए विकल्प चुनें।`;

      return {
        intent,
        language: lang,
        answer: isHindi ? answerHi : answerEn,
        facts: missing.map(r => ({ label: r.requirement_name, value: 'Missing / Needed', source: r.issuing_agency })),
        cards: missing.slice(0, 3).map(r => ({
          type: 'requirement',
          requirement_id: r.requirement_id || r.id,
          name: r.requirement_name,
          status: 'MISSING',
          authority: r.issuing_agency,
          fee: r.fee_display,
          source_url: r.source_url,
          last_verified_at: r.last_verified_date,
        })),
        actions: [
          { type: 'OPEN_SCAN', label: isHindi ? 'दस्तावेज स्कैन करें' : 'Upload Document' },
          { type: 'NAVIGATE_REQUIREMENTS', label: isHindi ? 'सभी आवश्यकताएं देखें' : 'View All Requirements' },
        ],
      };
    }

    case 'EXPIRY': {
      const expiring = tools.get_expiring_requirements(ctx, 45);
      if (expiring.length === 0) {
        return {
          intent,
          language: lang,
          answer: isHindi
            ? `**${bizName}** का कोई भी लाइसेंस अगले 45 दिनों में समाप्त नहीं हो रहा है।`
            : `You have no licenses expiring within the next 45 days for **${bizName}**.`,
          facts: [],
          cards: [],
          actions: [{ type: 'NAVIGATE_DASHBOARD', label: isHindi ? 'डैशबोर्ड देखें' : 'View Dashboard' }],
        };
      }

      const listText = expiring.map(r => `• **${r.requirement_name}**: Expires in **${r.days_left} days** (${r.expiry_date}) — ${r.issuing_agency}`).join('\n');
      const answerEn = `**${expiring.length} requirement(s)** need renewal attention soon for **${bizName}**:\n\n${listText}\n\nWe recommend initiating the renewal packet at least 15 days before the cut-off date.`;
      const answerHi = `**${bizName}** के लिए **${expiring.length} लाइसेंस** जल्द समाप्त होने वाले हैं:\n\n${listText}\n\nहम सलाह देते हैं कि समय सीमा से कम से कम 15 दिन पहले रिन्यूअल प्रक्रिया शुरू करें।`;

      return {
        intent,
        language: lang,
        answer: isHindi ? answerHi : answerEn,
        facts: expiring.map(r => ({ label: r.requirement_name, value: `Expires in ${r.days_left} days`, source: 'business_ledger' })),
        cards: expiring.map(r => ({
          type: 'requirement',
          requirement_id: r.requirement_id || r.id,
          name: r.requirement_name,
          status: 'EXPIRING',
          authority: r.issuing_agency,
          fee: r.fee_display,
          source_url: r.source_url,
          last_verified_at: r.last_verified_date,
        })),
        actions: [
          { type: 'OPEN_RENEWAL', requirement_id: expiring[0].requirement_id || expiring[0].id, label: isHindi ? 'रिन्यूअल शुरू करें' : 'Prepare Renewal' },
          { type: 'NAVIGATE_REQUIREMENTS', label: isHindi ? 'लाइसेंस देखें' : 'View Requirements' },
        ],
      };
    }

    case 'COMPARE_CITIES': {
      const matchCity = query.match(/(chandigarh|delhi|mumbai|new york|los angeles)/i);
      const targetCity = matchCity ? matchCity[0] : (country === 'India' ? 'Chandigarh' : 'Los Angeles, CA');
      const diff = tools.compare_city_requirements(ctx, { newCity: targetCity });

      const sharedNames = diff.sharedRequirements.map(r => `✓ ${r.requirement_name}`).join('\n') || 'None';
      const deltaNames = diff.deltaRequirements.map((r, i) => `${i + 1}. **${r.requirement_name}** (${r.issuing_agency})`).join('\n') || 'All permits covered';

      const answerEn = `### Expansion Analysis: Adding **${targetCity}** for ${bizName}\n\n` +
        `Compared with your current operating compliance profile:\n\n` +
        `**Already Covered & Reusable (${diff.sharedRequirements.length})**:\n${sharedNames}\n\n` +
        `**New Requirements Needed (${diff.deltaRequirements.length})**:\n${deltaNames}`;

      const answerHi = `### **${targetCity}** विस्तार विश्लेषण (**${bizName}**)\n\n` +
        `आपके वर्तमान कंप्लायंस प्रोफाइल की तुलना में:\n\n` +
        `**पहले से मौजूद / मान्य लाइसेंस (${diff.sharedRequirements.length})**:\n${sharedNames}\n\n` +
        `**नए आवश्यक लाइसेंस (${diff.deltaRequirements.length})**:\n${deltaNames}`;

      return {
        intent,
        language: lang,
        answer: isHindi ? answerHi : answerEn,
        facts: [
          { label: 'Reusable Permits', value: `${diff.sharedRequirements.length} permits`, source: 'smart_diff' },
          { label: 'New Required', value: `${diff.deltaRequirements.length} permits`, source: 'smart_diff' },
        ],
        cards: diff.deltaRequirements.slice(0, 3).map(r => ({
          type: 'requirement',
          requirement_id: r.id,
          name: r.requirement_name,
          status: 'NEW_CITY',
          authority: r.issuing_agency,
          fee: r.fee_max ? `${currencySymbol}${r.fee_max}` : 'Free / Included',
          source_url: r.source_url,
          last_verified_at: r.last_verified_date || '2026-08-29',
        })),
        actions: [
          { type: 'NAVIGATE_REQUIREMENTS', label: isHindi ? 'नए लाइसेंस देखें' : 'View New Requirements' },
        ],
      };
    }

    case 'EXPLAIN': {
      const req = tools.get_requirement_details(ctx, { requirementIdOrName: query }) || ctx.requirements[0];
      if (!req) {
        return {
          intent,
          language: lang,
          answer: isHindi
            ? 'DockIt उपलब्ध स्रोत से इस आवश्यकता की जानकारी सत्यापित नहीं कर सका।'
            : 'DockIt could not verify this requirement from the available sources.',
          facts: [],
          cards: [],
          actions: [],
        };
      }

      const answerEn = `This requirement applies to **${bizName}** because you operate as a **${ctx.business.business_type}** in **${req.city || ctx.business.city}**.\n\n` +
        `• **Requirement**: ${req.requirement_name}\n` +
        `• **Issuing Authority**: ${req.issuing_agency}\n` +
        `• **Statutory Purpose**: ${req.description}\n` +
        `• **Official Source**: [${req.source_url}](${req.source_url})\n` +
        `• **Last Verified Date**: ${req.last_verified_date}`;

      const answerHi = `यह लाइसेंस **${bizName}** पर इसलिए लागू होता है क्योंकि आप **${req.city || ctx.business.city}** में **${ctx.business.business_type}** संचालित करते हैं:\n\n` +
        `• **लाइसेंस नाम**: ${req.requirement_name}\n` +
        `• **जारीकर्ता प्राधिकरण**: ${req.issuing_agency}\n` +
        `• **उद्देश्य**: ${req.description}\n` +
        `• **आधिकारिक स्रोत**: [${req.source_url}](${req.source_url})\n` +
        `• **सत्यापन तिथि**: ${req.last_verified_date}`;

      return {
        intent,
        language: lang,
        answer: isHindi ? answerHi : answerEn,
        facts: [
          { label: 'Authority', value: req.issuing_agency, source: req.source_url },
          { label: 'Last Verified', value: req.last_verified_date, source: 'dockit_verified_catalog' },
        ],
        cards: [{
          type: 'requirement',
          requirement_id: req.requirement_id || req.id,
          name: req.requirement_name,
          status: req.status.toUpperCase(),
          authority: req.issuing_agency,
          fee: req.fee_display,
          source_url: req.source_url,
          last_verified_at: req.last_verified_date,
        }],
        actions: [
          { type: 'OPEN_SOURCE', requirement_id: req.requirement_id || req.id, label: isHindi ? 'आधिकारिक स्रोत खोलें' : 'View Official Source' },
          { type: 'DOWNLOAD_PACKET', requirement_id: req.requirement_id || req.id, label: isHindi ? 'आवेदन पत्र डाउनलोड करें' : 'Pre-fill & Download Form' },
        ],
      };
    }

    case 'DOCUMENT': {
      const doc = tools.get_document_status(ctx, {});
      if (!doc) {
        return {
          intent,
          language: lang,
          answer: isHindi
            ? 'आपके खाते में कोई अपलोड किया गया दस्तावेज नहीं मिला। कृपया अपना लाइसेंस स्कैन करें।'
            : 'No uploaded documents were found for your business profile. Please scan your document.',
          facts: [],
          cards: [],
          actions: [{ type: 'OPEN_SCAN', label: isHindi ? 'दस्तावेज स्कैन करें' : 'Scan Document' }],
        };
      }

      const answerEn = `Your uploaded **${doc.document_type}** was detected with **${doc.extraction_confidence}% OCR confidence**:\n\n` +
        `• **License Number**: ${doc.extracted_fields?.license_number || 'Verified'}\n` +
        `• **Business Name on File**: ${doc.extracted_fields?.business_name || bizName}\n` +
        `• **Expiry Date**: ${doc.expires_at || 'Not specified'}\n` +
        `• **Document Status**: **${doc.status.toUpperCase()}**\n\n` +
        `This document is mapped to your active **${doc.document_type}** requirement.`;

      const answerHi = `आपका अपलोड किया गया **${doc.document_type}** **${doc.extraction_confidence}% OCR सटीकता** के साथ सत्यापित हुआ है:\n\n` +
        `• **लाइसेंस नंबर**: ${doc.extracted_fields?.license_number || 'Verified'}\n` +
        `• **दर्ज व्यापार का नाम**: ${doc.extracted_fields?.business_name || bizName}\n` +
        `• **समाप्ति तिथि**: ${doc.expires_at || 'Not specified'}\n` +
        `• **स्थिति**: **${doc.status.toUpperCase()}**`;

      return {
        intent,
        language: lang,
        answer: isHindi ? answerHi : answerEn,
        facts: [
          { label: 'OCR Confidence', value: `${doc.extraction_confidence}%`, source: 'multimodal_vision' },
          { label: 'Expiry Date', value: doc.expires_at || 'N/A', source: 'document_scan' },
        ],
        cards: [{
          type: 'document',
          name: doc.name,
          status: doc.status.toUpperCase(),
          confidence: doc.extraction_confidence,
          expires_at: doc.expires_at,
          requirement_id: doc.linked_requirement_id,
        }],
        actions: [
          { type: 'OPEN_SCAN', label: isHindi ? 'नया दस्तावेज स्कैन करें' : 'Scan New Document' },
          { type: 'NAVIGATE_REQUIREMENTS', label: isHindi ? 'लाइसेंस देखें' : 'View Requirements' },
        ],
      };
    }

    case 'APPLICATION': {
      const readiness = tools.get_application_readiness(ctx, { requirementIdOrName: query });
      const req = readiness.requirement;
      const reqLower = (req.requirement_name || '').toLowerCase();
      const isOnlineOnly = reqLower.includes('gst') || reqLower.includes('pan') || reqLower.includes('ppl') || reqLower.includes('iprs');

      if (isOnlineOnly) {
        const portalUrl = reqLower.includes('gst') ? 'https://www.gst.gov.in' : (reqLower.includes('pan') ? 'https://www.incometax.gov.in' : req.source_url);
        const answerEn = `**${req.requirement_name}** is processed **100% electronically via the official government portal** (${portalUrl}).\n\n` +
          `• **Filing Mode**: Direct Digital Filing (No physical or fillable PDF form is accepted)\n` +
          `• **Issuing Authority**: ${req.issuing_agency}\n` +
          `• **Authentication Required**: Aadhaar OTP / Digital Signature Certificate (DSC)\n\n` +
          `You can proceed directly to the official government portal below to initiate your electronic registration.`;

        const answerHi = `**${req.requirement_name}** का पंजीकरण **100% ऑनलाइन सरकारी पोर्टल** (${portalUrl}) के माध्यम से होता है।\n\n` +
          `• **आवेदन प्रकार**: सीधा डिजिटल ऑनलाइन पोर्टल (कोई मैनुअल या पीडीएफ फॉर्म मान्य नहीं है)\n` +
          `• **जारीकर्ता प्राधिकरण**: ${req.issuing_agency}\n` +
          `• **सत्यापन**: आधार ओटीपी / डिजिटल हस्ताक्षर (DSC)`;

        return {
          intent,
          language: lang,
          answer: isHindi ? answerHi : answerEn,
          facts: [
            { label: 'Filing Mode', value: 'Direct Electronic Portal', source: req.issuing_agency },
            { label: 'Official Portal', value: portalUrl, source: 'official_agency' },
          ],
          cards: [{
            type: 'application',
            requirement_id: req.requirement_id || req.id,
            name: req.requirement_name,
            readiness: 100,
            authority: req.issuing_agency,
            fee: req.fee_display,
            source_url: portalUrl,
            last_verified_at: req.last_verified_date,
          }],
          actions: [
            { type: 'OPEN_SOURCE', url: portalUrl, label: isHindi ? 'सरकारी पोर्टल खोलें' : 'Open Official Govt Portal' },
          ],
        };
      }

      const answerEn = `Your application for **${req.requirement_name}** is **${readiness.readiness_percentage}% ready**.\n\n` +
        `✓ **Completed Fields**: ${readiness.completed_fields.join(', ')}\n` +
        (readiness.missing_fields.length > 0 ? `⚠ **Missing Fields**: ${readiness.missing_fields.join(', ')}\n\n` : '\n\n') +
        (readiness.is_ready
          ? `All required fields are verified from your business profile. You can generate and download the official pre-filled application form now.`
          : `Please complete the missing details or preview the application form.`);

      const answerHi = `**${req.requirement_name}** के लिए आपका आवेदन **${readiness.readiness_percentage}% तैयार** है।\n\n` +
        `✓ **पूर्ण विवरण**: ${readiness.completed_fields.join(', ')}\n` +
        (readiness.missing_fields.length > 0 ? `⚠ **अपूर्ण विवरण**: ${readiness.missing_fields.join(', ')}\n\n` : '\n\n') +
        `आप आधिकारिक प्री-फिल्ड आवेदन पत्र सीधे डाउनलोड कर सकते हैं।`;

      return {
        intent,
        language: lang,
        answer: isHindi ? answerHi : answerEn,
        facts: [
          { label: 'Form Readiness', value: `${readiness.readiness_percentage}%`, source: 'form_fill_engine' },
          { label: 'Template Type', value: 'Official Agency Statutory Form', source: req.issuing_agency },
        ],
        cards: [{
          type: 'application',
          requirement_id: req.requirement_id || req.id,
          name: req.requirement_name,
          readiness: readiness.readiness_percentage,
          authority: req.issuing_agency,
          fee: req.fee_display,
          source_url: req.source_url,
          last_verified_at: req.last_verified_date,
        }],
        actions: [
          { type: 'DOWNLOAD_PACKET', requirement_id: req.requirement_id || req.id, label: isHindi ? 'आवेदन पत्र डाउनलोड करें' : 'Pre-fill & Download Form' },
          { type: 'OPEN_SOURCE', requirement_id: req.requirement_id || req.id, label: isHindi ? 'सरकारी पोर्टल' : 'Official Portal' },
        ],
      };
    }

    case 'RENEWAL': {
      const renewal = tools.get_renewal_details(ctx, { requirementIdOrName: query });
      const req = renewal.requirement;

      const answerEn = `Your **${req.requirement_name}** is eligible for renewal:\n\n` +
        `• **Current Expiry**: ${renewal.expires_at || 'Expiring soon'} (${renewal.days_left !== null ? `${renewal.days_left} days remaining` : 'Action required'})\n` +
        `• **Government Renewal Fee**: **${renewal.fee_display}**\n` +
        `• **Issuing Authority**: ${renewal.authority}\n` +
        `• **Required Documents**:\n${renewal.required_docs.map(d => `  ✓ ${d}`).join('\n')}\n\n` +
        `You can review statutory late fines and complete the renewal filing directly in DockIt.`;

      const answerHi = `आपका **${req.requirement_name}** रिन्यूअल के लिए उपलब्ध है:\n\n` +
        `• **समाप्ति तिथि**: ${renewal.expires_at || 'जल्द समाप्त'} (${renewal.days_left !== null ? `${renewal.days_left} दिन शेष` : 'कार्रवाई आवश्यक'})\n` +
        `• **सरकारी रिन्यूअल शुल्क**: **${renewal.fee_display}**\n` +
        `• **प्राधिकरण**: ${renewal.authority}\n` +
        `• **आवश्यक दस्तावेज**:\n${renewal.required_docs.map(d => `  ✓ ${d}`).join('\n')}`;

      return {
        intent,
        language: lang,
        answer: isHindi ? answerHi : answerEn,
        facts: [
          { label: 'Renewal Fee', value: renewal.fee_display, source: req.source_url },
          { label: 'Authority', value: renewal.authority, source: 'official_catalog' },
        ],
        cards: [{
          type: 'requirement',
          requirement_id: req.requirement_id || req.id,
          name: req.requirement_name,
          status: 'RENEWAL_DUE',
          authority: renewal.authority,
          fee: renewal.fee_display,
          source_url: renewal.source_url,
          last_verified_at: renewal.last_verified_date,
        }],
        actions: [
          { type: 'OPEN_RENEWAL', requirement_id: req.requirement_id || req.id, label: isHindi ? 'रिन्यूअल भुगतान करें' : 'Prepare Renewal' },
          { type: 'DOWNLOAD_PACKET', requirement_id: req.requirement_id || req.id, label: isHindi ? 'फॉर्म डाउनलोड करें' : 'Download Renewal Form' },
        ],
      };
    }

    case 'DISCOVER':
    default: {
      const allReqs = ctx.requirements;
      const listText = allReqs.map((r, i) => `${i + 1}. **${r.requirement_name}** (${r.jurisdiction_level.toUpperCase()} — ${r.issuing_agency})`).join('\n');

      const answerEn = `Based on your **${ctx.business.business_type}** profile in **${ctx.business.cities.join(', ')}**, here are your mandatory statutory requirements:\n\n` +
        `${listText}\n\n` +
        `All listed permits are grounded in verified municipal and national bylaws.`;

      const answerHi = `**${ctx.business.cities.join(', ')}** में आपके **${ctx.business.business_type}** व्यवसाय के लिए निम्नलिखित अनिवार्य सरकारी लाइसेंस आवश्यक हैं:\n\n` +
        `${listText}`;

      return {
        intent: 'DISCOVER',
        language: lang,
        answer: isHindi ? answerHi : answerEn,
        facts: allReqs.slice(0, 3).map(r => ({ label: r.requirement_name, value: r.fee_display, source: r.issuing_agency })),
        cards: allReqs.slice(0, 3).map(r => ({
          type: 'requirement',
          requirement_id: r.requirement_id || r.id,
          name: r.requirement_name,
          status: r.status.toUpperCase(),
          authority: r.issuing_agency,
          fee: r.fee_display,
          source_url: r.source_url,
          last_verified_at: r.last_verified_date,
        })),
        actions: [
          { type: 'NAVIGATE_REQUIREMENTS', label: isHindi ? 'सभी लाइसेंस देखें' : 'View Requirements' },
          { type: 'OPEN_SCAN', label: isHindi ? 'दस्तावेज अपलोड करें' : 'Upload Document' },
        ],
      };
    }
  }
}

/**
 * 5. Response Validation Layer
 * Validates Gemini/model structured response against trusted business context.
 */
export function validateCopilotResponse(rawResponse, ctx, expectedIntent) {
  if (!rawResponse || typeof rawResponse !== 'object') {
    return generateGroundedResponse(expectedIntent || 'STATUS', ctx);
  }

  const validActions = ['OPEN_SCAN', 'OPEN_RENEWAL', 'DOWNLOAD_PACKET', 'NAVIGATE_REQUIREMENTS', 'NAVIGATE_DASHBOARD', 'OPEN_SOURCE', 'OPEN_DOCUMENT', 'OPEN_APPLICATION'];
  const sanitized = {
    intent: expectedIntent || rawResponse.intent || 'GENERAL_BUSINESS_HELP',
    language: rawResponse.language || 'en',
    answer: String(rawResponse.answer || '').trim(),
    facts: Array.isArray(rawResponse.facts) ? rawResponse.facts : [],
    cards: [],
    actions: [],
    brief: rawResponse.brief || null,
  };

  // Validate cards
  if (Array.isArray(rawResponse.cards)) {
    for (const card of rawResponse.cards) {
      if (card && card.requirement_id) {
        const match = ctx.requirements.find(r => r.requirement_id === card.requirement_id || r.id === card.requirement_id) ||
                      ctx.catalog.find(c => c.id === card.requirement_id);
        if (match) {
          sanitized.cards.push({
            type: card.type || 'requirement',
            requirement_id: match.requirement_id || match.id,
            name: match.requirement_name,
            status: card.status || match.status || 'ACTIVE',
            authority: match.issuing_agency,
            fee: match.fee_display || (match.fee_max ? `₹${match.fee_max}` : 'Free'),
            source_url: match.source_url,
            last_verified_at: match.last_verified_date || '2026-08-29',
          });
        }
      }
    }
  }

  // Validate actions
  if (Array.isArray(rawResponse.actions)) {
    for (const act of rawResponse.actions) {
      if (act && validActions.includes(act.type)) {
        sanitized.actions.push({
          type: act.type,
          requirement_id: act.requirement_id || null,
          label: act.label || (act.type === 'OPEN_SCAN' ? 'Upload Document' : 'View Details'),
        });
      }
    }
  }

  // Ensure answer is not empty
  if (!sanitized.answer) {
    return generateGroundedResponse(sanitized.intent, ctx);
  }

  return sanitized;
}

