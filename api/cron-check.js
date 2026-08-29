/**
 * /api/cron-check.js
 * Vercel Cron Job — runs daily at 9 AM IST (3:30 AM UTC).
 * Checks ALL users' checklists and sends reminder emails
 * at each user's chosen day-milestones (stored in businesses.reminder_days).
 * Skips users who have disabled email reminders.
 * Protected by CRON_SECRET header to prevent unauthorized calls.
 *
 * Schedule defined in vercel.json: "0 3 * * *"
 */
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS to read all users' data
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '', // add this to Vercel env vars
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const DEFAULT_REMINDER_DAYS = [60, 30, 7] // fallback if user has no preference

async function sendEmail({ to, ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl, country }) {
  const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/send-reminder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl, country }),
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

    // 1. Fetch all business requirements expiring within 65 days
    //    Also fetch the parent business's reminder preferences
    const { data: businessRequirements, error: licErr } = await supabaseAdmin
      .from('business_requirements')
      .select(`
        id,
        status,
        expiry_date,
        license_number,
        issuing_authority,
        requirement:requirements(
          requirement_name,
          legacy_type_id,
          source_url
        ),
        businesses (
          owner_name,
          email,
          business_name,
          email_reminders_enabled,
          reminder_days
        )
      `)
      .lte('expiry_date', new Date(today.getTime() + 65 * 86400000).toISOString().split('T')[0])
      .neq('status', 'waived')

    if (licErr) throw new Error(`Supabase query failed: ${licErr.message}`)
    if (!businessRequirements?.length) {
      return res.status(200).json({ ...results, message: 'No requirements due for reminders' })
    }

    // 2. Process each requirement
    for (const br of businessRequirements) {
      const biz = br.businesses
      if (!biz?.email) { results.skipped++; continue }
      if (!br.expiry_date) { results.skipped++; continue }

      // ── Respect user preferences ──────────────────────────
      // Skip if the user has explicitly disabled email reminders
      if (biz.email_reminders_enabled === false) {
        results.skipped++
        continue
      }

      // Use the user's chosen reminder day intervals, or fall back to defaults
      const userReminderDays = (Array.isArray(biz.reminder_days) && biz.reminder_days.length > 0)
        ? biz.reminder_days.sort((a, b) => b - a) // descending: 60, 30, 7, 1
        : DEFAULT_REMINDER_DAYS

      const expiry = new Date(br.expiry_date)
      expiry.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((expiry - today) / 86400000)

      // Only process if within the user's reminder window
      const maxStage = Math.max(...userReminderDays)
      const shouldRemind = userReminderDays.some((stage) => daysLeft <= stage && daysLeft >= 0)
      const isOverdue = daysLeft < 0 && daysLeft >= -3 // send at expiry for 3 days
      if (!shouldRemind && !isOverdue) { results.skipped++; continue }

      // 3. Check which stages already sent
      const { data: sentRows } = await supabaseAdmin
        .from('reminders')
        .select('reminder_stage')
        .eq('business_requirement_id', br.id)
        .eq('status', 'sent')

      const sentStages = sentRows?.map((r) => r.reminder_stage) ?? []

      // Find the highest-priority unsent stage from the USER's chosen intervals
      let stageToSend = null
      for (const stage of userReminderDays) {
        if (daysLeft <= stage && !sentStages.includes(stage)) {
          stageToSend = stage
          break
        }
      }

      if (!stageToSend) { results.skipped++; continue }

      const reqName = br.requirement?.requirement_name || 'License'
      const country = biz.email?.endsWith('.in') ? 'India' : 'USA'

      // 4. Send the email
      try {
        const sent = await sendEmail({
          to: biz.email,
          ownerName: biz.owner_name,
          licenseName: reqName,
          daysLeft,
          expiryDate: br.expiry_date,
          penalty: 0,
          renewalUrl: br.requirement?.source_url || (country === 'India' ? 'https://india.gov.in' : 'https://usa.gov'),
          country,
        })

        if (sent) {
          // 5. Log the sent reminder
          await supabaseAdmin.from('reminders').insert({
            business_requirement_id: br.id,
            reminder_stage: stageToSend,
            channel: 'email',
            status: 'sent',
          })
          results.sent++
          results.details.push({ license: reqName, to: biz.email, stage: stageToSend, daysLeft })
        } else {
          results.errors++
        }
      } catch (emailErr) {
        console.error(`[cron-check] Email failed for business requirement ${br.id}:`, emailErr)
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
