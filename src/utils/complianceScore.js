/**
 * Compliance score is computed at runtime from the status
 * distribution of business_requirements rows.
 *
 * Status weights:
 *   expired      → -20 points
 *   needed       → -15 points (not yet obtained)
 *   in_progress  → -8 points  (working on it, but not satisfied)
 *   waived       → 0 points   (officially not required)
 *   satisfied    → 0 points   (compliant)
 *
 * Also factors in days-until-expiry for non-expired statuses.
 */

export function calculateComplianceScore(businessRequirements = []) {
  if (businessRequirements.length === 0) return { score: 0, grade: '—', color: 'gray', message: 'Add business data to generate compliance score' };

  let score = 100;

  for (const br of businessRequirements) {
    const status = br.status || 'needed';

    if (status === 'expired') {
      score -= 20;
    } else if (status === 'needed') {
      score -= 15;
    } else if (status === 'in_progress' || status === 'payment_recorded') {
      // Payment recorded or in progress — small deduction until verified/satisfied
      const d = br.daysLeft ?? getDaysLeft(br.expiry_date);
      if (d !== null && d <= 7) score -= 8;
      else if (d !== null && d <= 30) score -= 5;
      else score -= 3;
    } else if (status === 'satisfied') {
      // Check if it's about to expire
      const d = br.daysLeft ?? getDaysLeft(br.expiry_date);
      if (d !== null && d <= 7) score -= 10;
      else if (d !== null && d <= 30) score -= 4;
      else if (d !== null && d <= 60) score -= 1;
      // else: fully compliant, no deduction
    }
    // waived: no deduction
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

export function getLicenseSummary(businessRequirements = []) {
  const total = businessRequirements.length;
  const expired = businessRequirements.filter(br => br.status === 'expired').length;
  const needed = businessRequirements.filter(br => br.status === 'needed').length;
  const inProgress = businessRequirements.filter(br => br.status === 'in_progress' || br.status === 'payment_recorded').length;
  const satisfied = businessRequirements.filter(br => br.status === 'satisfied').length;
  const waived = businessRequirements.filter(br => br.status === 'waived').length;

  // Also compute expiry-based summaries for backward compat
  const expiringWeek = businessRequirements.filter(br => {
    const d = br.daysLeft ?? getDaysLeft(br.expiry_date);
    return d !== null && d >= 0 && d <= 7 && br.status !== 'expired';
  }).length;
  const expiringMonth = businessRequirements.filter(br => {
    const d = br.daysLeft ?? getDaysLeft(br.expiry_date);
    return d !== null && d >= 0 && d <= 30 && br.status !== 'expired';
  }).length;
  const active = businessRequirements.filter(br => {
    const d = br.daysLeft ?? getDaysLeft(br.expiry_date);
    return (d === null || d > 60) && br.status === 'satisfied';
  }).length;

  return { total, expired, needed, inProgress, satisfied, waived, expiringWeek, expiringMonth, active };
}
