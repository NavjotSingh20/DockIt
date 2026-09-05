import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Plus, Building2, AlertTriangle, MapPin, ClipboardCheck, MessageSquare, Clock, Map, FileText, DollarSign } from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import toast from 'react-hot-toast';
import ScrollFloat from '../components/ui/ScrollFloat';
import SeamlessStrokeText from '../components/ui/SeamlessStrokeText';
import DockItLogo from '../components/ui/DockItLogo';

/* ─── Real US Food Truck Permit Data (Hero animation — Rico's Curbside Kitchen NYC example) ─── */
const US_HERO_CHECKLIST = [
  { id: 'us-1', name: 'Mobile Food Vending License', agency: 'NYC Dept. of Consumer & Worker Protection (DCWP)', fee: '$50', cities: ['New York'] },
  { id: 'us-2', name: 'Mobile Food Vendor (MFV) Unit Permit', agency: 'NYC Dept. of Health & Mental Hygiene (DOHMH)', fee: '$200', cities: ['New York'] },
  { id: 'us-3', name: 'Food Protection Certificate (MFV)', agency: 'NYC Health Academy / DOHMH', fee: '$114', cities: ['New York'] },
  { id: 'us-4', name: 'Employer Identification Number (EIN / SS-4)', agency: 'Internal Revenue Service (IRS Federal)', fee: '$0 Free', cities: ['New York', 'Los Angeles'] },
  { id: 'us-5', name: 'NYS Certificate of Authority (Sales Tax)', agency: 'NY State Dept. of Taxation & Finance', fee: '$0 Free', cities: ['New York'] },
  { id: 'us-6', name: 'Approved Commercial Commissary Agreement', agency: 'DOHMH Registered Commissary Kitchen', fee: 'Required', cities: ['New York'] },
  { id: 'us-7', name: 'Environmental Control Board (ECB) Clearance', agency: 'NYC Office of Administrative Trials (OATH)', fee: '$0 Free', cities: ['New York'] },
];

/* ─── Smart-Diff demo data (US Multi-City Expansion: New York -> Los Angeles) ─── */
const DIFF_CITY_A_ITEMS = [
  { id: 'nyc-1', name: 'NYC Mobile Food Vending License', agency: 'NYC DCWP', fee: '$50', cities: ['New York'] },
  { id: 'nyc-2', name: 'NYC DOHMH Unit Vending Permit', agency: 'NYC Dept. of Health (DOHMH)', fee: '$200', cities: ['New York'] },
  { id: 'nyc-3', name: 'NYS Certificate of Authority (Sales Tax)', agency: 'NY State Dept. of Tax & Finance', fee: '$0', cities: ['New York'] },
  { id: 'nyc-4', name: 'NYC Food Protection Certificate', agency: 'NYC DOHMH Health Academy', fee: '$114', cities: ['New York'] },
  { id: 'us-shared-1', name: 'Employer Identification Number (EIN)', agency: 'Internal Revenue Service (IRS)', fee: '$0', cities: ['New York', 'Los Angeles'] },
  { id: 'us-shared-2', name: 'Commercial Commissary Agreement', agency: 'Licensed Commercial Commissary', fee: 'Active', cities: ['New York', 'Los Angeles'] },
  { id: 'us-shared-3', name: 'Commercial General Liability Policy', agency: 'Standard US Commercial Carrier', fee: 'Active', cities: ['New York', 'Los Angeles'] },
];

const DIFF_CITY_B_ITEMS = [
  { id: 'la-1', name: 'LA County Mobile Food Facility (MFF) Permit', agency: 'LA County Dept. of Public Health (LACDPH)', fee: '$435', cities: ['Los Angeles'] },
  { id: 'la-2', name: 'City of LA Business Tax Certificate (BTRC)', agency: 'City of Los Angeles Office of Finance', fee: '$50', cities: ['Los Angeles'] },
  { id: 'la-3', name: 'California Seller\'s Permit', agency: 'California Dept. of Tax & Fee Admin (CDTFA)', fee: '$0', cities: ['Los Angeles'] },
  { id: 'la-4', name: 'California HCD Commercial Vehicle Insignia', agency: 'CA Dept. of Housing & Community Dev.', fee: '$100', cities: ['Los Angeles'] },
  { id: 'la-5', name: 'California Food Handler / Manager Card', agency: 'CA Dept. of Public Health', fee: '$15', cities: ['Los Angeles'] },
];

