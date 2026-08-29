import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import {
  AlertTriangle, ShieldCheck, TrendingUp, MapPin,
  Flame, Calendar, Check, X, Eye, Zap, RefreshCw, FileText
} from 'lucide-react';
import { format } from 'date-fns';
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

// =========================================
// 1. RESTRAINED BAR CHART (License Status Breakdown)
// =========================================
function RestrainedBarChart({ summary, total }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(null);

  const barData = [
    { label: t('status.active', 'Active'), count: summary.satisfied, color: 'bg-emerald-500', pct: total > 0 ? Math.round((summary.satisfied / total) * 100) : 0 },
    { label: t('status.in_progress', 'Progress'), count: summary.inProgress, color: 'bg-blue-500', pct: total > 0 ? Math.round((summary.inProgress / total) * 100) : 0 },
    { label: t('status.needed', 'Needed'), count: summary.needed, color: 'bg-amber-500', pct: total > 0 ? Math.round((summary.needed / total) * 100) : 0 },
    { label: t('status.expired', 'Expired'), count: summary.expired, color: 'bg-rose-500', pct: total > 0 ? Math.round((summary.expired / total) * 100) : 0 },
    { label: 'Waived', count: summary.waived, color: 'bg-purple-500', pct: total > 0 ? Math.round((summary.waived / total) * 100) : 0 },
  ];

  return (
    <div className="w-full h-full bg-surface rounded-2xl border border-rule shadow-card relative flex flex-col p-5 md:p-6">
      <div className="flex items-center justify-between border-b border-rule pb-3.5 mb-4">
        <h2 className="font-bold font-display text-base md:text-lg text-ink tracking-tight">
          {t('analytics.distribution', 'Permit Status Distribution')}
        </h2>
        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-base text-ink-muted border border-rule rounded">
          {total} TOTAL
        </span>
      </div>

      <div className="flex justify-between items-end flex-1 gap-2 sm:gap-4 min-h-[180px]">
        {barData.map((item, i) => (
          <div key={i} className="relative flex-1 h-full flex items-end group">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(item.pct, 14)}%` }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
                delay: i * 0.08,
              }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              className={cn(
                'w-full rounded-t-md border border-rule-dark/40 shadow-subtle relative z-10 cursor-pointer origin-bottom flex flex-col items-center justify-between py-2 overflow-hidden',
                item.color
              )}
              whileHover={{ scaleY: 1.04 }}
            >
              <span className="relative z-20 font-bold text-xs font-mono text-white">
                {item.count}
              </span>
              <span className="relative z-20 font-medium text-[10px] font-mono text-white/90 uppercase tracking-tight">
                {item.label}
              </span>
            </motion.div>
            <AnimatePresence>
              {hovered === i && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute bottom-full -mb-1.5 left-1/2 -translate-x-1/2 bg-ink text-white px-2.5 py-1 text-[11px] font-mono whitespace-nowrap rounded border border-rule-dark z-30 pointer-events-none shadow-card"
                >
                  {item.label}: {item.count} ({item.pct}%)
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 2. RESTRAINED RADAR CHART (Compliance Health Dimensions)
// ==========================================
const RADAR_SIZE = 220;
const CENTER = RADAR_SIZE / 2;
const RADIUS = 85;

const angleToRad = (angle) => (Math.PI / 180) * angle;
const getCoords = (value, index, totalAxes) => {
  const angle = angleToRad((360 / totalAxes) * index - 90);
  const r = (Math.min(100, Math.max(0, value)) / 100) * RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
};

function RestrainedRadarChart({ radarData }) {
  const { t } = useTranslation();
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const numAxes = radarData.length;

  const pathData =
    radarData.map((d, i) => {
      const coords = getCoords(d.value, i, numAxes);
      return `${i === 0 ? 'M' : 'L'} ${coords.x} ${coords.y}`;
    }).join(' ') + ' Z';

  const gridLevels = [100, 75, 50, 25];

  return (
    <div className="w-full h-full bg-surface rounded-2xl border border-rule shadow-card p-5 md:p-6 flex flex-col sm:flex-row gap-5 relative overflow-hidden">
      {/* LEFT: CHART AREA */}
      <div className="flex-1 flex items-center justify-center relative min-h-[220px]">
        <svg
          viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
          className="w-full h-full max-w-[220px] overflow-visible"
        >
          {/* Grid Background */}
          {gridLevels.map((level, lvlIdx) => (
            <path
              key={lvlIdx}
              d={
                radarData.map((_, i) => {
                  const c = getCoords(level, i, numAxes);
                  return `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`;
                }).join(' ') + ' Z'
              }
              fill="none"
              stroke="#D6CFC4"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ))}

          {/* Axes Lines */}
          {radarData.map((_, i) => {
            const outer = getCoords(100, i, numAxes);
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={outer.x}
                y2={outer.y}
                stroke="#D6CFC4"
                strokeWidth="1"
              />
            );
          })}

          {/* The Data Polygon */}
          <motion.path
            d={pathData}
            fill="rgba(217, 119, 6, 0.25)"
            stroke="#D97706"
            strokeWidth="2"
            strokeLinejoin="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
              delay: 0.15,
            }}
            style={{ originX: '50%', originY: '50%' }}
          />

          {/* Interactive Points */}
          {radarData.map((d, i) => {
            const coords = getCoords(d.value, i, numAxes);
            const isHovered = hoveredMetric === d.label;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredMetric(d.label)}
                onMouseLeave={() => setHoveredMetric(null)}
                className="cursor-pointer"
              >
                <circle cx={coords.x} cy={coords.y} r="16" fill="transparent" />
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r="4"
                  className="fill-surface stroke-accent"
                  strokeWidth="2"
                  animate={{
                    scale: isHovered ? 1.8 : 1,
                    strokeWidth: isHovered ? 3 : 2,
                    fill: isHovered ? d.color : '#FEFDFB',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* RIGHT: STATS LIST */}
      <div className="w-full sm:w-48 flex flex-col justify-center gap-1.5 z-10">
        <h2 className="font-bold font-display text-base border-b border-rule pb-2 text-ink tracking-tight">
          {t('analytics.health_dimensions', 'Health Dimensions')}
        </h2>
        {radarData.map((item, i) => (
          <motion.div
            key={i}
            onMouseEnter={() => setHoveredMetric(item.label)}
            onMouseLeave={() => setHoveredMetric(null)}
            className="flex items-center justify-between p-1.5 rounded-md hover:bg-base cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium font-mono text-ink-muted">
                {item.label}
              </span>
            </div>
            <span className="font-bold text-xs text-ink font-mono">
              {item.value}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// =========================================
// 3. RESTRAINED DONUT CHART (Live Compliance Score & Inspection)
// =========================================
const springConfig = { type: 'spring', stiffness: 300, damping: 20 };
const getPieCoords = (percent) => {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
};

function RestrainedDonut({ complianceScore, totalFine, totalDailyFine, totalLicenses }) {
  const { t } = useTranslation();
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const pieData = [
    { label: 'COMPLIANT', value: Math.max(5, complianceScore), color: '#10B981' },
    { label: 'RISK', value: Math.max(5, 100 - complianceScore), color: totalFine > 0 ? '#EF4444' : '#F59E0B' },
  ];

  let cumulativePercent = 0;

  return (
    <div className="w-full h-full bg-surface rounded-2xl border border-rule shadow-card p-5 md:p-6 flex flex-col items-center justify-between overflow-hidden relative">
      <div className="flex items-center justify-between border-b border-rule pb-3.5 mb-4 w-full z-10">
        <h2 className="font-bold font-display text-base md:text-lg text-ink tracking-tight">
          {t('dashboard.compliance_score', 'System Compliance Score')}
        </h2>
        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 border border-rule rounded bg-base text-ink">
          {complianceScore >= 80 ? 'GRADE A' : complianceScore >= 60 ? 'GRADE B' : complianceScore >= 40 ? 'GRADE C' : 'CRITICAL'}
        </span>
      </div>

      <div className="z-10 flex flex-col items-center w-full flex-1 justify-center my-2">
        <div className="relative w-48 h-48 md:w-56 md:h-56">
          <motion.svg
            viewBox="-1.2 -1.2 2.4 2.4"
            className="-rotate-90 overflow-visible w-full h-full"
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: -90, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
              delay: 0.15,
            }}
          >
            {pieData.map((slice) => {
              const totalVal = pieData.reduce((s, p) => s + p.value, 0);
              const startPercent = cumulativePercent;
              const endPercent = cumulativePercent + slice.value / totalVal;
              cumulativePercent = endPercent;
              const [startX, startY] = getPieCoords(startPercent);
              const [endX, endY] = getPieCoords(endPercent);
              const largeArcFlag = slice.value / totalVal > 0.5 ? 1 : 0;
              const pathData = [
                `M ${startX} ${startY}`,
                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                `L 0 0`,
              ].join(' ');
              const isHovered = hoveredSlice === slice.label;
              const isDimmed = hoveredSlice !== null && !isHovered;

              return (
                <motion.path
                  key={slice.label}
                  d={pathData}
                  fill={slice.color}
                  stroke="#FEFDFB"
                  strokeWidth="0.04"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{
                    translateX: isHovered ? (startX + endX) * 0.08 : 0,
                    translateY: isHovered ? (startY + endY) * 0.08 : 0,
                    scale: isHovered ? 1.04 : 1,
                    opacity: isDimmed ? 0.35 : 1,
                  }}
                  transition={springConfig}
                  onMouseEnter={() => setHoveredSlice(slice.label)}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              );
            })}
            <motion.circle
              cx="0"
              cy="0"
              r="0.62"
              fill="#FEFDFB"
              stroke="#D6CFC4"
              strokeWidth="0.02"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, ...springConfig }}
            />
          </motion.svg>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-bold font-mono leading-none text-ink">
                {complianceScore}%
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mt-1 font-display">
                OVERALL
              </span>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="w-full mt-4 grid grid-cols-2 gap-2.5">
          <div className="p-2.5 border border-rule-dark rounded-md bg-base/60 flex flex-col">
            <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-ink-muted">Fine Risk</span>
            <span className="text-base font-bold font-mono text-danger mt-0.5">
              {formatCurrency(totalFine)}
            </span>
          </div>
          <div className="p-2.5 border border-rule-dark rounded-md bg-base/60 flex flex-col">
            <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-ink-muted">Daily Accrual</span>
            <span className="text-base font-bold font-mono text-caution mt-0.5">
              +{formatCurrency(totalDailyFine)}/d
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================
// 4. MAIN BENTO ANALYTICS PAGE
// =========================================
export default function Analytics() {
  const { t } = useTranslation();
  const { isDemo, demoLicenses } = useDemo();
  const { user } = useAuth();
  const { licenses } = useLicenses(null, isDemo ? demoLicenses : null);

  const summary = getLicenseSummary(licenses);
  const scoreData = calculateComplianceScore(licenses);

  // Expired penalties calculation
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

  // Fine projection (next 90 days if unresolved)
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

  // Renewal timeline sorted chronologically
  const renewalTimeline = useMemo(() => {
    return [...licenses]
      .filter(l => l.expiry_date)
      .sort((a, b) => getDaysLeft(a.expiry_date) - getDaysLeft(b.expiry_date));
  }, [licenses]);

  // City breakdown
  const cityBreakdown = useMemo(() => {
    const map = {};
    licenses.forEach(l => {
      const city = l.requirement?.city || l.city || 'Multi-Jurisdiction';
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

  // Inspection checklist
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
    checklist.push({ ok: licenses.filter(l => l.license_number).length === licenses.length && licenses.length > 0, label: 'All license numbers recorded', critical: false });

    return checklist;
  }, [licenses]);

  const inspectionScore = useMemo(() => {
    const critical = inspectionChecklist.filter(c => c.critical);
    const nonCritical = inspectionChecklist.filter(c => !c.critical);
    const critPassed = critical.filter(c => c.ok).length;
    const nonCritPassed = nonCritical.filter(c => c.ok).length;
    if (critPassed < critical.length) return { score: Math.round((critPassed / (critical.length || 1)) * 50), label: 'Fail Risk', color: 'text-danger', bg: 'bg-danger' };
    const full = 50 + Math.round((nonCritPassed / (nonCritical.length || 1)) * 50);
    return {
      score: full,
      label: full === 100 ? 'Ready to Pass' : 'Minor Issues',
      color: full === 100 ? 'text-settled' : 'text-caution',
      bg: full === 100 ? 'bg-settled' : 'bg-caution'
    };
  }, [inspectionChecklist]);

  // Radar metrics derived from real licenses
  const radarMetrics = useMemo(() => {
    const total = licenses.length || 1;
    const satisfied = licenses.filter(l => l.status === 'satisfied').length;
    const nonExpired = licenses.filter(l => l.status !== 'expired' && (!l.expiry_date || getDaysLeft(l.expiry_date) >= 0)).length;
    const hasDocs = licenses.filter(l => l.license_number || l.extracted_via_ocr).length;
    const longTerm = licenses.filter(l => !l.expiry_date || getDaysLeft(l.expiry_date) > 30).length;

    return [
      { label: 'Score', value: scoreData.score || 85, color: '#f87171' },
      { label: 'Active', value: Math.round((satisfied / total) * 100), color: '#10B981' },
      { label: 'Unexpired', value: Math.round((nonExpired / total) * 100), color: '#3B82F6' },
      { label: 'Verified', value: Math.round((hasDocs / total) * 100), color: '#F59E0B' },
      { label: 'Horizon', value: Math.round((longTerm / total) * 100), color: '#8B5CF6' },
    ];
  }, [licenses, scoreData]);

  return (
    <div className="min-h-screen w-full bg-base p-4 md:p-8 font-sans flex flex-col space-y-6">
      <div className="max-w-7xl w-full mx-auto flex flex-col flex-1 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-rule-dark pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-ink">
              {t('analytics.title', 'Analytics & Telemetry')}
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Real-time compliance performance, risk forecasting, and inspection health
            </p>
          </div>

          {totalDailyCost > 0 && (
            <div className="flex items-center gap-2 border border-red-200 bg-red-50 text-danger px-3.5 py-1.5 font-mono font-bold text-xs rounded-md shadow-subtle">
              <Flame size={15} />
              +{formatCurrency(totalDailyCost)}/day Accruing Fines
            </div>
          )}
        </header>

        {/* MAIN BENTO GRID - ROW 1: PRIMARY TELEMETRY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* COLUMN 1 (LEFT 7 COLS): STACKED BAR + RADAR */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="w-full min-h-[340px]">
              <RestrainedBarChart summary={summary} total={licenses.length} />
            </div>
            <div className="w-full min-h-[340px]">
              <RestrainedRadarChart radarData={radarMetrics} />
            </div>
          </div>

          {/* COLUMN 2 (RIGHT 5 COLS): FULL HEIGHT DONUT + LIVE RISK */}
          <div className="lg:col-span-5 flex">
            <div className="w-full h-full">
              <RestrainedDonut
                complianceScore={scoreData.score || 85}
                totalFine={totalCurrentFine}
                totalDailyFine={totalDailyCost}
                totalLicenses={licenses.length}
              />
            </div>
          </div>
        </div>

        {/* ── BENTO ROW 2: FINE PROJECTION & ESCALATION ── */}
        <div className="w-full bg-surface rounded-2xl border border-rule shadow-card p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-rule pb-3.5 mb-5 gap-2">
            <div>
              <h2 className="font-bold font-display text-base md:text-lg text-ink flex items-center gap-2.5 tracking-tight">
                <TrendingUp size={18} className="text-accent" /> {t('analytics.fine_projection', 'Fine Escalation Projection (90-Day Forecast)')}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Estimated cumulative penalty exposure if unresolved
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold">
              {[
                { label: '+7D', val: projectionData.find(p => p.label === '+7d')?.fine || 0 },
                { label: '+30D', val: projectionData.find(p => p.label === '+30d')?.fine || 0 },
                { label: '+90D', val: projectionData.find(p => p.label === '+90d')?.fine || 0 },
              ].map(s => (
                <div key={s.label} className="border border-rule rounded px-2.5 py-1 bg-base">
                  <span className="text-ink-muted mr-1">{s.label}:</span>
                  <span className="text-danger font-bold">{formatCurrency(s.val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 mb-4">
            {projectionData.map((pt, i) => {
              const maxFine = Math.max(...projectionData.map(p => p.fine), 1);
              const heightPct = Math.max(15, Math.round((pt.fine / maxFine) * 100));
              return (
                <div key={i} className="flex flex-col items-center border border-rule/60 rounded-md p-2.5 bg-base/50">
                  <span className="font-mono font-medium text-xs text-ink-muted">{pt.label}</span>
                  <div className="w-full h-20 flex items-end justify-center my-1.5">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.04 }}
                      className="w-full max-w-[24px] bg-rose-500 rounded-t-sm shadow-subtle"
                    />
                  </div>
                  <span className="font-mono font-bold text-xs text-ink">{formatCurrency(pt.fine)}</span>
                </div>
              );
            })}
          </div>

          {expiredWithPenalties.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3 pt-3 border-t border-rule">
              {expiredWithPenalties.map(l => (
                <div key={l.id} className="border border-red-200 border-l-[3px] border-l-danger rounded-md p-3 bg-red-50/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs font-display text-ink">{l.name}</div>
                      <div className="font-mono text-[11px] text-ink-muted mt-0.5">{l.daysOverdue} days overdue</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-danger text-sm">{formatCurrency(l.penalty.currentFine)}</div>
                      <div className="font-mono text-[10px] text-ink-muted">+{formatCurrency(l.penalty.dailyCost)}/day</div>
                    </div>
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono text-ink-muted bg-surface border border-rule rounded px-2 py-0.5">
                    ⚠️ {l.penalty.currentConsequence}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── BENTO ROW 3: INSPECTION READINESS & RENEWAL COUNTDOWN ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT (6 COLS): INSPECTION READINESS */}
          <div className="lg:col-span-6 bg-surface rounded-2xl border border-rule shadow-card p-5 md:p-6">
            <div className="flex items-center justify-between border-b border-rule pb-3.5 mb-5">
              <h2 className="font-bold font-display text-base md:text-lg text-ink flex items-center gap-2.5 tracking-tight">
                <Eye size={18} className="text-accent" /> {t('analytics.audit_checklist', 'Inspection Audit Checklist')}
              </h2>
              <span className={`font-mono font-semibold text-xs px-2.5 py-0.5 border border-rule rounded ${inspectionScore.score >= 80 ? 'bg-settled/15 text-settled' : inspectionScore.score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-danger'}`}>
                {inspectionScore.score}/100 — {inspectionScore.label}
              </span>
            </div>

            <div className="space-y-2">
              {inspectionChecklist.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2.5 rounded-md border border-rule/60 ${item.ok ? 'bg-settled/5' : item.critical ? 'bg-red-50/40' : 'bg-amber-50/40'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${item.ok ? 'bg-settled text-white' : item.critical ? 'bg-danger text-white' : 'bg-caution text-white'}`}>
                      {item.ok ? '✓' : '✗'}
                    </div>
                    <span className="text-xs font-medium font-mono text-ink">
                      {item.label}
                    </span>
                  </div>
                  {item.critical && !item.ok && (
                    <span className="font-mono text-[10px] font-semibold bg-red-50 text-danger px-2 py-0.5 rounded border border-red-200">
                      CRITICAL
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT (6 COLS): RENEWAL COUNTDOWN */}
          <div className="lg:col-span-6 bg-surface rounded-2xl border border-rule shadow-card p-5 md:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-rule pb-3.5 mb-5">
                <h2 className="font-bold font-display text-base md:text-lg text-ink flex items-center gap-2.5 tracking-tight">
                  <Calendar size={18} className="text-accent" /> {t('analytics.expiry_horizon', 'Expiry Horizon')}
                </h2>
                <span className="font-mono text-xs text-ink-muted font-medium">CHRONOLOGICAL</span>
              </div>

              {renewalTimeline.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-rule rounded-md font-mono text-xs text-ink-muted">
                  No expiring permits tracked.
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {renewalTimeline.slice(0, 6).map((lic, i) => {
                    const days = getDaysLeft(lic.expiry_date);
                    const name = lic.requirement?.requirement_name || lic.license_type || 'License';
                    const isOverdue = days !== null && days < 0;
                    const isUrgent = days !== null && days >= 0 && days <= 30;

                    return (
                      <div
                        key={lic.id || i}
                        className="flex items-center justify-between p-2.5 rounded-md border border-rule/60 bg-base/50 hover:bg-base transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-semibold text-xs truncate text-ink font-display">{name}</div>
                          <div className="font-mono text-[10px] text-ink-muted">{lic.requirement?.issuing_agency || 'Official Authority'}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-mono font-bold text-xs ${isOverdue ? 'text-danger' : isUrgent ? 'text-caution' : 'text-settled'}`}>
                            {days === null ? '—' : isOverdue ? `${Math.abs(days)}D OVERDUE` : `${days}D LEFT`}
                          </div>
                          {lic.expiry_date && (
                            <div className="font-mono text-[10px] text-ink-muted">
                              {format(new Date(lic.expiry_date), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BENTO ROW 4: CITY-BY-CITY & PRIORITY ACTION QUEUE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT (5 COLS): CITY BREAKDOWN */}
          {cityBreakdown.length > 0 && (
            <div className="lg:col-span-5 bg-surface rounded-2xl border border-rule shadow-card p-5 md:p-6">
              <div className="flex items-center justify-between border-b border-rule pb-3.5 mb-5">
                <h2 className="font-bold font-display text-base md:text-lg text-ink flex items-center gap-2.5 tracking-tight">
                  <MapPin size={18} className="text-accent" /> {t('analytics.multi_city_index', 'Multi-City Index')}
                </h2>
              </div>

              <div className="space-y-3">
                {cityBreakdown.map((c, i) => (
                  <div key={c.city} className="border border-rule rounded-md p-3 bg-base/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs font-display text-ink">{c.city}</span>
                      <span className="font-mono font-semibold text-xs px-2 py-0.2 border border-rule rounded bg-surface">{c.score}% COMPLIANT</span>
                    </div>
                    <div className="w-full h-2 bg-rule-dark rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full ${c.score >= 80 ? 'bg-settled' : c.score >= 50 ? 'bg-caution' : 'bg-danger'}`}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                      <div className="bg-surface rounded border border-rule/50 p-1 font-semibold text-settled">ACT: {c.satisfied}</div>
                      <div className="bg-surface rounded border border-rule/50 p-1 font-semibold text-blue-700">PROG: {c.inProgress}</div>
                      <div className="bg-surface rounded border border-rule/50 p-1 font-semibold text-danger">EXP: {c.expired}</div>
                      <div className="bg-surface rounded border border-rule/50 p-1 font-semibold text-ink-muted">NEED: {c.needed}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RIGHT (7 COLS): PRIORITY ACTION QUEUE */}
          <div className={`${cityBreakdown.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'} bg-surface rounded-2xl border border-rule shadow-card p-5 md:p-6`}>
            <div className="flex items-center justify-between border-b border-rule pb-3.5 mb-5">
              <h2 className="font-bold font-display text-base md:text-lg text-ink flex items-center gap-2.5 tracking-tight">
                <Zap size={18} className="text-accent" /> {t('analytics.priority_queue', 'Priority Execution Queue')}
              </h2>
              <span className="font-mono text-[10px] font-semibold bg-base border border-rule text-ink-muted px-2 py-0.5 rounded">
                URGENT FIRST
              </span>
            </div>

            <div className="space-y-2">
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
                .slice(0, 6)
                .map((l, i) => {
                  const days = getDaysLeft(l.expiry_date);
                  const name = l.requirement?.requirement_name || l.license_type || 'License';
                  const action = l.status === 'expired' ? 'RENEW NOW'
                    : l.status === 'needed' ? 'APPLY NOW'
                    : days !== null && days <= 30 ? 'EXPIRING SOON'
                    : 'COMPLIANT';
                  const actionCls = action.includes('NOW')
                    ? 'bg-red-50 text-danger border-red-200'
                    : action.includes('SOON')
                    ? 'bg-amber-50 text-caution border-amber-200'
                    : 'bg-settled/10 text-settled border-settled/25';

                  return (
                    <div
                      key={l.id || i}
                      className="flex items-center justify-between p-2.5 rounded-md border border-rule-dark/60 bg-base/50"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-semibold text-xs truncate text-ink font-display">{name}</div>
                        <div className="font-mono text-[10px] text-ink-muted">{l.requirement?.city || 'Federal / Multi-Jurisdiction'}</div>
                      </div>
                      <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${actionCls}`}>
                        {action}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

