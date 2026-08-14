import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Trash2, ExternalLink,
  UtensilsCrossed, Flame, Store, Building2, Coffee,
  Receipt, SignpostBig, Pill, FileText, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../hooks/useAuth';
import { useLicenses } from '../hooks/useLicenses';
import { getLicenseById } from '../utils/licenseTypes';
import { formatDate, formatCurrency } from '../utils/formatters';
import { fillOfficialForm } from '../utils/formFillEngine';
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

        {/* Action buttons */}
        {!editing && (
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-rule/50">
            <button
              onClick={async () => {
                const toastId = toast.loading('Generating official application packet...');
                try {
                  const reqObj = license.requirement || {
                    requirement_name: def?.name || license.license_type,
                    issuing_agency: license.issuing_authority || def?.issuing_authority,
                    template_url: license.template_url || license.requirement?.template_url,
                    form_field_map: license.form_field_map || license.requirement?.form_field_map,
                  };
                  const pdfBlob = await fillOfficialForm(reqObj, business);
                  const url = URL.createObjectURL(pdfBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  const safeName = (reqObj.requirement_name || 'Application_Packet').replace(/[^a-zA-Z0-9_]/g, '_');
                  a.download = `${safeName}_Application_Packet.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success('Downloaded application packet!', { id: toastId });
                } catch (err) {
                  console.error(err);
                  toast.error('Failed to generate application packet.', { id: toastId });
                }
              }}
              className="btn-secondary flex-1 border-accent/40 text-accent font-semibold"
            >
              <FileDown size={15} /> Download Application Packet
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
        )}
      </motion.div>

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
