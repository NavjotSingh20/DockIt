/**
 * /api/send-reminder.js
 * Vercel Serverless Function — Send branded reminder email via Resend.
 * POST body: { to, ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl }
 * Response:  { success: boolean, messageId: string|null, error: string|null }
 */

function buildEmailHtml({ ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl }) {
  const isOverdue = daysLeft < 0
  const isUrgent = daysLeft <= 7
  const statusColor = isOverdue ? '#DC2626' : isUrgent ? '#F59E0B' : '#1A56DB'
  const statusText = isOverdue
    ? `EXPIRED ${Math.abs(daysLeft)} days ago`
    : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`

  const penaltyText = penalty > 0
    ? `₹${new Intl.NumberFormat('en-IN').format(penalty)}`
    : 'Penalties may apply'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>License Renewal Alert — ComplianceAI</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#0D1B2A;padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-0.5px;">ComplianceAI</span>
                  <span style="color:#6B9EC7;font-size:13px;display:block;margin-top:2px;">Smart License Management for Indian Businesses</span>
                </td>
                <td align="right">
                  <span style="background:#1A56DB;color:#fff;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;">License Alert</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Status Banner -->
        <tr>
          <td style="background:${statusColor};padding:20px 36px;text-align:center;">
            <span style="color:#fff;font-size:32px;font-weight:900;letter-spacing:-1px;">${statusText}</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#FFFFFF;padding:36px;">
            <p style="color:#374151;font-size:16px;margin:0 0 24px;">Dear <strong>${ownerName}</strong>,</p>
            <p style="color:#374151;font-size:15px;margin:0 0 24px;">
              Your <strong style="color:#0D1B2A;">${licenseName}</strong> requires immediate attention.
            </p>

            <!-- Stats -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:28px;">
              <tr>
                <td style="padding:16px 20px;border-right:1px solid #E5E7EB;text-align:center;">
                  <span style="color:#6B7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:block;">License</span>
                  <span style="color:#0D1B2A;font-size:15px;font-weight:700;">${licenseName}</span>
                </td>
                <td style="padding:16px 20px;border-right:1px solid #E5E7EB;text-align:center;">
                  <span style="color:#6B7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:block;">Expiry Date</span>
                  <span style="color:#0D1B2A;font-size:15px;font-weight:700;">${expiryDate}</span>
                </td>
                <td style="padding:16px 20px;text-align:center;">
                  <span style="color:#6B7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:block;">Penalty Risk</span>
                  <span style="color:#DC2626;font-size:15px;font-weight:700;">${penaltyText}</span>
                </td>
              </tr>
            </table>

            <!-- Warning box -->
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
              <p style="color:#991B1B;font-size:14px;margin:0;font-weight:600;">⚠️ Important</p>
              <p style="color:#DC2626;font-size:13px;margin:8px 0 0;">
                Operating without a valid ${licenseName} can result in fines, forced closure, and criminal proceedings under Karnataka law.
                ${penalty > 0 ? `Current penalty exposure: <strong>${penaltyText}</strong>.` : ''}
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${renewalUrl}" style="background:#1A56DB;color:#FFFFFF;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;display:inline-block;">
                Renew Now →
              </a>
            </div>

            <p style="color:#6B7280;font-size:13px;margin:0;">
              You can also manage all your licenses at <a href="https://complianceai.vercel.app" style="color:#1A56DB;">ComplianceAI Dashboard</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;padding:20px 36px;border-top:1px solid #E5E7EB;">
            <p style="color:#9CA3AF;font-size:12px;margin:0;text-align:center;">
              Sent by ComplianceAI — protecting Indian businesses.<br>
              This is an automated compliance alert. To unsubscribe, update your settings in the dashboard.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { to, ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl } = req.body || {}

  if (!to || !ownerName || !licenseName) {
    return res.status(400).json({ success: false, error: 'to, ownerName, and licenseName are required' })
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ success: false, error: 'Resend API key not configured' })
  }

  const subject = daysLeft < 0
    ? `🚨 EXPIRED: ${licenseName} — Act Now to Avoid ₹${(penalty || 0).toLocaleString('en-IN')} Penalty`
    : `⚠️ ${licenseName} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — Renew Now`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ComplianceAI <alerts@resend.dev>',
        to: [to],
        subject,
        html: buildEmailHtml({ ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl }),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[/api/send-reminder] Resend error:', data)
      return res.status(response.status).json({ success: false, error: data.message || 'Email send failed' })
    }

    return res.status(200).json({ success: true, messageId: data.id, error: null })
  } catch (err) {
    console.error('[/api/send-reminder]', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
