import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Plus, Building2, AlertTriangle, MapPin, ClipboardCheck, MessageSquare, Clock, Map } from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import toast from 'react-hot-toast';
import ScrollFloat from '../components/ui/ScrollFloat';
import SeamlessStrokeText from '../components/ui/SeamlessStrokeText';
import DockItLogo from '../components/ui/DockItLogo';

/* ─── Real permit data (Hero animation — NYC example) ─── */
const NYC_CHECKLIST = [
  { id: 'nyc-1', name: 'Mobile Food Vending License', agency: 'NYC DCWP', cities: ['NYC'] },
  { id: 'nyc-2', name: 'Mobile Food Unit Permit', agency: 'DOHMH', cities: ['NYC'] },
  { id: 'nyc-3', name: 'Fire Dept. Certificate of Fitness', agency: 'FDNY', cities: ['NYC'] },
  { id: 'nyc-4', name: 'Commissary Agreement (letter)', agency: 'DOHMH requirement', cities: ['NYC'] },
  { id: 'nyc-5', name: 'Food Protection Certificate', agency: 'DOHMH', cities: ['NYC', 'LA'] },
  { id: 'nyc-6', name: 'Sales Tax Certificate of Authority', agency: 'NY Dept. of Taxation', cities: ['NYC', 'LA'] },
  { id: 'nyc-7', name: 'EIN (Federal)', agency: 'IRS', cities: ['NYC', 'LA'] },
];

/* ─── Smart-Diff demo data (neutral / international) ─── */
const DIFF_CITY_A_ITEMS = [
  { id: 'a-1', name: 'Health Permit', agency: 'City health authority', cities: ['City 1'] },
  { id: 'a-2', name: 'Fire Safety Certificate', agency: 'Fire department', cities: ['City 1'] },
  { id: 'a-3', name: 'Commissary Agreement', agency: 'Health dept. requirement', cities: ['City 1'] },
  { id: 'a-4', name: 'Mobile Vendor License', agency: 'Municipal licensing', cities: ['City 1'] },
  { id: 'a-5', name: 'Food Safety Certification', agency: 'Health authority', cities: ['City 1', 'City 2'] },
  { id: 'a-6', name: 'Sales Tax Registration', agency: 'Tax authority', cities: ['City 1', 'City 2'] },
  { id: 'a-7', name: 'Business Registration', agency: 'Government registry', cities: ['City 1', 'City 2'] },
];

const DIFF_CITY_B_ITEMS = [
  { id: 'b-1', name: 'County Health Permit', agency: 'County environmental health', cities: ['City 2'] },
  { id: 'b-2', name: 'Local Trade License', agency: 'Municipal corporation', cities: ['City 2'] },
  { id: 'b-3', name: 'Zoning Clearance', agency: 'City planning dept.', cities: ['City 2'] },
  { id: 'b-4', name: 'Fire Clearance (Local)', agency: 'Local fire authority', cities: ['City 2'] },
];

const DIFF_SHARED_IDS = ['a-5', 'a-6', 'a-7'];



