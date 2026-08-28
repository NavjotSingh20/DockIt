import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Trash2, ExternalLink, Info,
  UtensilsCrossed, Flame, Store, Building2, Coffee,
  Receipt, SignpostBig, Pill, FileText, FileDown, CheckCircle2, AlertCircle, FileCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../hooks/useAuth';
import { useLicenses } from '../hooks/useLicenses';
import { getLicenseById, BUSINESS_TYPES } from '../utils/licenseTypes';
import { formatDate, formatCurrency } from '../utils/formatters';
import { fillOfficialForm, checkApplicationReadiness, getProfileFieldValue } from '../utils/formFillEngine';
import StatusBadge from '../components/ui/StatusBadge';
import PenaltyCalculator from '../components/features/PenaltyCalculator';
import RenewalForm from '../components/features/RenewalForm';
import OfficeLocator from '../components/features/OfficeLocator';

const ICON_MAP = { UtensilsCrossed, Flame, Store, Building2, Coffee, Receipt, SignpostBig, Pill, FileText };

export default function LicenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDemo, demoLicenses } = useDemo();
  const { user } = useAuth();
  const { business } = useOutletContext();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-3xl border border-rule p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100' : daysLeft <= 30 ? 'bg-accent-light' : 'bg-settled-light'}`}>
              <Icon size={28} className={isOverdue ? 'text-danger' : daysLeft <= 30 ? 'text-accent' : 'text-settled'} />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-ink">{def?.name || license.license_type}</h1>
              <div className="text-sm text-ink-faint mt-1">{license.issuing_authority || def?.issuing_authority}</div>
            </div>
          </div>
          <StatusBadge status={computedStatus} large />
        </div>

        {/* Big days number */}
        <div className={`text-center py-8 rounded-2xl mb-6 ${isOverdue ? 'bg-red-50' : daysLeft <= 30 ? 'bg-accent-light' : 'bg-settled-light'}`}>
          <div className={`text-7xl font-black font-display ${isOverdue ? 'text-danger' : daysLeft <= 30 ? 'text-accent' : 'text-settled'}`}>
            {Math.abs(daysLeft)}
          </div>
          <div className={`text-lg font-semibold font-display mt-1 ${isOverdue ? 'text-danger/70' : daysLeft <= 30 ? 'text-accent/70' : 'text-settled/70'}`}>
            {isOverdue ? 'days overdue' : t('dashboard.days_left')}
          </div>
          <div className="text-sm text-ink-faint mt-1">Expires: {formatDate(license.expiry_date)}</div>
        </div>

        {/* Fields */}
        {editing ? (
          <div className="space-y-4">
            {[
              { label: 'License Number', key: 'license_number' },
              { label: 'Issuing Authority', key: 'issuing_authority' },
              { label: 'Issue Date', key: 'issue_date', type: 'date' },
              { label: 'Expiry Date', key: 'expiry_date', type: 'date' },
            ].map(({ label, key, type = 'text' }) => (
              <div key={key}>
                <label className="block text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-1.5">{label}</label>
                <input type={type} value={editData[key] || ''} onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))} className="input" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button onClick={handleSaveEdit} className="btn-primary flex-1">{t('common.save')}</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: t('license.license_number'), value: license.license_number },
              { label: t('license.issuing_authority'), value: license.issuing_authority || def?.issuing_authority },
              { label: t('license.issue_date'), value: formatDate(license.issue_date) },
              { label: t('license.expiry_date'), value: formatDate(license.expiry_date) },
              { label: 'AI Confidence', value: license.confidence_score ? `${license.confidence_score}%` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-base rounded-xl p-4">
                <div className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-1">{label}</div>
                <div className="text-sm font-semibold text-ink break-words">{value || '—'}</div>
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
            <div className="space-y-4 mt-6 pt-4 border-t border-rule/50">
              {/* Readiness Banner (Only for official mapped government forms) */}
              {readiness.hasOfficialForm ? (
                <div className={`rounded-2xl p-4 border transition-all ${readiness.isReady ? 'bg-green-50/70 border-green-200/80 text-green-900' : 'bg-amber-50/70 border-amber-200/80 text-amber-900'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 font-bold font-display text-sm">
                      {readiness.isReady ? (
                        <>
                          <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
                          <span>Official Application Ready ({readiness.readyFields}/{readiness.totalFields} fields filled)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                          <span>Application Incomplete ({readiness.readyFields}/{readiness.totalFields} fields filled)</span>
                        </>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface/80 border border-rule/40">
                      Official Form
                    </span>
                  </div>

                  {readiness.isReady ? (
                    <p className="text-xs text-green-800/90 leading-relaxed">
                      All required profile fields match this agency's official form template. Ready to generate and download.
                    </p>
                  ) : (
                    <div className="space-y-1.5 mt-2">
                      <p className="text-xs text-amber-800 leading-relaxed">
                        To download the filled official government application, please provide the following missing profile details in Settings:
                      </p>
                      <ul className="flex flex-wrap gap-1.5 pt-1">
                        {readiness.missingFields.map((f, i) => (
                          <li key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-100/90 text-amber-900 border border-amber-200/60">
                            Missing: {f.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
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
                    className={`btn-secondary flex-1 border-accent/40 text-accent font-semibold flex items-center justify-center gap-2 ${!readiness.isReady ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
                  >
                    <FileCheck size={16} /> Download Official Application
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
                    className="btn-secondary flex-1 border-ink/20 text-ink-muted hover:text-ink font-semibold flex items-center justify-center gap-2"
                  >
                    <FileDown size={16} /> Download Summary Sheet
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

                    // Broadcast via window.postMessage for bridge.js
                    window.postMessage({ type: 'DOCKIT_SYNC_EXTENSION_PAYLOAD', payload }, '*');

                    // If extension is installed, try direct chrome.storage
                    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
                      chrome.storage.local.set({ activeAutofill: payload });
                    }

                    toast.success('Prepared for Portal Autofill! Ready in extension.', {
                      icon: '⚡',
                      duration: 4000
                    });

                    // If source_url exists, prompt or offer to open
                    if (reqObj.source_url) {
                      setTimeout(() => {
                        window.open(reqObj.source_url, '_blank');
                      }, 800);
                    }
                  }}
                  title="Prepare profile data for Chrome Extension autofill on government portal"
                  className="btn-secondary border-accent/30 text-accent hover:bg-accent/10 font-semibold px-4 flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={15} /> Prepare for Autofill
                </button>

                <button onClick={() => setEditing(true)} className="btn-secondary px-4">
                  <Edit2 size={15} /> Edit
                </button>
                {def?.renewal_portal && (
                  <a href={def.renewal_portal} target="_blank" rel="noopener noreferrer" className="btn-primary px-4">
                    <ExternalLink size={15} /> Renew Online
                  </a>
                )}
                <button onClick={handleDelete} className="px-4 py-3 rounded-xl border-2 border-danger/30 text-danger hover:bg-red-50 transition-all">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })()}
      </motion.div>

      {/* Why Do I Need This? — always visible, live data from requirement join */}
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-surface rounded-3xl border border-rule p-6 md:p-8">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Info size={18} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-bold font-display text-ink">Why Do I Need This?</h3>
            </div>

            {/* Plain-language explanation */}
            <p className="text-sm text-ink leading-relaxed mb-5">
              Required because you operate as a <strong className="text-ink font-semibold">{bizLabel}</strong> in{' '}
              <strong className="text-ink font-semibold">{reqCity}</strong>.
              {jurisdiction && <> This is a <strong className="text-ink font-semibold">{jurisdiction}</strong>-level requirement.</>}
            </p>

            {/* Description from catalog */}
            {desc && (
              <p className="text-sm text-ink-muted leading-relaxed mb-5 pl-4 border-l-2 border-rule/60 italic">
                {desc}
              </p>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agency && (
                <div className="bg-base rounded-xl p-4">
                  <div className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-1">Authority</div>
                  <div className="text-sm font-semibold text-ink break-words">{agency}</div>
                </div>
              )}
              {sourceUrl && (
                <div className="bg-base rounded-xl p-4">
                  <div className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-1">Official Source</div>
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-accent hover:underline break-all flex items-center gap-1.5">
                    {new URL(sourceUrl).hostname.replace('www.', '')} <ExternalLink size={12} />
                  </a>
                </div>
              )}
              <div className="bg-base rounded-xl p-4">
                <div className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-1">Renewal Cycle</div>
                <div className="text-sm font-semibold text-ink">
                  {renewalMonths ? `Every ${renewalMonths} months` : 'One-time (no renewal)'}
                </div>
              </div>
              {procTime && (
                <div className="bg-base rounded-xl p-4">
                  <div className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-1">Est. Processing Time</div>
                  <div className="text-sm font-semibold text-ink">{procTime}</div>
                </div>
              )}
              <div className="bg-base rounded-xl p-4">
                <div className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-1">Est. Fees</div>
                <div className="text-sm font-semibold text-ink">{feeDisplay}</div>
              </div>
              <div className="bg-base rounded-xl p-4">
                <div className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-1">Last Verified</div>
                <div className="text-sm font-semibold text-ink">{formatDate(lastVerified)}</div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Penalty Calculator */}
      {(isOverdue || daysLeft <= 60) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <PenaltyCalculator licenseType={license.license_type} daysOverdue={isOverdue ? Math.abs(daysLeft) : 0} />
        </motion.div>
      )}

      {/* Renewal Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <RenewalForm license={license} business={business} />
      </motion.div>

      {/* Office Locator */}
      {['FSSAI','FIRE_NOC','TRADE_LICENSE','SHOP_ESTABLISHMENT','EATING_HOUSE','GST'].includes(license.license_type) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="bg-surface rounded-2xl border border-rule p-5">
            <h3 className="section-title mb-4">🗺 {t('license.office_locator')}</h3>
            <OfficeLocator licenseType={license.license_type} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
