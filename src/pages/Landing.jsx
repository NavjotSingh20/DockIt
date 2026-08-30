import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Plus, Building2, AlertTriangle, MapPin, ClipboardCheck, MessageSquare, Clock, Map } from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import toast from 'react-hot-toast';
import ScrollFloat from '../components/ui/ScrollFloat';
import SeamlessStrokeText from '../components/ui/SeamlessStrokeText';
import DockItLogo from '../components/ui/DockItLogo';

/* ─── Real permit data (Hero animation — Delhi NCR restaurant example) ─── */
const INDIA_HERO_CHECKLIST = [
  { id: 'ind-1', name: 'FSSAI Food License (State / FoSCoS)', agency: 'FSSAI / FoSCoS Portal', cities: ['Delhi'] },
  { id: 'ind-2', name: 'GST Registration (Active GSTIN)', agency: 'GST Council of India / CBIC', cities: ['Delhi'] },
  { id: 'ind-3', name: 'MCD Health Trade License', agency: 'Municipal Corporation of Delhi', cities: ['Delhi'] },
  { id: 'ind-4', name: 'Delhi Police Eating House Registration', agency: 'Delhi Police Licensing Branch', cities: ['Delhi'] },
  { id: 'ind-5', name: 'Delhi Fire Services Clearance (NOC)', agency: 'Delhi Fire Services (DFS)', cities: ['Delhi'] },
  { id: 'ind-6', name: 'Delhi Shop & Establishment Act', agency: 'Delhi Labour Department', cities: ['Delhi'] },
  { id: 'ind-7', name: 'Signage & Facade Nameboard Permit', agency: 'MCD Advertisement Dept', cities: ['Delhi'] },
];

/* ─── Smart-Diff demo data (India Multi-City Expansion: Delhi -> Chandigarh) ─── */
const DIFF_CITY_A_ITEMS = [
  { id: 'delhi-1', name: 'MCD Health Trade License', agency: 'Municipal Corporation of Delhi', cities: ['Delhi'] },
  { id: 'delhi-2', name: 'Delhi Police Eating House License', agency: 'Delhi Police (Licensing Branch)', cities: ['Delhi'] },
  { id: 'delhi-3', name: 'Delhi Fire Services NOC', agency: 'Delhi Fire Services', cities: ['Delhi'] },
  { id: 'delhi-4', name: 'Delhi Shop & Establishment Act', agency: 'Delhi Labour Department', cities: ['Delhi'] },
  { id: 'delhi-5', name: 'FSSAI Food License (FoSCoS)', agency: 'FSSAI (Central / State)', cities: ['Delhi', 'Chandigarh'] },
  { id: 'delhi-6', name: 'GST Registration', agency: 'GST Council of India', cities: ['Delhi', 'Chandigarh'] },
  { id: 'delhi-7', name: 'Permanent Account Number (PAN)', agency: 'Income Tax Department (India)', cities: ['Delhi', 'Chandigarh'] },
];

const DIFF_CITY_B_ITEMS = [
  { id: 'chd-1', name: 'MCC Municipal Trade License', agency: 'Municipal Corporation Chandigarh', cities: ['Chandigarh'] },
  { id: 'chd-2', name: 'Chandigarh Health / Eating House Lic.', agency: 'MCC Health Dept (MOH)', cities: ['Chandigarh'] },
  { id: 'chd-3', name: 'Chandigarh Fire Safety Certificate / NOC', agency: 'Chandigarh Fire & Emergency Services', cities: ['Chandigarh'] },
  { id: 'chd-4', name: 'Punjab Shop & Commercial Reg.', agency: 'Chandigarh Labour Department', cities: ['Chandigarh'] },
];

const DIFF_SHARED_IDS = ['delhi-5', 'delhi-6', 'delhi-7'];

