import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import toast from 'react-hot-toast';
import ScrollFloat from '../components/ui/ScrollFloat';
import SeamlessStrokeText from '../components/ui/SeamlessStrokeText';

/* ─── Real permit data ─── */
const NYC_CHECKLIST = [
  { id: 'nyc-1', name: 'Mobile Food Vending License', agency: 'NYC DCWP', cities: ['NYC'] },
  { id: 'nyc-2', name: 'Mobile Food Unit Permit', agency: 'DOHMH', cities: ['NYC'] },
  { id: 'nyc-3', name: 'Fire Dept. Certificate of Fitness', agency: 'FDNY', cities: ['NYC'] },
  { id: 'nyc-4', name: 'Commissary Agreement (letter)', agency: 'DOHMH requirement', cities: ['NYC'] },
  { id: 'nyc-5', name: 'Food Protection Certificate', agency: 'DOHMH', cities: ['NYC', 'LA'] },
  { id: 'nyc-6', name: 'Sales Tax Certificate of Authority', agency: 'NY Dept. of Taxation', cities: ['NYC', 'LA'] },
  { id: 'nyc-7', name: 'EIN (Federal)', agency: 'IRS', cities: ['NYC', 'LA'] },
];

const LA_ONLY_ITEMS = [
  { id: 'la-1', name: 'Health Permit', agency: 'LA County Env. Health', cities: ['LA'] },
  { id: 'la-2', name: 'CA Seller\'s Permit', agency: 'CDTFA', cities: ['LA'] },
  { id: 'la-3', name: 'Commissary Agreement (LA)', agency: 'LA County requirement', cities: ['LA'] },
  { id: 'la-4', name: 'Fire Clearance', agency: 'LAFD', cities: ['LA'] },
];

// Items shared between cities (already covered when adding LA)
const SHARED_IDS = ['nyc-5', 'nyc-6', 'nyc-7'];

/* ─── Comparison data ─── */
const COMPARISON = [
  {
    them: 'Assume you already know what permits you need',
    us: 'Tells you what you need in the first place',
  },
  {
    them: 'Track one jurisdiction at a time',
    us: 'Merges requirements across cities',
  },
  {
    them: 'Built for office-bound compliance teams',
    us: 'Built for a food truck owner on their phone',
  },
];

