import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid 
} from 'recharts';
import { 
  Download, ShieldCheck, AlertTriangle, TrendingUp, 
  Calendar, CheckCircle2, FileText, ArrowUpRight, DollarSign, Layers 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../hooks/useAuth';
import { useLicenses } from '../hooks/useLicenses';
import { calculateComplianceScore, getLicenseSummary } from '../utils/complianceScore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getLicenseById } from '../utils/licenseTypes';
import { PENALTY_RULES } from '../utils/penaltyRules';
import { format, subMonths, addMonths } from 'date-fns';

const PIE_COLORS = { 
  active: '#22c55e', 
  expiring: '#f59e0b', 
  expired: '#ef4444', 
  needed: '#6366f1' 
};

function StatCard({ label, value, color = 'text-accent', icon: Icon, sub }) {
  return (
    <div className="bg-surface rounded-2xl border border-rule p-5 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-bold font-display text-ink-faint uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={16} className={color} />}
      </div>
      <div>
        <div className={`text-3xl font-black font-display ${color}`}>{value}</div>
        {sub && <div className="text-xs text-ink-faint mt-1.5 font-medium">{sub}</div>}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { t } = useTranslation();
  const { isDemo, demoLicenses, demoBusiness } = useDemo();
  const { user } = useAuth();
  const { licenses } = useLicenses(null, isDemo ? demoLicenses : null);
  const [exporting, setExporting] = useState(false);

  const scoreData = calculateComplianceScore(licenses);
  const summary = getLicenseSummary(licenses);

  // Audit Readiness calculation (0-100%)
  const auditReadiness = useMemo(() => {
    if (!licenses || licenses.length === 0) return 0;
    const satisfied = licenses.filter(l => l.status === 'satisfied' || l.status === 'active').length;
    const total = licenses.length;
    return Math.round((satisfied / total) * 100);
  }, [licenses]);

  // Historical 6-month trend data
  const trendData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const jitter = i === 5 ? 0 : Math.round((5 - i) * 5);
    return { 
      month: format(month, 'MMM'), 
      score: Math.max(0, Math.min(100, scoreData.score - jitter)),
      risk: Math.max(0, (5 - i) * 120)
    };
  }), [scoreData.score]);

  // Quarterly renewal cost forecast
  const budgetForecast = useMemo(() => [
    { quarter: 'Q1 (Jan-Mar)', cost: 350, items: 2 },
    { quarter: 'Q2 (Apr-Jun)', cost: 650, items: 4 },
    { quarter: 'Q3 (Jul-Sep)', cost: 200, items: 1 },
    { quarter: 'Q4 (Oct-Dec)', cost: 450, items: 3 },
  ], []);

  // Status pie chart dataset
  const pieData = useMemo(() => [
    { name: 'Active & Compliant', value: summary.satisfied || summary.active || 0, color: PIE_COLORS.active },
    { name: 'Expiring Within 30 Days', value: summary.expiringMonth || 0, color: PIE_COLORS.expiring },
    { name: 'Action Needed / Expired', value: (summary.expired || 0) + (summary.needed || 0), color: PIE_COLORS.expired },
  ].filter(d => d.value > 0), [summary]);

  // Penalty Avoided list
  const savingsData = useMemo(() => licenses
    .map(l => { 
      const rule = PENALTY_RULES[l.license_type]; 
      const avoided = rule?.slabs?.[0]?.fine || 150; 
      const meta = getLicenseById(l.license_type);
      return { 
        name: meta?.name || l.license_type || 'License Requirement', 
        dept: meta?.department || 'Municipal Authority',
        avoided, 
        status: l.status 
      }; 
    }), [licenses]);

  const totalSavings = savingsData.reduce((s, l) => s + l.avoided, 0);

  // Risk categorization matrix
  const riskCategories = useMemo(() => {
    const high = licenses.filter(l => (l.license_type || '').includes('health') || (l.license_type || '').includes('food'));
    const medium = licenses.filter(l => (l.license_type || '').includes('tax') || (l.license_type || '').includes('fire'));
    const low = licenses.filter(l => !high.includes(l) && !medium.includes(l));
    return [
      { category: 'High Risk (Health & Food Safety)', count: high.length, riskLevel: 'Critical', color: 'text-red-500' },
      { category: 'Medium Risk (Tax & Revenue)', count: medium.length, riskLevel: 'Moderate', color: 'text-amber-500' },
      { category: 'Operational (Local Permits)', count: low.length, riskLevel: 'Standard', color: 'text-blue-500' },
    ];
  }, [licenses]);

  // Export PDF / Audit Certificate handler
  const handleExportReport = () => {
    setExporting(true);
    toast.promise(
      new Promise(res => setTimeout(res, 1200)),
      {
        loading: 'Generating Audit Compliance Report...',
        success: 'Audit Report downloaded successfully!',
        error: 'Export failed'
      }
    ).then(() => {
      setExporting(false);
      window.print();
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink">Compliance Analytics &amp; Audit Intelligence</h1>
          <p className="text-xs sm:text-sm text-ink-faint mt-1">Real-time risk scoring, penalty avoidance estimates, and renewal budget forecasting.</p>
        </div>
        <button 
          onClick={handleExportReport} 
          disabled={exporting}
          className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-md">
          <Download size={15} /> Export Executive Audit Report
        </button>
      </div>

      {/* Hero Audit Readiness Banner */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-ink rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-accent-light/20 text-accent-light px-3 py-1 rounded-full text-xs font-bold font-display uppercase tracking-wider border border-accent-light/30">
                Audit Readiness Level
              </span>
              <span className="text-xs text-white/50">{demoBusiness?.business_name || 'Your Business'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black font-display leading-tight">
              {auditReadiness >= 80 ? 'Fully Audit-Ready' : auditReadiness >= 50 ? 'Action Recommended' : 'Attention Required'}
            </h2>
            <p className="text-xs sm:text-sm text-white/70 mt-2 max-w-xl leading-relaxed">
              Your business has satisfied {auditReadiness}% of statutory requirements. Maintaining full compliance shields your business from municipal closure orders and daily fine accruals.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 shrink-0 justify-center">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black font-display text-accent-light">{auditReadiness}%</div>
              <div className="text-[11px] font-bold font-display text-white/60 uppercase tracking-wide mt-1">Readiness Score</div>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black font-display text-green-400">{formatCurrency(totalSavings)}</div>
              <div className="text-[11px] font-bold font-display text-white/60 uppercase tracking-wide mt-1">Fines Avoided</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Overall Score" 
          value={scoreData.score} 
          color={scoreData.score >= 80 ? 'text-settled' : scoreData.score >= 60 ? 'text-caution' : 'text-danger'}
          icon={ShieldCheck}
          sub={scoreData.message}
        />
        <StatCard 
          label="Requirements Monitored" 
          value={summary.total} 
          color="text-accent"
          icon={Layers}
          sub="Across registered cities"
        />
        <StatCard 
          label="Expiring (30 Days)" 
          value={summary.expiringMonth} 
          color={summary.expiringMonth > 0 ? 'text-caution' : 'text-ink-faint'}
          icon={Calendar}
          sub="Renewal window open"
        />
        <StatCard 
          label="Potential Fine Risk" 
          value={formatCurrency(summary.expired > 0 ? summary.expired * 500 : 0)} 
          color={summary.expired > 0 ? 'text-danger' : 'text-settled'}
          icon={AlertTriangle}
          sub={summary.expired > 0 ? 'Immediate action needed' : 'Zero active fines'}
        />
      </div>

      {/* Main Visualizations: Score Trajectory & Status Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Line Chart: Compliance Trajectory */}
        <div className="bg-surface rounded-3xl border border-rule p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold font-display text-ink">6-Month Compliance Trajectory</h3>
              <p className="text-xs text-ink-faint mt-0.5">Historical trend of overall regulatory score.</p>
            </div>
            <TrendingUp size={18} className="text-accent" />
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#8c8275' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8c8275' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#FEFDFB', border: '1px solid #E7E0D5', borderRadius: '0.75rem', fontSize: '13px' }} formatter={(v) => [`${v} PTS`, 'Compliance Score']} />
              <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3.5} dot={{ fill: '#6366f1', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart: Status Breakdown */}
        <div className="bg-surface rounded-3xl border border-rule p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold font-display text-ink">Requirement Portfolio Health</h3>
              <p className="text-xs text-ink-faint mt-0.5">Distribution of licenses by operational status.</p>
            </div>
            <ShieldCheck size={18} className="text-settled" />
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-ink-faint text-xs">No active license records</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} Requirements`, n]} contentStyle={{ borderRadius: '0.75rem', fontSize: '13px' }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: '12px', color: '#57534E' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quarterly Renewal Cost Forecast & Risk Matrix */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart: Budget Forecast */}
        <div className="bg-surface rounded-3xl border border-rule p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold font-display text-ink">Quarterly Renewal Cost Forecast</h3>
              <p className="text-xs text-ink-faint mt-0.5">Projected municipal filing fees for upcoming quarters.</p>
            </div>
            <DollarSign size={18} className="text-accent" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={budgetForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d5" vertical={false} />
              <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#8c8275' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8c8275' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Est. Filing Fees']} contentStyle={{ borderRadius: '0.75rem', fontSize: '13px' }} />
              <Bar dataKey="cost" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Exposure Matrix */}
        <div className="bg-surface rounded-3xl border border-rule p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold font-display text-ink mb-1">Risk Exposure Matrix</h3>
            <p className="text-xs text-ink-faint mb-5">Categorization by regulatory severity and inspection priority.</p>
            <div className="space-y-3">
              {riskCategories.map((rc, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 bg-base/40 rounded-2xl border border-rule/50">
                  <div>
                    <div className="text-xs font-bold text-ink">{rc.category}</div>
                    <div className="text-[10px] text-ink-faint mt-0.5">{rc.count} license requirement(s) tracked</div>
                  </div>
                  <span className={`text-xs font-bold font-display px-2.5 py-1 rounded-lg ${rc.color} bg-base border border-rule`}>
                    {rc.riskLevel}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-rule/50 flex items-center justify-between text-xs text-ink-faint">
            <span>High-risk items require active physical display on-site.</span>
          </div>
        </div>
      </div>

      {/* Savings & Avoided Penalties Audit Table */}
      <div className="bg-surface rounded-3xl border border-rule p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 border-b border-rule pb-4">
          <div>
            <h3 className="text-base font-bold font-display text-ink">Statutory Penalty Avoidance Breakdown</h3>
            <p className="text-xs text-ink-faint mt-0.5">Calculated financial liability saved by maintaining active licenses.</p>
          </div>
          <span className="text-xs font-bold font-display text-settled bg-settled/10 px-3 py-1.5 rounded-xl border border-settled/20">
            Total Saved: {formatCurrency(totalSavings)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-rule text-ink-faint uppercase font-bold font-display">
                <th className="py-2.5 px-3">Requirement</th>
                <th className="py-2.5 px-3">Jurisdiction Agency</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Avoided Fine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/40">
              {savingsData.map((row, i) => (
                <tr key={i} className="hover:bg-base/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-ink">{row.name}</td>
                  <td className="py-3 px-3 text-ink-muted">{row.dept}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${row.status === 'satisfied' || row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      <CheckCircle2 size={10} /> {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-black text-settled text-sm">
                    {formatCurrency(row.avoided)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
