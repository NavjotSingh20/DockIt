import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Trash2, ExternalLink, Info,
  UtensilsCrossed, Flame, Store, Building2, Coffee,
  Receipt, SignpostBig, Pill, FileText, FileDown, CheckCircle2, AlertCircle, FileCheck, Sparkles, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../hooks/useAuth';
import { useLicenses } from '../hooks/useLicenses';
import { getLicenseById, BUSINESS_TYPES } from '../utils/licenseTypes';
import { formatDate, formatCurrency } from '../utils/formatters';
import { fillOfficialForm, checkApplicationReadiness, getProfileFieldValue, generatePaymentReceiptPDF } from '../utils/formFillEngine';
import StatusBadge from '../components/ui/StatusBadge';
import PenaltyCalculator from '../components/features/PenaltyCalculator';
import RenewalForm from '../components/features/RenewalForm';
import RequirementLocationMap from '../components/features/RequirementLocationMap';
import PaymentModal from '../components/features/PaymentModal';

const ICON_MAP = { UtensilsCrossed, Flame, Store, Building2, Coffee, Receipt, SignpostBig, Pill, FileText };

export default function LicenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDemo, demoBusiness, demoLicenses, activeProfileId, updateDemoRequirement } = useDemo();
  const { user } = useAuth();
  const { business: outletBiz } = useOutletContext();
  const business = isDemo ? demoBusiness : outletBiz;
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { licenses, loading, editLicense, removeLicense } = useLicenses(
    isDemo ? null : business?.id,
    isDemo ? demoLicenses : null
  );

  const license = licenses.find(l => l.id === id);

  useEffect(() => {
    if (license) setEditData({
      license_number: license.license_number || '',
      issuing_authority: license.issuing_authority || '',
      issue_date: license.issue_date || '',
      expiry_date: license.expiry_date || '',
    });
  }, [license]);

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-4">
      {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
    </div>
  );

  if (!license) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🔍</div>
      <h2 className="text-xl font-bold font-display text-ink mb-2">License not found</h2>
      <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">← Back to Dashboard</button>
    </div>
  );

  const def = getLicenseById(license.license_type);
  const Icon = ICON_MAP[def?.icon] || FileText;
  const { daysLeft, computedStatus } = license;
  const isOverdue = daysLeft < 0;

  const handleSaveEdit = async () => {
    if (isDemo) { toast('Demo mode — changes not saved'); setEditing(false); return; }
    try {
      await editLicense(id, editData);
      setEditing(false);
      toast.success('License updated!');
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this license?')) return;
    if (isDemo) { toast('Demo mode'); return; }
    try {
      await removeLicense(id);
      navigate('/dashboard');
      toast.success('License deleted');
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors">
        <ArrowLeft size={16} /> {t('common.back')} to Dashboard
      </button>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`bg-surface rounded-lg border border-rule-dark border-l-[3px] ${isOverdue ? 'border-l-danger' : daysLeft <= 30 ? 'border-l-caution' : 'border-l-settled'} p-5 md:p-6 shadow-card`}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-md border flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-50 border-red-200 text-danger' : daysLeft <= 30 ? 'bg-amber-50 border-amber-200 text-accent-dark' : 'bg-settled/10 border-settled/20 text-settled'}`}>
              <Icon size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-ink tracking-tight">
                {license.requirement?.requirement_name || license.requirement_name || def?.name || license.license_type || 'Required License'}
              </h1>
              <div className="text-xs text-ink-muted mt-0.5 font-mono">
                {license.issuing_authority || license.issuing_agency || license.requirement?.issuing_agency || def?.issuing_authority || 'Regulatory Agency'}
              </div>
            </div>
          </div>
          <StatusBadge status={computedStatus} large />
        </div>

        {/* Big days number / status container */}
        <div className={`text-center py-6 px-4 rounded-md mb-5 border ${isOverdue ? 'bg-red-50/50 border-red-200 text-danger' : daysLeft <= 30 ? 'bg-amber-50/50 border-amber-200 text-caution' : 'bg-base border-rule-dark text-settled'}`}>
          <div className={`text-5xl font-bold font-mono tracking-tight ${isOverdue ? 'text-danger' : daysLeft <= 30 ? 'text-caution' : 'text-settled'}`}>
            {daysLeft === null || daysLeft === undefined ? '—' : `${Math.abs(daysLeft)}d`}
          </div>
          <div className={`text-xs font-semibold font-display uppercase tracking-wider mt-1 ${isOverdue ? 'text-danger/80' : daysLeft <= 30 ? 'text-amber-800' : 'text-settled'}`}>
            {daysLeft === null || daysLeft === undefined ? 'Action Required' : isOverdue ? 'Days Overdue' : t('dashboard.days_left', 'Days Remaining')}
          </div>
          <div className="text-xs text-ink-muted mt-1 font-mono">Expires: <span className="font-semibold text-ink">{formatDate(license.expiry_date) || '—'}</span></div>
        </div>

        {/* Fields */}
        {editing ? (
          <div className="space-y-3">
            {[
              { label: 'License Number', key: 'license_number' },
              { label: 'Issuing Authority', key: 'issuing_authority' },
              { label: 'Issue Date', key: 'issue_date', type: 'date' },
              { label: 'Expiry Date', key: 'expiry_date', type: 'date' },
            ].map(({ label, key, type = 'text' }) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold font-display text-ink-muted uppercase tracking-wider mb-1">{label}</label>
                <input type={type} value={editData[key] || ''} onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))} className="input text-xs" />
              </div>
            ))}
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1 text-xs">{t('common.cancel')}</button>
              <button onClick={handleSaveEdit} className="btn-primary flex-1 text-xs">{t('common.save')}</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: t('license.license_number'), value: license.license_number },
              { label: t('license.issuing_authority'), value: license.issuing_authority || def?.issuing_authority },
              { label: t('license.issue_date'), value: formatDate(license.issue_date) },
              { label: t('license.expiry_date'), value: formatDate(license.expiry_date) },
              { label: 'AI Confidence', value: license.confidence_score ? `${license.confidence_score}%` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-base/70 rounded-md border border-rule-dark/50 p-3">
                <div className="text-[10px] font-semibold font-display text-ink-muted uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-xs font-semibold font-mono text-ink break-words">{value || '—'}</div>
              </div>
            ))}
          </div>
        )}

        {/* Application Readiness Check & Action buttons */}
        {!editing && (() => {
          const reqObj = license.requirement || {
            requirement_name: def?.name || license.license_type,
            issuing_agency: license.issuing_authority || def?.issuing_authority,
            template_url: license.template_url || license.requirement?.template_url,
            form_field_map: license.form_field_map || license.requirement?.form_field_map,
          };

          const readiness = checkApplicationReadiness(reqObj, business);

          return (
            <div className="space-y-3 mt-5 pt-4 border-t border-rule-dark/50">
              {/* Readiness Banner */}
              {readiness.hasOfficialForm ? (
                <div className={`rounded-md p-3.5 border transition-all ${readiness.isReady ? 'bg-green-50/70 border-green-200 text-green-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 font-bold font-display text-xs sm:text-sm">
                      {readiness.isReady ? (
                        <>
                          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                          <span>Official Application Ready ({readiness.readyFields}/{readiness.totalFields} fields filled)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                          <span>Application Incomplete ({readiness.readyFields}/{readiness.totalFields} fields filled)</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-surface border border-rule-dark">
                      Official Form
                    </span>
                  </div>

                  {readiness.isReady ? (
                    <p className="text-xs text-green-800 leading-relaxed">
                      All required profile fields match this agency's official form template. Ready to generate and download.
                    </p>
                  ) : (
                    <div className="space-y-1 mt-1.5">
                      <p className="text-xs text-amber-800 leading-relaxed">
                        To download the filled official government application, please provide the following missing profile details in Settings:
                      </p>
                      <ul className="flex flex-wrap gap-1.5 pt-1">
                        {readiness.missingFields.map((f, i) => (
                          <li key={i} className="text-[10px] font-medium font-mono px-2 py-0.5 rounded bg-amber-100/90 text-amber-900 border border-amber-200">
                            Missing: {f.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5">
                {readiness.hasOfficialForm ? (
                  <button
                    disabled={!readiness.isReady}
                    onClick={async () => {
                      const toastId = toast.loading('Generating official government application...');
                      try {
                        const pdfBlob = await fillOfficialForm(reqObj, business);
                        const url = URL.createObjectURL(pdfBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        const safeName = (reqObj.requirement_name || 'Official_Application').replace(/[^a-zA-Z0-9_]/g, '_');
                        a.download = `${safeName}_Official_Application.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.success('Downloaded official government application!', { id: toastId });
                      } catch (err) {
                        console.error(err);
                        toast.error('Failed to generate application.', { id: toastId });
                      }
                    }}
                    title={!readiness.isReady ? 'Please complete missing profile fields before downloading official form' : 'Download official pre-filled government form'}
                    className={`btn-secondary flex-1 text-xs py-2 ${!readiness.isReady ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
                  >
                    <FileCheck size={14} /> Download Official Application
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const toastId = toast.loading('Generating compliance summary sheet...');
                      try {
                        const pdfBlob = await fillOfficialForm(reqObj, business);
                        const url = URL.createObjectURL(pdfBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        const safeName = (reqObj.requirement_name || 'Compliance_Summary').replace(/[^a-zA-Z0-9_]/g, '_');
                        a.download = `${safeName}_Summary_Sheet.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.success('Downloaded compliance summary sheet!', { id: toastId });
                      } catch (err) {
                        console.error(err);
                        toast.error('Failed to generate summary sheet.', { id: toastId });
                      }
                    }}
                    className="btn-secondary flex-1 text-xs py-2"
                  >
                    <FileDown size={14} /> Download Summary Sheet
                  </button>
                )}

                <button
                  onClick={() => {
                    const payload = {
                      requirement_id: reqObj.id || license.requirement_id,
                      requirement_name: reqObj.requirement_name || license.license_type,
                      issuing_agency: reqObj.issuing_agency || license.issuing_authority,
                      source_url: reqObj.source_url || license.renewal_portal_url,
                      business_name: getProfileFieldValue('business_name', business, reqObj),
                      owner_name: getProfileFieldValue('owner_name', business, reqObj),
                      phone: getProfileFieldValue('phone', business, reqObj),
                      email: getProfileFieldValue('email', business, reqObj),
                      address: getProfileFieldValue('address', business, reqObj),
                      city: getProfileFieldValue('city', business, reqObj),
                      state: getProfileFieldValue('state', business, reqObj),
                      zip: getProfileFieldValue('zip', business, reqObj),
                      city_state_zip: getProfileFieldValue('city_state_zip', business, reqObj),
                      county_state: getProfileFieldValue('county_state', business, reqObj),
                      business_type: getProfileFieldValue('business_type', business, reqObj),
                      date: getProfileFieldValue('date', business, reqObj),
                      timestamp: Date.now()
                    };

                    window.postMessage({ type: 'DOCKIT_SYNC_EXTENSION_PAYLOAD', payload }, '*');

                    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
                      chrome.storage.local.set({ activeAutofill: payload });
                    }

                    toast.success('Prepared for Portal Autofill! Ready in extension.', {
                      icon: '⚡',
                      duration: 4000
                    });

                    if (reqObj.source_url) {
                      setTimeout(() => {
                        window.open(reqObj.source_url, '_blank');
                      }, 800);
                    }
                  }}
                  title="Prepare profile data for Chrome Extension autofill on government portal"
                  className="btn-secondary text-accent hover:bg-accent-light text-xs py-2 px-3"
                >
                  <Sparkles size={13} /> Autofill
                </button>

                <button onClick={() => setEditing(true)} className="btn-secondary text-xs py-2 px-3">
                  <Edit2 size={13} /> Edit
                </button>

                {/* Renew Online / Pay & Renew */}
                {(() => {
                  const feeMin = reqObj.fee_min;
                  const feeMax = reqObj.fee_max;
                  const hasFee = (feeMin !== null && feeMin !== undefined && feeMin > 0) ||
                                 (feeMax !== null && feeMax !== undefined && feeMax > 0);
                  const isPaid = license.status === 'payment_recorded';

                  if (hasFee) {
                    return (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className={`btn-primary text-xs py-2 px-3.5 ${isPaid ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        title={isPaid ? 'Payment recorded in test mode' : 'Pay renewal fee & initiate renewal (Sandbox Test Mode)'}
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle2 size={13} /> Payment Recorded
                          </>
                        ) : (
                          <>
                            <CreditCard size={13} /> Renew Online ({formatCurrency(feeMax ?? feeMin)})
                          </>
                        )}
                      </button>
                    );
                  }

                  if (def?.renewal_portal || reqObj.source_url) {
                    return (
                      <a
                        href={def?.renewal_portal || reqObj.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-xs py-2 px-3.5"
                      >
                        <ExternalLink size={13} /> Renew Online
                      </a>
                    );
                  }

                  return null;
                })()}

                <button onClick={handleDelete} className="px-3 py-2 rounded-md border border-danger/30 text-danger hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })()}
      </motion.div>

      {/* Payment Gateway Modal */}
      {(() => {
        const reqObj = license.requirement || {
          requirement_name: def?.name || license.license_type,
          issuing_agency: license.issuing_authority || def?.issuing_authority,
          fee_min: license.fee_min ?? license.requirement?.fee_min,
          fee_max: license.fee_max ?? license.requirement?.fee_max,
        };

        return (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            requirement={reqObj}
            license={license}
            business={business}
            daysLeft={daysLeft}
            onPaymentSuccess={async (paymentRecord) => {
              toast.success(`Payment recorded! Ref: ${paymentRecord.paymentId.substring(0, 16)}...`, {
                icon: '💳',
                duration: 5000,
              });

              if (isDemo) {
                updateDemoRequirement(id, {
                  status: 'payment_recorded',
                  payment_recorded_at: paymentRecord.paidAt,
                  payment_id: paymentRecord.paymentId,
                  amount_paid: paymentRecord.amount,
                  penalty_paid: paymentRecord.penalty,
                });
                return;
              }

              try {
                await editLicense(id, {
                  status: 'payment_recorded',
                  payment_recorded_at: paymentRecord.paidAt,
                  payment_id: paymentRecord.paymentId,
                });
              } catch (err) {
                console.error('Failed to update payment status:', err);
                toast.error('Payment recorded locally, but could not sync with database.');
              }
            }}
          />
        );
      })()}

      {/* Paid Receipt Download Banner */}
      {license.status === 'payment_recorded' && (
        <div className="bg-green-50/80 border border-green-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-green-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-100 border border-green-300 text-green-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <div className="font-bold font-display text-sm text-green-900">Government Renewal Fee Paid & Recorded</div>
              <div className="text-[11px] text-green-700 font-mono mt-0.5">
                Ref: {license.payment_id || 'pi_sandbox_recorded'} · Status: payment_recorded
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              const reqObj = license.requirement || {
                requirement_name: def?.name || license.license_type,
                issuing_agency: license.issuing_authority || def?.issuing_authority,
                city: license.city || business?.cities?.[0],
              };
              const pdfBlob = generatePaymentReceiptPDF({
                paymentId: license.payment_id || `pi_${id.slice(0, 8)}`,
                amount: license.amount_paid || reqObj.fee_max || reqObj.fee_min || 50,
                baseFee: reqObj.fee_max || reqObj.fee_min || 50,
                penalty: license.penalty_paid || 0,
                daysOverdue: Math.abs(daysLeft || 0),
                currency: business?.country === 'India' ? 'INR' : 'USD',
                requirementName: reqObj.requirement_name || license.license_type,
                issuingAgency: reqObj.issuing_agency || license.issuing_authority,
                businessName: business?.business_name,
                ownerName: business?.owner_name,
                city: reqObj.city || business?.cities?.[0] || business?.city,
                country: business?.country || 'USA',
                paidAt: license.payment_recorded_at || new Date().toISOString(),
              });
              const url = URL.createObjectURL(pdfBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Official_Receipt_${(reqObj.requirement_name || 'License').replace(/[^a-zA-Z0-9_]/g, '_')}.pdf`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast.success('Downloaded Payment Confirmation PDF!');
            }}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-xs whitespace-nowrap"
          >
            <FileDown size={14} /> Download Official Receipt (PDF)
          </button>
        </div>
      )}

      {/* Why Do I Need This? */}
      {(() => {
        const req = license.requirement || {};
        const reqCity = req.city || business?.cities?.[0] || '';
        const reqBizType = req.business_type || business?.business_type || '';
        const bizLabel = BUSINESS_TYPES.find(b => b.id === reqBizType)?.label || reqBizType;
        const jurisdiction = req.jurisdiction_level;
        const agency = req.issuing_agency;
        const sourceUrl = req.source_url;
        const desc = req.description;
        const renewalMonths = req.renewal_cycle_months;
        const procTime = req.processing_time;
        const feeMin = req.fee_min;
        const feeMax = req.fee_max;
        const lastVerified = req.last_verified_date;

        const feeDisplay = (() => {
          if (feeMin == null && feeMax == null) return '—';
          if ((feeMin === 0 || feeMin == null) && (feeMax === 0 || feeMax == null)) return 'Free';
          if (feeMin != null && feeMax != null && feeMin !== feeMax) return `${formatCurrency(feeMin)} – ${formatCurrency(feeMax)}`;
          return formatCurrency(feeMax ?? feeMin);
        })();

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-surface rounded-lg border border-rule-dark shadow-card p-5 md:p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-700">
                <Info size={16} />
              </div>
              <h3 className="text-base font-bold font-display text-ink tracking-tight">Why Do I Need This?</h3>
            </div>

            {/* Plain-language explanation */}
            <p className="text-xs md:text-sm text-ink leading-relaxed mb-4">
              Required because you operate as a <strong className="text-ink font-semibold">{bizLabel}</strong> in{' '}
              <strong className="text-ink font-semibold">{reqCity}</strong>.
              {jurisdiction && <> This is a <strong className="text-ink font-semibold">{jurisdiction}</strong>-level requirement.</>}
            </p>

            {/* Description from catalog */}
            {desc && (
              <p className="text-xs text-ink-muted leading-relaxed mb-4 pl-3 border-l-2 border-rule-dark italic">
                {desc}
              </p>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {agency && (
                <div className="bg-base/70 rounded-md border border-rule-dark/50 p-3">
                  <div className="text-[10px] font-semibold font-display text-ink-muted uppercase tracking-wider mb-0.5">Authority</div>
                  <div className="text-xs font-semibold text-ink font-mono break-words">{agency}</div>
                </div>
              )}
              {sourceUrl && (
                <div className="bg-base/70 rounded-md border border-rule-dark/50 p-3">
                  <div className="text-[10px] font-semibold font-display text-ink-muted uppercase tracking-wider mb-0.5">Official Source</div>
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold text-accent hover:underline break-all flex items-center gap-1 font-mono">
                    {new URL(sourceUrl).hostname.replace('www.', '')} <ExternalLink size={11} />
                  </a>
                </div>
              )}
              <div className="bg-base/70 rounded-md border border-rule-dark/50 p-3">
                <div className="text-[10px] font-semibold font-display text-ink-muted uppercase tracking-wider mb-0.5">Renewal Cycle</div>
                <div className="text-xs font-semibold text-ink font-mono">
                  {renewalMonths ? `Every ${renewalMonths} months` : 'One-time (no renewal)'}
                </div>
              </div>
              {procTime && (
                <div className="bg-base/70 rounded-md border border-rule-dark/50 p-3">
                  <div className="text-[10px] font-semibold font-display text-ink-muted uppercase tracking-wider mb-0.5">Est. Processing Time</div>
                  <div className="text-xs font-semibold text-ink font-mono">{procTime}</div>
                </div>
              )}
              <div className="bg-base/70 rounded-md border border-rule-dark/50 p-3">
                <div className="text-[10px] font-semibold font-display text-ink-muted uppercase tracking-wider mb-0.5">Est. Fees</div>
                <div className="text-xs font-bold font-mono text-ink">{feeDisplay}</div>
              </div>
              <div className="bg-base/70 rounded-md border border-rule-dark/50 p-3">
                <div className="text-[10px] font-semibold font-display text-ink-muted uppercase tracking-wider mb-0.5">Last Verified</div>
                <div className="text-xs font-semibold font-mono text-ink">{formatDate(lastVerified)}</div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Penalty Calculator */}
      {(isOverdue || daysLeft <= 60) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <PenaltyCalculator licenseType={license.license_type} daysOverdue={isOverdue ? Math.abs(daysLeft) : 0} country={business?.country || license?.country || 'USA'} />
        </motion.div>
      )}

      {/* Renewal Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <RenewalForm license={license} business={business} />
      </motion.div>

      {/* Requirement Jurisdiction & Location Map */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <RequirementLocationMap
          license={license}
          requirement={license.requirement}
          business={business}
        />
      </motion.div>
    </div>
  );
}
