export function calculateComplianceScore(licenses = []) {
  let score = 100;
  for (const lic of licenses) {
    const d = lic.daysLeft ?? getDaysLeft(lic.expiry_date);
    if (d < 0) score -= 20;
    else if (d <= 7) score -= 15;
    else if (d <= 30) score -= 8;
    else if (d <= 60) score -= 3;
  }
  score = Math.max(0, score);
  let grade, color, message;
  if (score >= 80) { grade = 'A'; color = 'green'; message = 'Fully Compliant'; }
  else if (score >= 60) { grade = 'B'; color = 'blue'; message = 'Mostly Compliant'; }
  else if (score >= 40) { grade = 'C'; color = 'amber'; message = 'Needs Attention'; }
  else { grade = 'D'; color = 'red'; message = 'Critical — Immediate Action Required'; }
  return { score, grade, color, message };
}

function getDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  return Math.round((exp - today) / (1000 * 60 * 60 * 24));
}

export function getLicenseSummary(licenses = []) {
  const total = licenses.length;
  const expired = licenses.filter(l => (l.daysLeft ?? getDaysLeft(l.expiry_date)) < 0).length;
  const expiringWeek = licenses.filter(l => { const d = l.daysLeft ?? getDaysLeft(l.expiry_date); return d >= 0 && d <= 7; }).length;
  const expiringMonth = licenses.filter(l => { const d = l.daysLeft ?? getDaysLeft(l.expiry_date); return d >= 0 && d <= 30; }).length;
  const active = licenses.filter(l => (l.daysLeft ?? getDaysLeft(l.expiry_date)) > 60).length;
  return { total, expired, expiringWeek, expiringMonth, active };
}
