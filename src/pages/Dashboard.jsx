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

function StatCard({ label, value, color = 'text-accent', icon: Icon }) {
  return (
    <div className="bg-surface rounded-2xl border border-rule p-5">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={14} className={color} />}
        <div className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide">{label}</div>
      </div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
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
  const { isDemo, demoLicenses, addScannedDemoLicense } = useDemo();
  const { business } = useOutletContext();
  const [showScan, setShowScan] = useState(false);
  const [sort, setSort] = useState('urgent');

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'timeline'

  const { licenses, loading, addLicense } = useLicenses(
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
  // Strictly reuses calculateComplianceScore() / getLicenseSummary() urgency brackets:
  // - Critical / Expired: status === 'expired' or daysLeft < 0
  // - High Urgency: 0 <= daysLeft <= 7
  // - Moderate Urgency: 8 <= daysLeft <= 30
  // - Upcoming: 31 <= daysLeft <= 60
  // - Fully Compliant / Future: daysLeft > 60
  const timelineGroups = useMemo(() => {
    const withExpiry = licenses.filter(l => l.expiry_date);
    // Sort strictly chronologically by expiry_date ascending (earliest to latest)
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const hasData = licenses.length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header hero card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-ink rounded-3xl p-6 md:p-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="text-white">
            <div className="text-accent-light text-sm font-display font-medium mb-1">{greeting}</div>
            <h1 className="text-2xl md:text-3xl font-bold font-display leading-tight">
              {business?.owner_name || 'Welcome back'}
            </h1>
            <div className="text-ink-faint text-sm mt-1">
              {business?.business_name || 'Your Business'} · {business?.city || 'New York'}
              {business?.state ? `, ${business.state}` : ''}
              {business?.country ? ` (${business.country})` : ''}
            </div>
            {!hasData && (
              <div className="mt-3 text-xs text-ink-faint italic">
                Track your first requirement in{' '}
                <Link to="/requirements" className="text-accent-light underline">My Requirements</Link>{' '}
                to generate compliance scores.
              </div>
            )}
          </div>

          {/* ── Hybrid Compliance Rings ── */}
          {hasData ? (
            <div className="flex items-center gap-6 shrink-0">
              {/* Ring 1: Permit Coverage */}
              <div className="flex flex-col items-center gap-1">
                <ComplianceRing score={permitCoverage.score} size={110} strokeWidth={9} color="#6366f1" />
                <div className="text-xs font-bold font-display text-white/70 text-center leading-tight">
                  Permit<br/>Coverage
                </div>
                <div className="text-[10px] text-white/50 font-display">
                  {permitCoverage.covered}/{permitCoverage.total} tracked
                </div>
              </div>
              {/* Divider */}
              <div className="h-20 w-px bg-white/10 hidden md:block" />
              {/* Ring 2: License Health */}
              <div className="flex flex-col items-center gap-1">
                <ComplianceRing score={licenseHealth.score} size={110} strokeWidth={9} />
                <div className="text-xs font-bold font-display text-white/70 text-center leading-tight">
                  License<br/>Health
                </div>
                <div className="text-[10px] text-white/50 font-display">
                  {licenseHealth.healthy}/{licenseHealth.total} healthy
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2 bg-base/10 border border-rule/20 rounded-2xl p-5 text-center max-w-[200px]">
              <ShieldCheck size={28} className="text-white/30" />
              <div className="text-white/50 font-bold text-xs leading-snug">
                Track requirements to<br/>unlock compliance scores
              </div>
              <Link to="/requirements" className="mt-1 text-accent-light text-xs font-bold underline">
                Go to My Requirements →
              </Link>
            </div>
          )}
        </div>

        {/* Score breakdown bar */}
        {hasData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/10">
            {[
              { label: 'Satisfied', value: summary.satisfied, color: 'text-green-400' },
              { label: 'In Progress', value: summary.inProgress, color: 'text-blue-400' },
              { label: 'Needed', value: summary.needed, color: 'text-amber-400' },
              { label: 'Expired/Lapsed', value: summary.expired, color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className={`text-2xl font-black ${color}`}>{value}</div>
                <div className="text-xs text-white/50 font-display">{label}</div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Alert banner */}
      {summary.expired > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-danger" />
            </div>
            <div>
              <div className="font-bold text-red-800 text-sm">{summary.expired} {t('dashboard.alert_expired')} {formatCurrency(totalPenalty)}</div>
              <div className="text-red-600 text-xs mt-0.5">Renew immediately to avoid further fines</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Expiring soon banner */}
      {summary.expiringMonth > 0 && summary.expired === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} className="text-amber-600" />
          </div>
          <div>
            <div className="font-bold text-amber-800 text-sm">{summary.expiringMonth} permit(s) expiring within 30 days</div>
            <div className="text-amber-600 text-xs mt-0.5">Action recommended to stay compliant</div>
          </div>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('dashboard.total_licenses')} value={summary.total} color="text-accent" icon={ClipboardList} />
        <StatCard label="Satisfied" value={summary.satisfied} color={summary.satisfied > 0 ? 'text-settled' : 'text-ink-faint'} icon={FileCheck2} />
        <StatCard label="Expiring This Month" value={summary.expiringMonth} color={summary.expiringMonth > 0 ? 'text-caution' : 'text-ink-faint'} icon={TrendingUp} />
        <StatCard label="Expired / Lapsed" value={summary.expired} color={summary.expired > 0 ? 'text-danger' : 'text-ink-faint'} icon={AlertTriangle} />
      </div>

      {/* Tracked requirements display */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule pb-4">
          <div>
            <h2 className="text-xl font-bold font-display text-ink">Tracked Compliance Requirements</h2>
            <p className="text-xs text-ink-faint mt-0.5">
              {viewMode === 'timeline'
                ? 'Chronological timeline of upcoming and past expirations grouped by urgency'
                : 'Monitor active and needed permits across your operating jurisdictions'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-base p-1 rounded-xl border border-rule/80">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-display transition-all ${viewMode === 'grid' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                title="Grid Card View"
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-display transition-all ${viewMode === 'timeline' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
                title="Chronological Timeline View"
              >
                <Calendar size={14} />
                <span>Timeline</span>
              </button>
            </div>

            {viewMode === 'grid' && (
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="text-xs font-bold border border-rule rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-accent bg-surface font-display text-ink-muted">
                <option value="urgent">Most Urgent</option>
                <option value="az">A–Z</option>
                <option value="recent">Recently Added</option>
              </select>
            )}

            <button onClick={() => setShowScan(true)} className="btn-primary text-xs py-2 px-4">
              <Plus size={14} /> Add Document
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
          <div className="space-y-8">
            {timelineGroups.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-rule p-8 text-center space-y-2">
                <Clock size={32} className="mx-auto text-ink-faint" />
                <h3 className="font-bold font-display text-ink text-base">No Expiration Dates Set</h3>
                <p className="text-xs text-ink-faint max-w-md mx-auto">
                  None of your tracked requirements currently have an expiry date recorded. Scan or edit your requirements to populate the compliance timeline.
                </p>
              </div>
            ) : (
              <div className="relative border-l-2 border-rule ml-4 md:ml-6 space-y-10 pl-6 md:pl-8">
                {timelineGroups.map((group) => (
                  <div key={group.id} className="relative space-y-4">
                    {/* Urgency Milestone Pin */}
                    <div className="absolute -left-[31px] md:-left-[39px] top-0 w-6 h-6 rounded-full bg-surface border-2 border-accent flex items-center justify-center shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/50 pb-2">
                      <div className="flex items-center gap-2.5">
                        <h3 className={`text-base font-bold font-display ${group.color}`}>
                          {group.title}
                        </h3>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-base text-ink-muted border border-rule">
                          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <span className="text-xs font-bold font-display uppercase tracking-wider text-ink-faint">
                        {group.badge}
                      </span>
                    </div>

                    {/* Chronological List of Requirements in this bracket */}
                    <div className="grid gap-3">
                      {group.items.map((lic) => {
                        const isExpired = lic.daysLeft !== null && lic.daysLeft < 0;
                        return (
                          <motion.div
                            key={lic.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-2xl border p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface hover:shadow-md transition-all ${lic.status === 'expired' || isExpired ? 'border-red-200 bg-red-50/20' : 'border-rule'}`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold font-display text-ink text-sm sm:text-base">
                                  {lic.requirement?.requirement_name || lic.license_type}
                                </span>
                                {lic.requirement?.jurisdiction_level && (
                                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-base text-ink-muted border border-rule/60">
                                    {lic.requirement.jurisdiction_level}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-ink-faint flex flex-wrap items-center gap-3">
                                <span>Authority: <strong className="text-ink-muted font-medium">{lic.issuing_authority || lic.requirement?.issuing_agency || '—'}</strong></span>
                                {lic.license_number && (
                                  <>
                                    <span>•</span>
                                    <span>Doc #: <strong className="text-ink-muted font-medium">{lic.license_number}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                              <div className="text-right">
                                <div className="text-xs text-ink-faint uppercase font-bold tracking-wide">
                                  {isExpired ? 'Expired On' : 'Expires On'}
                                </div>
                                <div className="text-sm font-bold font-display text-ink">
                                  {formatDate(lic.expiry_date)}
                                </div>
                                <div className={`text-xs font-semibold ${isExpired ? 'text-danger' : lic.daysLeft <= 30 ? 'text-caution' : 'text-settled'}`}>
                                  {isExpired ? `${Math.abs(lic.daysLeft)} days overdue` : `${lic.daysLeft} days remaining`}
                                </div>
                              </div>

                              <button
                                onClick={() => navigate(`/license/${lic.id}`)}
                                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1 font-display"
                              >
                                <span>Details</span>
                                <ChevronRight size={14} />
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
                  <AlertTriangle size={15} /> Action Required ({actionRequired.length})
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {actionRequired.map((lic, i) => (
                    <motion.div key={lic.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="h-full">
                      <LicenseCard license={lic} onRenew={() => setShowScan(true)} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Active / Monitored */}
            {monitored.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-display text-settled uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={15} /> Active &amp; Monitored ({monitored.length})
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {monitored.map((lic, i) => (
                    <motion.div key={lic.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="h-full">
                      <LicenseCard license={lic} onRenew={() => setShowScan(true)} />
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
    </div>
  );
}

