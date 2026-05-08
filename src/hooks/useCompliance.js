/**
 * useCompliance.js
 * Derives compliance score, grade, and alert data from a licenses array.
 */
import { useMemo } from 'react'
import { calculateComplianceScore } from '@/utils/complianceScore'
import { getTotalPenaltyExposure } from '@/utils/penaltyRules'
import { getDaysUntilExpiry } from '@/utils/formatters'

/**
 * @param {Array} licenses - enriched license objects from useLicenses
 * @returns {{ score, grade, color, message, expiredCount, expiringCount, totalPenalty, nextExpiry }}
 */
export function useCompliance(licenses) {
  return useMemo(() => {
    if (!licenses?.length) {
      return {
        score: 100, grade: 'A', color: '#16A34A',
        message: 'No licenses tracked yet',
        expiredCount: 0, expiringCount: 0,
        activeCount: 0, totalLicenses: 0,
        totalPenalty: 0, nextExpiry: null,
        breakdown: {},
      }
    }

    const { score, grade, color, message, breakdown } = calculateComplianceScore(licenses)
    const totalPenalty = getTotalPenaltyExposure(licenses)

    const expiredCount  = licenses.filter((l) => getDaysUntilExpiry(l.expiry_date) < 0).length
    const expiringCount = licenses.filter((l) => {
      const d = getDaysUntilExpiry(l.expiry_date)
      return d >= 0 && d <= 30
    }).length
    const activeCount = licenses.filter((l) => getDaysUntilExpiry(l.expiry_date) > 30).length

    // Next expiry = soonest non-expired
    const upcoming = licenses
      .filter((l) => getDaysUntilExpiry(l.expiry_date) >= 0)
      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    const nextExpiry = upcoming[0] ?? null

    return {
      score, grade, color, message, breakdown,
      expiredCount, expiringCount, activeCount,
      totalLicenses: licenses.length,
      totalPenalty, nextExpiry,
    }
  }, [licenses])
}
