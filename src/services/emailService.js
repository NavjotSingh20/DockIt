const RESEND_KEY = import.meta.env.VITE_RESEND_API_KEY || '';

export async function sendReminderEmail(to, ownerName, licenseName, daysLeft, expiryDate, penalty, renewalUrl) {
  if (!RESEND_KEY) throw new Error('Resend API key not configured');

  const urgencyColor = daysLeft <= 7 ? '#DC2626' : daysLeft <= 30 ? '#F59E0B' : '#1A56DB';
  const urgencyLabel = daysLeft < 0 ? 'EXPIRED' : daysLeft === 0 ? 'EXPIRES TODAY' : `${daysLeft} DAYS LEFT`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Inter,Arial,sans-serif;background:#F8FAFC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr><td style="background:#0D1B2A;padding:28px 32px;border-radius:12px 12px 0 0;">
      <div style="color:#1A56DB;font-size:22px;font-weight:800;">⚡ ComplianceAI</div>
      <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Business License Compliance Platform</div>
    </td></tr>
    <tr><td style="background:#fff;padding:32px;">
      <p style="color:#374151;font-size:16px;margin:0 0 24px;">Hi ${ownerName},</p>
      <div style="background:${urgencyColor}15;border:2px solid ${urgencyColor};border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="color:${urgencyColor};font-size:36px;font-weight:900;">${urgencyLabel}</div>
        <div style="color:#111827;font-size:20px;font-weight:700;margin-top:8px;">${licenseName}</div>
        <div style="color:#6B7280;font-size:14px;margin-top:4px;">Expiry: ${expiryDate}</div>
      </div>
      ${penalty ? `<div style="background:#FEF2F2;border-radius:10px;padding:16px;margin-bottom:24px;"><div style="color:#DC2626;font-size:14px;font-weight:700;">⚖️ Penalty if not renewed</div><div style="color:#DC2626;font-size:24px;font-weight:800;margin-top:4px;">${penalty}</div></div>` : ''}
      <a href="${renewalUrl}" style="display:block;background:#1A56DB;color:#fff;text-decoration:none;text-align:center;padding:16px;border-radius:10px;font-size:16px;font-weight:700;margin-bottom:24px;">Renew Now →</a>
      <p style="color:#6B7280;font-size:13px;text-align:center;margin:0;">Sent by ComplianceAI — protecting Indian businesses<br>You are receiving this because you enabled email reminders.</p>
    </td></tr>
  </table>
</body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'ComplianceAI <alerts@resend.dev>', to: [to], subject: `⚠️ ${licenseName} — ${urgencyLabel}`, html }),
  });

  if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Failed to send email'); }
  return await res.json();
}
