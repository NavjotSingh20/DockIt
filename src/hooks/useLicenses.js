import { useState, useEffect, useCallback } from 'react';
import { getLicenses, createLicense, updateLicense, deleteLicense } from '../services/supabase';
import { getDaysLeft, getStatusFromDays } from '../utils/formatters';

export function useLicenses(businessId, demoLicenses = null) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const enrich = (list) =>
    list.map((l) => {
      const daysLeft = getDaysLeft(l.expiry_date);
      return { ...l, daysLeft, computedStatus: getStatusFromDays(daysLeft) };
    }).sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));

  const load = useCallback(async () => {
    if (demoLicenses) { setLicenses(enrich(demoLicenses)); setLoading(false); return; }
    if (!businessId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await getLicenses(businessId);
      setLicenses(enrich(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [businessId, demoLicenses]);

  useEffect(() => { load(); }, [load]);

  const addLicense = async (data) => {
    const created = await createLicense(data);
    setLicenses((prev) => enrich([...prev, created]));
    return created;
  };

  const editLicense = async (id, updates) => {
    const updated = await updateLicense(id, updates);
    setLicenses((prev) => enrich(prev.map((l) => (l.id === id ? updated : l))));
    return updated;
  };

  const removeLicense = async (id) => {
    await deleteLicense(id);
    setLicenses((prev) => prev.filter((l) => l.id !== id));
  };

  return { licenses, loading, error, reload: load, addLicense, editLicense, removeLicense };
}
