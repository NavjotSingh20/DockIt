import { createClient } from '@supabase/supabase-js';
import { isRequirementApplicable, synthesizeCityRequirements } from '../utils/jurisdictionEngine';
import { enrichRequirements } from './requirementsFetcher';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Guard: Supabase v2 calls new URL() internally — crashes entire module if URL is invalid
const safeUrl = rawUrl.startsWith('https://') ? rawUrl : 'https://placeholder.supabase.co';
const safeKey = rawKey.length > 20 ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.placeholder';

export const supabase = createClient(safeUrl, safeKey);
export const isSupabaseConfigured = rawUrl.startsWith('https://') && rawKey.length > 20;

// ── Auth ─────────────────────────────────────────────────────────────
export async function signInWithOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: null, // force OTP code, not magic link
    },
  });
  if (error) throw error;
}

export async function verifyOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

// ── Helpers ──────────────────────────────────────────────────────────
function getLocalToken() {
  try {
    const projectId = safeUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
    if (!projectId) return safeKey;
    const sessionStr = localStorage.getItem(`sb-${projectId}-auth-token`);
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed?.access_token) return parsed.access_token;
    }
  } catch (e) {}
  return safeKey;
}

function mapBusiness(biz) {
  if (!biz) return null;
  const firstCityState = biz.cities?.[0] || 'New York, NY';
  const parts = firstCityState.split(',').map(s => s.trim());
  return {
    ...biz,
    city: parts[0] || '',
    state: parts[1] || '',
    country: localStorage.getItem('country') || 'USA',
    email_reminders_enabled: biz.email_reminders_enabled ?? true,
    reminder_days: biz.reminder_days ?? [60, 30, 7],
  };
}

// ── Businesses ───────────────────────────────────────────────────────
export async function createBusiness(data) {
  const payload = { ...data };
  if (!payload.cities && payload.city) {
    payload.cities = [`${payload.city}${payload.state ? `, ${payload.state}` : ''}`];
  }

  try {
    const { data: biz, error } = await supabase.from('businesses').insert([payload]).select().single();
    if (!error) return mapBusiness(biz);

    // If PostgREST schema cache complains about city/state/country, fallback to cities array only
    if (error.message && (error.message.includes('city') || error.message.includes('column') || error.message.includes('schema cache'))) {
      const cleanPayload = { ...payload };
      delete cleanPayload.city;
      delete cleanPayload.state;
      delete cleanPayload.country;
      const { data: fallbackBiz, error: fallbackErr } = await supabase.from('businesses').insert([cleanPayload]).select().single();
      if (fallbackErr) throw fallbackErr;
      return mapBusiness(fallbackBiz);
    }
    throw error;
  } catch (err) {
    if (err.message && (err.message.includes('city') || err.message.includes('column') || err.message.includes('schema cache'))) {
      const cleanPayload = { ...payload };
      delete cleanPayload.city;
      delete cleanPayload.state;
      delete cleanPayload.country;
      const { data: fallbackBiz, error: fallbackErr } = await supabase.from('businesses').insert([cleanPayload]).select().single();
      if (fallbackErr) throw fallbackErr;
      return mapBusiness(fallbackBiz);
    }
    throw err;
  }
}

export async function getBusiness(userId) {
  const token = getLocalToken();
  const res = await fetch(`${safeUrl}/rest/v1/businesses?owner_id=eq.${userId}&order=created_at.desc&limit=1`, {
    headers: {
      'apikey': safeKey,
      'Authorization': `Bearer ${token}`,
    }
  });
  if (!res.ok) throw new Error('Failed to fetch business');
  const data = await res.json();
  return data.length > 0 ? mapBusiness(data[0]) : null;
}

export async function updateBusiness(id, updates) {
  const payload = { ...updates };
  try {
    const { data, error } = await supabase.from('businesses').update(payload).eq('id', id).select().single();
    if (!error) return mapBusiness(data);

    if (error.message && (error.message.includes('city') || error.message.includes('column') || error.message.includes('schema cache'))) {
      const cleanPayload = { ...payload };
      delete cleanPayload.city;
      delete cleanPayload.state;
      delete cleanPayload.country;
      const { data: fallbackData, error: fallbackErr } = await supabase.from('businesses').update(cleanPayload).eq('id', id).select().single();
      if (fallbackErr) throw fallbackErr;
      return mapBusiness(fallbackData);
    }
    throw error;
  } catch (err) {
    if (err.message && (err.message.includes('city') || err.message.includes('column') || err.message.includes('schema cache'))) {
      const cleanPayload = { ...payload };
      delete cleanPayload.city;
      delete cleanPayload.state;
      delete cleanPayload.country;
      const { data: fallbackData, error: fallbackErr } = await supabase.from('businesses').update(cleanPayload).eq('id', id).select().single();
      if (fallbackErr) throw fallbackErr;
      return mapBusiness(fallbackData);
    }
    throw err;
  }
}