/* ─── City tag pill ─── */
function CityTag({ city }) {
  const colors = {
    NYC: 'bg-ink/8 text-ink-muted',
    LA: 'bg-accent/10 text-accent-dark',
    'City 1': 'bg-ink/8 text-ink-muted',
    'City 2': 'bg-accent/10 text-accent-dark',
    Both: 'bg-settled/15 text-settled',
  };
  return (
    <span className={`text-[11px] font-display font-semibold px-2 py-0.5 rounded-full ${colors[city] || colors['City 1']}`}>
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
  const checkColor = {
    default: 'text-ink-faint',
    covered: 'text-settled',
    new: 'text-accent',
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
        <div className="text-xs text-ink-faint">{item.agency}</div>
      </div>
      {showCity && (
        <CityTag city={item.cities.length > 1 ? 'Both' : item.cities[0]} />
      )}
    </div>
  );
}

/* ─── Hero checklist module (enhanced) ─── */
function HeroChecklist() {
  const [checkedItems, setCheckedItems] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  // Auto-check items sequentially after mount
  useEffect(() => {
    const timers = NYC_CHECKLIST.map((item, i) =>
      setTimeout(() => {
        setCheckedItems((prev) => [...prev, item.id]);
      }, 1200 + i * 600)
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

  const progress = (checkedItems.length / NYC_CHECKLIST.length) * 100;

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
      transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
      className="w-full md:w-80"
    >
      <div
        ref={cardRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setMousePos({ x: 0, y: 0 }); }}
        onMouseMove={handleMouseMove}
        className="bg-surface rounded-2xl border border-rule overflow-hidden"
        style={{
          ...tiltStyle,
          boxShadow: isHovered
            ? '0 20px 40px rgba(28,25,23,0.10), 0 4px 12px rgba(28,25,23,0.06), 0 0 0 1px rgba(231,224,213,0.5)'
            : '0 4px 16px rgba(28,25,23,0.06), 0 1px 4px rgba(28,25,23,0.03), 0 0 0 1px rgba(231,224,213,0.3)',
        }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-rule/60">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span className="text-sm font-display font-bold text-ink">NYC food truck</span>
            </div>
            <span className="text-xs font-display text-ink-faint">
              {checkedItems.length}/{NYC_CHECKLIST.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-rule/50 rounded-full mt-2 overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Checklist items with staggered reveal + auto-check */}
        <div className="px-1 py-2">
          {NYC_CHECKLIST.map((item, i) => {
            const isChecked = checkedItems.includes(item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-base-dark/40 transition-colors group"
              >
                {/* Checkbox with animation */}
                <motion.div
                  className={`w-4.5 h-4.5 rounded flex items-center justify-center flex-shrink-0 border transition-all duration-300 ${
                    isChecked
                      ? 'bg-settled border-settled'
                      : 'border-rule-dark bg-transparent'
                  }`}
                  animate={isChecked ? { scale: [1, 1.2, 1] } : {}}
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
                  <div className={`text-[13px] font-medium transition-colors duration-300 ${
                    isChecked ? 'text-ink-muted line-through decoration-settled/40' : 'text-ink'
                  }`}>
                    {item.name}
                  </div>
                  <div className="text-[11px] text-ink-faint truncate">{item.agency}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom status */}
        <div className="px-4 py-3 bg-base-dark/30 border-t border-rule/40">
          <AnimatePresence mode="wait">
            {checkedItems.length === NYC_CHECKLIST.length ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded-full bg-settled flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
                <span className="text-xs font-display font-semibold text-settled">
                  Checklist complete — ready to operate
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-xs text-ink-faint"
              >
                Verifying requirements…
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Smart-diff demo (the hero feature) ─── */
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
          <span className="text-sm font-display font-semibold text-ink">Your city</span>
        </div>
        <div className="h-px flex-1 bg-rule" />
        <button
          onClick={() => setShowCityB(!showCityB)}
          className={`flex items-center gap-2 transition-all duration-300 ${
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
            {showCityB ? 'City added' : '+ Add a city'}
          </span>
        </button>
      </div>

      {/* Checklist card */}
      <div className="bg-surface rounded-2xl border border-rule overflow-hidden shadow-card transition-all duration-500">
        {/* Header */}
        <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-bold text-ink">Your checklist</span>
            <CityTag city="City 1" />
            <AnimatePresence>
              {showCityB && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <CityTag city="City 2" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-xs text-ink-faint font-display">
            {showCityB ? `${DIFF_CITY_A_ITEMS.length + DIFF_CITY_B_ITEMS.length - coveredItems.length} items` : `${DIFF_CITY_A_ITEMS.length} items`}
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

              {/* Already covered group */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
                className="bg-settled-light/30 overflow-hidden"
              >
                <div className="px-4 py-2 flex items-center gap-2">
                  <Check size={14} className="text-settled" strokeWidth={3} />
                  <span className="text-xs font-display font-bold text-settled uppercase tracking-wide">
                    Already covered
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

              {/* New for City B group */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 py-2 flex items-center gap-2">
                  <Plus size={14} className="text-accent" strokeWidth={3} />
                  <span className="text-xs font-display font-bold text-accent uppercase tracking-wide">
                    New for this city
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
   LANDING PAGE
   ════════════════════════════════════════════════════════════════ */
/* ─── Compliance Risk Calculator Data ─── */
const CALCULATOR_DATA = {
  food_truck: {
    name: 'Food Truck / Cart',
    cities: {
      'New York, NY': {
        time: '30-45 Days',
        startupCost: '$300 - $800',
        violations: [
          { name: 'Operating without Health Permit (DOHMH)', penalty: '$1,000 per day', law: 'NYC Health Code § 81.05' },
          { name: 'Uncertified Food Protection Manager', penalty: '$250 - $500', law: 'NYC Health Code § 81.15' },
          { name: 'Missing Fire Safety Certificate (FDNY)', penalty: '$1,000 per check', law: 'FC § 105.6' }
        ]
      },
      'Los Angeles, CA': {
        time: '45-60 Days',
        startupCost: '$500 - $1,200',
        violations: [
          { name: 'Operating without Health Permit (LACDPH)', penalty: '$500 + shut down', law: 'LA County Code § 8.04.140' },
          { name: 'No CA Sales Tax Certificate (CDTFA)', penalty: '$1,000 - $5,000', law: 'CA Rev & Tax Code § 6071' },
          { name: 'Missing BTRC Registration', penalty: '$250 fine + back taxes', law: 'LAMC § 21.03' }
        ]
      },
      'Mumbai, Maharashtra': {
        time: '15-30 Days',
        startupCost: '₹8,000 - ₹25,000',
        violations: [
          { name: 'Missing FSSAI License', penalty: 'Up to ₹5,00,000 / 6 months jail', law: 'Food Safety Act § 63' },
          { name: 'Operating without Shop & Establishment Act', penalty: '₹2,000 - ₹10,000', law: 'Maharashtra Shops Act § 35' },
          { name: 'Missing BMC Trade License', penalty: '₹5,000 + confiscation', law: 'MMC Act § 394' }
        ]
      }
    }
  },
  restaurant: {
    name: 'Restaurant / Cafe',
    cities: {
      'New York, NY': {
        time: '60-90 Days',
        startupCost: '$1,500 - $4,000',
        violations: [
          { name: 'Operating without Health Permit (DOHMH)', penalty: '$2,000 per day', law: 'NYC Health Code § 81.05' },
          { name: 'Failure to Display Grade Card', penalty: '$1,000 flat fine', law: 'NYC Health Code § 81.51' }
        ]
      },
      'Los Angeles, CA': {
        time: '90-120 Days',
        startupCost: '$2,000 - $5,000',
        violations: [
          { name: 'Operating without Health Permit (LACDPH)', penalty: '$1,000 per day', law: 'LA County Code § 8.04.140' },
          { name: 'Missing liquor license compliance', penalty: 'Shut down + $5,000 fine', law: 'CA ABC Act § 23300' }
        ]
      },
      'Mumbai, Maharashtra': {
        time: '45-75 Days',
        startupCost: '₹30,000 - ₹1,20,000',
        violations: [
          { name: 'Missing Eating House License (Mumbai Police)', penalty: '₹10,000 + shut down', law: 'Mumbai Police Act § 33' },
          { name: 'Missing fire clearance / NOC', penalty: '₹50,000 + electricity cutoff', law: 'Maharashtra Fire Act § 3' }
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
        <span className="text-xs font-bold font-display text-accent uppercase tracking-wider">Interactive tool</span>
        <h3 className="text-xl font-bold font-display text-ink mt-1">Compliance &amp; Penalty Risk Calculator</h3>
        <p className="text-xs text-ink-faint mt-1">Estimate setup timelines, costs, and penalty risks for your city.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-bold font-display text-ink-muted uppercase tracking-wide block mb-1.5">Business Type</label>
          <div className="flex gap-2">
            {Object.entries(CALCULATOR_DATA).map(([key, data]) => (
              <button key={key} onClick={() => setBizType(key)}
                className={`flex-1 py-2 px-3 text-xs font-bold font-display rounded-xl border transition-all ${bizType === key ? 'bg-accent border-accent text-white' : 'bg-surface border-rule text-ink-muted hover:bg-base'}`}>
                {data.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold font-display text-ink-muted uppercase tracking-wide block mb-1.5">Operating City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}
            className="w-full input text-xs font-bold font-display py-2.5">
            <option value="New York, NY">New York, NY</option>
            <option value="Los Angeles, CA">Los Angeles, CA</option>
            <option value="Mumbai, Maharashtra">Mumbai, Maharashtra</option>
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
              <span className="text-[10px] font-bold font-display text-ink-faint uppercase tracking-wider">Permit Fees</span>
              <div className="text-lg font-black font-display text-accent mt-1">{cityConfig.startupCost}</div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold font-display text-ink-muted uppercase tracking-wide block">Violations &amp; Fine Risks</span>
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

/* ─── Pain point cards data ─── */
const PAIN_POINTS = [
  {
    icon: Building2,
    iconBg: 'bg-ink/8',
    iconColor: 'text-ink-muted',
    headline: '4–7 agencies. Zero coordination.',
    body: 'A single food truck in NYC needs clearances from DCWP, DOHMH, FDNY, and NY Dept of Taxation. None of them share your file — you track it all yourself.',
  },
  {
    icon: AlertTriangle,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    headline: '$1,000/day fines. No warning.',
    body: 'Missing a single permit — even one you didn\'t know existed — can mean daily fines, forced closure, or equipment confiscation on the spot.',
  },
  {
    icon: MapPin,
    iconBg: 'bg-caution/10',
    iconColor: 'text-caution',
    headline: 'New city = start from scratch?',
    body: 'Expanding to LA or catering a festival across county lines means re-researching every requirement from zero. There\'s no carry-over between jurisdictions.',
  },
];

/* ─── Feature grid data ─── */
const FEATURES = [
  {
    icon: ClipboardCheck,
    title: 'Unified Checklist',
    description: 'City, county, and state requirements merged into one prioritized list. No cross-referencing across 5 PDFs.',
  },
  {
    icon: MessageSquare,
    title: 'AI Compliance Assistant',
    description: 'Ask about generator decibel limits, commissary distance rules, or weekend parking restrictions. Get answers with statute references.',
  },
  {
    icon: Clock,
    title: 'Renewal Alerts',
    description: 'Get notified before permits expire. Upload documents and track expiration dates in one vault.',
  },
  {
    icon: Map,
    title: 'Zone & Location Map',
    description: 'See where you can legally operate, commissary proximity, and restricted zones — visually.',
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
              className="inline-flex items-center justify-center h-9 text-sm text-ink-muted hover:text-accent font-display font-medium transition-colors px-3 rounded-xl leading-none"
            >
              Demo
            </button>
            <button
              onClick={handleGetStarted}
              className="btn-primary text-sm py-0 h-9 px-4 leading-none"
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
                DockIt tells food truck owners exactly which licenses, permits, and inspections they need — city by city, agency by agency.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleGetStarted} className="btn-primary text-base px-7 py-3.5 leading-none">
                  Build your checklist <ArrowRight size={18} />
                </button>
                <button onClick={handleDemo} className="inline-flex items-center justify-center text-sm text-ink-muted hover:text-accent font-display font-semibold transition-colors px-5 py-3.5 rounded-xl border border-rule hover:border-rule-dark bg-surface leading-none">
                  Try the demo
                </button>
              </div>
            </motion.div>

            {/* Right: interactive checklist preview */}
            <HeroChecklist />
          </div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 mt-12 md:mt-16 pt-6 border-t border-rule/50"
          >
            {['Delhi', 'Mumbai', 'NYC', 'Los Angeles'].map((city) => (
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
              Food truck licensing isn't hard because the rules are complex — it's hard because the rules are scattered across agencies that don't talk to each other.
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
              See it for yourself — pick your city and business type
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
                  When you expand to a new city, DockIt doesn't start over.
                  It shows you what's already covered from your existing permits and
                  surfaces only the genuinely new requirements for that jurisdiction.
                </p>
                <p className="text-sm text-ink-faint">
                  No blank-page reload. No re-entering information.
                  Just the delta.
                </p>
              </div>

              {/* Step markers */}
              <div className="mt-8 space-y-3">
                {[
                  { n: '1', label: 'Pick your business type + city' },
                  { n: '2', label: 'Get your city-specific checklist' },
                  { n: '3', label: 'Add another city — see the smart diff' },
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
                Everything you need to launch and stay compliant.
              </h2>
              <p className="text-ink-muted text-[15px] mt-3 max-w-lg mx-auto">
                From your first permit application to ongoing renewals — one platform, every jurisdiction.
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
              Build your permit checklist in under a minute. Free to start.
            </p>
            <button onClick={handleGetStarted} className="btn-primary text-base px-8 py-4">
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
                Compliance discovery for small businesses.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              {['Delhi', 'Mumbai', 'NYC', 'Los Angeles'].map((city) => (
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
            <p>&copy; {new Date().getFullYear()} DockIt. All rights reserved.</p>
            <p className="text-center sm:text-right">
              DockIt provides regulatory discovery tools. It is not a law firm and does not constitute legal advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
