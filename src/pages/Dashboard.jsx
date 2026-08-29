import { useState, useMemo } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, AlertTriangle, Plus, ShieldCheck, FileCheck2, ClipboardList, TrendingUp, Calendar, LayoutGrid, Clock, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useDemo } from '../context/DemoContext';
import { useLicenses } from '../hooks/useLicenses';
import { getLicenseSummary } from '../utils/complianceScore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PENALTY_RULES } from '../utils/penaltyRules';
import { getBusiness, createLicense } from '../services/supabase';
import ComplianceRing from '../components/ui/ComplianceRing';
import LicenseCard from '../components/ui/LicenseCard';
import SkeletonCard from '../components/ui/SkeletonCard';
import EmptyState from '../components/ui/EmptyState';
import ScanModal from '../components/features/ScanModal';
import PaymentModal from '../components/features/PaymentModal';

function StatCard({ label, value, color = 'text-accent', icon: Icon }) {
  return (
    <div className="bg-surface rounded-lg border border-rule-dark shadow-card p-4">
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon size={14} className={color} />}
        <div className="text-[11px] font-semibold font-display text-ink-muted uppercase tracking-wider">{label}</div>
      </div>
      <div className={`text-2xl md:text-3xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}

/** Compute "Permit Coverage" score: % of tracked requirements that are satisfied or in_progress */
function computePermitCoverage(licenses) {
  if (!licenses || licenses.length === 0) return { score: 0, covered: 0, total: 0, grade: '—' };
  const total = licenses.length;
  const covered = licenses.filter(l => l.status === 'satisfied' || l.status === 'in_progress' || l.status === 'waived').length;
  const score = Math.round((covered / total) * 100);
  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
  return { score, covered, total, grade };
}

/** Compute "License Health" score: penalizes expired licenses and those expiring within 30 days */
function computeLicenseHealth(licenses) {
  if (!licenses || licenses.length === 0) return { score: 0, healthy: 0, total: 0, grade: '—' };
  const total = licenses.length;
  let deductions = 0;
  licenses.forEach(l => {
    if (l.status === 'expired') { deductions += 25; return; }
    const d = l.daysLeft;
    if (d !== null && d <= 7) deductions += 15;
    else if (d !== null && d <= 30) deductions += 8;
    else if (d !== null && d <= 60) deductions += 2;
  });
  const score = Math.max(0, 100 - Math.round((deductions / (total * 25)) * 100));
  const healthy = licenses.filter(l => l.status !== 'expired' && (l.daysLeft === null || l.daysLeft > 60)).length;
  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
  return { score, healthy, total, grade };
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemo, demoLicenses, addScannedDemoLicense, updateDemoRequirement } = useDemo();
  const { business } = useOutletContext();
  const [showScan, setShowScan] = useState(false);
  const [paymentModalLicense, setPaymentModalLicense] = useState(null);
  const [sort, setSort] = useState('urgent');

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'timeline'

  const { licenses, loading, addLicense, editLicense } = useLicenses(
    isDemo ? null : business?.id,
    isDemo ? demoLicenses : null
  );

  const sorted = useMemo(() => {
    return [...licenses].sort((a, b) => {
      if (sort === 'urgent') return (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999);
      if (sort === 'az') return (a.license_type || '').localeCompare(b.license_type || '');
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [licenses, sort]);

  // Partition requirements for better dashboard readability
  const { actionRequired, monitored } = useMemo(() => {
    const action = [];
    const ok = [];
    sorted.forEach(l => {
      const isUrgent = l.status === 'needed' || l.status === 'expired' || (l.daysLeft !== null && l.daysLeft <= 15);
      if (isUrgent) {
        action.push(l);
      } else {
        ok.push(l);
      }
    });
    return { actionRequired: action, monitored: ok };
  }, [sorted]);

  // Compliance Timeline: all requirements with an expiry_date, sorted chronologically & grouped by urgency
  const timelineGroups = useMemo(() => {
    const withExpiry = licenses.filter(l => l.expiry_date);
    const chronological = [...withExpiry].sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

    const groups = [
      {
        id: 'expired',
        title: 'Expired / Lapsed Requirements',
        color: 'text-danger',
        bg: 'bg-red-50/70 border-red-200',
        badge: 'Critical',
        items: chronological.filter(l => l.status === 'expired' || (l.daysLeft !== null && l.daysLeft < 0)),
      },
      {
        id: 'critical_week',
        title: 'Expiring in ≤ 7 Days',
        color: 'text-danger',
        bg: 'bg-red-50/40 border-red-200/80',
        badge: 'Immediate Action',
        items: chronological.filter(l => l.status !== 'expired' && l.daysLeft !== null && l.daysLeft >= 0 && l.daysLeft <= 7),
      },
      {
        id: 'critical_month',
        title: 'Expiring in 8 – 30 Days',
        color: 'text-caution',
        bg: 'bg-amber-50/40 border-amber-200/80',
        badge: 'Attention Needed',
        items: chronological.filter(l => l.status !== 'expired' && l.daysLeft !== null && l.daysLeft > 7 && l.daysLeft <= 30),
      },
      {
        id: 'upcoming',
        title: 'Expiring in 31 – 60 Days',
        color: 'text-blue-600',
        bg: 'bg-blue-50/40 border-blue-200/80',
        badge: 'Upcoming Renewal',
        items: chronological.filter(l => l.status !== 'expired' && l.daysLeft !== null && l.daysLeft > 30 && l.daysLeft <= 60),
      },
      {
        id: 'stable',
        title: 'Stable & Long-Term (> 60 Days)',
        color: 'text-settled',
        bg: 'bg-green-50/40 border-green-200/80',
        badge: 'Compliant',
        items: chronological.filter(l => l.status !== 'expired' && (l.daysLeft === null || l.daysLeft > 60)),
      },
    ];

    return groups.filter(g => g.items.length > 0);
  }, [licenses]);

  if (!isDemo && user && business === undefined) {
    return <div className="p-8 text-center text-ink-muted">Loading business profile...</div>;
  }

  const summary = getLicenseSummary(licenses);
  const permitCoverage = computePermitCoverage(licenses);
  const licenseHealth = computeLicenseHealth(licenses);

  const totalPenalty = licenses
    .filter(l => l.daysLeft < 0)
    .reduce((sum, l) => {
      const rule = PENALTY_RULES[l.license_type];
      const fine = rule?.slabs?.[0]?.fine || 0;
      return sum + fine;
    }, 0);

  const handleSave = async (fields) => {
    if (isDemo) {
      addScannedDemoLicense(fields);
      toast.success('License scanned & saved to profile!');
      return;
    }
    if (!business?.id) throw new Error('No business found');

    await addLicense({
      license_type: fields.license_type || 'Scanned Document',
      license_number: fields.license_number || null,
      issuing_authority: fields.issuing_authority || null,
      expiry_date: fields.expiry_date || null,
      business_id: business.id,
      status: fields.expiry_date && new Date(fields.expiry_date) < new Date() ? 'expired' : 'satisfied',
      extracted_via_ocr: true,
    });
    toast.success('License saved successfully!');
  };

  const hasData = licenses.length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header hero card — Asymmetric, restrained professional layout */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-lg border border-rule-dark shadow-card p-6 md:p-7">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left Column: Business info & status tally */}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold font-display uppercase tracking-wider text-accent mb-1">
              Compliance Overview
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-ink tracking-tight leading-tight">
              {business?.business_name ? t(`business.${business.business_name}`, business.business_name) : (business?.owner_name || 'Business Dashboard')}
            </h1>
            <div className="text-xs font-mono text-ink-muted mt-1.5 flex flex-wrap items-center gap-1.5">
              <span>{business?.owner_name ? `${business.owner_name} · ` : ''}</span>
              <span>{t(`geo.${business?.city}`, business?.city || 'New York')}</span>
              {business?.state && <span>, {t(`geo.${business.state}`, business.state)}</span>}
              {business?.country && <span>({t(`geo.${business.country}`, business.country)})</span>}
              <span className="text-rule-dark">|</span>
              <span className="capitalize">{business?.business_type?.replace('_', ' ') || 'General Business'}</span>
            </div>

            {!hasData && (
              <div className="mt-3 text-xs text-ink-muted italic">
                Track your first requirement in{' '}
                <Link to="/requirements" className="text-accent underline font-medium">My Requirements</Link>{' '}
                to generate compliance scores.
              </div>
            )}

            {/* Inline Status Breakdown Strip */}
            {hasData && (
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-5 pt-4 border-t border-rule-dark/50">
                {[
                  { label: t('status.satisfied', 'Satisfied'), value: summary.satisfied, cls: 'bg-settled/10 text-settled border-settled/20' },
                  { label: t('status.in_progress', 'In Progress'), value: summary.inProgress, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { label: t('status.needed', 'Needed'), value: summary.needed, cls: 'bg-base-dark text-ink-muted border-rule-dark' },
                  { label: t('status.expired', 'Expired'), value: summary.expired, cls: 'bg-red-50 text-danger border-red-200' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${cls}`}>
                    <span className="font-bold font-mono">{value}</span>
                    <span className="font-medium font-display text-[11px]">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Asymmetric Stacked Telemetry Rings */}
          {hasData ? (
            <div className="shrink-0 flex items-center gap-5 border-t md:border-t-0 md:border-l border-rule-dark/60 pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-around md:justify-start">
              {/* Ring 1: Permit Coverage */}
              <div className="flex flex-col items-center gap-1">
                <ComplianceRing score={permitCoverage.score} size={88} strokeWidth={7} color="#4F46E5" />
                <div className="text-[11px] font-semibold font-display text-ink text-center leading-tight">
                  {t('dashboard.permit_coverage', 'Coverage')}
                </div>
                <div className="text-[10px] text-ink-muted font-mono">
                  {permitCoverage.covered}/{permitCoverage.total} tracked
                </div>
              </div>

              {/* Ring 2: License Health */}
              <div className="flex flex-col items-center gap-1">
                <ComplianceRing score={licenseHealth.score} size={88} strokeWidth={7} />
                <div className="text-[11px] font-semibold font-display text-ink text-center leading-tight">
                  {t('dashboard.license_health', 'Health')}
                </div>
                <div className="text-[10px] text-ink-muted font-mono">
                  {licenseHealth.healthy}/{licenseHealth.total} healthy
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2 bg-base border border-rule-dark rounded-lg p-4 text-center max-w-[200px]">
              <ShieldCheck size={24} className="text-ink-muted" />
              <div className="text-ink-muted font-medium text-xs leading-snug">
                Track requirements to view compliance scores
              </div>
              <Link to="/requirements" className="mt-0.5 text-accent text-xs font-semibold underline">
                Browse Catalog →
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* Alert banner — Expired / Penalties */}
      {summary.expired > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-red-50/70 border border-red-200 border-l-[3px] border-l-danger rounded-lg p-3.5 shadow-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-danger shrink-0" />
            <div>
              <div className="font-semibold text-danger text-xs sm:text-sm">
                {summary.expired} {t('dashboard.alert_expired', 'requirement(s) expired · Estimated fine:')} <span className="font-mono font-bold">{formatCurrency(totalPenalty)}</span>
              </div>
              <div className="text-danger/80 text-[11px] mt-0.5">{t('dashboard.renew_immediately', 'Action recommended to avoid penalty escalation')}</div>
            </div>
          </div>
          <button onClick={() => setViewMode('grid')} className="text-xs font-semibold text-danger underline font-display shrink-0 ml-2">
            View Items →
          </button>
        </motion.div>
      )}

      {/* Expiring soon banner */}
      {summary.expiringMonth > 0 && summary.expired === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-amber-50/70 border border-amber-200 border-l-[3px] border-l-caution rounded-lg p-3.5 shadow-card flex items-center gap-3">
          <TrendingUp size={18} className="text-amber-700 shrink-0" />
          <div>
            <div className="font-semibold text-amber-900 text-xs sm:text-sm">{summary.expiringMonth} {t('dashboard.expiring_banner_title', 'permit(s) expiring within 30 days')}</div>
            <div className="text-amber-700 text-[11px] mt-0.5">{t('dashboard.action_recommended', 'Action recommended to stay compliant')}</div>
          </div>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('dashboard.total_licenses')} value={summary.total} color="text-accent" icon={ClipboardList} />
        <StatCard label={t('status.satisfied', 'Satisfied')} value={summary.satisfied} color={summary.satisfied > 0 ? 'text-settled' : 'text-ink-faint'} icon={FileCheck2} />
        <StatCard label={t('dashboard.expiring_this_month', 'Expiring Soon')} value={summary.expiringMonth} color={summary.expiringMonth > 0 ? 'text-caution' : 'text-ink-faint'} icon={TrendingUp} />
        <StatCard label={t('dashboard.expired_lapsed', 'Expired / Overdue')} value={summary.expired} color={summary.expired > 0 ? 'text-danger' : 'text-ink-faint'} icon={AlertTriangle} />
      </div>

      {/* Tracked requirements display */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule-dark pb-3">
          <div>
            <h2 className="text-lg font-bold font-display text-ink tracking-tight">Tracked Requirements</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {viewMode === 'timeline'
                ? 'Chronological timeline of upcoming and past expirations'
                : 'Monitor active, needed, and renewing permits across your operating jurisdictions'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-base p-0.5 rounded-md border border-rule-dark">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold font-display transition-all ${viewMode === 'grid' ? 'bg-surface text-ink shadow-subtle' : 'text-ink-muted hover:text-ink'}`}
                title="Grid Card View"
              >
                <LayoutGrid size={13} />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold font-display transition-all ${viewMode === 'timeline' ? 'bg-surface text-ink shadow-subtle' : 'text-ink-muted hover:text-ink'}`}
                title="Chronological Timeline View"
              >
                <Calendar size={13} />
                <span>Timeline</span>
              </button>
            </div>

            {viewMode === 'grid' && (
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="text-xs font-medium border border-rule-dark rounded-md px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent bg-surface font-display text-ink shadow-subtle">
                <option value="urgent">Most Urgent</option>
                <option value="az">A–Z</option>
                <option value="recent">Recently Added</option>
              </select>
            )}

            <button onClick={() => setShowScan(true)} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={13} /> Add Document
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            title={t('dashboard.no_licenses')}
            description="Go to My Requirements and click 'Add to My Licenses' on any permit to start tracking it here."
            action={() => navigate('/requirements')}
            actionLabel="Browse My Requirements"
            icon={ClipboardList}
          />
        ) : viewMode === 'timeline' ? (
          /* ── Compliance Timeline View ── */
          <div className="space-y-6">
            {timelineGroups.length === 0 ? (
              <div className="bg-surface rounded-lg border border-rule-dark p-6 text-center space-y-2">
                <Clock size={28} className="mx-auto text-ink-faint" />
                <h3 className="font-semibold font-display text-ink text-sm">No Expiration Dates Set</h3>
                <p className="text-xs text-ink-muted max-w-md mx-auto">
                  None of your tracked requirements currently have an expiry date recorded. Scan or edit your requirements to populate the compliance timeline.
                </p>
              </div>
            ) : (
              <div className="relative border-l border-rule-dark ml-3 md:ml-4 space-y-8 pl-5 md:pl-6">
                {timelineGroups.map((group) => (
                  <div key={group.id} className="relative space-y-3">
                    {/* Urgency Milestone Pin */}
                    <div className="absolute -left-[27px] md:-left-[31px] top-0.5 w-4 h-4 rounded-full bg-surface border border-accent flex items-center justify-center shadow-subtle">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule-dark/50 pb-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-bold font-display ${group.color}`}>
                          {group.title}
                        </h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-base text-ink-muted border border-rule-dark">
                          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold font-display uppercase tracking-wider text-ink-muted">
                        {group.badge}
                      </span>
                    </div>

                    {/* Chronological List of Requirements in this bracket */}
                    <div className="grid gap-2.5">
                      {group.items.map((lic) => {
                        const isExpired = lic.daysLeft !== null && lic.daysLeft < 0;
                        return (
                          <motion.div
                            key={lic.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-md border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface shadow-subtle hover:shadow-card transition-shadow ${lic.status === 'expired' || isExpired ? 'border-red-200 border-l-[3px] border-l-danger bg-red-50/30' : 'border-rule-dark'}`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold font-display text-ink text-sm">
                                  {lic.requirement?.requirement_name || lic.license_type}
                                </span>
                                {lic.requirement?.jurisdiction_level && (
                                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-base text-ink-muted border border-rule-dark">
                                    {lic.requirement.jurisdiction_level}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-ink-muted flex flex-wrap items-center gap-2 font-mono">
                                <span>Authority: <strong className="text-ink font-medium">{lic.issuing_authority || lic.requirement?.issuing_agency || '—'}</strong></span>
                                {lic.license_number && (
                                  <>
                                    <span>·</span>
                                    <span>Doc #: <strong className="text-ink font-medium">{lic.license_number}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                              <div className="text-right">
                                <div className="text-[10px] text-ink-muted uppercase font-semibold font-display tracking-wider">
                                  {isExpired ? 'Expired' : 'Expires'}
                                </div>
                                <div className="text-xs font-bold font-mono text-ink">
                                  {formatDate(lic.expiry_date)}
                                </div>
                                <div className={`text-[11px] font-medium font-mono ${isExpired ? 'text-danger' : lic.daysLeft <= 30 ? 'text-caution' : 'text-settled'}`}>
                                  {isExpired ? `${Math.abs(lic.daysLeft)}d overdue` : `${lic.daysLeft}d left`}
                                </div>
                              </div>

                              <button
                                onClick={() => navigate(`/license/${lic.id}`)}
                                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 font-display"
                              >
                                <span>Details</span>
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Grid View ── */
          <div className="space-y-8">
            {/* Section 1: Urgent Action Required */}
            {actionRequired.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-display text-danger uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={15} /> {t('dashboard.action_required', 'Action Required')} ({actionRequired.length})
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {actionRequired.map((lic, i) => (
                    <motion.div key={lic.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="h-full">
                      <LicenseCard
                        license={lic}
                        onRenew={(l) => {
                          const feeMin = l.fee_min ?? l.requirement?.fee_min;
                          const feeMax = l.fee_max ?? l.requirement?.fee_max;
                          const hasFee = (feeMin !== null && feeMin !== undefined && feeMin > 0) ||
                                         (feeMax !== null && feeMax !== undefined && feeMax > 0);
                          if (hasFee) {
                            setPaymentModalLicense(l);
                          } else {
                            navigate(`/license/${l.id}`);
                          }
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Active / Monitored */}
            {monitored.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-display text-settled uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={15} /> {t('dashboard.active_monitored', 'Active & Monitored')} ({monitored.length})
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {monitored.map((lic, i) => (
                    <motion.div key={lic.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="h-full">
                      <LicenseCard
                        license={lic}
                        onRenew={(l) => {
                          const feeMin = l.fee_min ?? l.requirement?.fee_min;
                          const feeMax = l.fee_max ?? l.requirement?.fee_max;
                          const hasFee = (feeMin !== null && feeMin !== undefined && feeMin > 0) ||
                                         (feeMax !== null && feeMax !== undefined && feeMax > 0);
                          if (hasFee) {
                            setPaymentModalLicense(l);
                          } else {
                            navigate(`/license/${l.id}`);
                          }
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera / Scan FAB — sits LEFT of the chatbot bubble */}
      <button
        onClick={() => setShowScan(true)}
        title="Scan a License"
        className="fixed bottom-20 right-[4.75rem] lg:bottom-6 lg:right-24 z-30 w-14 h-14 bg-ink hover:bg-ink/80 text-white rounded-full shadow-xl flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-110"
      >
        <Camera size={20} />
        <span className="text-[9px] font-bold font-display tracking-wide leading-none">SCAN</span>
      </button>

      {/* Scan Modal */}
      {showScan && <ScanModal
        onClose={() => setShowScan(false)}
        onSave={handleSave}
        businessType={business?.business_type}
        cities={business?.cities || []}
      />}

      {/* Payment Modal for Direct Renewal Checkout */}
      {paymentModalLicense && (
        <PaymentModal
          isOpen={!!paymentModalLicense}
          onClose={() => setPaymentModalLicense(null)}
          requirement={paymentModalLicense.requirement || {
            id: paymentModalLicense.requirement_id || paymentModalLicense.id,
            requirement_name: paymentModalLicense.license_type,
            issuing_agency: paymentModalLicense.issuing_authority,
            fee_min: paymentModalLicense.fee_min,
            fee_max: paymentModalLicense.fee_max,
          }}
          business={business}
          onPaymentSuccess={async (paymentRecord) => {
            toast.success(`Payment recorded for ${paymentModalLicense.license_type}!`, {
              icon: '💳',
              duration: 5000,
            });

            if (isDemo) {
              updateDemoRequirement(paymentModalLicense.id, {
                status: 'payment_recorded',
                payment_recorded_at: paymentRecord.paidAt,
                payment_id: paymentRecord.paymentId,
              });
              return;
            }

            try {
              await editLicense(paymentModalLicense.id, {
                status: 'payment_recorded',
              });
            } catch (err) {
              console.error('Failed to update payment status:', err);
              toast.error('Payment recorded locally, but could not sync with database.');
            }
          }}
        />
      )}
    </div>
  );
}

