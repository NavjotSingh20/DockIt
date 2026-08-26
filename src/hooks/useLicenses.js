/**
 * useLicenses.js
 * React hook — fetches, caches, and manages licenses for a business.
 * Supports demo mode (no Supabase calls).
 */
import { useState, useEffect, useCallback } from 'react'
import { getLicenses, createLicense, updateLicense, deleteLicense } from '@/services/supabase'
import { getDaysUntilExpiry, getStatusFromDays } from '@/utils/formatters'

/**
 * @param {string|null} businessId  - null in demo mode
 * @param {Array|null}  demoLicenses - provide demo data to skip Supabase
 */
export function useLicenses(businessId, demoLicenses = null) {
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const isDemoMode = demoLicenses !== null

  // Enrich licenses with computed fields
  const enrich = (list) =>
    list.map((lic) => {
      const daysLeft = getDaysUntilExpiry(lic.expiry_date)
      return { ...lic, daysLeft, computedStatus: getStatusFromDays(daysLeft) }
    }).sort((a, b) => a.daysLeft - b.daysLeft) // soonest first

  const fetchLicenses = useCallback(async () => {
    if (isDemoMode) {
      setLicenses(enrich(demoLicenses))
      setLoading(false)
      return
    }
    if (!businessId) { setLoading(false); return }

    setLoading(true)
    setError(null)
    const { data, error: err } = await getLicenses(businessId)
    if (err) setError(err.message)
    else setLicenses(enrich(data))
    setLoading(false)
  }, [businessId, isDemoMode])

  useEffect(() => { fetchLicenses() }, [fetchLicenses])

  const addLicense = async (licenseData) => {
    if (isDemoMode) return { error: 'Cannot save in demo mode' }
    const { data, error } = await createLicense(licenseData)
    if (!error) setLicenses((prev) => enrich([...prev, data]))
    return { data, error }
  }

  const editLicense = async (id, updates) => {
    if (isDemoMode) return { error: 'Cannot save in demo mode' }
    const { data, error } = await updateLicense(id, updates)
    if (!error) setLicenses((prev) => enrich(prev.map((l) => l.id === id ? data : l)))
    return { data, error }
  }

  const removeLicense = async (id) => {
    if (isDemoMode) return { error: 'Cannot delete in demo mode' }
    const { error } = await deleteLicense(id)
    if (!error) setLicenses((prev) => prev.filter((l) => l.id !== id))
    return { error }
  }

  const refresh = fetchLicenses

  return { licenses, loading, error, addLicense, editLicense, removeLicense, refresh }
}
