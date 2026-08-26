/**
 * penaltyRules.js
 * Penalty slabs + calculator for all Indian SMB license types.
 */

export const PENALTY_RULES = {
  FSSAI: {
    name: 'FSSAI Food License',
    grace_days: 0,
    slabs: [
      { days_overdue: 1,   fine: 5000,   consequence: 'Warning notice issued by FSSAI officer' },
      { days_overdue: 7,   fine: 10000,  consequence: 'Show cause notice — respond within 15 days' },
      { days_overdue: 30,  fine: 25000,  consequence: 'Operations may be suspended' },
      { days_overdue: 90,  fine: 100000, consequence: 'License cancellation proceedings initiated' },
      { days_overdue: 180, fine: 500000, consequence: 'Criminal prosecution under FSS Act 2006' },
    ],
    legal_reference: 'Food Safety and Standards Act, 2006 — Section 63',
  },
  FIRE_NOC: {
    name: 'Fire NOC',
    grace_days: 0,
    slabs: [
      { days_overdue: 1,  fine: 2000,   consequence: 'Warning notice from KSFE officer' },
      { days_overdue: 15, fine: 8000,   consequence: 'Show cause notice issued' },
      { days_overdue: 30, fine: 20000,  consequence: 'Closure notice possible' },
      { days_overdue: 60, fine: 50000,  consequence: 'Forced closure order from District Magistrate' },
      { days_overdue: 90, fine: 100000, consequence: 'Criminal proceedings under KFF Act' },
    ],
    legal_reference: 'Karnataka Fire Force Act, 1964 — Section 13',
  },
  TRADE_LICENSE: {
    name: 'Trade License',
    grace_days: 30,
    slabs: [
      { days_overdue: 1,   fine: 1000,  consequence: 'Late fee applied automatically' },
      { days_overdue: 30,  fine: 5000,  consequence: 'Penalty notice from BBMP ward office' },
      { days_overdue: 90,  fine: 15000, consequence: 'License suspension' },
      { days_overdue: 180, fine: 30000, consequence: 'Business sealing order by BBMP marshal' },
    ],
    legal_reference: 'BBMP Act, 1976 — Section 112',
  },
  SHOP_ESTABLISHMENT: {
    name: 'Shop & Establishment Act',
    grace_days: 0,
    slabs: [
      { days_overdue: 1,  fine: 1000,  consequence: 'Fine issued by Labour Inspector' },
      { days_overdue: 30, fine: 5000,  consequence: 'Labour inspector inspection notice' },
      { days_overdue: 90, fine: 20000, consequence: 'Prosecution under Karnataka Labour Act' },
    ],
    legal_reference: 'Karnataka Shops and Commercial Establishments Act, 1961 — Section 7',
  },
  EATING_HOUSE: {
    name: 'Eating House License',
    grace_days: 0,
    slabs: [
      { days_overdue: 1,   fine: 2000,  consequence: 'Police notice from local station' },
      { days_overdue: 30,  fine: 10000, consequence: 'Show cause notice — respond within 7 days' },
      { days_overdue: 60,  fine: 25000, consequence: 'Closure order by local police authority' },
      { days_overdue: 180, fine: 50000, consequence: 'Criminal proceedings under IPC Section 188' },
    ],
    legal_reference: 'Karnataka Police Act, 1963 — Section 76',
  },
  SIGNAGE: {
    name: 'Signage / Hoarding License',
    grace_days: 15,
    slabs: [
      { days_overdue: 1,  fine: 500,  consequence: 'Penalty notice from BBMP Advertisement Dept' },
      { days_overdue: 30, fine: 3000, consequence: 'Removal order for unauthorized signboard' },
      { days_overdue: 60, fine: 8000, consequence: 'BBMP forcibly removes signboard at owner cost' },
    ],
    legal_reference: 'BBMP Advertisement By-Laws, 2006',
  },
  DRUG_LICENSE: {
    name: 'Drug License',
    grace_days: 0,
    slabs: [
      { days_overdue: 1,  fine: 5000,   consequence: 'Warning from Drugs Inspector' },
      { days_overdue: 30, fine: 20000,  consequence: 'Show cause notice — suspension possible' },
      { days_overdue: 60, fine: 50000,  consequence: 'License suspension — cannot sell drugs' },
      { days_overdue: 90, fine: 100000, consequence: 'Criminal prosecution under Drugs & Cosmetics Act' },
    ],
    legal_reference: 'Drugs and Cosmetics Act, 1940 — Section 27',
  },
}

/**
 * Calculate current and projected penalties for a license.
 * @param {string} licenseType
 * @param {number} daysOverdue - positive = overdue, 0 or negative = not yet overdue
 * @returns {{ currentFine, currentConsequence, projections, dailyCost, legalReference, graceDays } | null}
 */
export function calculatePenalty(licenseType, daysOverdue) {
  const rule = PENALTY_RULES[licenseType]
  if (!rule) return null

  const slabs = rule.slabs
  const effectiveOverdue = Math.max(0, daysOverdue - rule.grace_days)

  let currentSlab = null
  for (const slab of slabs) {
    if (effectiveOverdue >= slab.days_overdue) currentSlab = slab
  }

  const currentFine = currentSlab ? currentSlab.fine : 0
  const currentConsequence = currentSlab
    ? currentSlab.consequence
    : 'No penalty yet — renew before expiry to avoid fines'

  const projections = [7, 30, 90].map((futureDays) => {
    const total = effectiveOverdue + futureDays
    let futureSlab = null
    for (const slab of slabs) {
      if (total >= slab.days_overdue) futureSlab = slab
    }
    return {
      days: futureDays,
      fine: futureSlab ? futureSlab.fine : currentFine,
      consequence: futureSlab ? futureSlab.consequence : currentConsequence,
    }
  })

  const fineDiff = projections[1].fine - currentFine
  const dailyCost = effectiveOverdue > 0 ? Math.round(fineDiff / 30) : 0

  return { currentFine, currentConsequence, projections, dailyCost, legalReference: rule.legal_reference, graceDays: rule.grace_days }
}

/**
 * Sum up total current fine exposure across multiple licenses.
 * @param {Array<{ license_type: string, expiry_date: string }>} licenses
 * @returns {number}
 */
export function getTotalPenaltyExposure(licenses) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return licenses.reduce((total, lic) => {
    const expiry = new Date(lic.expiry_date)
    const daysOverdue = Math.ceil((today - expiry) / 86400000)
    if (daysOverdue <= 0) return total
    const p = calculatePenalty(lic.license_type, daysOverdue)
    return total + (p ? p.currentFine : 0)
  }, 0)
}
