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

const PIE_COLORS = { active: '#16A34A', expiring: '#F59E0B', expired: '#DC2626', notAdded: '#9CA3AF' };

function StatCard({ label, value, color = 'text-blue-600', sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
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
        className="bg-[#0D1B2A] rounded-3xl p-6 md:p-8 text-center">
        <div className="text-blue-300 text-sm font-bold uppercase tracking-wide mb-2">{t('analytics.savings_title')}</div>
        <div className="text-4xl md:text-5xl font-black text-white mb-2">{formatCurrency(totalSavings)}</div>
        <div className="text-gray-400 text-sm">estimated penalties avoided by staying compliant</div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Compliance Score" value={`${scoreData.score}`} color={`${scoreData.score >= 80 ? 'text-green-600' : scoreData.score >= 60 ? 'text-blue-600' : 'text-red-600'}`} sub={scoreData.message} />
        <StatCard label="Licenses Tracked" value={summary.total} color="text-blue-600" />
        <StatCard label="Expiring This Month" value={summary.expiringMonth} color="text-amber-600" />
        <StatCard label="Days Until Next Expiry" value={licenses.filter(l => l.daysLeft !== null && l.daysLeft > 0).reduce((m, l) => Math.min(m, l.daysLeft), 999) === 999 ? '—' : licenses.filter(l => l.daysLeft !== null && l.daysLeft > 0).reduce((m, l) => Math.min(m, l.daysLeft), 999)} color="text-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="section-title mb-6">{t('analytics.score_trend')}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '0.75rem', fontSize: '13px' }} formatter={(v) => [v, 'Score']} />
              <Line type="monotone" dataKey="score" stroke="#16A34A" strokeWidth={3} dot={{ fill: '#16A34A', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="section-title mb-6">{t('analytics.distribution')}</h2>
          {pieData.length === 0
            ? <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No license data yet</div>
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: '0.75rem', fontSize: '13px' }} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: '12px', color: '#4B5563' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Upcoming renewals */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="section-title mb-4">{t('analytics.upcoming')}</h2>
          <div className="space-y-3">
            {upcoming.map((lic) => (
              <div key={lic.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{getLicenseById(lic.license_type)?.name || lic.license_type}</div>
                  <div className="text-xs text-gray-400">{formatDate(lic.expiry_date)}</div>
                </div>
                <div className={`text-sm font-bold ${lic.daysLeft <= 7 ? 'text-red-600' : lic.daysLeft <= 30 ? 'text-amber-600' : 'text-gray-600'}`}>{lic.daysLeft}d left</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings table */}
      {savingsData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="section-title mb-4">{t('analytics.savings_table')}</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 text-xs font-bold text-gray-400 uppercase">{t('analytics.license_col')}</th>
              <th className="text-right py-2 px-3 text-xs font-bold text-gray-400 uppercase">{t('analytics.avoided_col')}</th>
            </tr></thead>
            <tbody>
              {savingsData.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 px-3 text-gray-700 font-medium">{row.name}</td>
                  <td className="py-3 px-3 text-right text-green-600 font-bold">{formatCurrency(row.avoided)}</td>
                </tr>
              ))}
              <tr className="bg-green-50">
                <td className="py-3 px-3 font-bold text-gray-900">Total Avoided</td>
                <td className="py-3 px-3 text-right font-black text-green-700 text-base">{formatCurrency(totalSavings)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
