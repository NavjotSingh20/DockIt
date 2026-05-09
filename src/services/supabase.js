import { createClient } from '@supabase/supabase-js';

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

// ── Businesses ───────────────────────────────────────────────────────
export async function createBusiness(data) {
  const { data: biz, error } = await supabase.from('businesses').insert([data]).select().single();
  if (error) throw error;
  return biz;
}

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
  return data.length > 0 ? data[0] : null;
}

export async function updateBusiness(id, updates) {
  const { data, error } = await supabase.from('businesses').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── Licenses ─────────────────────────────────────────────────────────
export async function getLicenses(businessId) {
  const token = getLocalToken();
  const res = await fetch(`${safeUrl}/rest/v1/licenses?business_id=eq.${businessId}&order=expiry_date.asc`, {
    headers: {
      'apikey': safeKey,
      'Authorization': `Bearer ${token}`,
    }
  });
  if (!res.ok) throw new Error('Failed to fetch licenses');
  return await res.json();
}

export async function createLicense(data) {
  const { data: lic, error } = await supabase.from('licenses').insert([data]).select().single();
  if (error) throw error;
  return lic;
}

export async function updateLicense(id, updates) {
  const { data, error } = await supabase.from('licenses').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteLicense(id) {
  const { error } = await supabase.from('licenses').delete().eq('id', id);
  if (error) throw error;
}

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
