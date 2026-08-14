import { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Search, Plus, Check, ExternalLink, Clock,
  Building2, AlertCircle, Sparkles, MapPin, X, ChevronRight, CheckCircle2, FileDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDemo } from '../context/DemoContext';
import { getRequirements, getBusinessRequirements, createBusinessRequirement, updateBusiness } from '../services/supabase';
import { formatCurrency } from '../utils/formatters';
import { fillOfficialForm } from '../utils/formFillEngine';

const CITIES_DATA = {
  India: [
    { city: 'Mumbai', state: 'Maharashtra' },
    { city: 'Delhi', state: 'NCT' },
    { city: 'Chennai', state: 'Tamil Nadu' },
    { city: 'Kolkata', state: 'West Bengal' },
    { city: 'Hyderabad', state: 'Telangana' },
    { city: 'Pune', state: 'Maharashtra' },
    { city: 'Ahmedabad', state: 'Gujarat' },
  ],
  USA: [
    { city: 'New York', state: 'NY' },
    { city: 'Los Angeles', state: 'CA' },
    { city: 'Chicago', state: 'IL' },
    { city: 'Houston', state: 'TX' },
    { city: 'Phoenix', state: 'AZ' },
    { city: 'San Francisco', state: 'CA' },
    { city: 'Seattle', state: 'WA' },
  ]
};

const JURISDICTION_CLASSES = {
  federal: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
  state: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  city: 'bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
};

