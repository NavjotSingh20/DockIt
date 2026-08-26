/**
 * usePenalty.js
 * Hook to calculate penalty for a single license.
 */
import { useMemo } from 'react'
import { calculatePenalty } from '@/utils/penaltyRules'
import { getDaysUntilExpiry } from '@/utils/formatters'

/**
 * @param {string} licenseType - e.g. 'FSSAI'
 * @param {string} expiryDate  - ISO date string
 * @returns {{ daysOverdue, penalty, isOverdue, isExpiring }}
 */
export function usePenalty(licenseType, expiryDate) {
  return useMemo(() => {
    if (!licenseType || !expiryDate) {
      return { daysOverdue: 0, penalty: null, isOverdue: false, isExpiring: false }
    }

    const daysLeft    = getDaysUntilExpiry(expiryDate)
    const daysOverdue = daysLeft < 0 ? Math.abs(daysLeft) : 0
    const isOverdue   = daysLeft < 0
    const isExpiring  = daysLeft >= 0 && daysLeft <= 30
    const penalty     = calculatePenalty(licenseType, daysOverdue)

    return { daysLeft, daysOverdue, penalty, isOverdue, isExpiring }
  }, [licenseType, expiryDate])
}