/* ─── City tag pill ─── */
function CityTag({ city }) {
  const colors = {
    NYC: 'bg-ink/8 text-ink-muted',
    LA: 'bg-accent/10 text-accent-dark',
    Both: 'bg-settled/15 text-settled',
  };
  return (
    <span className={`text-[11px] font-display font-semibold px-2 py-0.5 rounded-full ${colors[city] || colors.NYC}`}>
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
  const [showLA, setShowLA] = useState(false);
  const diffRef = useRef(null);

  // Auto-trigger the diff after a delay when section scrolls into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const timer = setTimeout(() => setShowLA(true), 1200);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.4 }
    );
    if (diffRef.current) observer.observe(diffRef.current);
    return () => observer.disconnect();
  }, []);

  const coveredItems = NYC_CHECKLIST.filter((item) => SHARED_IDS.includes(item.id));
  const nycOnlyItems = NYC_CHECKLIST.filter((item) => !SHARED_IDS.includes(item.id));

  return (
    <div ref={diffRef} className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center">
            <span className="text-xs font-display font-bold text-base">1</span>
          </div>
          <span className="text-sm font-display font-semibold text-ink">NYC</span>
        </div>
        <div className="h-px flex-1 bg-rule" />
        <button
          onClick={() => setShowLA(!showLA)}
          className={`flex items-center gap-2 transition-all duration-300 ${
            showLA ? '' : 'animate-pulse'
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-300 ${
            showLA ? 'bg-accent' : 'bg-rule-dark'
          }`}>
            <span className={`text-xs font-display font-bold ${showLA ? 'text-white' : 'text-ink-muted'}`}>2</span>
          </div>
          <span className={`text-sm font-display font-semibold transition-colors duration-300 ${
            showLA ? 'text-accent' : 'text-ink-faint'
          }`}>
            {showLA ? 'LA added' : '+ Add LA'}
          </span>
        </button>
      </div>

      {/* Checklist card */}
      <div className="bg-surface rounded-2xl border border-rule overflow-hidden shadow-card">
        {/* Header */}
        <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-bold text-ink">Your checklist</span>
            <CityTag city="NYC" />
            <AnimatePresence>
              {showLA && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <CityTag city="LA" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-xs text-ink-faint font-display">
            {showLA ? `${NYC_CHECKLIST.length + LA_ONLY_ITEMS.length - coveredItems.length} items` : `${NYC_CHECKLIST.length} items`}
          </span>
        </div>

        {/* Items */}
        <div className="divide-y divide-rule/50">
          {!showLA ? (
            // Pre-diff: just NYC items
            NYC_CHECKLIST.map((item) => (
              <ChecklistItem key={item.id} item={item} />
            ))
          ) : (
            // Post-diff: split into groups
            <>
              {/* NYC-only items stay */}
              {nycOnlyItems.map((item) => (
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="bg-settled-light/30"
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

              {/* New for LA group */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <div className="px-4 py-2 flex items-center gap-2">
                  <Plus size={14} className="text-accent" strokeWidth={3} />
                  <span className="text-xs font-display font-bold text-accent uppercase tracking-wide">
                    New for LA
                  </span>
                </div>
                {LA_ONLY_ITEMS.map((item, i) => (
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
          <span className="font-display font-bold text-ink text-lg tracking-tight">
            Dock<span className="text-accent">It</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDemo}
              className="text-sm text-ink-muted hover:text-accent font-display font-medium transition-colors px-3 py-2"
            >
              Demo
            </button>
            <button
              onClick={handleGetStarted}
              className="btn-primary text-sm py-2 px-4"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Section 1: Hero ─── */}
      <section className="pt-24 pb-16 md:pb-20 px-4">
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
                  text="You don't just forget to renew — you don't know what you need in the first place." 
                  highlight="you don't know what you need"
                />
              </h1>
              <p className="text-ink-muted text-base md:text-lg leading-relaxed mb-8 max-w-lg">
                Every city has different permit rules. DockIt tells food truck operators
                exactly which licenses, permits, and inspections they need — city by city,
                before they get fined.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleGetStarted} className="btn-primary text-base px-7 py-3.5">
                  Build your checklist <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>

            {/* Right: enhanced checklist module */}
            <HeroChecklist />
          </div>
        </div>
      </section>

      {/* ─── Section 2: How it works — Smart Diff ─── */}
      <section className="py-16 md:py-24 px-4 bg-base-dark/50">
        <div className="max-w-5xl mx-auto">
          <div className="md:grid md:grid-cols-[1fr_1.3fr] md:gap-16 md:items-start">
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
                Add a second city. Watch the diff.
              </ScrollFloat>

              <div className="space-y-4 text-ink-muted text-[15px] leading-relaxed mt-6">
                <p>
                  Tell DockIt your business type and the cities you operate in.
                  You get a single, merged checklist — not separate lists to cross-reference yourself.
                </p>
                <p>
                  When you add a new city, DockIt flags what's <strong className="text-settled font-semibold">already
                  covered</strong> (your EIN, food handler cert, sales tax registration) and
                  surfaces only what's <strong className="text-accent font-semibold">genuinely new</strong> for
                  that jurisdiction.
                </p>
                <p className="text-sm text-ink-faint">
                  No blank-page reload. No re-entering information you've already provided.
                  Just the delta.
                </p>
              </div>

              {/* Step markers */}
              <div className="mt-8 space-y-3">
                {[
                  { n: '1', label: 'Pick your business type + city' },
                  { n: '2', label: 'Get your city-specific checklist' },
                  { n: '3', label: 'Add another city → see the smart diff' },
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
        </div>
      </section>

      {/* ─── Section 3: Why it's different ─── */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
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
              textClassName="font-display font-bold text-ink text-2xl md:text-3xl tracking-tight inline"
            >
              Not another renewal reminder.
            </ScrollFloat>
            <p className="text-ink-muted text-[15px] mb-10 max-w-xl mt-4">
              Tools like Middesk, Mosey, and CSC are great — if you already know what licenses you
              hold. DockIt solves the step before that.
            </p>

            {/* Comparison */}
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {/* Them */}
              <div className="bg-surface rounded-2xl border border-rule p-5 md:p-6">
                <div className="text-xs font-display font-bold text-ink-faint uppercase tracking-wider mb-4">
                  Renewal reminder tools
                </div>
                <div className="space-y-4">
                  {COMPARISON.map((c, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-ink/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-ink-faint text-xs">—</span>
                      </div>
                      <span className="text-sm text-ink-muted">{c.them}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 text-xs text-ink-faint">
                  <span>Middesk</span><span>·</span><span>Mosey</span><span>·</span><span>CSC</span><span>·</span><span>Avalara</span>
                </div>
              </div>

              {/* Us */}
              <div className="bg-surface rounded-2xl border-2 border-accent/30 p-5 md:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-display font-bold px-3 py-1 rounded-bl-xl">
                  DockIt
                </div>
                <div className="text-xs font-display font-bold text-accent uppercase tracking-wider mb-4">
                  What DockIt does
                </div>
                <div className="space-y-4">
                  {COMPARISON.map((c, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={12} className="text-accent" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-ink font-medium">{c.us}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Section 5: CTA + Footer ─── */}
      <section className="py-16 md:py-20 px-4 mt-8">
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
              Build your permit checklist in under a minute — free, no sign-up required to browse.
            </p>
            <button onClick={handleGetStarted} className="btn-primary text-base px-8 py-4">
              Build your checklist <ArrowRight size={18} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-ink text-ink-faint py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-base text-lg">
              Dock<span className="text-accent">It</span>
            </span>
          </div>
          <p className="text-sm text-center md:text-right">
            Compliance discovery for food trucks — NYC &amp; LA.
          </p>
        </div>
      </footer>
    </div>
  );
}