export default function MyRequirements() {
  const context = useOutletContext();
  const business = context?.business;
  const navigate = useNavigate();

  const { isDemo, demoBusiness, updateDemoBusiness, demoRequirements, demoBusinessRequirements, addDemoRequirement } = useDemo();

  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState([]);
  const [trackedReqIds, setTrackedReqIds] = useState(new Set());
  const [addingId, setAddingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('all');
  const [showAddCityModal, setShowAddCityModal] = useState(false);
  const [selectedNewCity, setSelectedNewCity] = useState('');
  const [addingCity, setAddingCity] = useState(false);

  const activeBiz = isDemo ? demoBusiness : business;
  const country = activeBiz?.country || localStorage.getItem('country') || 'USA';
  const businessType = (activeBiz?.business_type || 'restaurant').trim();
  
  const rawCities = activeBiz?.cities && activeBiz.cities.length > 0
    ? activeBiz.cities
    : [activeBiz?.city ? `${activeBiz.city}, ${activeBiz.state || ''}` : (country === 'India' ? 'Mumbai, Maharashtra' : 'New York, NY')];
  
  // Deduplicated operating cities list
  const operatingCities = Array.from(new Set(rawCities));

  // Load requirements & tracked business requirements
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (isDemo) {
      const masterList = demoRequirements || [];
      const userList = demoBusinessRequirements || [];

      // Filter requirements matching business_type and any operating city OR federal items
      const matched = masterList.filter(req => {
        const typeMatch = !businessType || req.business_type === businessType || req.business_type === 'restaurant' || req.business_type === 'food_truck';
        const isFederal = req.jurisdiction_level === 'federal';
        const cityMatch = operatingCities.some(c => (req.city || '').toLowerCase().includes(c.split(',')[0].trim().toLowerCase()));
        return typeMatch && (isFederal || cityMatch);
      });

      if (isMounted) {
        setRequirements(matched.length > 0 ? matched : masterList);
        const trackedSet = new Set(userList.map(br => br.requirement_id || br.requirement?.id));
        setTrackedReqIds(trackedSet);
        setLoading(false);
      }
      return;
    }

    // Real Supabase Mode
    async function loadData() {
      try {
        const [reqs, userBrs] = await Promise.all([
          getRequirements(businessType, operatingCities).catch((e) => {
            console.error('getRequirements error:', e);
            return [];
          }),
          business?.id ? getBusinessRequirements(business.id).catch(() => []) : Promise.resolve([])
        ]);

        if (isMounted) {
          if (reqs.length === 0) {
            // Fallback: try fetching by business_type only (ignores city mismatch)
            const fallbackReqs = await getRequirements(businessType, []).catch(() => []);
            setRequirements(fallbackReqs);
          } else {
            setRequirements(reqs);
          }

          const trackedSet = new Set(userBrs.map(br => br.requirement_id || br.requirement?.id));
          setTrackedReqIds(trackedSet);
        }
      } catch (err) {
        console.error('Error loading requirements:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => { isMounted = false; };
  // Use stable primitives in deps to avoid infinite re-render loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, activeBiz?.id, businessType, JSON.stringify(operatingCities), demoRequirements, demoBusinessRequirements]);


  // Handle Adding a New Operating City (Smart-Diff Trigger)
  const handleAddCity = async (cityStateStr) => {
    if (!cityStateStr || operatingCities.includes(cityStateStr)) {
      toast.error('City is already in your operating jurisdictions.');
      return;
    }

    setAddingCity(true);
    const updatedCities = [...operatingCities, cityStateStr];

    try {
      if (isDemo) {
        updateDemoBusiness({
          cities: updatedCities,
          city: cityStateStr.split(',')[0].trim(),
          state: cityStateStr.split(',')[1]?.trim() || ''
        });
        toast.success(`📍 ${cityStateStr} added to operating cities! Smart-Diff checklist updated.`);
      } else {
        if (!business?.id) {
          toast.error('Please complete onboarding setup first.');
          return;
        }
        await updateBusiness(business.id, { cities: updatedCities });
        toast.success(`📍 ${cityStateStr} added to operating cities! Smart-Diff checklist updated.`);
      }
      setShowAddCityModal(false);
      setSelectedNewCity('');
    } catch (err) {
      console.error("Failed to add city:", err);
      toast.error(err.message || 'Failed to add city.');
    } finally {
      setAddingCity(false);
    }
  };

  // Handle Add to My Licenses
  const handleAddRequirement = async (item) => {
    setAddingId(item.id);
    try {
      if (isDemo) {
        addDemoRequirement(item);
        setTrackedReqIds(prev => new Set([...prev, item.id]));
        toast.success(`Added "${item.requirement_name}" to your tracked licenses!`);
      } else {
        if (!business?.id) {
          toast.error('Please complete business setup first.');
          return;
        }
        await createBusinessRequirement({
          business_id: business.id,
          requirement_id: item.id,
          status: 'needed',
          issuing_authority: item.issuing_agency,
        });
        setTrackedReqIds(prev => new Set([...prev, item.id]));
        toast.success(`Added "${item.requirement_name}" to your tracked licenses!`);
      }
    } catch (err) {
      console.error("Failed to add requirement:", err);
      toast.error(err.message || 'Failed to add requirement.');
    } finally {
      setAddingId(null);
    }
  };

  // Handle Download Application Packet
  const handleDownloadPacket = async (reqItem) => {
    const toastId = toast.loading(`Generating official packet for ${reqItem.requirement_name}...`);
    try {
      const pdfBlob = await fillOfficialForm(reqItem, activeBiz);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (reqItem.requirement_name || 'Application_Packet').replace(/[^a-zA-Z0-9_]/g, '_');
      a.download = `${safeName}_Application_Packet.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded application packet!`, { id: toastId });
    } catch (err) {
      console.error("Download packet error:", err);
      toast.error("Failed to generate application packet.", { id: toastId });
    }
  };

  // Filtered requirements view
  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      const matchSearch = searchQuery === '' ||
        req.requirement_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.issuing_agency.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.description && req.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchJurisdiction = jurisdictionFilter === 'all' || req.jurisdiction_level === jurisdictionFilter;

      return matchSearch && matchJurisdiction;
    });
  }, [requirements, searchQuery, jurisdictionFilter]);

  // Smart-Diff Engine Categorization: Reusable Federal/Covered vs City Specific
  const { coveredFederalReqs, citySpecificGroups } = useMemo(() => {
    const coveredFederal = [];
    const cityMap = {};

    filteredRequirements.forEach(req => {
      const isTracked = trackedReqIds.has(req.id);
      const isFederal = req.jurisdiction_level === 'federal';

      if (isFederal && isTracked) {
        // Federal items tracked under any city are auto-satisfied for all cities
        coveredFederal.push(req);
      } else {
        // Group by city name
        const cityKey = req.city || 'General / Federal';
        if (!cityMap[cityKey]) cityMap[cityKey] = [];
        cityMap[cityKey].push(req);
      }
    });

    return {
      coveredFederalReqs: coveredFederal,
      citySpecificGroups: cityMap
    };
  }, [filteredRequirements, trackedReqIds]);

  const isMultiCity = operatingCities.length > 1;
  const availableCitiesToAdd = (CITIES_DATA[country] || [])
    .map(c => `${c.city}, ${c.state}`)
    .filter(c => !operatingCities.includes(c));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-3xl border border-rule shadow-card">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
              <ClipboardList size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-ink">My Requirements</h1>
              <p className="text-sm text-ink-muted">Master legal discovery catalog & multi-jurisdiction smart-diff engine</p>
            </div>
          </div>
        </div>

        {/* Operating Cities Badges & Add City Action */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-display font-semibold px-3 py-1.5 bg-base rounded-xl border border-rule text-ink-muted flex items-center gap-1.5">
            <Building2 size={13} className="text-accent" />
            <span className="capitalize">{businessType.replace('_', ' ')}</span>
          </span>

          {operatingCities.map((city, idx) => (
            <span key={idx} className="text-xs font-display font-semibold px-3 py-1.5 bg-accent/10 text-accent-dark rounded-xl border border-accent/20 flex items-center gap-1">
              📍 {city}
            </span>
          ))}

          {/* Quick Add City Button */}
          <button
            onClick={() => setShowAddCityModal(true)}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 border-dashed border-accent/40 text-accent hover:bg-accent-light"
          >
            <Plus size={14} /> Add City
          </button>
        </div>
      </div>

      {/* Smart-Diff Jurisdiction Banner (Visible when multiple cities or federal items active) */}
      {isMultiCity && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent/10 border-2 border-accent/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-white shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="font-bold text-accent-dark font-display text-sm flex items-center gap-2">
                Smart-Diff Engine Active
                <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full font-bold uppercase">
                  {operatingCities.length} Jurisdictions Merged
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Cross-referencing <strong>{operatingCities.join(' & ')}</strong>. Federal requirements (EIN) auto-deduplicated across cities.
              </p>
            </div>
          </div>
          <div className="text-xs font-bold font-display px-3 py-1.5 bg-surface text-ink rounded-xl border border-rule self-start md:self-auto shadow-xs">
            ✨ Reusable Federal Covered / New City Permits Merged
          </div>
        </motion.div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Search license name, agency, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>

        {/* Jurisdiction Filters */}
        <div className="flex items-center bg-surface p-1 rounded-2xl border border-rule gap-1">
          {['all', 'federal', 'state', 'city'].map((j) => (
            <button
              key={j}
              onClick={() => setJurisdictionFilter(j)}
              className={`px-3.5 py-1.5 text-xs font-bold font-display rounded-xl transition-all capitalize ${
                jurisdictionFilter === j
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-base'
              }`}
            >
              {j}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-surface rounded-2xl border border-rule p-6 space-y-4">
              <div className="skeleton h-6 w-2/3 rounded-lg" />
              <div className="skeleton h-4 w-1/3 rounded-lg" />
              <div className="skeleton h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredRequirements.length > 0 ? (
        <div className="space-y-8">
          {/* SECTION 1: Covered / Reusable Across Cities (Federal) */}
          {coveredFederalReqs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-rule pb-2">
                <CheckCircle2 size={18} className="text-settled" />
                <h2 className="text-base font-bold font-display text-ink">
                  Covered Across Cities (Federal / Reusable Permits)
                </h2>
                <span className="text-xs font-display font-semibold px-2 py-0.5 bg-settled/10 text-settled rounded-full">
                  {coveredFederalReqs.length} Covered
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {coveredFederalReqs.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface rounded-3xl border-2 border-settled/30 p-6 shadow-card flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-purple-50 text-purple-700 border-purple-200">
                          {req.jurisdiction_level}
                        </span>
                        <span className="text-xs font-bold font-display text-settled flex items-center gap-1">
                          <CheckCircle2 size={13} /> Reusable for All Cities
                        </span>
                      </div>

                      <h3 className="text-lg font-bold font-display text-ink leading-snug mb-1">
                        {req.requirement_name}
                      </h3>
                      <p className="text-xs text-ink-muted font-medium mb-3 flex items-center gap-1.5">
                        <Building2 size={13} className="text-ink-faint" />
                        {req.issuing_agency}
                      </p>

                      {req.description && (
                        <p className="text-xs text-ink-muted leading-relaxed line-clamp-3 mb-4 bg-base p-3 rounded-xl border border-rule/60">
                          {req.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-rule/60 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        onClick={() => handleDownloadPacket(req)}
                        className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 text-accent font-semibold border-accent/30 hover:bg-accent-light"
                      >
                        <FileDown size={13} /> Download Application Packet
                      </button>

                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-display bg-settled/15 text-settled border border-settled/30">
                        <Check size={14} strokeWidth={3} /> Satisfied across all locations
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: City-Specific Groups */}
          {Object.entries(citySpecificGroups).map(([cityName, items]) => (
            <div key={cityName} className="space-y-4">
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-accent" />
                  <h2 className="text-base font-bold font-display text-ink">
                    {isMultiCity ? `Permits for ${cityName}` : `Required Permits — ${cityName}`}
                  </h2>
                  <span className="text-xs font-display font-semibold px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                    {items.length} Required
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {items.map((req) => {
                  const isTracked = trackedReqIds.has(req.id);
                  const isAdding = addingId === req.id;
                  const jurisClass = JURISDICTION_CLASSES[req.jurisdiction_level] || JURISDICTION_CLASSES.city;

                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-surface rounded-3xl border border-rule p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${jurisClass}`}>
                            {req.jurisdiction_level}
                          </span>
                          <span className="text-xs text-ink-faint font-medium">
                            📍 {req.city}
                          </span>
                        </div>

                        {/* Title & Agency */}
                        <h3 className="text-lg font-bold font-display text-ink leading-snug mb-1">
                          {req.requirement_name}
                        </h3>
                        <p className="text-xs text-ink-muted font-medium mb-3 flex items-center gap-1.5">
                          <Building2 size={13} className="text-ink-faint" />
                          {req.issuing_agency}
                        </p>

                        {/* Description */}
                        {req.description && (
                          <p className="text-xs text-ink-muted leading-relaxed line-clamp-3 mb-4 bg-base p-3 rounded-xl border border-rule/60">
                            {req.description}
                          </p>
                        )}

                        {/* Key Details Pills */}
                        <div className="grid grid-cols-2 gap-2 mb-5">
                          {/* Fee */}
                          <div className="bg-base/70 p-2.5 rounded-xl border border-rule/60">
                            <div className="text-[10px] font-display uppercase tracking-wide text-ink-faint font-semibold">Estimated Fee</div>
                            <div className="text-xs font-bold text-ink mt-0.5">
                              {req.fee_min !== null && req.fee_max !== null
                                ? (req.fee_min === 0 && req.fee_max === 0
                                    ? 'Free / Included'
                                    : `${formatCurrency(req.fee_min, country)} – ${formatCurrency(req.fee_max, country)}`)
                                : <span className="text-amber-700 dark:text-amber-400 italic text-[11px]">Fee Verification Pending</span>
                              }
                            </div>
                          </div>

                          {/* Processing Time */}
                          <div className="bg-base/70 p-2.5 rounded-xl border border-rule/60">
                            <div className="text-[10px] font-display uppercase tracking-wide text-ink-faint font-semibold">Processing Time</div>
                            <div className="text-xs font-bold text-ink mt-0.5 flex items-center gap-1">
                              <Clock size={12} className="text-ink-faint" />
                              {req.processing_time || 'Varies by agency'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-4 border-t border-rule/60 flex items-center justify-between gap-2 flex-wrap">
                        <button
                          onClick={() => handleDownloadPacket(req)}
                          className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 text-accent font-semibold border-accent/30 hover:bg-accent-light"
                          title="Download Official Filled Application Packet"
                        >
                          <FileDown size={13} /> Application Packet
                        </button>

                        {isTracked ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-display bg-settled-light/60 text-settled border border-settled/30">
                            <Check size={14} strokeWidth={3} /> Tracking in Licenses
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddRequirement(req)}
                            disabled={isAdding}
                            className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1.5"
                          >
                            {isAdding ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={14} />}
                            Add to My Licenses
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State Fallback */
        <div className="bg-surface rounded-3xl border border-rule p-8 text-center max-w-2xl mx-auto my-8 shadow-card space-y-4">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-ink">No Requirements Found</h3>
            <p className="text-sm text-ink-muted mt-2 max-w-lg mx-auto">
              No pre-populated catalog items match <strong>{businessType.replace('_', ' ')}</strong> in <strong>{operatingCities.join(', ')}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Add City Modal */}
      <AnimatePresence>
        {showAddCityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-3xl border border-rule shadow-2xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between border-b border-rule pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="text-accent" size={20} />
                  <h3 className="text-lg font-bold font-display text-ink">Add Operating City</h3>
                </div>
                <button onClick={() => setShowAddCityModal(false)} className="text-ink-faint hover:text-ink">
                  <X size={20} />
                </button>
              </div>

              <p className="text-xs text-ink-muted">
                Add another jurisdiction where your business operates. The <strong>Smart-Diff engine</strong> will automatically deduplicate federal permits and merge local permits.
              </p>

              <div>
                <label className="block text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-1.5">Select City *</label>
                <select
                  value={selectedNewCity}
                  onChange={(e) => setSelectedNewCity(e.target.value)}
                  className="input w-full"
                >
                  <option value="">-- Choose city from {country} --</option>
                  {availableCitiesToAdd.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddCityModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={() => handleAddCity(selectedNewCity)}
                  disabled={!selectedNewCity || addingCity}
                  className="btn-primary flex-1"
                >
                  {addingCity ? 'Adding…' : 'Merge Jurisdiction'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