const DIFF_SHARED_IDS = ['us-shared-1', 'us-shared-2', 'us-shared-3'];

/* ─── City tag pill ─── */
function CityTag({ city }) {
  const colors = {
    'New York': 'bg-accent/10 text-accent-dark',
    'Los Angeles': 'bg-settled/15 text-settled',
    'Federal': 'bg-ink/8 text-ink-muted',
    Both: 'bg-settled/15 text-settled',
  };
  return (
    <span className={`text-[11px] font-display font-semibold px-2 py-0.5 rounded-full ${colors[city] || 'bg-ink/8 text-ink-muted'}`}>
      {city}
    </span>
  );
}

/* ─── Checklist item row ─── */
function ChecklistItem({ item, state = 'default', showCity = false }) {
  const stateStyles = {
    default: 'border-l-2 border-transparent',
    covered: 'border-l-2 border-settled bg-settled-light/50',
    new: 'border-l-2 border-accent bg-accent-light/40',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${stateStyles[state]} transition-all duration-300`}>
      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
        state === 'covered' ? 'bg-settled/20' : state === 'new' ? 'bg-accent/15' : 'bg-ink/5'
      }`}>
        {state === 'covered' ? (
          <Check size={13} className="text-settled" strokeWidth={3} />
        ) : state === 'new' ? (
          <Plus size={13} className="text-accent" strokeWidth={3} />
        ) : (
          <div className="w-2 h-2 rounded-sm bg-ink-faint/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${state === 'covered' ? 'text-ink-muted' : 'text-ink'}`}>
          {item.name}
        </div>
        <div className="text-xs text-ink-faint truncate">{item.agency}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.fee && (
          <span className="text-[11px] font-display font-bold text-ink-muted bg-base px-2 py-0.5 rounded-md border border-rule/60">
            {item.fee}
          </span>
        )}
        {showCity && (
          <CityTag city={item.cities.length > 1 ? 'Both' : item.cities[0]} />
        )}
      </div>
    </div>
  );
}

