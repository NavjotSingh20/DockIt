import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell
} from 'recharts';
import {
  AlertTriangle, ShieldCheck, Clock, DollarSign, TrendingUp, MapPin,
  FileText, ChevronRight, Zap, Calendar, Check, X, Eye, Building2,
  Flame, RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../hooks/useAuth';
import { useLicenses } from '../hooks/useLicenses';
import { calculateComplianceScore, getLicenseSummary } from '../utils/complianceScore';
import { formatCurrency } from '../utils/formatters';
import { PENALTY_RULES, calculatePenalty } from '../utils/penaltyRules';

// ── Helpers ──────────────────────────────────────────────────
function getDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  return Math.round((exp - today) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days) {
  if (days === null) return { bg: 'bg-ink-faint/10', text: 'text-ink-faint', border: 'border-ink-faint/20', dot: 'bg-ink-faint' };
  if (days < 0) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' };
  if (days <= 7) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' };
  if (days <= 30) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
  if (days <= 90) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' };
  return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' };
}

// ── Sub-components ─────────────────────────────────────────
function LiveCounter({ value, prefix = '', suffix = '', className = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.round(start));
    }, 18);
    return () => clearInterval(timer);
  }, [value]);
  return <span className={className}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

function RenewalTimelineDot({ lic, index }) {
  const days = getDaysLeft(lic.expiry_date);
  const col = urgencyColor(days);
  const name = lic.requirement?.requirement_name || lic.license_type || 'License';
  const agency = lic.requirement?.issuing_agency || lic.issuing_authority || '';
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`relative flex items-start gap-3 p-3.5 rounded-2xl border ${col.bg} ${col.border} hover:scale-[1.01] transition-transform`}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${col.dot} flex-shrink-0 mt-1 ring-2 ring-offset-1 ring-current`} style={{ ringColor: col.dot }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-ink truncate">{name}</div>
        <div className="text-[10px] text-ink-faint truncate mt-0.5">{agency}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-xs font-black font-display ${col.text}`}>
          {days === null ? '—' : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
        </div>
        {lic.expiry_date && (
          <div className="text-[10px] text-ink-faint mt-0.5">
            {format(new Date(lic.expiry_date), 'MMM d, yyyy')}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Analytics() {
  const { isDemo, demoLicenses, demoBusiness } = useDemo();
  const { user } = useAuth();
  const { licenses } = useLicenses(null, isDemo ? demoLicenses : null);
  const [selectedLic, setSelectedLic] = useState(null);
  const [tick, setTick] = useState(0);

  // Live clock for "accruing fines" feel
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const summary = getLicenseSummary(licenses);
  const scoreData = calculateComplianceScore(licenses);

  // ── Expired licenses → penalty calculations ─────────────
  const expiredWithPenalties = useMemo(() => {
    return licenses
      .filter(l => l.status === 'expired' || (l.expiry_date && getDaysLeft(l.expiry_date) < 0))
      .map(l => {
        const daysOverdue = l.expiry_date ? Math.abs(getDaysLeft(l.expiry_date)) : 30;
        const licType = l.license_type || (l.requirement?.legacy_type_id) || 'BUSINESS_LICENSE';
        const penalty = calculatePenalty(licType, daysOverdue);
        return { ...l, daysOverdue, penalty, licType, name: l.requirement?.requirement_name || licType };
      });
  }, [licenses]);

  const totalCurrentFine = expiredWithPenalties.reduce((s, l) => s + l.penalty.currentFine, 0);
  const totalDailyCost = expiredWithPenalties.reduce((s, l) => s + l.penalty.dailyCost, 0);

  // ── Fine projection chart (next 90 days if no action taken) ─
  const projectionData = useMemo(() => {
    const points = [0, 7, 14, 30, 45, 60, 90];
    return points.map(daysFromNow => {
      const total = expiredWithPenalties.reduce((sum, l) => {
        const futureDays = l.daysOverdue + daysFromNow;
        const rule = PENALTY_RULES[l.licType];
        if (!rule) return sum + 150;
        let fine = 0;
        for (const slab of rule.slabs) {
          if (futureDays >= slab.days_overdue) fine = slab.fine;
        }
        return sum + fine;
      }, 0);
      return { label: daysFromNow === 0 ? 'Today' : `+${daysFromNow}d`, fine: total };
    });
  }, [expiredWithPenalties]);

  // ── Sorted renewal timeline ──────────────────────────────
  const renewalTimeline = useMemo(() => {
    return [...licenses]
      .filter(l => l.expiry_date)
      .sort((a, b) => getDaysLeft(a.expiry_date) - getDaysLeft(b.expiry_date));
  }, [licenses]);

  // ── City-by-city compliance ──────────────────────────────
  const cityBreakdown = useMemo(() => {
    const map = {};
    licenses.forEach(l => {
      const city = l.requirement?.city || l.city || 'Unknown';
      if (!map[city]) map[city] = { city, total: 0, satisfied: 0, expired: 0, needed: 0, inProgress: 0 };
      map[city].total++;
      if (l.status === 'satisfied') map[city].satisfied++;
      else if (l.status === 'expired') map[city].expired++;
      else if (l.status === 'needed') map[city].needed++;
      else if (l.status === 'in_progress') map[city].inProgress++;
    });
    return Object.values(map).map(c => ({
      ...c,
      score: c.total > 0 ? Math.round((c.satisfied / c.total) * 100) : 0
    })).sort((a, b) => a.score - b.score);
  }, [licenses]);

  // ── Inspection readiness checklist ──────────────────────
  const inspectionChecklist = useMemo(() => {
    const checklist = [];
    const hasExpired = licenses.filter(l => l.status === 'expired').length > 0;
    const hasNeeded = licenses.filter(l => l.status === 'needed').length > 0;
    const hasExpiringSoon = licenses.filter(l => { const d = getDaysLeft(l.expiry_date); return d !== null && d >= 0 && d <= 30; }).length > 0;
    const hasOCR = licenses.filter(l => l.confidence_score > 0 || l.extracted_via_ocr).length > 0;

    checklist.push({ ok: !hasExpired, label: 'All licenses are current (not expired)', critical: true });
    checklist.push({ ok: !hasNeeded, label: 'No required permits are missing', critical: true });
    checklist.push({ ok: !hasExpiringSoon, label: 'No renewals due within 30 days', critical: false });
    checklist.push({ ok: hasOCR || licenses.length > 0, label: 'License documents uploaded & verified', critical: false });
    checklist.push({ ok: licenses.filter(l => l.license_number).length === licenses.length, label: 'All license numbers recorded', critical: false });

    return checklist;
  }, [licenses]);

  const inspectionScore = useMemo(() => {
    const critical = inspectionChecklist.filter(c => c.critical);
    const nonCritical = inspectionChecklist.filter(c => !c.critical);
    const critPassed = critical.filter(c => c.ok).length;
    const nonCritPassed = nonCritical.filter(c => c.ok).length;
    if (critPassed < critical.length) return { score: Math.round((critPassed / critical.length) * 50), label: 'Fail Inspection', color: 'text-red-500', bg: 'bg-red-500' };
    const full = 50 + Math.round((nonCritPassed / nonCritical.length) * 50);
    return {
      score: full,
      label: full === 100 ? 'Ready to Pass' : 'Minor Issues',
      color: full === 100 ? 'text-green-600' : 'text-amber-600',
      bg: full === 100 ? 'bg-green-500' : 'bg-amber-500'
    };
  }, [inspectionChecklist]);

  const hasData = licenses.length > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-ink tracking-tight">Compliance Intelligence</h1>
          <p className="text-xs sm:text-sm text-ink-faint mt-1">Live penalty tracking, inspection readiness, and renewal planning</p>
        </div>
        {totalDailyCost > 0 && (
          <motion.div
            animate={{ opacity: [1, 0.7, 1] }} transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-2xl text-xs font-bold font-display shrink-0"
          >
            <Flame size={14} className="flex-shrink-0" />
            {formatCurrency(totalDailyCost)}/day accruing in fines
          </motion.div>
        )}
      </div>

      {/* ── SECTION 1: Live Penalty Exposure ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} className="text-red-500" />
          <h2 className="text-sm font-bold font-display text-ink uppercase tracking-wide">Live Penalty Exposure</h2>
          <span className="text-[10px] font-bold font-display px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">REAL-TIME</span>
        </div>

        {!hasData ? (
          <div className="bg-surface rounded-3xl border border-rule p-8 text-center">
            <AlertCircle size={32} className="text-ink-faint mx-auto mb-3" />
            <div className="text-sm font-bold text-ink">No compliance data yet</div>
            <div className="text-xs text-ink-faint mt-1">Add your licenses in My Requirements to start tracking penalties</div>
          </div>
        ) : expiredWithPenalties.length === 0 ? (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border border-green-200 p-8 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={32} className="text-green-600" />
            </div>
            <div>
              <div className="text-xl font-black font-display text-green-800">Zero Fine Exposure</div>
              <div className="text-sm text-green-700 mt-1">All tracked licenses are current. No penalties accruing.</div>
              <div className="text-xs text-green-600 mt-2 font-semibold">Est. fines avoided: {formatCurrency(licenses.length * 500)}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Exposure Banner */}
            <div className="relative bg-ink rounded-3xl p-6 overflow-hidden shadow-xl">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-500/10 rounded-full blur-2xl" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
                <div className="flex-1">
                  <div className="text-xs font-bold font-display text-white/50 uppercase tracking-widest mb-1">Current Total Exposure</div>
                  <div className="text-4xl md:text-5xl font-black font-display text-red-400">
                    <LiveCounter value={totalCurrentFine} prefix="$" />
                  </div>
                  <div className="text-sm text-white/60 mt-2">
                    +{formatCurrency(totalDailyCost)} per day if unresolved · {expiredWithPenalties.length} license(s) overdue
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[7, 30, 90].map(days => {
                    const projected = projectionData.find(p => p.label === `+${days}d`)?.fine || 0;
                    return (
                      <div key={days} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                        <div className="text-[10px] font-bold font-display text-white/40 uppercase tracking-wide">+{days}d</div>
                        <div className="text-base font-black font-display text-red-300 mt-1">{formatCurrency(projected)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Projection Chart */}
            <div className="bg-surface rounded-3xl border border-rule p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold font-display text-ink">Fine Escalation Projection</h3>
                  <p className="text-xs text-ink-faint mt-0.5">Cumulative penalties if no action is taken</p>
                </div>
                <TrendingUp size={16} className="text-red-500" />
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={projectionData}>
                  <defs>
                    <linearGradient id="fineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8c8275' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8c8275' }} axisLine={false} tickLine={false} width={50}
                    tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip formatter={v => [formatCurrency(v), 'Projected Fine']}
                    contentStyle={{ background: '#FEFDFB', border: '1px solid #E7E0D5', borderRadius: '12px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="fine" stroke="#ef4444" strokeWidth={2.5}
                    fill="url(#fineGrad)" dot={{ fill: '#ef4444', r: 4, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Per-License Penalty Breakdown */}
            <div className="grid md:grid-cols-2 gap-4">
              {expiredWithPenalties.map((l, i) => (
                <motion.div key={l.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="bg-surface rounded-2xl border border-red-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedLic(selectedLic?.id === l.id ? null : l)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-ink truncate">{l.name}</div>
                      <div className="text-[10px] text-ink-faint mt-0.5">{l.daysOverdue} days overdue</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-black font-display text-red-600">{formatCurrency(l.penalty.currentFine)}</div>
                      <div className="text-[10px] text-red-400 font-semibold">+{formatCurrency(l.penalty.dailyCost)}/day</div>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 w-fit">
                    {l.penalty.currentConsequence}
                  </div>
                  <AnimatePresence>
                    {selectedLic?.id === l.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="mt-3 pt-3 border-t border-red-100 space-y-2 overflow-hidden"
                      >
                        {l.penalty.projections.map((p, j) => (
                          <div key={j} className="flex items-center justify-between text-xs">
                            <span className="text-ink-faint">In {p.days} days</span>
                            <span className="font-bold text-red-600">{formatCurrency(p.fine)}</span>
                          </div>
                        ))}
                        <div className="text-[10px] text-ink-faint italic mt-1">Ref: {l.penalty.legalReference}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 2: Inspection Readiness Report ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Eye size={16} className="text-accent" />
          <h2 className="text-sm font-bold font-display text-ink uppercase tracking-wide">Inspection Readiness Report</h2>
        </div>

        <div className="bg-surface rounded-3xl border border-rule p-5 shadow-sm">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Score display */}
            <div className="flex flex-col items-center justify-center shrink-0 md:w-44">
              <div className="relative w-28 h-28">
                <svg width="112" height="112" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="56" cy="56" r="46" fill="none" stroke="#e7e0d5" strokeWidth="10" />
                  <motion.circle cx="56" cy="56" r="46" fill="none"
                    stroke={inspectionScore.score >= 80 ? '#22c55e' : inspectionScore.score >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10" strokeLinecap="round"
                    initial={{ strokeDasharray: '0 290' }}
                    animate={{ strokeDasharray: `${(inspectionScore.score / 100) * 290} 290` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-black font-display ${inspectionScore.color}`}>{inspectionScore.score}</span>
                  <span className="text-[9px] text-ink-faint font-bold uppercase tracking-wide">/100</span>
                </div>
              </div>
              <div className={`mt-2 text-xs font-bold font-display ${inspectionScore.color}`}>{inspectionScore.label}</div>
              <div className="text-[10px] text-ink-faint text-center mt-0.5">If inspected today</div>
            </div>

            {/* Checklist */}
            <div className="flex-1 space-y-2">
              {inspectionChecklist.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`flex items-center gap-3 p-3 rounded-2xl border ${item.ok ? 'bg-green-50 border-green-200' : item.critical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${item.ok ? 'bg-green-500' : item.critical ? 'bg-red-500' : 'bg-amber-500'}`}>
                    {item.ok ? <Check size={12} className="text-white" /> : <X size={12} className="text-white" />}
                  </div>
                  <span className={`text-xs font-semibold ${item.ok ? 'text-green-800' : item.critical ? 'text-red-800' : 'text-amber-800'}`}>
                    {item.label}
                  </span>
                  {item.critical && !item.ok && (
                    <span className="ml-auto text-[10px] font-bold font-display px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 flex-shrink-0">CRITICAL</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Renewal Timeline ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-accent" />
            <h2 className="text-sm font-bold font-display text-ink uppercase tracking-wide">Renewal Countdown</h2>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold font-display text-ink-faint">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Overdue</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />&lt;30d</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />OK</span>
          </div>
        </div>

        {renewalTimeline.length === 0 ? (
          <div className="bg-surface rounded-3xl border border-rule p-6 text-center text-xs text-ink-faint">
            No expiry dates tracked yet. Scan your licenses to auto-fill expiry dates.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-2.5">
            {renewalTimeline.map((lic, i) => <RenewalTimelineDot key={lic.id} lic={lic} index={i} />)}
          </div>
        )}
      </div>

      {/* ── SECTION 4: City-by-City Compliance ── */}
      {cityBreakdown.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-accent" />
            <h2 className="text-sm font-bold font-display text-ink uppercase tracking-wide">City-by-City Compliance</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cityBreakdown.map((c, i) => (
              <motion.div key={c.city} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-surface rounded-2xl border border-rule p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-accent flex-shrink-0" />
                    <span className="text-xs font-bold text-ink truncate">{c.city}</span>
                  </div>
                  <span className={`text-xs font-black font-display ${c.score >= 80 ? 'text-green-600' : c.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{c.score}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-base rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${c.score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
                    className={`h-full rounded-full ${c.score >= 80 ? 'bg-green-500' : c.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  />
                </div>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[
                    { label: 'Active', value: c.satisfied, color: 'text-green-600' },
                    { label: 'Progress', value: c.inProgress, color: 'text-amber-600' },
                    { label: 'Expired', value: c.expired, color: 'text-red-600' },
                    { label: 'Needed', value: c.needed, color: 'text-ink-faint' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className={`text-sm font-black font-display ${s.color}`}>{s.value}</div>
                      <div className="text-[9px] text-ink-faint font-display uppercase">{s.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 5: Action Queue ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-accent" />
          <h2 className="text-sm font-bold font-display text-ink uppercase tracking-wide">Priority Action Queue</h2>
        </div>
        <div className="bg-surface rounded-3xl border border-rule overflow-hidden shadow-sm">
          {licenses.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-faint">No licenses tracked yet.</div>
          ) : (
            <div className="divide-y divide-rule/40">
              {[...licenses]
                .sort((a, b) => {
                  const score = l => {
                    if (l.status === 'expired') return 0;
                    if (l.status === 'needed') return 1;
                    const d = getDaysLeft(l.expiry_date);
                    if (d !== null && d <= 7) return 2;
                    if (d !== null && d <= 30) return 3;
                    return 4;
                  };
                  return score(a) - score(b);
                })
                .slice(0, 8)
                .map((l, i) => {
                  const days = getDaysLeft(l.expiry_date);
                  const col = urgencyColor(days !== null ? days : (l.status === 'needed' ? -1 : 999));
                  const name = l.requirement?.requirement_name || l.license_type || 'License';
                  const action = l.status === 'expired' ? 'RENEW NOW'
                    : l.status === 'needed' ? 'APPLY'
                    : days !== null && days <= 30 ? 'RENEW SOON'
                    : 'MONITOR';
                  const actionColor = action === 'RENEW NOW' || action === 'APPLY' ? 'bg-red-600 text-white' : action === 'RENEW SOON' ? 'bg-amber-500 text-white' : 'bg-green-100 text-green-700';
                  return (
                    <div key={l.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-base/40 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-ink truncate">{name}</div>
                        <div className="text-[10px] text-ink-faint">{l.requirement?.issuing_agency || l.issuing_authority || ''}</div>
                      </div>
                      <div className="text-xs text-ink-faint flex-shrink-0 hidden sm:block">
                        {l.status === 'expired' ? `${Math.abs(days)}d overdue`
                          : l.status === 'needed' ? 'Not obtained'
                          : days !== null ? `${days}d left`
                          : '—'}
                      </div>
                      <span className={`text-[10px] font-black font-display px-2.5 py-1 rounded-lg flex-shrink-0 ${actionColor}`}>{action}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
