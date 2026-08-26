import { createClient } from '@supabase/supabase-js';
import { isRequirementApplicable, synthesizeCityRequirements } from '../utils/jurisdictionEngine';

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
    country: localStorage.getItem('country') || 'USA'
  };
}

// ── Businesses ───────────────────────────────────────────────────────
export async function createBusiness(data) {
  const { data: biz, error } = await supabase.from('businesses').insert([data]).select().single();
  if (error) throw error;
  return mapBusiness(biz);
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
  const { data, error } = await supabase.from('businesses').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return mapBusiness(data);
}

export async function getRequirements(businessType, cities = []) {
  let query = supabase.from('requirements').select('*');
  if (businessType && businessType !== 'all') {
    query = query.or(`business_type.ilike.${businessType},business_type.eq.all`);
  }

  const { data, error } = await query.order('requirement_name');
  if (error) throw error;

  const catalog = data || [];
  if (!cities || cities.length === 0) {
    return catalog;
  }

  const matched = catalog.filter(r => isRequirementApplicable(r, cities, businessType));

  // Deduplicate by requirement_name and city/jurisdiction to prevent duplicate catalog entries
  const seenKeys = new Set();
  const deduplicated = [];
  for (const r of matched) {
    const key = `${r.requirement_name?.toLowerCase().trim()}_${(r.city || '').toLowerCase().trim()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicated.push(r);
    }
  }

  // If specific cities have no matched catalog rows in DB, synthesize statutory defaults
  if (deduplicated.length === 0 && cities.length > 0) {
    const allSynthesized = cities.flatMap(c => synthesizeCityRequirements(c, businessType));
    return allSynthesized;
  }

  return deduplicated;
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

export async function createBusinessRequirement(data) {
  const { data: br, error } = await supabase
    .from('business_requirements')
    .insert([data])
    .select('*, requirement:requirements(*)')
    .single();
  if (error) throw error;
  return br;
}

export async function updateBusinessRequirement(id, updates) {
  const { data, error } = await supabase
    .from('business_requirements')
    .update(updates)
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
