/**
 * supabase.js
 * Supabase client + all auth, business, license, storage helpers.
 * Used directly by the frontend — no server proxy needed.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing env vars: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ─────────────────────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP to the given email address.
 * Uses Supabase Email OTP (no Twilio required).
 */
export async function signInWithOtp(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  return { data, error }
}

/**
 * Verify the 6-digit OTP the user received by email.
 */
export async function verifyOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  return { data, error }
}

/**
 * Sign the current user out.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Get the currently authenticated user (or null).
 */
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * Subscribe to auth state changes.
 * Returns the unsubscribe function.
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}

// ─────────────────────────────────────────────────────────
// BUSINESS HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Create a new business profile for the authenticated user.
 */
export async function createBusiness(data) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not authenticated') }

  const { data: business, error } = await supabase
    .from('businesses')
    .insert({ ...data, owner_id: user.id })
    .select()
    .single()

  return { data: business, error }
}

/**
 * Fetch the business profile for the current user.
 */
export async function getBusiness() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not authenticated') }

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  return { data, error }
}

/**
 * Update fields on the current user's business.
 */
export async function updateBusiness(id, updates) {
  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

// ─────────────────────────────────────────────────────────
// LICENSE HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Fetch all licenses for a business, sorted by expiry (soonest first).
 */
export async function getLicenses(businessId) {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('business_id', businessId)
    .order('expiry_date', { ascending: true })

  return { data: data ?? [], error }
}

/**
 * Create a new license record.
 */
export async function createLicense(licenseData) {
  const { data, error } = await supabase
    .from('licenses')
    .insert(licenseData)
    .select()
    .single()

  return { data, error }
}

/**
 * Update fields on an existing license.
 */
export async function updateLicense(id, updates) {
  const { data, error } = await supabase
    .from('licenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

/**
 * Delete a license by ID.
 */
export async function deleteLicense(id) {
  const { error } = await supabase.from('licenses').delete().eq('id', id)
  return { error }
}

// ─────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Upload a document file to Supabase Storage.
 * Files are stored under: {userId}/{licenseId}/{filename}
 */
export async function uploadDocument(file, userId, licenseId) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${licenseId}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('license-documents')
    .upload(path, file, { upsert: true, contentType: file.type })

  return { data, path, error }
}

/**
 * Get a signed URL (1 hour) for a stored document.
 */
export async function getDocumentUrl(path) {
  const { data, error } = await supabase.storage
    .from('license-documents')
    .createSignedUrl(path, 3600)

  return { url: data?.signedUrl ?? null, error }
}

// ─────────────────────────────────────────────────────────
// REMINDER HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Log a sent reminder to prevent duplicate sends.
 */
export async function logReminder(licenseId, stage, channel = 'email') {
  const { data, error } = await supabase
    .from('reminders')
    .insert({ license_id: licenseId, reminder_stage: stage, channel, status: 'sent' })
    .select()
    .single()

  return { data, error }
}

/**
 * Get all reminder stages already sent for a license.
 * Returns an array of stage numbers: e.g. [60, 30]
 */
export async function getRemindersSent(licenseId) {
  const { data, error } = await supabase
    .from('reminders')
    .select('reminder_stage')
    .eq('license_id', licenseId)
    .eq('status', 'sent')

  return { stages: data?.map((r) => r.reminder_stage) ?? [], error }
}

// ─────────────────────────────────────────────────────────
// RENEWAL HELPERS
// ─────────────────────────────────────────────────────────

/**
 * Create a renewal record when user starts a renewal.
 */
export async function createRenewal(licenseId, preFillData, checklist) {
  const { data, error } = await supabase
    .from('renewals')
    .insert({
      license_id: licenseId,
      pre_filled_data: preFillData,
      document_checklist: checklist,
      status: 'in_progress',
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Update a renewal record (e.g. mark completed).
 */
export async function updateRenewal(id, updates) {
  const { data, error } = await supabase
    .from('renewals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}