/* ─── City tag pill ─── */
function CityTag({ city }) {
  const colors = {
    Delhi: 'bg-ink/8 text-ink-muted',
    Chandigarh: 'bg-accent/10 text-accent-dark',
    'New Delhi': 'bg-ink/8 text-ink-muted',
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
    const timers = INDIA_HERO_CHECKLIST.map((item, i) =>
      setTimeout(() => {
        setCheckedItems((prev) => [...prev, item.id]);
      }, 1000 + i * 500)
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

  const progress = (checkedItems.length / INDIA_HERO_CHECKLIST.length) * 100;

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
              <span className="text-sm font-display font-bold text-ink">Delhi NCR Restaurant</span>
            </div>
            <span className="text-xs font-display text-ink-faint">
              {checkedItems.length}/{INDIA_HERO_CHECKLIST.length}
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
          {INDIA_HERO_CHECKLIST.map((item, i) => {
            const isChecked = checkedItems.includes(item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.07, duration: 0.35, ease: 'easeOut' }}
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
            {checkedItems.length === INDIA_HERO_CHECKLIST.length ? (
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
                  Statutory checklist complete — ready to launch
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
                Verifying central &amp; municipal requirements…
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Smart-diff demo (India Multi-City Expansion) ─── */
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
          <span className="text-sm font-display font-semibold text-ink">New Delhi (Primary)</span>
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
            {showCityB ? '+ Chandigarh Added' : '+ Add Chandigarh'}
          </span>
        </button>
      </div>

      {/* Checklist card */}
      <div className="bg-surface rounded-2xl border border-rule overflow-hidden shadow-card transition-all duration-500">
        {/* Header */}
        <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-bold text-ink">Expansion Checklist</span>
            <CityTag city="Delhi" />
            <AnimatePresence>
              {showCityB && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <CityTag city="Chandigarh" />
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

              {/* Already covered group (National / Central Law) */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
                className="bg-settled-light/30 overflow-hidden"
              >
                <div className="px-4 py-2 flex items-center gap-2">
                  <Check size={14} className="text-settled" strokeWidth={3} />
                  <span className="text-xs font-display font-bold text-settled uppercase tracking-wide">
                    Already Covered Across India (National)
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

              {/* New for City B group (Local Municipal / UT Permits) */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 py-2 flex items-center gap-2">
                  <Plus size={14} className="text-accent" strokeWidth={3} />
                  <span className="text-xs font-display font-bold text-accent uppercase tracking-wide">
                    New For Chandigarh (UT &amp; Municipal Delta)
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
   INDIA COMPLIANCE RISK & PENALTY CALCULATOR
   ════════════════════════════════════════════════════════════════ */
const CALCULATOR_DATA = {
  restaurant: {
    name: 'Restaurant / Dine-in Cafe',
    cities: {
      'New Delhi, Delhi': {
        time: '30–60 Days',
        startupCost: '₹15,000 – ₹45,000',
        violations: [
          { name: 'Operating without FSSAI Food License', penalty: 'Up to ₹5,00,000 / 6 mos imprisonment', law: 'FSS Act 2006 § 63' },
          { name: 'Missing MCD Health Trade License', penalty: '₹5,000 – ₹20,000 + Premise Sealing', law: 'DMC Act 1957 § 417/421' },
          { name: 'Unlicensed Eating House (Delhi Police)', penalty: 'Immediate Closure Notice', law: 'Delhi Police Act § 28/112' },
          { name: 'Operating without Delhi Fire DFS NOC', penalty: 'Utility Cutoff + Seal Notice', law: 'Delhi Fire Safety Act § 3' }
        ]
      },
      'Chandigarh': {
        time: '25–45 Days',
        startupCost: '₹12,000 – ₹35,000',
        violations: [
          { name: 'Operating without FSSAI License', penalty: 'Up to ₹5,00,000 fine', law: 'Food Safety & Standards Act § 63' },
          { name: 'Missing MCC Municipal Trade License', penalty: '₹5,000 + Sealing notice', law: 'Punjab Municipal Corp Act § 343' },
          { name: 'No Punjab Shop & Commercial Reg.', penalty: '₹2,000 – ₹5,000 fine', law: 'Punjab Shops Act 1958 § 13' },
          { name: 'Fire Safety Non-Compliance', penalty: 'Immediate Premise Sealing', law: 'UT Fire Safety Guidelines' }
        ]
      },
      'Mumbai, Maharashtra': {
        time: '45–75 Days',
        startupCost: '₹25,000 – ₹60,000',
        violations: [
          { name: 'Missing BMC Health Trade License', penalty: '₹10,000 + Goods Seizure', law: 'MMC Act 1888 § 394' },
          { name: 'Missing Mumbai Police Eating House Lic.', penalty: '₹10,000 + Closure', law: 'Mumbai Police Act § 33' },
          { name: 'Operating without FSSAI Food License', penalty: 'Up to ₹5,00,000 penalty', law: 'FSS Act § 63' }
        ]
      }
    }
  },
  cloud_kitchen: {
    name: 'Cloud Kitchen / QSR',
    cities: {
      'New Delhi, Delhi': {
        time: '15–30 Days',
        startupCost: '₹8,000 – ₹20,000',
        violations: [
          { name: 'Missing FSSAI Food License (State/Basic)', penalty: 'Up to ₹5,00,000 penalty', law: 'Food Safety Act § 63' },
          { name: 'Missing GST Registration (>₹20L turnover)', penalty: '100% Tax penalty + Interest', law: 'CGST Act § 122' },
          { name: 'Missing Delhi Shop & Establishment', penalty: '₹2,000 – ₹10,000 fine', law: 'Delhi Shops Act § 35' }
        ]
      },
      'Chandigarh': {
        time: '14–28 Days',
        startupCost: '₹6,000 – ₹18,000',
        violations: [
          { name: 'Missing FSSAI Food License', penalty: 'Up to ₹5,00,000 penalty', law: 'FSS Act § 63' },
          { name: 'Missing MCC Trade License', penalty: '₹5,000 fine + Sealing', law: 'MCC Bylaws § 12' },
          { name: 'Unregistered Commercial Establishment', penalty: '₹2,000 – ₹5,000 fine', law: 'Punjab Shops Act § 13' }
        ]
      },
      'Mumbai, Maharashtra': {
        time: '20–40 Days',
        startupCost: '₹10,000 – ₹25,000',
        violations: [
          { name: 'Missing FSSAI Food License', penalty: 'Up to ₹5,00,000', law: 'FSS Act § 63' },
          { name: 'Operating without Gumasta (Shop Act)', penalty: '₹5,00,000 / Notice', law: 'Maha Shops Act 2017' }
        ]
      }
    }
  },
  food_truck: {
    name: 'Food Truck / Kiosk',
    cities: {
      'New Delhi, Delhi': {
        time: '20–35 Days',
        startupCost: '₹10,000 – ₹25,000',
        violations: [
          { name: 'Operating without FSSAI Food Safety Lic.', penalty: 'Up to ₹5,00,000 / Seizure', law: 'Food Safety Act § 63' },
          { name: 'Missing MCD Vending / Health NOC', penalty: 'Impounding of Vehicle + ₹5,000', law: 'MCD Street Vending Bylaws' }
        ]
      },
      'Chandigarh': {
        time: '15–30 Days',
        startupCost: '₹8,000 – ₹20,000',
        violations: [
          { name: 'Operating without FSSAI Registration', penalty: 'Up to ₹5,00,000 fine', law: 'FSS Act § 63' },
          { name: 'Unauthorized Vending in UT Zones', penalty: 'Vehicle Confiscation', law: 'UT Street Vendors Act' }
        ]
      },
      'Mumbai, Maharashtra': {
        time: '25–45 Days',
        startupCost: '₹12,000 – ₹30,000',
        violations: [
          { name: 'Operating without FSSAI License', penalty: 'Up to ₹5,00,000', law: 'Food Safety Act § 63' },
          { name: 'Missing BMC Mobile Vending Permission', penalty: 'Tow away + ₹5,000 fine', law: 'MMC Act § 313' }
        ]
      }
    }
  }
};

function ComplianceRiskCalculator() {
  const [bizType, setBizType] = useState('restaurant');
  const [city, setCity] = useState('New Delhi, Delhi');
  
  const bizData = CALCULATOR_DATA[bizType];
  const cityConfig = bizData?.cities[city] || bizData?.cities['New Delhi, Delhi'];

  return (
    <div className="bg-surface rounded-3xl border border-rule p-6 md:p-8 max-w-3xl mx-auto shadow-card">
      <div className="text-center max-w-md mx-auto mb-6">
        <span className="text-xs font-bold font-display text-accent uppercase tracking-wider">Statutory Intelligence Tool</span>
        <h3 className="text-xl font-bold font-display text-ink mt-1">India Compliance &amp; Penalty Risk Estimator</h3>
        <p className="text-xs text-ink-faint mt-1">Estimate processing times, official government fees, and statutory penalty risks for Indian cities.</p>
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
          <label className="text-xs font-bold font-display text-ink-muted uppercase tracking-wide block mb-1.5">Target Indian City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}
            className="w-full input text-xs font-bold font-display py-2.5 cursor-pointer">
            <option value="New Delhi, Delhi">New Delhi, Delhi</option>
            <option value="Chandigarh">Chandigarh (UT)</option>
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

/* ─── Pain point cards data ─── */
const PAIN_POINTS = [
  {
    icon: Building2,
    iconBg: 'bg-ink/8',
    iconColor: 'text-ink-muted',
    headline: '5–8 government portals. Zero coordination.',
    body: 'A single restaurant in Delhi or Chandigarh must navigate FoSCoS for FSSAI, the Labour portal for Shop & Establishment, MCD/MCC for Trade Licenses, plus Fire and Police clearances independently.',
  },
  {
    icon: AlertTriangle,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    headline: 'Up to ₹5 Lakh fines & sealing risk.',
    body: 'Operating without an FSSAI license attracts penalties up to ₹5,00,000 under FSS Act § 63. Unlicensed eating houses face immediate police closure and municipal sealing without advance notice.',
  },
  {
    icon: MapPin,
    iconBg: 'bg-caution/10',
    iconColor: 'text-caution',
    headline: 'Multi-city expansion friction.',
    body: 'Opening a second outlet in Chandigarh or Mumbai after Delhi means re-learning distinct municipal bylaws, local health codes, and state labour registrations from scratch.',
  },
];

/* ─── Feature grid data ─── */
const FEATURES = [
  {
    icon: ClipboardCheck,
    title: 'Unified India Compliance Roadmap',
    description: 'Central FSSAI, GST, state labour laws, and local municipal trade licenses synthesized into one prioritized checklist.',
  },
  {
    icon: MessageSquare,
    title: 'AI Compliance Assistant',
    description: 'Ask about FSSAI turnover thresholds (Basic vs State vs Central), outdoor signage taxes, kitchen grease-trap requirements, or fire NOC exemptions in plain English or Hindi.',
  },
  {
    icon: Clock,
    title: 'Automated Expiry & Renewal Vault',
    description: 'Stay ahead of annual FSSAI and municipal trade license renewals with automated 60, 30, and 7-day milestone email notifications.',
  },
  {
    icon: Map,
    title: 'Designated Ward & Office Locator',
    description: 'Locate your regional FSSAI FoSCoS office, local municipal ward (MCD/MCC/BMC), and designated licensing police station on an interactive map.',
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
                DockIt guides Indian restaurant, cafe, and cloud kitchen founders through every mandatory license — from FSSAI and GST to MCD trade permits, fire NOCs, and police eating house registrations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleGetStarted} className="btn-primary text-base px-7 py-3.5 leading-none cursor-pointer">
                  Build your checklist <ArrowRight size={18} />
                </button>
                <button onClick={handleDemo} className="inline-flex items-center justify-center text-sm text-ink-muted hover:text-accent font-display font-semibold transition-colors px-5 py-3.5 rounded-xl border border-rule hover:border-rule-dark bg-surface leading-none cursor-pointer">
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
            {['New Delhi', 'Chandigarh', 'Mumbai', 'Bengaluru'].map((city) => (
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
              Food business licensing in India isn't difficult because the food is complex — it's difficult because the rules are fragmented across central portals (FoSCoS, GSTN), state departments (Labour, Fire Services), and local municipal bodies (MCD, MCC, BMC) that don't talk to each other.
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
                  When expanding your restaurant or cloud kitchen brand to a new Indian city, DockIt doesn't start over.
                  Your central FSSAI registration and GST numbers carry over seamlessly.
                </p>
                <p className="text-sm text-ink-faint">
                  DockIt isolates the exact municipal health trade licenses, local fire NOCs, and UT police registrations required for the new outlet — with zero duplicate research.
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
                Everything required to launch and stay compliant in India.
              </h2>
              <p className="text-ink-muted text-[15px] mt-3 max-w-lg mx-auto">
                From your initial FSSAI FoSCoS filing to municipal renewals — one unified intelligence platform.
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
              Build your complete Indian food business compliance checklist in under 60 seconds.
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
                Statutory compliance discovery for Indian food businesses and restaurants.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              {['New Delhi', 'Chandigarh', 'Mumbai', 'Bengaluru'].map((city) => (
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
            <p>&copy; {new Date().getFullYear()} DockIt India. All rights reserved.</p>
            <p className="text-center sm:text-right">
              DockIt provides regulatory discovery tools. It is not a government body or law firm and does not constitute legal advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