/* ─── Hero checklist module (enhanced with US Food Truck banner) ─── */
function HeroChecklist() {
  const [checkedItems, setCheckedItems] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  // Auto-check items sequentially after mount
  useEffect(() => {
    const timers = US_HERO_CHECKLIST.map((item, i) =>
      setTimeout(() => {
        setCheckedItems((prev) => [...prev, item.id]);
      }, 900 + i * 450)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Track mouse position for subtle tilt
  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  const progress = (checkedItems.length / US_HERO_CHECKLIST.length) * 100;

  const tiltStyle = isHovered
    ? {
        transform: `perspective(800px) rotateY(${mousePos.x * 3}deg) rotateX(${-mousePos.y * 3}deg) scale(1.02)`,
        transition: 'transform 0.15s ease-out',
      }
    : {
        transform: 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)',
        transition: 'transform 0.4s ease-out',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
      className="w-full md:w-96"
    >
      <div
        ref={cardRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setMousePos({ x: 0, y: 0 }); }}
        onMouseMove={handleMouseMove}
        className="bg-surface rounded-2xl border border-rule overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 group"
        style={{
          ...tiltStyle,
        }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-rule/60 bg-surface">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span className="text-sm font-display font-bold text-ink">Rico's Curbside Kitchen</span>
              <span className="text-[10px] font-display font-semibold uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent">NYC Food Truck</span>
            </div>
            <span className="text-xs font-display text-ink-faint">
              {checkedItems.length}/{US_HERO_CHECKLIST.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-rule/50 rounded-full mt-2 overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Checklist items with staggered reveal + auto-check */}
        <div className="px-1.5 py-2 divide-y divide-rule/30">
          {US_HERO_CHECKLIST.map((item, i) => {
            const isChecked = checkedItems.includes(item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.35, ease: 'easeOut' }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-base-dark/40 transition-colors"
              >
                {/* Checkbox with animation */}
                <motion.div
                  className={`w-4.5 h-4.5 rounded flex items-center justify-center flex-shrink-0 border transition-all duration-300 ${
                    isChecked
                      ? 'bg-settled border-settled shadow-sm'
                      : 'border-rule-dark bg-transparent'
                  }`}
                  animate={isChecked ? { scale: [1, 1.25, 1] } : {}}
                  transition={{ duration: 0.25 }}
                  style={{ width: 18, height: 18 }}
                >
                  {isChecked && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.div>

                {/* Item text */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[12.5px] font-medium transition-colors duration-300 ${
                    isChecked ? 'text-ink-muted line-through decoration-settled/40' : 'text-ink'
                  }`}>
                    {item.name}
                  </div>
                  <div className="text-[11px] text-ink-faint truncate">{item.agency}</div>
                </div>

                {/* Statutory fee */}
                <span className="text-[11px] font-display font-bold text-ink-muted bg-base px-1.5 py-0.5 rounded border border-rule/50 flex-shrink-0">
                  {item.fee}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom status */}
        <div className="px-4 py-3 bg-base-dark/30 border-t border-rule/40">
          <AnimatePresence mode="wait">
            {checkedItems.length === US_HERO_CHECKLIST.length ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-settled flex items-center justify-center">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </div>
                  <span className="text-xs font-display font-bold text-settled">
                    NYC 314C &amp; SS-4 Form Ready
                  </span>
                </div>
                <span className="text-[11px] font-display font-bold text-accent">
                  100% Cleared
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-xs text-ink-faint flex items-center justify-between"
              >
                <span>Verifying Federal, NY State &amp; NYC agencies…</span>
                <span className="font-display font-bold text-ink-muted">{Math.round(progress)}%</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Smart-diff demo (US Multi-City Expansion: New York -> Los Angeles) ─── */
function SmartDiffDemo() {
  const [showCityB, setShowCityB] = useState(false);
  const diffRef = useRef(null);

  // Auto-trigger the diff after a delay when section scrolls into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const timer = setTimeout(() => setShowCityB(true), 1200);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.4 }
    );
    if (diffRef.current) observer.observe(diffRef.current);
    return () => observer.disconnect();
  }, []);

  const coveredItems = DIFF_CITY_A_ITEMS.filter((item) => DIFF_SHARED_IDS.includes(item.id));
  const cityAOnlyItems = DIFF_CITY_A_ITEMS.filter((item) => !DIFF_SHARED_IDS.includes(item.id));

  return (
    <div ref={diffRef} className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center">
            <span className="text-xs font-display font-bold text-base">1</span>
          </div>
          <span className="text-sm font-display font-semibold text-ink">New York, NY (Primary)</span>
        </div>
        <div className="h-px flex-1 bg-rule" />
        <button
          onClick={() => setShowCityB(!showCityB)}
          className={`flex items-center gap-2 transition-all duration-300 cursor-pointer ${
            showCityB ? '' : 'animate-pulse'
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-300 ${
            showCityB ? 'bg-accent' : 'bg-rule-dark'
          }`}>
            <span className={`text-xs font-display font-bold ${showCityB ? 'text-white' : 'text-ink-muted'}`}>2</span>
          </div>
          <span className={`text-sm font-display font-semibold transition-colors duration-300 ${
            showCityB ? 'text-accent' : 'text-ink-faint'
          }`}>
            {showCityB ? '+ Los Angeles Added' : '+ Add Los Angeles'}
          </span>
        </button>
      </div>

      {/* Checklist card */}
      <div className="bg-surface rounded-2xl border border-rule overflow-hidden shadow-card transition-all duration-500">
        {/* Header */}
        <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-bold text-ink">Expansion Checklist</span>
            <CityTag city="New York" />
            <AnimatePresence>
              {showCityB && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <CityTag city="Los Angeles" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-xs text-ink-faint font-display">
            {showCityB ? `${DIFF_CITY_A_ITEMS.length + DIFF_CITY_B_ITEMS.length - coveredItems.length} active licenses` : `${DIFF_CITY_A_ITEMS.length} licenses`}
          </span>
        </div>

        {/* Items */}
        <div className="divide-y divide-rule/50">
          {!showCityB ? (
            // Pre-diff: just City A items
            DIFF_CITY_A_ITEMS.map((item) => (
              <ChecklistItem key={item.id} item={item} />
            ))
          ) : (
            // Post-diff: split into groups
            <>
              {/* City A-only items stay */}
              {cityAOnlyItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                >
                  <ChecklistItem item={item} showCity />
                </motion.div>
              ))}

              {/* Already covered group (Federal / Nationwide US Base) */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
                className="bg-settled-light/30 overflow-hidden"
              >
                <div className="px-4 py-2 flex items-center gap-2">
                  <Check size={14} className="text-settled" strokeWidth={3} />
                  <span className="text-xs font-display font-bold text-settled uppercase tracking-wide">
                    Already Covered Across the US (Federal / Baseline)
                  </span>
                </div>
                {coveredItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.35 }}
                  >
                    <ChecklistItem item={item} state="covered" showCity />
                  </motion.div>
                ))}
              </motion.div>

              {/* New for City B group (LA County & California Delta) */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 py-2 flex items-center gap-2">
                  <Plus size={14} className="text-accent" strokeWidth={3} />
                  <span className="text-xs font-display font-bold text-accent uppercase tracking-wide">
                    New For Los Angeles (County &amp; State Delta)
                  </span>
                </div>
                {DIFF_CITY_B_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.35 }}
                  >
                    <ChecklistItem item={item} state="new" showCity />
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   USA COMPLIANCE RISK & PENALTY CALCULATOR (Dollar Currency & Real US Data)
   ════════════════════════════════════════════════════════════════ */
const CALCULATOR_DATA = {
  food_truck: {
    name: 'Food Truck / Mobile Vendor',
    cities: {
      'New York, NY': {
        time: '30–60 Days',
        startupCost: '$364 – $600',
        violations: [
          { name: 'Unlicensed Mobile Food Vending', penalty: '$1,000 fine + Vehicle Impound', law: 'NYC Admin. Code § 17-314/325' },
          { name: 'Missing Food Protection Certificate', penalty: '$250 – $1,000 fine', law: 'NYC Health Code § 81.09' },
          { name: 'Operating without NYS Sales Tax Authority', penalty: 'Up to $10,000 penalty + Misdemeanor', law: 'NY Tax Law § 1145' },
          { name: 'Unapproved Commissary Servicing', penalty: 'Immediate Permit Revocation', law: 'NYC Health Code § 89.27' }
        ]
      },
      'Los Angeles, CA': {
        time: '45–75 Days',
        startupCost: '$585 – $850',
        violations: [
          { name: 'Operating without LACDPH Health Permit', penalty: 'Up to $1,000 fine / 6 mos jail + Impoundment', law: 'CalCode § 114381' },
          { name: 'Operating without City of LA BTRC', penalty: 'Principal tax + 40% civil penalty', law: 'LAMC § 21.05' },
          { name: 'Missing California Food Handler / Manager Card', penalty: '$100 – $500 fine per uncertified employee', law: 'CalCode § 113948' },
          { name: 'Missing HCD Vehicle Insignia', penalty: 'Red-Tagging / Immediate Closure', law: 'CA Health & Safety Code § 18029' }
        ]
      }
    }
  },
  restaurant: {
    name: 'Restaurant / Brick-and-Mortar',
    cities: {
      'New York, NY': {
        time: '60–90 Days',
        startupCost: '$650 – $1,800',
        violations: [
          { name: 'Missing NYC DOHMH Food Service Permit', penalty: '$1,000 – $2,000 + Closure Order', law: 'NYC Health Code § 81.05' },
          { name: 'Operating without DOB Certificate of Occupancy', penalty: 'DOB Stop Work / Vacate Order', law: 'NYC Building Code § 28-118' },
          { name: 'Missing Certified Food Protection Supervisor', penalty: '$1,000 health citation', law: 'NYC Health Code § 81.09' },
          { name: 'Fire Suppression Non-Compliance', penalty: 'FDNY Summons + Immediate Seal', law: 'NYC Fire Code § 904' }
        ]
      },
      'Los Angeles, CA': {
        time: '60–90 Days',
        startupCost: '$800 – $2,200',
        violations: [
          { name: 'Missing LACDPH Restaurant Public Health Permit', penalty: 'Premises closure notice + fines', law: 'CalCode § 114381' },
          { name: 'Operating without City of LA BTRC', penalty: '40% civil penalty on back taxes', law: 'LAMC § 21.05' },
          { name: 'Missing Certified Food Safety Manager', penalty: '$500 health citation', law: 'CalCode § 113947.1' },
          { name: 'Fire Suppression Non-Compliance', penalty: 'LAFD Notice of Violation', law: 'LAFD Fire Code § 904' }
        ]
      }
    }
  },
  cloud_kitchen: {
    name: 'Ghost Kitchen / Commercial Prep',
    cities: {
      'New York, NY': {
        time: '30–45 Days',
        startupCost: '$450 – $1,200',
        violations: [
          { name: 'Missing Non-Retail Food Processing Permit', penalty: '$1,000 fine + Cease & Desist', law: 'NYS Dept. of Agriculture & Markets § 500' },
          { name: 'Unregistered Commercial Kitchen Facility', penalty: 'Premises closure notice', law: 'NYC Health Code § 81' },
          { name: 'Operating without NYS Sales Tax Registration', penalty: 'Up to $10,000 penalty', law: 'NY Tax Law § 1145' }
        ]
      },
      'Los Angeles, CA': {
        time: '30–60 Days',
        startupCost: '$550 – $1,400',
        violations: [
          { name: 'Missing LACDPH Shared Kitchen Operator Permit', penalty: 'Immediate Suspension of Facility', law: 'CalCode § 114381' },
          { name: 'Operating without City of LA BTRC', penalty: 'Late penalty + audit notice', law: 'LAMC § 21.05' },
          { name: 'Missing California Food Handler Verification', penalty: '$250 citation per violation', law: 'CalCode § 113948' }
        ]
      }
    }
  }
};

function ComplianceRiskCalculator() {
  const [bizType, setBizType] = useState('food_truck');
  const [city, setCity] = useState('New York, NY');
  
  const bizData = CALCULATOR_DATA[bizType];
  const cityConfig = bizData?.cities[city] || bizData?.cities['New York, NY'];

  return (
    <div className="bg-surface rounded-3xl border border-rule p-6 md:p-8 max-w-3xl mx-auto shadow-card">
      <div className="text-center max-w-md mx-auto mb-6">
        <span className="text-xs font-bold font-display text-accent uppercase tracking-wider">Statutory Intelligence Tool</span>
        <h3 className="text-xl font-bold font-display text-ink mt-1">US Compliance &amp; Penalty Risk Estimator</h3>
        <p className="text-xs text-ink-faint mt-1">Estimate processing times, official government fees, and statutory penalty risks for US jurisdictions.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-bold font-display text-ink-muted uppercase tracking-wide block mb-1.5">Business Category</label>
          <div className="flex gap-2">
            {Object.entries(CALCULATOR_DATA).map(([key, data]) => (
              <button key={key} onClick={() => setBizType(key)}
                className={`flex-1 py-2 px-2.5 text-xs font-bold font-display rounded-xl border transition-all cursor-pointer ${bizType === key ? 'bg-accent border-accent text-white' : 'bg-surface border-rule text-ink-muted hover:bg-base'}`}>
                {data.name.split(' / ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold font-display text-ink-muted uppercase tracking-wide block mb-1.5">Target US City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}
            className="w-full input text-xs font-bold font-display py-2.5 cursor-pointer">
            <option value="New York, NY">New York, NY</option>
            <option value="Los Angeles, CA">Los Angeles, CA</option>
          </select>
        </div>
      </div>

      {cityConfig && (
        <div className="space-y-6 pt-4 border-t border-rule/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base/30 rounded-2xl p-4 border border-rule/30 text-center">
              <span className="text-[10px] font-bold font-display text-ink-faint uppercase tracking-wider">Est. Setup Time</span>
              <div className="text-lg font-black font-display text-ink mt-1">{cityConfig.time}</div>
            </div>
            <div className="bg-base/30 rounded-2xl p-4 border border-rule/30 text-center">
              <span className="text-[10px] font-bold font-display text-ink-faint uppercase tracking-wider">Govt. License Fees</span>
              <div className="text-lg font-black font-display text-accent mt-1">{cityConfig.startupCost}</div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold font-display text-ink-muted uppercase tracking-wide block">Statutory Non-Compliance Penalties</span>
            <div className="space-y-2">
              {cityConfig.violations.map((v, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 bg-surface rounded-xl border border-rule hover:border-rule-dark transition-all gap-1.5">
                  <div>
                    <div className="text-xs font-bold text-ink">{v.name}</div>
                    <div className="text-[10px] text-ink-faint font-display mt-0.5">{v.law}</div>
                  </div>
                  <div className="text-xs font-bold font-display text-danger bg-danger/10 px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0">
                    {v.penalty}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Pain point cards data (US Food Truck & Operator Realities) ─── */
const PAIN_POINTS = [
  {
    icon: Building2,
    iconBg: 'bg-ink/8',
    iconColor: 'text-ink-muted',
    headline: '4–7 overlapping agencies. Zero coordination.',
    body: 'A single food truck in New York or Los Angeles must navigate the IRS for EIN, State Revenue for Sales Tax, County/City Health (DOHMH or LACDPH) for mobile permits, Consumer Affairs (DCWP), and fire departments independently.',
  },
  {
    icon: AlertTriangle,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    headline: '$1,000+ fines, impoundment & red-tagging.',
    body: 'Operating without an authentic mobile food vending permit triggers immediate vehicle impoundment and fines over $1,000 under NYC Admin Code § 17-314 and CalCode § 114381. Unlicensed mobile units face confiscation on the spot.',
  },
  {
    icon: MapPin,
    iconBg: 'bg-caution/10',
    iconColor: 'text-caution',
    headline: 'Cross-jurisdiction expansion friction.',
    body: 'Expanding across city borders from NYC to Los Angeles or across county lines means re-learning distinct county health grading criteria, vehicle inspection insignias (HCD), and local business tax certificates (BTRC) from scratch.',
  },
];

/* ─── Feature grid data ─── */
const FEATURES = [
  {
    icon: ClipboardCheck,
    title: 'Unified US Compliance Roadmap',
    description: 'Federal EINs, state sales tax authority, certified commercial commissary contracts, and municipal food truck permits synthesized into one prioritized checklist.',
  },
  {
    icon: MessageSquare,
    title: 'AI Statutory Compliance Assistant',
    description: 'Ask about commissary requirements, Class A vs Class D truck health codes, parking time restrictions, or state sales tax registration in plain English.',
  },
  {
    icon: Clock,
    title: 'Automated Expiry & Renewal Vault',
    description: 'Stay ahead of 2-year DCWP licenses, annual DOHMH/LACDPH health decals, and vehicle inspection renewals with automated 60, 30, and 7-day milestone alerts.',
  },
  {
    icon: FileText,
    title: 'Authentic Statutory Form Engine',
    description: 'Automatically populates genuine government PDF forms like NYC Form 314C, IRS Form SS-4, and LA County Health Applications with millimeter-accurate tick-box slotting.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { enterDemo } = useDemo();

  const handleDemo = () => {
    enterDemo();
    navigate('/dashboard');
    toast.success('Demo loaded — explore the dashboard');
  };

  const handleGetStarted = () => {
    navigate('/onboard');
  };

  return (
    <div className="min-h-screen bg-base overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-base/90 backdrop-blur-md border-b border-rule">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <DockItLogo size="sm" />
          <div className="flex items-center gap-3">
            <button
              onClick={handleDemo}
              className="inline-flex items-center justify-center h-9 text-sm text-ink-muted hover:text-accent font-display font-medium transition-colors px-3 rounded-xl leading-none cursor-pointer"
            >
              Demo
            </button>
            <button
              onClick={handleGetStarted}
              className="btn-primary text-sm py-0 h-9 px-4 leading-none cursor-pointer"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════
         SECTION 1 — HERO: "Know What You Need. Before You Open."
         ════════════════════════════════════════════════════════════ */}
      <section className="pt-24 pb-12 md:pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="md:grid md:grid-cols-[1fr_auto] md:gap-12 md:items-start">
            {/* Left: copy */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-xl"
            >
              <h1 className="font-display font-bold text-ink text-3xl md:text-[2.75rem] md:leading-[1.15] leading-snug mb-5 tracking-tight">
                <SeamlessStrokeText 
                  text="Know What You Need. Before You Open." 
                  highlight="Before You Open."
                />
              </h1>
              <p className="text-ink-muted text-base md:text-lg leading-relaxed mb-8 max-w-lg">
                DockIt automates statutory licensing for American food trucks, mobile vendors, and culinary operators — from Federal EINs and State Sales Tax to municipal health permits, commissary agreements, and official Form 314C filings.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleGetStarted} className="btn-primary text-base px-7 py-3.5 leading-none cursor-pointer">
                  Build your checklist <ArrowRight size={18} />
                </button>
                <button onClick={handleDemo} className="inline-flex items-center justify-center text-sm text-ink-muted hover:text-accent font-display font-semibold transition-colors px-5 py-3.5 rounded-xl border border-rule hover:border-rule-dark bg-surface leading-none cursor-pointer">
                  Try demo
                </button>
              </div>
            </motion.div>

            {/* Right: interactive US Food Truck checklist preview */}
            <HeroChecklist />
          </div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 mt-12 md:mt-16 pt-6 border-t border-rule/50"
          >
            {['New York, NY', 'Los Angeles, CA', 'Austin, TX', 'Federal / Nationwide'].map((city) => (
              <div key={city} className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-settled shrink-0" />
                <span className="text-xs font-display font-semibold text-ink-faint uppercase tracking-wider leading-none select-none">
                  {city}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
         SECTION 2 — THE PROBLEM: "What happens without a system."
         ════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-4 bg-base-dark/50">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 md:mb-14"
          >
            <ScrollFloat
              animationDuration={1}
              ease="back.inOut(2)"
              scrollStart="center bottom+=50%"
              scrollEnd="bottom bottom-=40%"
              stagger={0.03}
              textClassName="font-display font-bold text-ink text-2xl md:text-3xl tracking-tight inline"
            >
              What happens without a system.
            </ScrollFloat>
            <p className="text-ink-muted text-[15px] leading-relaxed mt-4 max-w-xl">
              Food business licensing in the United States isn't difficult because the food is complex — it's difficult because the rules are fragmented across federal agencies (IRS), state tax boards (NYS DTF, CDTFA), and local municipal/county health departments (NYC DOHMH, LA County LACDPH) that don't talk to each other.
            </p>
          </motion.div>

          {/* Pain point cards */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-5 mb-14 md:mb-20">
            {PAIN_POINTS.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="bg-surface rounded-2xl border border-rule p-5 md:p-6 hover:shadow-card-hover transition-shadow duration-300"
              >
                <div className={`w-10 h-10 rounded-xl ${point.iconBg} flex items-center justify-center mb-4`}>
                  <point.icon size={20} className={point.iconColor} />
                </div>
                <h3 className="font-display font-bold text-ink text-base mb-2">{point.headline}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{point.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Risk calculator — proof of the problem */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-center text-sm font-display font-semibold text-ink-faint uppercase tracking-wider mb-6">
              Estimate statutory requirements &amp; non-compliance risks
            </p>
            <ComplianceRiskCalculator />
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
         SECTION 3 — WHAT WE OFFER: "One system. Every city."
         ════════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">

          {/* 3a: Smart-Diff Engine — the hero feature */}
          <div className="md:grid md:grid-cols-[1fr_1.3fr] md:gap-16 md:items-start mb-20 md:mb-28">
            {/* Left: explanation */}
            <div className="mb-10 md:mb-0 md:sticky md:top-24">
              <ScrollFloat
                animationDuration={1}
                ease="back.inOut(2)"
                scrollStart="center bottom+=50%"
                scrollEnd="bottom bottom-=40%"
                stagger={0.03}
                textClassName="font-display font-bold text-ink text-2xl md:text-3xl tracking-tight inline"
              >
                Add a city. See what's new.
              </ScrollFloat>

              <div className="space-y-4 text-ink-muted text-[15px] leading-relaxed mt-6">
                <p>
                  When expanding your food truck or culinary brand to a new US city, DockIt doesn't start over.
                  Your Federal EIN, commercial commissary foundation, and general business entity carry over seamlessly.
                </p>
                <p className="text-sm text-ink-faint">
                  DockIt isolates the exact county health permits, state seller's registrations, and vehicle inspection insignias required for the new market — with zero duplicate research.
                </p>
              </div>

              {/* Step markers */}
              <div className="mt-8 space-y-3">
                {[
                  { n: '1', label: 'Select your food business category + city' },
                  { n: '2', label: 'Get your comprehensive statutory checklist' },
                  { n: '3', label: 'Add expansion city — instantly see the delta' },
                ].map((step) => (
                  <div key={step.n} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-ink/8 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-display font-bold text-ink-muted">{step.n}</span>
                    </div>
                    <span className="text-sm text-ink-muted">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: interactive demo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <SmartDiffDemo />
            </motion.div>
          </div>

          {/* 3b: Feature Grid — 2x2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-10">
              <h2 className="font-display font-bold text-ink text-2xl md:text-3xl tracking-tight">
                Everything required to launch and stay compliant across the USA.
              </h2>
              <p className="text-ink-muted text-[15px] mt-3 max-w-lg mx-auto">
                From your initial IRS Form SS-4 and NYC Form 314C filings to annual health renewals — one unified intelligence platform.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {FEATURES.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.35 }}
                  className="group bg-surface rounded-2xl border border-rule p-5 md:p-6 hover:border-accent/30 hover:shadow-card-hover transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/8 flex items-center justify-center mb-4 group-hover:bg-accent/15 transition-colors duration-300">
                    <feature.icon size={20} className="text-accent" />
                  </div>
                  <h3 className="font-display font-bold text-ink text-[15px] mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
         SECTION 4 — CLOSING CTA + PROFESSIONAL FOOTER
         ════════════════════════════════════════════════════════════ */}

      {/* Final conversion block */}
      <section className="py-16 md:py-20 px-4 border-t border-rule/30">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <ScrollFloat
              animationDuration={1}
              ease="back.inOut(2)"
              scrollStart="center bottom+=50%"
              scrollEnd="bottom bottom-=40%"
              stagger={0.03}
              containerClassName="mb-3"
              textClassName="font-display font-bold text-ink text-2xl md:text-3xl tracking-tight inline"
            >
              Find out what you actually need.
            </ScrollFloat>
            <p className="text-ink-muted text-[15px] mb-8 max-w-md mx-auto">
              Build your complete US food truck and hospitality compliance checklist in under 60 seconds.
            </p>
            <button onClick={handleGetStarted} className="btn-primary text-base px-8 py-4 cursor-pointer">
              Build your checklist <ArrowRight size={18} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-ink py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="font-display font-bold text-base-dark text-lg">
                Dock<span className="text-accent">It</span>
              </span>
              <p className="text-sm text-white/40 mt-1">
                Statutory compliance discovery for American food trucks, mobile vendors, and hospitality operators.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              {['New York, NY', 'Los Angeles, CA', 'Austin, TX', 'Federal / Nationwide'].map((city) => (
                <div key={city} className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-settled shrink-0" />
                  <span className="text-xs text-white/40 font-display font-semibold uppercase tracking-wider leading-none select-none">
                    {city}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
            <p>&copy; {new Date().getFullYear()} DockIt USA. All rights reserved.</p>
            <p className="text-center sm:text-right">
              DockIt provides regulatory discovery and statutory document filing tools. It is not a government body or law firm and does not constitute formal legal counsel.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
