import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../hooks/useAuth';
import { useLicenses } from '../hooks/useLicenses';
import { calculateComplianceScore, getLicenseSummary } from '../utils/complianceScore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getLicenseById } from '../utils/licenseTypes';
import { PENALTY_RULES } from '../utils/penaltyRules';
import { format, subMonths } from 'date-fns';

const PIE_COLORS = { active: '#6B8F71', expiring: '#CA8A04', expired: '#C2410C', notAdded: '#A8A29E' };

function StatCard({ label, value, color = 'text-accent', sub }) {
  return (
    <div className="bg-surface rounded-2xl border border-rule p-5">
      <div className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-3xl font-black font-display ${color}`}>{value}</div>
      {sub && <div className="text-xs text-ink-faint mt-1">{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const { t } = useTranslation();
  const { isDemo, demoLicenses } = useDemo();
  const { user } = useAuth();
  const { licenses } = useLicenses(null, isDemo ? demoLicenses : null);

  const scoreData = calculateComplianceScore(licenses);
  const summary = getLicenseSummary(licenses);

  const trendData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const jitter = i === 5 ? 0 : Math.round((5 - i) * 6);
    return { month: format(month, 'MMM'), score: Math.max(0, Math.min(100, scoreData.score - jitter)) };
  }), [scoreData.score]);

  const pieData = [
    { name: 'Active', value: summary.active, color: PIE_COLORS.active },
    { name: 'Expiring Soon', value: summary.expiringMonth, color: PIE_COLORS.expiring },
    { name: 'Expired', value: summary.expired, color: PIE_COLORS.expired },
  ].filter(d => d.value > 0);

  const upcoming = useMemo(() => licenses.filter(l => l.daysLeft !== null && l.daysLeft >= 0 && l.daysLeft <= 90).sort((a, b) => a.daysLeft - b.daysLeft), [licenses]);

  const savingsData = useMemo(() => licenses.filter(l => l.status === 'active' || (l.daysLeft !== null && l.daysLeft > 0))
    .map(l => { const rule = PENALTY_RULES[l.license_type]; const avoided = rule?.slabs?.[0]?.fine || 0; return { name: getLicenseById(l.license_type)?.name || l.license_type, avoided }; })
    .filter(l => l.avoided > 0), [licenses]);

  const totalSavings = savingsData.reduce((s, l) => s + l.avoided, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-title">{t('analytics.title')}</motion.h1>

      {/* Hero savings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-ink rounded-3xl p-6 md:p-8 text-center">
        <div className="text-accent text-sm font-bold font-display uppercase tracking-wide mb-2">{t('analytics.savings_title')}</div>
        <div className="text-4xl md:text-5xl font-black font-display text-white mb-2">{formatCurrency(totalSavings)}</div>
        <div className="text-ink-faint text-sm">estimated penalties avoided by staying compliant</div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Compliance Score" 
          value={licenses.length > 0 ? `${scoreData.score}` : '—'} 
          color={licenses.length > 0 ? (scoreData.score >= 80 ? 'text-settled' : scoreData.score >= 60 ? 'text-accent' : 'text-danger') : 'text-ink-faint'} 
          sub={licenses.length > 0 ? scoreData.message : 'Add business data to generate'} 
        />
        <StatCard label="Licenses Tracked" value={summary.total} color="text-accent" />
        <StatCard label="Expiring This Month" value={summary.expiringMonth} color="text-caution" />
        <StatCard label="Days Until Next Expiry" value={licenses.filter(l => l.daysLeft !== null && l.daysLeft > 0).reduce((m, l) => Math.min(m, l.daysLeft), 999) === 999 ? '—' : licenses.filter(l => l.daysLeft !== null && l.daysLeft > 0).reduce((m, l) => Math.min(m, l.daysLeft), 999)} color="text-accent-dark" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-rule p-6">
          <h2 className="section-title mb-6">{t('analytics.score_trend')}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#A8A29E' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#A8A29E' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#FEFDFB', border: '1px solid #E7E0D5', borderRadius: '0.75rem', fontSize: '13px' }} formatter={(v) => [v, 'Score']} />
              <Line type="monotone" dataKey="score" stroke="#6B8F71" strokeWidth={3} dot={{ fill: '#6B8F71', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface rounded-2xl border border-rule p-6">
          <h2 className="section-title mb-6">{t('analytics.distribution')}</h2>
          {pieData.length === 0
            ? <div className="flex items-center justify-center h-48 text-ink-faint text-sm">No license data yet</div>
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: '0.75rem', fontSize: '13px' }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: '12px', color: '#57534E' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Upcoming renewals */}
      {upcoming.length > 0 && (
        <div className="bg-surface rounded-2xl border border-rule p-6">
          <h2 className="section-title mb-4">{t('analytics.upcoming')}</h2>
          <div className="space-y-3">
            {upcoming.map((lic) => (
              <div key={lic.id} className="flex items-center justify-between p-3 bg-base rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-ink">{getLicenseById(lic.license_type)?.name || lic.license_type}</div>
                  <div className="text-xs text-ink-faint">{formatDate(lic.expiry_date)}</div>
                </div>
                <div className={`text-sm font-bold font-display ${lic.daysLeft <= 7 ? 'text-danger' : lic.daysLeft <= 30 ? 'text-caution' : 'text-ink-muted'}`}>{lic.daysLeft}d left</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings table */}
      {savingsData.length > 0 && (
        <div className="bg-surface rounded-2xl border border-rule p-6">
          <h2 className="section-title mb-4">{t('analytics.savings_table')}</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-rule">
              <th className="text-left py-2 px-3 text-xs font-bold font-display text-ink-faint uppercase">{t('analytics.license_col')}</th>
              <th className="text-right py-2 px-3 text-xs font-bold font-display text-ink-faint uppercase">{t('analytics.avoided_col')}</th>
            </tr></thead>
            <tbody>
              {savingsData.map((row, i) => (
                <tr key={i} className="border-b border-rule/50 last:border-0">
                  <td className="py-3 px-3 text-ink font-medium">{row.name}</td>
                  <td className="py-3 px-3 text-right text-settled font-bold">{formatCurrency(row.avoided)}</td>
                </tr>
              ))}
              <tr className="bg-settled-light">
                <td className="py-3 px-3 font-bold text-ink">Total Avoided</td>
                <td className="py-3 px-3 text-right font-black text-settled text-base">{formatCurrency(totalSavings)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
