import { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Search, Plus, Check, ExternalLink, Clock,
  Building2, AlertCircle, Sparkles, MapPin, X, ChevronRight, CheckCircle2, FileDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useDemo } from '../context/DemoContext';
import { getRequirements, getBusinessRequirements, createBusinessRequirement, updateBusiness } from '../services/supabase';
import { formatCurrency } from '../utils/formatters';
import { fillOfficialForm } from '../utils/formFillEngine';
import { computeSmartDiff, isRequirementApplicable } from '../utils/jurisdictionEngine';

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
  federal: 'bg-purple-50 text-purple-700 border-purple-200',
  state: 'bg-blue-50 text-blue-700 border-blue-200',
  city: 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function MyRequirements() {
  const { t } = useTranslation();
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
      const matched = masterList.filter(req => isRequirementApplicable(req, operatingCities, businessType));

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

        // Smart-Diff for Demo Mode
        const { deltaRequirements, sharedRequirements } = computeSmartDiff(
          demoBusinessRequirements,
          cityStateStr,
          businessType,
          demoRequirements
        );

        deltaRequirements.forEach(req => addDemoRequirement(req));

        toast.success(
          `${cityStateStr} added! Smart-Diff added ${deltaRequirements.length} new permit(s) (${sharedRequirements.length} shared permits preserved).`
        );
      } else {
        if (!business?.id) {
          toast.error('Please complete onboarding setup first.');
          return;
        }
        await updateBusiness(business.id, { cities: updatedCities });

        let addedCount = 0;
        let sharedCount = 0;
        try {
          const [catalogReqs, existingBrs] = await Promise.all([
            getRequirements(businessType, [cityStateStr]),
            getBusinessRequirements(business.id).catch(() => [])
          ]);

          const { deltaRequirements, sharedRequirements } = computeSmartDiff(
            existingBrs,
            cityStateStr,
            businessType,
            catalogReqs
          );

          addedCount = deltaRequirements.length;
          sharedCount = sharedRequirements.length;

          if (deltaRequirements.length > 0) {
            const createPromises = deltaRequirements.map(req =>
              createBusinessRequirement({
                business_id: business.id,
                requirement_id: req.id,
                status: 'needed',
                issuing_authority: req.issuing_agency,
              })
            );
            await Promise.all(createPromises);
          }
        } catch (smartDiffErr) {
          console.error("Smart-Diff auto-population failed:", smartDiffErr);
        }

        toast.success(
          `${cityStateStr} added! Smart-Diff added ${addedCount} new state/local permit(s) (${sharedCount} shared permit(s) preserved).`
        );
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
    const seenReqKeys = new Set();

    filteredRequirements.forEach(req => {
      const isTracked = trackedReqIds.has(req.id);
      const isFederal = req.jurisdiction_level === 'federal';

      if (isFederal && isTracked) {
        if (!seenReqKeys.has(`federal_${req.requirement_name.toLowerCase()}`)) {
          seenReqKeys.add(`federal_${req.requirement_name.toLowerCase()}`);
          coveredFederal.push(req);
        }
      } else {
        const cityKey = req.city || 'General / Federal';
        const dedupeKey = `${cityKey}_${req.requirement_name?.toLowerCase().trim()}`;
        if (!seenReqKeys.has(dedupeKey)) {
          seenReqKeys.add(dedupeKey);
          if (!cityMap[cityKey]) cityMap[cityKey] = [];
          cityMap[cityKey].push(req);
        }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-5 md:p-6 rounded-lg border border-rule-dark shadow-card">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-accent/10 rounded-md border border-accent/20 flex items-center justify-center text-accent">
              <ClipboardList size={18} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-display text-ink tracking-tight">{t('requirements.title')}</h1>
              <p className="text-xs text-ink-muted">{t('requirements.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Operating Cities Badges & Add City Action */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-display font-medium px-2.5 py-1 bg-base rounded-md border border-rule-dark text-ink-muted flex items-center gap-1.5">
            <Building2 size={12} className="text-accent" />
            <span className="capitalize">{businessType.replace('_', ' ')}</span>
          </span>

          {operatingCities.map((city, idx) => (
            <span key={idx} className="text-xs font-display font-medium px-2.5 py-1 bg-accent/8 text-accent-dark rounded-md border border-accent/20 flex items-center gap-1.5">
              <MapPin size={11} className="text-accent" />
              {city}
            </span>
          ))}

          {/* Quick Add City Button */}
          <button
            onClick={() => setShowAddCityModal(true)}
            className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 border-dashed border-rule-dark hover:border-accent text-accent"
          >
            <Plus size={13} /> {t('requirements.add_city')}
          </button>
        </div>
      </div>

      {/* Smart-Diff Jurisdiction Banner */}
      {isMultiCity && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent/8 border border-accent/25 border-l-[3px] border-l-accent rounded-lg p-3.5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center text-white shrink-0 shadow-subtle">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="font-bold text-accent-dark font-display text-xs md:text-sm flex items-center gap-2">
                Smart-Diff Engine Active
                <span className="text-[10px] font-mono bg-accent text-white px-2 py-0.2 rounded font-semibold uppercase">
                  {operatingCities.length} Jurisdictions
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Cross-referencing <strong>{operatingCities.join(' & ')}</strong>. Federal requirements auto-deduplicated across cities.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-medium font-display px-2.5 py-1 bg-surface text-ink-muted rounded-md border border-rule-dark self-start md:self-auto shadow-subtle flex items-center gap-1.5">
            <Sparkles size={12} className="text-accent" /> Reusable Federal Covered
          </div>
        </motion.div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder={t('requirements.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 w-full text-xs"
          />
        </div>

        {/* Jurisdiction Filters */}
        <div className="flex items-center bg-surface p-1 rounded-md border border-rule-dark gap-1 shadow-subtle">
          {['all', 'federal', 'state', 'city'].map((j) => (
            <button
              key={j}
              onClick={() => setJurisdictionFilter(j)}
              className={`px-3 py-1 text-xs font-medium font-display rounded transition-all capitalize ${
                jurisdictionFilter === j
                  ? 'bg-accent text-white shadow-subtle'
                  : 'text-ink-muted hover:text-ink hover:bg-base'
              }`}
            >
              {t(`requirements.${j}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-surface rounded-lg border border-rule-dark p-5 space-y-3 shadow-card">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-3.5 w-1/3" />
              <div className="skeleton h-14 w-full" />
            </div>
          ))}
        </div>
      ) : filteredRequirements.length > 0 ? (
        <div className="space-y-6">
          {/* SECTION 1: Covered / Reusable Across Cities (Federal) */}
          {coveredFederalReqs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-rule-dark pb-2">
                <CheckCircle2 size={16} className="text-settled" />
                <h2 className="text-sm font-bold font-display text-ink tracking-tight">
                  Covered Across Cities (Federal / Reusable Permits)
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.2 bg-settled/10 text-settled rounded-md border border-settled/20 font-semibold">
                  {coveredFederalReqs.length} Covered
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coveredFederalReqs.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface rounded-lg border border-rule-dark border-l-[3px] border-l-settled p-5 shadow-card flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[10px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
                          {req.jurisdiction_level}
                        </span>
                        <span className="text-xs font-medium font-display text-settled flex items-center gap-1">
                          <CheckCircle2 size={13} /> Satisfied
                        </span>
                      </div>

                      <h3 className="text-base font-bold font-display text-ink leading-snug mb-1">
                        {req.requirement_name}
                      </h3>
                      <p className="text-xs text-ink-muted font-medium mb-2.5 flex items-center gap-1.5 font-mono">
                        <Building2 size={12} className="text-ink-faint" />
                        {req.issuing_agency}
                      </p>

                      {req.description && (
                        <p className="text-xs text-ink-muted leading-relaxed line-clamp-3 mb-3.5 bg-base p-2.5 rounded-md border border-rule-dark/50">
                          {req.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Action Bar */}
                    <div className="pt-3 border-t border-rule-dark/50 space-y-2">
                      <button
                        onClick={() => handleDownloadPacket(req)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-ink hover:bg-ink/90 text-white transition-colors shadow-subtle text-xs"
                        title="Download your pre-filled official application form"
                      >
                        <div className="flex items-center gap-2">
                          <FileDown size={14} className="text-white/80" />
                          <span className="font-semibold font-display">Pre-fill &amp; Download Form</span>
                        </div>
                        <ExternalLink size={12} className="text-white/50" />
                      </button>
                      <div className="flex items-center justify-end">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium font-display bg-settled/10 text-settled border border-settled/25">
                          <Check size={12} strokeWidth={2.5} /> Active across all locations
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: City-Specific Groups */}
          {Object.entries(citySpecificGroups).map(([cityName, items]) => (
            <div key={cityName} className="space-y-3">
              <div className="flex items-center justify-between border-b border-rule-dark pb-2">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-accent" />
                  <h2 className="text-sm font-bold font-display text-ink tracking-tight">
                    {isMultiCity ? `Permits for ${cityName}` : `Required Permits — ${cityName}`}
                  </h2>
                  <span className="text-[11px] font-mono px-2 py-0.2 bg-accent/10 text-accent rounded-md border border-accent/20 font-semibold">
                    {items.length} Required
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((req) => {
                  const isTracked = trackedReqIds.has(req.id);
                  const isAdding = addingId === req.id;
                  const jurisClass = JURISDICTION_CLASSES[req.jurisdiction_level] || JURISDICTION_CLASSES.city;

                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-surface rounded-lg border border-rule-dark shadow-card hover:shadow-card-hover transition-all p-5 flex flex-col justify-between ${isTracked ? 'border-l-[3px] border-l-settled' : 'border-l-[3px] border-l-accent'}`}
                    >
                      <div>
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className={`text-[10px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${jurisClass}`}>
                            {req.jurisdiction_level}
                          </span>
                          <span className="text-xs text-ink-muted font-medium flex items-center gap-1 font-mono">
                            <MapPin size={11} className="text-ink-faint" /> {req.city}
                          </span>
                        </div>

                        {/* Title & Agency */}
                        <h3 className="text-base font-bold font-display text-ink leading-snug mb-1">
                          {req.requirement_name}
                        </h3>
                        <p className="text-xs text-ink-muted font-medium mb-2.5 flex items-center gap-1.5 font-mono">
                          <Building2 size={12} className="text-ink-faint" />
                          {req.issuing_agency}
                        </p>

                        {/* Description */}
                        {req.description && (
                          <p className="text-xs text-ink-muted leading-relaxed line-clamp-3 mb-3.5 bg-base p-2.5 rounded-md border border-rule-dark/50">
                            {req.description}
                          </p>
                        )}

                        {/* Key Details Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {/* Fee */}
                          <div className="bg-base/70 p-2 rounded-md border border-rule-dark/60">
                            <div className="text-[10px] font-display uppercase tracking-wider text-ink-muted font-semibold">Estimated Fee</div>
                            <div className="text-xs font-bold font-mono text-ink mt-0.5">
                              {req.fee_min !== null && req.fee_max !== null
                                ? (req.fee_min === 0 && req.fee_max === 0
                                    ? 'Free / Included'
                                    : `${formatCurrency(req.fee_min, country)} – ${formatCurrency(req.fee_max, country)}`)
                                : <span className="text-accent-dark italic text-[11px]">Fee Verification Pending</span>
                              }
                            </div>
                          </div>

                          {/* Processing Time */}
                          <div className="bg-base/70 p-2 rounded-md border border-rule-dark/60">
                            <div className="text-[10px] font-display uppercase tracking-wider text-ink-muted font-semibold">Processing Time</div>
                            <div className="text-xs font-bold font-mono text-ink mt-0.5 flex items-center gap-1">
                              <Clock size={11} className="text-ink-faint" />
                              {req.processing_time || 'Varies by agency'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Action Bar */}
                      <div className="pt-3 border-t border-rule-dark/50 space-y-2">
                        <button
                          onClick={() => handleDownloadPacket(req)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-ink hover:bg-ink/90 text-white transition-colors shadow-subtle text-xs"
                          title="Download your pre-filled official application form"
                        >
                          <div className="flex items-center gap-2">
                            <FileDown size={14} className="text-white/80" />
                            <span className="font-semibold font-display">Pre-fill &amp; Download Form</span>
                          </div>
                          <ExternalLink size={12} className="text-white/50" />
                        </button>

                        <div className="flex items-center justify-end">
                          {isTracked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium font-display bg-settled/10 text-settled border border-settled/25">
                              <Check size={12} strokeWidth={2.5} /> Tracking in Licenses
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddRequirement(req)}
                              disabled={isAdding}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold font-display bg-accent text-white hover:bg-accent-dark transition-colors shadow-subtle"
                            >
                              {isAdding ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={12} />}
                              Add to My Licenses
                            </button>
                          )}
                        </div>
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
        <div className="bg-surface rounded-lg border border-rule-dark p-8 text-center max-w-2xl mx-auto my-8 shadow-card space-y-3">
          <div className="w-10 h-10 bg-amber-50 text-caution rounded-md border border-amber-200 flex items-center justify-center mx-auto">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold font-display text-ink">No Requirements Found</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-lg mx-auto">
              No pre-populated catalog items match <strong>{businessType.replace('_', ' ')}</strong> in <strong>{operatingCities.join(', ')}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Add City Modal */}
      <AnimatePresence>
        {showAddCityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-surface rounded-lg border border-rule-dark shadow-xl p-5 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between border-b border-rule-dark pb-2.5">
                <div className="flex items-center gap-2">
                  <MapPin className="text-accent" size={18} />
                  <h3 className="text-base font-bold font-display text-ink">Add Operating City</h3>
                </div>
                <button onClick={() => setShowAddCityModal(false)} className="text-ink-faint hover:text-ink">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-ink-muted">
                Add another jurisdiction where your business operates. The <strong>Smart-Diff engine</strong> will automatically deduplicate federal permits and merge local permits.
              </p>

              <div>
                <label className="block text-[11px] font-semibold font-display text-ink-muted uppercase tracking-wider mb-1">Select City *</label>
                <select
                  value={selectedNewCity}
                  onChange={(e) => setSelectedNewCity(e.target.value)}
                  className="input w-full text-xs"
                >
                  <option value="">-- Choose city from {country} --</option>
                  {availableCitiesToAdd.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button onClick={() => setShowAddCityModal(false)} className="btn-secondary flex-1 text-xs py-2">
                  Cancel
                </button>
                <button
                  onClick={() => handleAddCity(selectedNewCity)}
                  disabled={!selectedNewCity || addingCity}
                  className="btn-primary flex-1 text-xs py-2"
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
