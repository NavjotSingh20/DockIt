/**
 * /api/cron-check.js
 * Vercel Cron Job — runs daily at 9 AM IST (3:30 AM UTC).
 * Checks ALL users' licenses and sends reminder emails at 60/30/7/1 day milestones.
 * Protected by CRON_SECRET header to prevent unauthorized calls.
 *
 * Schedule defined in vercel.json: "0 3 * * *"
 */
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS to read all users' data
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // add this to Vercel env vars
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const REMINDER_STAGES = [60, 30, 7, 1] // days before expiry

async function sendEmail({ to, ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl }) {
  const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/send-reminder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl }),
  })
  return response.ok
}

export default async function handler(req, res) {
  // Security: only allow calls with correct secret
  const secret = req.headers['x-cron-secret'] || req.query.secret
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const results = { sent: 0, skipped: 0, errors: 0, details: [] }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Fetch all licenses expiring within 65 days (includes overdue)
    const { data: licenses, error: licErr } = await supabaseAdmin
      .from('licenses')
      .select(`
        id,
        license_type,
        expiry_date,
        status,
        renewal_portal_url,
        businesses (
          owner_name,
          email,
          business_name
        )
      `)
      .lte('expiry_date', new Date(today.getTime() + 65 * 86400000).toISOString().split('T')[0])
      .neq('status', 'unknown')

    if (licErr) throw new Error(`Supabase query failed: ${licErr.message}`)
    if (!licenses?.length) {
      return res.status(200).json({ ...results, message: 'No licenses due for reminders' })
    }

    // 2. Process each license
    for (const lic of licenses) {
      const biz = lic.businesses
      if (!biz?.email) { results.skipped++; continue }

      const expiry = new Date(lic.expiry_date)
      expiry.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((expiry - today) / 86400000)

      // Only process if within reminder window
      const shouldRemind = REMINDER_STAGES.some((stage) => daysLeft <= stage && daysLeft >= 0)
      const isOverdue = daysLeft < 0 && daysLeft >= -3 // only send 1x at expiry
      if (!shouldRemind && !isOverdue) { results.skipped++; continue }

      // 3. Check which stages already sent
      const { data: sentRows } = await supabaseAdmin
        .from('reminders')
        .select('reminder_stage')
        .eq('license_id', lic.id)
        .eq('status', 'sent')

      const sentStages = sentRows?.map((r) => r.reminder_stage) ?? []

      // Find the highest-priority unsent stage
      let stageToSend = null
      for (const stage of REMINDER_STAGES) {
        if (daysLeft <= stage && !sentStages.includes(stage)) {
          stageToSend = stage
          break
        }
      }

      if (!stageToSend) { results.skipped++; continue }

      // 4. Send the email
      try {
        const sent = await sendEmail({
          to: biz.email,
          ownerName: biz.owner_name,
          licenseName: lic.license_type,
          daysLeft,
          expiryDate: lic.expiry_date,
          penalty: 0, // simplified — full calc available via penaltyRules
          renewalUrl: lic.renewal_portal_url || 'https://www.karnataka.gov.in',
        })

        if (sent) {
          // 5. Log the sent reminder
          await supabaseAdmin.from('reminders').insert({
            license_id: lic.id,
            reminder_stage: stageToSend,
            channel: 'email',
            status: 'sent',
          })
          results.sent++
          results.details.push({ license: lic.license_type, to: biz.email, stage: stageToSend, daysLeft })
        } else {
          results.errors++
        }
      } catch (emailErr) {
        console.error(`[cron-check] Email failed for license ${lic.id}:`, emailErr)
        results.errors++
      }
    }

    console.log('[cron-check] Completed:', results)
    return res.status(200).json(results)
  } catch (err) {
    console.error('[cron-check] Fatal error:', err)
    return res.status(500).json({ error: err.message, ...results })
  }
}