export async function getRequirements(businessType, cities = []) {
  let query = supabase.from('requirements').select('*');
  if (businessType && businessType !== 'all') {
    query = query.or(`business_type.ilike.${businessType},business_type.eq.all`);
  }

  const { data, error } = await query.order('requirement_name');
  if (error) throw error;

  const catalog = data || [];
  let finalRequirements;

  if (!cities || cities.length === 0) {
    finalRequirements = catalog;
  } else {
    const matched = catalog.filter(r => isRequirementApplicable(r, cities, businessType));

    // Deduplicate by requirement_name and city/jurisdiction
    const seenKeys = new Set();
    const deduplicated = [];
    for (const r of matched) {
      const key = `${r.requirement_name?.toLowerCase().trim()}_${(r.city || '').toLowerCase().trim()}`;
      if (!seenKeys.has(key)) { seenKeys.add(key); deduplicated.push(r); }
    }

    // If specific cities have no matched catalog rows in DB, synthesize statutory defaults
    if (deduplicated.length === 0 && cities.length > 0) {
      finalRequirements = cities.flatMap(c => synthesizeCityRequirements(c, businessType));
    } else {
      finalRequirements = deduplicated;
    }
  }

  // ── Live-Scrape Enrichment (with transparent Supabase fallback) ────────
  // enrichRequirements calls /api/requirements/batch-fetch server-side.
  // On any failure (timeout, CORS, non-2xx, parse error) it silently
  // returns the stored Supabase data unchanged — the UI is never broken.
  try {
    const enriched = await enrichRequirements(finalRequirements);
    return enriched;
  } catch (enrichErr) {
    // Absolute last-resort: enrichRequirements itself should never throw,
    // but if it does, return the raw Supabase data as-is.
    console.warn('[getRequirements] enrichRequirements threw unexpectedly:', enrichErr);
    return finalRequirements;
  }
}


// ── Business Requirements (per-business checklist) ───────────────────
export async function getBusinessRequirements(businessId) {
  const token = getLocalToken();
  // Use PostgREST embedded resource syntax to join requirements
  const res = await fetch(
    `${safeUrl}/rest/v1/business_requirements?business_id=eq.${businessId}&select=*,requirement:requirements(*)&order=expiry_date.asc`,
    {
      headers: {
        'apikey': safeKey,
        'Authorization': `Bearer ${token}`,
      }
    }
  );
  if (!res.ok) throw new Error('Failed to fetch business requirements');
  return await res.json();
}

export async function createBusinessRequirement(payload) {
  let requirement_id = payload.requirement_id;

  if (!requirement_id) {
    try {
      const typeName = payload.license_type || payload.requirement_name || 'General Business License';
      const { data: existing } = await supabase
        .from('requirements')
        .select('id')
        .ilike('requirement_name', `%${typeName}%`)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        requirement_id = existing.id;
      } else {
        const { data: fallbackReq } = await supabase
          .from('requirements')
          .select('id')
          .limit(1)
          .maybeSingle();
        requirement_id = fallbackReq?.id;
      }
    } catch (e) {
      console.warn('Could not auto-link requirement_id:', e);
    }
  }

  // STRICT WHITELIST: Only valid columns in business_requirements table
  const dbRecord = {
    business_id: payload.business_id,
    ...(requirement_id ? { requirement_id } : {}),
    status: payload.status || 'satisfied',
    license_number: payload.license_number || null,
    issuing_authority: payload.issuing_authority || null,
    document_url: payload.document_url || null,
    expiry_date: payload.expiry_date || null,
    extracted_via_ocr: payload.extracted_via_ocr ?? true,
  };

  // Check if a business_requirement entry already exists for this (business_id, requirement_id)
  let existingBR = null;
  if (dbRecord.business_id && dbRecord.requirement_id) {
    try {
      const { data: found } = await supabase
        .from('business_requirements')
        .select('id')
        .eq('business_id', dbRecord.business_id)
        .eq('requirement_id', dbRecord.requirement_id)
        .maybeSingle();
      existingBR = found;
    } catch (e) {
      console.warn('Check existing BR error:', e);
    }
  }

  if (existingBR?.id) {
    return await updateBusinessRequirement(existingBR.id, dbRecord);
  }

  const { data: br, error } = await supabase
    .from('business_requirements')
    .insert([dbRecord])
    .select('*, requirement:requirements(*)')
    .single();

  if (error) {
    // Fallback if unique constraint error 23505 occurs
    if (error.code === '23505' && dbRecord.business_id && dbRecord.requirement_id) {
      const { data: found } = await supabase
        .from('business_requirements')
        .select('id')
        .eq('business_id', dbRecord.business_id)
        .eq('requirement_id', dbRecord.requirement_id)
        .maybeSingle();
      if (found?.id) {
        return await updateBusinessRequirement(found.id, dbRecord);
      }
    }
    throw error;
  }
  return br;
}

export async function updateBusinessRequirement(id, updates) {
  const allowedKeys = ['status', 'license_number', 'issuing_authority', 'document_url', 'expiry_date', 'extracted_via_ocr'];
  const cleanUpdates = {};
  for (const k of allowedKeys) {
    if (k in updates) cleanUpdates[k] = updates[k];
  }

  const { data, error } = await supabase
    .from('business_requirements')
    .update(cleanUpdates)
    .eq('id', id)
    .select('*, requirement:requirements(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBusinessRequirement(id) {
  const { error } = await supabase.from('business_requirements').delete().eq('id', id);
  if (error) throw error;
}

// ── OCR Extractions (audit trail) ────────────────────────────────────
export async function createOcrExtraction(data) {
  const { data: extraction, error } = await supabase
    .from('ocr_extractions')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return extraction;
}

export async function getOcrExtractions(businessRequirementId) {
  const { data, error } = await supabase
    .from('ocr_extractions')
    .select('*')
    .eq('business_requirement_id', businessRequirementId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Legacy aliases (backward compat during UI migration) ─────────────
// Components that still call getLicenses/createLicense/etc. will
// continue to work via these aliases.
export const getLicenses = getBusinessRequirements;
export const createLicense = createBusinessRequirement;
export const updateLicense = updateBusinessRequirement;
export const deleteLicense = deleteBusinessRequirement;

// ── Storage ──────────────────────────────────────────────────────────
export async function uploadDocument(file, path) {
  const { data, error } = await supabase.storage.from('license-docs').upload(path, file, { upsert: true });
  if (error) throw error;
  return data;
}

export async function getDocumentUrl(path) {
  const { data } = supabase.storage.from('license-docs').getPublicUrl(path);
  return data.publicUrl;
}
