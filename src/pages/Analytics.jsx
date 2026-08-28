import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
// 1. BRUTALIST BAR CHART (License Status Breakdown)
// =========================================
function BrutalistBarChart({ summary, total }) {
  const [hovered, setHovered] = useState(null);

  const barData = [
    { label: 'ACTIVE', count: summary.satisfied, color: 'bg-emerald-400', pct: total > 0 ? Math.round((summary.satisfied / total) * 100) : 0 },
    { label: 'PROGRESS', count: summary.inProgress, color: 'bg-blue-400', pct: total > 0 ? Math.round((summary.inProgress / total) * 100) : 0 },
    { label: 'NEEDED', count: summary.needed, color: 'bg-amber-400', pct: total > 0 ? Math.round((summary.needed / total) * 100) : 0 },
    { label: 'EXPIRED', count: summary.expired, color: 'bg-rose-400', pct: total > 0 ? Math.round((summary.expired / total) * 100) : 0 },
    { label: 'WAIVED', count: summary.waived, color: 'bg-purple-400', pct: total > 0 ? Math.round((summary.waived / total) * 100) : 0 },
  ];

  return (
    <div className="w-full h-full bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] relative flex flex-col p-6 transition-colors duration-200">
      <div className="flex items-center justify-between border-b-[3px] border-black dark:border-white pb-2 mb-6">
        <h3 className="font-black uppercase text-xl text-black dark:text-white">
          Permit Status Distribution
        </h3>
        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black">
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
                delay: i * 0.1,
              }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              className={cn(
                'w-full border-[3px] border-black dark:border-white relative z-10 cursor-pointer origin-bottom flex flex-col items-center justify-between py-2 overflow-hidden',
                item.color
              )}
              whileHover={{ scaleY: 1.08, scaleX: 1.03 }}
              whileTap={{ scaleY: 0.95 }}
            >
              <div
                className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]"
              />
              <span className="relative z-20 font-black text-xs font-mono text-black">
                {item.count}
              </span>
              <span className="relative z-20 font-black text-[10px] font-mono text-black uppercase tracking-tight">
                {item.label}
              </span>
            </motion.div>
            <AnimatePresence>
              {hovered === i && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full -mb-2 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-3 py-1 text-xs font-black whitespace-nowrap border-[3px] border-black dark:border-white z-30 pointer-events-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
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
// 2. BRUTALIST RADAR CHART (Compliance Health Dimensions)
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

function BrutalistRadarChart({ radarData }) {
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const numAxes = radarData.length;

  const pathData =
    radarData.map((d, i) => {
      const coords = getCoords(d.value, i, numAxes);
      return `${i === 0 ? 'M' : 'L'} ${coords.x} ${coords.y}`;
    }).join(' ') + ' Z';

  const gridLevels = [100, 75, 50, 25];

  return (
    <div className="w-full h-full bg-zinc-50 dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 flex flex-col sm:flex-row gap-6 relative overflow-hidden transition-colors duration-200">
      {/* LEFT: CHART AREA */}
      <div className="flex-1 flex items-center justify-center relative min-h-[220px]">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 dark:opacity-10">
          <span className="text-8xl font-black uppercase text-black dark:text-white">
            HEALTH
          </span>
        </div>

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
              className="stroke-black/20 dark:stroke-white/20"
              strokeWidth="2"
              strokeDasharray="4 4"
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
                className="stroke-black/20 dark:stroke-white/20"
                strokeWidth="2"
              />
            );
          })}

          {/* The Data Polygon */}
          <motion.path
            d={pathData}
            fill="rgba(194, 65, 12, 0.45)"
            className="stroke-black dark:stroke-white"
            strokeWidth="3.5"
            strokeLinejoin="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
              delay: 0.2,
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
                <circle cx={coords.x} cy={coords.y} r="18" fill="transparent" />
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r="5"
                  className="fill-white dark:fill-zinc-900 stroke-black dark:stroke-white"
                  strokeWidth="2.5"
                  animate={{
                    scale: isHovered ? 2.2 : 1,
                    strokeWidth: isHovered ? 4 : 2.5,
                    fill: isHovered ? d.color : '#fff',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* RIGHT: STATS LIST */}
      <div className="w-full sm:w-48 flex flex-col justify-center gap-2 z-10">
        <h3 className="font-black uppercase text-lg mb-1 border-b-[3px] border-black dark:border-white pb-1.5 text-black dark:text-white">
          Health Index
        </h3>
        {radarData.map((item, i) => (
          <motion.div
            key={i}
            onMouseEnter={() => setHoveredMetric(item.label)}
            onMouseLeave={() => setHoveredMetric(null)}
            className="flex items-center justify-between p-1.5 border-2 border-transparent hover:border-black dark:hover:border-white hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            animate={{
              x: hoveredMetric === item.label ? 8 : 0,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 border-2 border-black dark:border-white shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-bold font-mono text-black dark:text-zinc-200">
                {item.label}
              </span>
            </div>
            <span className="font-black text-xs text-black dark:text-white font-mono">
              {item.value}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// =========================================
// 3. BRUTALIST DONUT CHART (Live Compliance Score & Inspection)
// =========================================
const springConfig = { type: 'spring', stiffness: 300, damping: 20 };
const getPieCoords = (percent) => {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
};

function BrutalistDonut({ complianceScore, totalFine, totalDailyFine, totalLicenses }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // Dynamic breakdown sectors
  const pieData = [
    { label: 'COMPLIANT', value: Math.max(5, complianceScore), color: '#34d399' },
    { label: 'RISK', value: Math.max(5, 100 - complianceScore), color: totalFine > 0 ? '#f87171' : '#fbbf24' },
  ];

  let cumulativePercent = 0;

  return (
    <div className="w-full h-full bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 flex flex-col items-center justify-between overflow-hidden relative transition-colors duration-200">
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none z-0 bg-[radial-gradient(#000_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:12px_12px]"
      />
      <div className="flex items-center justify-between border-b-[3px] border-black dark:border-white pb-2 mb-6 w-full z-10">
        <h3 className="font-black uppercase tracking-tight text-xl text-black dark:text-white">
          System Compliance Score
        </h3>
        <span className="font-mono text-xs font-black px-2 py-0.5 border-2 border-black dark:border-white bg-amber-300 text-black">
          {complianceScore >= 80 ? 'GRADE A' : complianceScore >= 60 ? 'GRADE B' : complianceScore >= 40 ? 'GRADE C' : 'CRITICAL'}
        </span>
      </div>

      <div className="z-10 flex flex-col items-center w-full flex-1 justify-center my-4">
        <div className="relative w-56 h-56 md:w-64 md:h-64">
          <motion.svg
            viewBox="-1.2 -1.2 2.4 2.4"
            className="-rotate-90 overflow-visible w-full h-full"
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: -90, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
              delay: 0.2,
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
                  className="stroke-black dark:stroke-white"
                  strokeWidth="0.04"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{
                    translateX: isHovered ? (startX + endX) * 0.1 : 0,
                    translateY: isHovered ? (startY + endY) * 0.1 : 0,
                    scale: isHovered ? 1.05 : 1,
                    opacity: isDimmed ? 0.3 : 1,
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
              r="0.6"
              className="fill-white dark:fill-zinc-900 stroke-black dark:stroke-white"
              strokeWidth="0.04"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, ...springConfig }}
            />
          </motion.svg>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black font-mono leading-none text-black dark:text-white">
                {complianceScore}%
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest bg-black dark:bg-white text-white dark:text-black px-1.5 py-0.5 mt-1 font-mono">
                OVERALL
              </span>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="w-full mt-6 grid grid-cols-2 gap-3">
          <div className="p-3 border-[3px] border-black dark:border-white bg-zinc-50 dark:bg-zinc-800 flex flex-col">
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400">Current Fine Risk</span>
            <span className="text-xl font-black font-mono text-rose-500 mt-0.5">
              {formatCurrency(totalFine)}
            </span>
          </div>
          <div className="p-3 border-[3px] border-black dark:border-white bg-zinc-50 dark:bg-zinc-800 flex flex-col">
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400">Daily Accrual</span>
            <span className="text-xl font-black font-mono text-amber-500 mt-0.5">
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
    if (critPassed < critical.length) return { score: Math.round((critPassed / (critical.length || 1)) * 50), label: 'Fail Risk', color: 'text-rose-500', bg: 'bg-rose-500' };
    const full = 50 + Math.round((nonCritPassed / (nonCritical.length || 1)) * 50);
    return {
      score: full,
      label: full === 100 ? 'Ready to Pass' : 'Minor Issues',
      color: full === 100 ? 'text-emerald-500' : 'text-amber-500',
      bg: full === 100 ? 'bg-emerald-500' : 'bg-amber-500'
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
      { label: 'SCORE', value: scoreData.score || 85, color: '#f87171' },
      { label: 'ACTIVE', value: Math.round((satisfied / total) * 100), color: '#4ade80' },
      { label: 'UNEXPIRED', value: Math.round((nonExpired / total) * 100), color: '#60a5fa' },
      { label: 'VERIFIED', value: Math.round((hasDocs / total) * 100), color: '#fbbf24' },
      { label: 'HORIZON', value: Math.round((longTerm / total) * 100), color: '#a78bfa' },
    ];
  }, [licenses, scoreData]);

  return (
    <div className="min-h-screen w-full bg-zinc-100 dark:bg-black p-4 md:p-10 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black flex flex-col transition-colors duration-200">
      {/* Texture Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"
      />

      <div className="max-w-7xl w-full mx-auto relative z-10 flex flex-col flex-1 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-[3px] border-black dark:border-white pb-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-black dark:text-white">
              Analytics
            </h1>
            <p className="font-bold font-mono text-zinc-600 dark:text-zinc-400 uppercase tracking-widest text-xs md:text-sm mt-1">
              Bento Telemetry · Real-Time Compliance Overview
            </p>
          </div>

          {totalDailyCost > 0 && (
            <div className="flex items-center gap-2 border-[3px] border-black dark:border-white bg-rose-400 text-black px-4 py-2 font-mono font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Flame size={16} />
              +{formatCurrency(totalDailyCost)}/day Accruing Fines
            </div>
          )}
        </header>

        {/* MAIN BENTO GRID - ROW 1: PRIMARY TELEMETRY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMN 1 (LEFT 7 COLS): STACKED BAR + RADAR */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="w-full min-h-[380px]">
              <BrutalistBarChart summary={summary} total={licenses.length} />
            </div>
            <div className="w-full min-h-[380px]">
              <BrutalistRadarChart radarData={radarMetrics} />
            </div>
          </div>

          {/* COLUMN 2 (RIGHT 5 COLS): FULL HEIGHT DONUT + LIVE RISK */}
          <div className="lg:col-span-5 flex">
            <div className="w-full h-full">
              <BrutalistDonut
                complianceScore={scoreData.score || 85}
                totalFine={totalCurrentFine}
                totalDailyFine={totalDailyCost}
                totalLicenses={licenses.length}
              />
            </div>
          </div>
        </div>

        {/* ── BENTO ROW 2: FINE PROJECTION & ESCALATION ── */}
        <div className="w-full bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-[3px] border-black dark:border-white pb-3 mb-6 gap-2">
            <div>
              <h3 className="font-black uppercase text-xl text-black dark:text-white flex items-center gap-2">
                <TrendingUp size={20} /> Fine Escalation Projection (90-Day Forecast)
              </h3>
              <p className="font-mono text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mt-0.5">
                Cumulative penalty exposure if unaddressed
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-black">
              {[
                { label: '+7D', val: projectionData.find(p => p.label === '+7d')?.fine || 0 },
                { label: '+30D', val: projectionData.find(p => p.label === '+30d')?.fine || 0 },
                { label: '+90D', val: projectionData.find(p => p.label === '+90d')?.fine || 0 },
              ].map(s => (
                <div key={s.label} className="border-2 border-black dark:border-white px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800">
                  <span className="text-zinc-400 mr-1">{s.label}:</span>
                  <span className="text-rose-500">{formatCurrency(s.val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
            {projectionData.map((pt, i) => {
              const maxFine = Math.max(...projectionData.map(p => p.fine), 1);
              const heightPct = Math.max(15, Math.round((pt.fine / maxFine) * 100));
              return (
                <div key={i} className="flex flex-col items-center border-[2px] border-black dark:border-white p-3 bg-zinc-50 dark:bg-zinc-800">
                  <span className="font-mono font-bold text-xs text-zinc-500">{pt.label}</span>
                  <div className="w-full h-24 flex items-end justify-center my-2">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.05 }}
                      className="w-full max-w-[28px] bg-rose-400 border-[2px] border-black dark:border-white"
                    />
                  </div>
                  <span className="font-mono font-black text-xs text-black dark:text-white">{formatCurrency(pt.fine)}</span>
                </div>
              );
            })}
          </div>

          {expiredWithPenalties.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t-[3px] border-black dark:border-white">
              {expiredWithPenalties.map(l => (
                <div key={l.id} className="border-2 border-black dark:border-white p-4 bg-rose-50 dark:bg-rose-950/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-black text-sm text-black dark:text-white">{l.name}</div>
                      <div className="font-mono text-xs text-zinc-500 mt-0.5">{l.daysOverdue} days overdue</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black font-mono text-rose-600 text-base">{formatCurrency(l.penalty.currentFine)}</div>
                      <div className="font-mono text-[10px] text-zinc-500">+{formatCurrency(l.penalty.dailyCost)}/day</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border border-black dark:border-white px-2 py-1">
                    ⚠️ {l.penalty.currentConsequence}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── BENTO ROW 3: INSPECTION READINESS & RENEWAL COUNTDOWN ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT (6 COLS): INSPECTION READINESS */}
          <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6">
            <div className="flex items-center justify-between border-b-[3px] border-black dark:border-white pb-3 mb-6">
              <h3 className="font-black uppercase text-xl text-black dark:text-white flex items-center gap-2">
                <Eye size={20} /> Inspection Audit Checklist
              </h3>
              <span className={`font-mono font-black text-xs px-2.5 py-1 border-2 border-black dark:border-white ${inspectionScore.score >= 80 ? 'bg-emerald-300 text-black' : inspectionScore.score >= 50 ? 'bg-amber-300 text-black' : 'bg-rose-400 text-black'}`}>
                {inspectionScore.score}/100 — {inspectionScore.label}
              </span>
            </div>

            <div className="space-y-3">
              {inspectionChecklist.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 border-[2px] border-black dark:border-white ${item.ok ? 'bg-emerald-50 dark:bg-emerald-950/20' : item.critical ? 'bg-rose-50 dark:bg-rose-950/20' : 'bg-amber-50 dark:bg-amber-950/20'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 border-2 border-black dark:border-white flex items-center justify-center font-black text-xs ${item.ok ? 'bg-emerald-400 text-black' : item.critical ? 'bg-rose-400 text-black' : 'bg-amber-400 text-black'}`}>
                      {item.ok ? '✓' : '✗'}
                    </div>
                    <span className="text-xs font-bold font-mono text-black dark:text-white">
                      {item.label}
                    </span>
                  </div>
                  {item.critical && !item.ok && (
                    <span className="font-mono text-[10px] font-black bg-black text-white px-2 py-0.5 border border-black dark:border-white">
                      CRITICAL
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT (6 COLS): RENEWAL COUNTDOWN */}
          <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b-[3px] border-black dark:border-white pb-3 mb-6">
                <h3 className="font-black uppercase text-xl text-black dark:text-white flex items-center gap-2">
                  <Calendar size={20} /> Expiry Horizon
                </h3>
                <span className="font-mono text-xs font-bold text-zinc-500">CHRONOLOGICAL</span>
              </div>

              {renewalTimeline.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-black dark:border-white font-mono text-xs text-zinc-400">
                  No expiring permits tracked.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {renewalTimeline.slice(0, 6).map((lic, i) => {
                    const days = getDaysLeft(lic.expiry_date);
                    const name = lic.requirement?.requirement_name || lic.license_type || 'License';
                    const isOverdue = days !== null && days < 0;
                    const isUrgent = days !== null && days >= 0 && days <= 30;

                    return (
                      <div
                        key={lic.id || i}
                        className="flex items-center justify-between p-2.5 border-[2px] border-black dark:border-white bg-zinc-50 dark:bg-zinc-800 hover:translate-x-1 transition-transform"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-xs truncate text-black dark:text-white">{name}</div>
                          <div className="font-mono text-[10px] text-zinc-500">{lic.requirement?.issuing_agency || 'Official Authority'}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-mono font-black text-xs ${isOverdue ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {days === null ? '—' : isOverdue ? `${Math.abs(days)}D OVERDUE` : `${days}D LEFT`}
                          </div>
                          {lic.expiry_date && (
                            <div className="font-mono text-[10px] text-zinc-400">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT (5 COLS): CITY BREAKDOWN */}
          {cityBreakdown.length > 0 && (
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6">
              <div className="flex items-center justify-between border-b-[3px] border-black dark:border-white pb-3 mb-6">
                <h3 className="font-black uppercase text-xl text-black dark:text-white flex items-center gap-2">
                  <MapPin size={20} /> Multi-City Index
                </h3>
              </div>

              <div className="space-y-4">
                {cityBreakdown.map((c, i) => (
                  <div key={c.city} className="border-2 border-black dark:border-white p-3 bg-zinc-50 dark:bg-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-xs uppercase font-mono text-black dark:text-white">{c.city}</span>
                      <span className="font-black font-mono text-xs px-2 py-0.5 border border-black dark:border-white bg-white dark:bg-zinc-900">{c.score}% COMPLIANT</span>
                    </div>
                    <div className="w-full h-3 border border-black dark:border-white bg-zinc-200 dark:bg-zinc-700 overflow-hidden mb-2">
                      <div
                        className={`h-full ${c.score >= 80 ? 'bg-emerald-400' : c.score >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                      <div className="bg-emerald-100 dark:bg-emerald-950/40 p-1 font-bold text-emerald-800 dark:text-emerald-300">ACT: {c.satisfied}</div>
                      <div className="bg-blue-100 dark:bg-blue-950/40 p-1 font-bold text-blue-800 dark:text-blue-300">PROG: {c.inProgress}</div>
                      <div className="bg-rose-100 dark:bg-rose-950/40 p-1 font-bold text-rose-800 dark:text-rose-300">EXP: {c.expired}</div>
                      <div className="bg-zinc-200 dark:bg-zinc-700 p-1 font-bold text-zinc-700 dark:text-zinc-300">NEED: {c.needed}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RIGHT (7 COLS): PRIORITY ACTION QUEUE */}
          <div className={`${cityBreakdown.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6`}>
            <div className="flex items-center justify-between border-b-[3px] border-black dark:border-white pb-3 mb-6">
              <h3 className="font-black uppercase text-xl text-black dark:text-white flex items-center gap-2">
                <Zap size={20} /> Priority Execution Queue
              </h3>
              <span className="font-mono text-xs font-black bg-black text-white dark:bg-white dark:text-black px-2 py-0.5">
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
                  const actionBg = action.includes('NOW') ? 'bg-rose-400 text-black' : action.includes('SOON') ? 'bg-amber-400 text-black' : 'bg-emerald-400 text-black';

                  return (
                    <div
                      key={l.id || i}
                      className="flex items-center justify-between p-3 border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-800"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-bold text-xs truncate text-black dark:text-white">{name}</div>
                        <div className="font-mono text-[10px] text-zinc-500">{l.requirement?.city || 'Federal / Multi-Jurisdiction'}</div>
                      </div>
                      <span className={`font-mono text-[10px] font-black px-2.5 py-1 border border-black dark:border-white ${actionBg}`}>
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
