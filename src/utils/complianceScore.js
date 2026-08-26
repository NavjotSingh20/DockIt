/**
 * complianceScore.js
 * Calculates a 0–100 compliance score based on license statuses.
 */

/**
 * @param {Array<{ expiry_date: string, status: string }>} licenses
 * @returns {{ score: number, grade: string, color: string, message: string, breakdown: object }}
 */
export function calculateComplianceScore(licenses) {
  if (!licenses || licenses.length === 0) {
    return { score: 100, grade: 'A', color: '#16A34A', message: 'No licenses tracked yet', breakdown: {} }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let deductions = 0
  const breakdown = { expired: 0, critical: 0, warning: 0, soon: 0, active: 0 }

  for (const lic of licenses) {
    const expiry = new Date(lic.expiry_date)
    const daysLeft = Math.ceil((expiry - today) / 86400000)

    if (daysLeft < 0) {
      deductions += 20
      breakdown.expired++
    } else if (daysLeft <= 7) {
      deductions += 15
      breakdown.critical++
    } else if (daysLeft <= 30) {
      deductions += 8
      breakdown.warning++
    } else if (daysLeft <= 60) {
      deductions += 3
      breakdown.soon++
    } else {
      breakdown.active++
    }
  }

  const score = Math.max(0, 100 - deductions)

  let grade, color, message
  if (score >= 80) {
    grade = 'A'; color = '#16A34A'; message = 'Fully Compliant'
  } else if (score >= 60) {
    grade = 'B'; color = '#1A56DB'; message = 'Mostly Compliant'
  } else if (score >= 40) {
    grade = 'C'; color = '#F59E0B'; message = 'Needs Attention'
  } else {
    grade = 'D'; color = '#DC2626'; message = 'Critical — Immediate Action Required'
  }

  return { score, grade, color, message, breakdown }
}

/**
 * Returns status string for a given days-until-expiry number.
 * @param {number} daysLeft - negative means overdue
 * @returns {'expired'|'expiring'|'soon'|'active'}
 */
export function getStatusFromDays(daysLeft) {
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 30) return 'expiring'
  if (daysLeft <= 60) return 'soon'
  return 'active'
}
