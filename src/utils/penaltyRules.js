export const PENALTY_RULES = {
  FSSAI: {
    name: 'FSSAI Food License', grace_days: 0,
    slabs: [
      { days_overdue: 1, fine: 5000, consequence: 'Warning notice issued' },
      { days_overdue: 7, fine: 10000, consequence: 'Show cause notice' },
      { days_overdue: 30, fine: 25000, consequence: 'Operations may be suspended' },
      { days_overdue: 90, fine: 100000, consequence: 'License cancellation proceedings' },
      { days_overdue: 180, fine: 500000, consequence: 'Criminal prosecution under FSS Act 2006' },
    ],
    legal_reference: 'Food Safety and Standards Act, 2006 — Section 63',
  },
  FIRE_NOC: {
    name: 'Fire NOC', grace_days: 0,
    slabs: [
      { days_overdue: 1, fine: 2000, consequence: 'Warning notice' },
      { days_overdue: 15, fine: 8000, consequence: 'Show cause notice' },
      { days_overdue: 30, fine: 20000, consequence: 'Closure notice possible' },
      { days_overdue: 60, fine: 50000, consequence: 'Forced closure order' },
      { days_overdue: 90, fine: 100000, consequence: 'Criminal proceedings' },
    ],
    legal_reference: 'State Fire Force Safety Act & National Building Code',
  },
  TRADE_LICENSE: {
    name: 'Trade License', grace_days: 30,
    slabs: [
      { days_overdue: 1, fine: 1000, consequence: 'Late fee applied' },
      { days_overdue: 30, fine: 5000, consequence: 'Penalty notice' },
      { days_overdue: 90, fine: 15000, consequence: 'License suspension' },
      { days_overdue: 180, fine: 30000, consequence: 'Business sealing order' },
    ],
    legal_reference: 'Municipal Corporation License Act / Regulations',
  },
  SHOP_ESTABLISHMENT: {
    name: 'Shop & Establishment', grace_days: 0,
    slabs: [
      { days_overdue: 1, fine: 1000, consequence: 'Fine issued' },
      { days_overdue: 30, fine: 5000, consequence: 'Labour inspector notice' },
      { days_overdue: 90, fine: 20000, consequence: 'Prosecution under Labour Act' },
    ],
    legal_reference: 'Shops and Commercial Establishments Act',
  },
  EATING_HOUSE: {
    name: 'Eating House License', grace_days: 0,
    slabs: [
      { days_overdue: 1, fine: 2000, consequence: 'Police notice' },
      { days_overdue: 30, fine: 10000, consequence: 'Show cause notice' },
      { days_overdue: 60, fine: 25000, consequence: 'Closure order by police' },
      { days_overdue: 180, fine: 50000, consequence: 'Criminal proceedings under IPC' },
    ],
    legal_reference: 'City Police Commissionerate Licensing Regulations',
  },
  GST: {
    name: 'GST Registration', grace_days: 0,
    slabs: [
      { days_overdue: 1, fine: 10000, consequence: 'Late fee per return' },
      { days_overdue: 30, fine: 25000, consequence: 'Notice from GST department' },
      { days_overdue: 90, fine: 50000, consequence: 'Registration cancellation' },
    ],
    legal_reference: 'GST Act, 2017 — Section 69',
  },

  // USA License Types
  BUSINESS_LICENSE: {
    name: 'General Business License', grace_days: 15,
    slabs: [
      { days_overdue: 1, fine: 100, consequence: 'Late fee applied' },
      { days_overdue: 30, fine: 500, consequence: 'Warning notice issued' },
      { days_overdue: 60, fine: 1500, consequence: 'License suspension warning' },
      { days_overdue: 90, fine: 5000, consequence: 'Court citation & closure order' },
    ],
    legal_reference: 'City Municipal Code — Business Licensing Ordinance',
  },
  HEALTH_PERMIT: {
    name: 'Health Department Permit', grace_days: 0,
    slabs: [
      { days_overdue: 1, fine: 250, consequence: 'Warning notice' },
      { days_overdue: 15, fine: 1000, consequence: 'Re-inspection fee' },
      { days_overdue: 30, fine: 3000, consequence: 'Health grade downgrade & citation' },
      { days_overdue: 45, fine: 10000, consequence: 'Forced closure by Health Department' },
    ],
    legal_reference: 'County Health Department Safety Code',
  },
  SALES_TAX: {
    name: 'Sales Tax Permit', grace_days: 0,
    slabs: [
      { days_overdue: 1, fine: 500, consequence: 'Late return fee' },
      { days_overdue: 30, fine: 2000, consequence: 'Audit warning' },
      { days_overdue: 90, fine: 10000, consequence: 'Permit revocation' },
    ],
    legal_reference: 'State Department of Revenue Tax Code',
  },
  FIRE_PERMIT: {
    name: 'Fire Department NOC', grace_days: 0,
    slabs: [
      { days_overdue: 1, fine: 200, consequence: 'Failure to post notice' },
      { days_overdue: 15, fine: 800, consequence: 'Citation and mandatory inspection' },
      { days_overdue: 30, fine: 2500, consequence: 'Violation citation' },
      { days_overdue: 60, fine: 7500, consequence: 'Forced closure due to safety hazard' },
    ],
    legal_reference: 'National Fire Protection Association (NFPA) / City Fire Code',
  },
  FDA_REG: {
    name: 'FDA Food Registration', grace_days: 0,
    slabs: [
      { days_overdue: 1, fine: 1000, consequence: 'Administrative holds on imports' },
      { days_overdue: 30, fine: 5000, consequence: 'Warning letter' },
      { days_overdue: 90, fine: 25000, consequence: 'Injunction / seizure of products' },
    ],
    legal_reference: 'FD&C Act — Section 415',
  },
};

export function calculatePenalty(licenseType, daysOverdue) {
  const rule = PENALTY_RULES[licenseType];
  if (!rule) return { currentFine: 0, currentConsequence: 'No penalty data', projections: [], dailyCost: 0, legalReference: '' };

  const effectiveDays = Math.max(0, daysOverdue - rule.grace_days);
  
  // Find current slab
  let currentFine = 0;
  let currentConsequence = 'Within grace period';
  for (const slab of rule.slabs) {
    if (effectiveDays >= slab.days_overdue) {
      currentFine = slab.fine;
      currentConsequence = slab.consequence;
    }
  }

  // Daily cost (fine increase per day)
  const maxFine = rule.slabs[rule.slabs.length - 1]?.fine || 0;
  const maxDays = rule.slabs[rule.slabs.length - 1]?.days_overdue || 180;
  const dailyCost = Math.round(maxFine / maxDays);

  // Projections
  const getFinAt = (d) => {
    let f = 0;
    for (const slab of rule.slabs) {
      if (d >= slab.days_overdue) f = slab.fine;
    }
    return f;
  };

  return {
    currentFine,
    currentConsequence,
    projections: [
      { days: 7, fine: getFinAt(effectiveDays + 7), consequence: rule.slabs.find(s => effectiveDays + 7 >= s.days_overdue)?.consequence || '' },
      { days: 30, fine: getFinAt(effectiveDays + 30), consequence: rule.slabs.find(s => effectiveDays + 30 >= s.days_overdue)?.consequence || '' },
      { days: 90, fine: getFinAt(effectiveDays + 90), consequence: rule.slabs.find(s => effectiveDays + 90 >= s.days_overdue)?.consequence || '' },
    ],
    dailyCost,
    legalReference: rule.legal_reference,
  };
}
