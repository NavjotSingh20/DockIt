/**
 * emailService.js
 * Client-side wrapper for the /api/send-reminder Vercel route.
 * The actual Resend API call happens server-side.
 */

/**
 * Trigger a reminder email via our backend API route.
 *
 * @param {object} params
 * @param {string} params.to           - recipient email
 * @param {string} params.ownerName    - business owner name
 * @param {string} params.licenseName  - e.g. "FSSAI Food License"
 * @param {number} params.daysLeft     - days remaining (negative = overdue)
 * @param {string} params.expiryDate   - formatted date string
 * @param {number} params.penalty      - current penalty in INR
 * @param {string} params.renewalUrl   - official renewal portal URL
 * @returns {Promise<{ success: boolean, messageId: string|null, error: string|null }>}
 */
export async function sendReminderEmail({ to, ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl }) {
  try {
    const res = await fetch('/api/send-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, messageId: null, error: json.error || `HTTP ${res.status}` }
    }
    return { success: true, messageId: json.messageId ?? null, error: null }
  } catch (err) {
    return { success: false, messageId: null, error: err.message }
  }
}

/**
 * Check + send reminders for all licenses on dashboard load.
 * Only sends if the stage hasn't been sent yet (checks via Supabase).
 *
 * @param {Array} licenses  - array of license objects
 * @param {object} business - business profile
 * @param {function} getRemindersSent - from supabase service
 * @param {function} logReminder      - from supabase service
 */
export async function checkAndSendReminders(licenses, business, getRemindersSent, logReminder) {
  if (!licenses?.length || !business?.email) return

  const REMINDER_STAGES = [60, 30, 7, 1]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const lic of licenses) {
    const expiry = new Date(lic.expiry_date)
    const daysLeft = Math.ceil((expiry - today) / 86400000)

    // Only send for non-expired, upcoming expirations
    if (daysLeft < 0 || daysLeft > 60) continue

    const { stages: sentStages } = await getRemindersSent(lic.id)

    for (const stage of REMINDER_STAGES) {
      if (daysLeft <= stage && !sentStages.includes(stage)) {
        await sendReminderEmail({
          to: business.email,
          ownerName: business.owner_name,
          licenseName: lic.license_type,
          daysLeft,
          expiryDate: lic.expiry_date,
          penalty: 0,
          renewalUrl: lic.renewal_portal_url || 'https://www.karnataka.gov.in',
        })
        await logReminder(lic.id, stage, 'email')
        break // only send the highest-priority stage
      }
    }
  }
}
