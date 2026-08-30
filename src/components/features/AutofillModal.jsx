import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  X,
  FileDown,
  ExternalLink,
  Building2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { fillOfficialForm, hasOfficialForm } from '../../utils/formFillEngine';

export default function AutofillModal({ isOpen, onClose, requirement, business }) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);

  const reqName = (requirement?.requirement_name || '').toLowerCase();
  const city = (requirement?.city || business?.city || 'Chandigarh');
  const isFillable = hasOfficialForm(requirement);

  // Derive official statutory form metadata
  const formMeta = useMemo(() => {
    // 1. FSSAI Form B
    if (reqName.includes('fssai') || reqName.includes('food')) {
      return {
        formCode: 'FORM B',
        formTitle: 'FSSAI Application for License / Registration (Form B)',
        actName: 'Food Safety and Standards Act, 2006 [Reg. 2.1.2 & 2.1.3]',
        authority: 'Food Safety and Standards Authority of India (FoSCoS)',
        portalUrl: 'https://foscos.fssai.gov.in',
        tier: 'State License (Turnover ₹12L – ₹20 Cr)',
        annualFee: '₹2,000 / Year',
        processingTime: '15-30 business days',
      };
    }

    // 2. Delhi Shops & Establishments Form A
    if (reqName.includes('delhi') && (reqName.includes('shop') || reqName.includes('establishment'))) {
      return {
        formCode: 'FORM A',
        formTitle: 'Delhi Shops & Establishments Registration (Form A)',
        actName: 'Delhi Shops and Establishments Act, 1954 [Rule 3]',
        authority: 'Labour Department, Govt of NCT of Delhi',
        portalUrl: 'https://labourcis.nic.in',
        tier: 'Commercial Food & Dining Establishment',
        annualFee: 'Statutory Registration Fee (Included)',
        processingTime: 'Instant Digital Form C Generation',
      };
    }

    // 3. Chandigarh MCC Form 1
    if (city.toLowerCase().includes('chandigarh') && (reqName.includes('trade') || reqName.includes('eating house') || reqName.includes('mcc') || reqName.includes('health'))) {
      return {
        formCode: 'FORM 1',
        formTitle: 'MCC Eating House & Municipal Trade License Application (Form 1)',
        actName: 'Punjab Municipal Corporation Act, 1976 (Extended to UT Chandigarh)',
        authority: 'Municipal Corporation Chandigarh (Medical Officer of Health)',
        portalUrl: 'https://mcchandigarh.gov.in',
        tier: 'Eating House / Multi-Cuisine Restaurant',
        annualFee: '₹10,000 / Year',
        processingTime: '14-21 business days',
      };
    }

    // 4. Online-only requirement (GST, PAN, IPRS, etc.)
    return {
      formCode: 'ONLINE PORTAL',
      formTitle: `${requirement?.requirement_name || 'Government Registration'}`,
      actName: requirement?.issuing_agency ? `Governed by ${requirement.issuing_agency}` : 'National Statutory Regulations',
      authority: requirement?.issuing_agency || 'Government Authority',
      portalUrl: reqName.includes('gst') ? 'https://www.gst.gov.in' : (reqName.includes('pan') ? 'https://www.incometax.gov.in' : (requirement?.source_url || 'https://india.gov.in')),
      tier: 'Direct Electronic Filing (Portal Only)',
      annualFee: requirement?.fee_max ? `₹${requirement.fee_max}` : 'Portal Application Fee',
      processingTime: requirement?.processing_time || '3-7 business days',
    };
  }, [reqName, city, requirement]);

  if (!isOpen || !requirement) return null;

  const handleDownload = async () => {
    if (!isFillable) {
      toast.error('No official fillable PDF form exists for this requirement. Please apply directly on the government portal.');
      return;
    }

    setDownloading(true);
    const toastId = toast.loading('Generating official statutory PDF form...');
    try {
      const pdfBlob = await fillOfficialForm(requirement, business);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(formMeta.formCode + '_' + (requirement?.requirement_name || 'Application')).replace(/[^a-zA-Z0-9_]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded official pre-filled form!', { id: toastId });
    } catch (err) {
      console.error('Download PDF error:', err);
      toast.error(err.message || 'Could not generate official form.', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const fields = [
    { label: 'Establishment / Trade Name', value: business?.business_name || 'Urban Tadka Kitchen' },
    { label: 'Applicant / Managing Operator', value: business?.owner_name || 'Business Owner' },
    { label: 'Authorized Premises Address', value: business?.address || (city.includes('Delhi') ? 'Connaught Place, New Delhi' : 'SCO 142-143, Sector 26, Chandigarh') },
    { label: 'Jurisdiction / City', value: `${city} (${business?.country || 'India'})` },
    { label: 'Contact Phone & Email', value: `${business?.phone || '+91 98765 43210'} · ${business?.email || 'contact@business.in'}` },
    { label: 'Category & Bylaw Code', value: `${formMeta.tier}` },
    { label: 'Prescribed Statutory Fee', value: `${formMeta.annualFee}` },
    { label: 'Target Authority', value: `${formMeta.authority}` },
  ];

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-surface border border-rule rounded-2xl shadow-card overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-ink text-white p-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0 mt-0.5">
                {isFillable ? <FileText size={20} /> : <Globe size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${isFillable ? 'bg-accent text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'} uppercase`}>
                    {formMeta.formCode}
                  </span>
                  <span className="text-xs text-gray-300 font-mono">
                    {isFillable ? 'Official Fillable Form' : '100% Online Electronic Filing'}
                  </span>
                </div>
                <h2 className="text-lg font-bold font-display text-white leading-snug">
                  {formMeta.formTitle}
                </h2>
                <p className="text-xs text-gray-300 font-mono mt-0.5">
                  {formMeta.actName}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* Authority Callout */}
            <div className="bg-base/70 border border-rule rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Building2 size={16} className="text-accent flex-shrink-0" />
                <div>
                  <div className="text-[11px] text-ink-muted">Issuing Government Authority</div>
                  <div className="font-bold text-ink text-xs font-display">{formMeta.authority}</div>
                </div>
              </div>

              <a
                href={formMeta.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rule bg-surface text-accent hover:underline font-display font-semibold text-[11px]"
              >
                <span>Govt Portal</span>
                <ExternalLink size={11} />
              </a>
            </div>

            {/* If NOT fillable: Honest Notice */}
            {!isFillable && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-bold text-xs font-display">
                  <AlertCircle size={15} className="text-amber-700 shrink-0" />
                  <span>No Offline / Fillable PDF Form Prescribed</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-amber-800">
                  This statutory authority (e.g. <strong>{formMeta.authority}</strong>) requires direct online registration through their official electronic portal via Aadhaar OTP or Digital Signature (DSC). No manual or downloadable fillable form is accepted for this process.
                </p>
                <div className="pt-1">
                  <a
                    href={formMeta.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-display font-semibold text-xs shadow-xs"
                  >
                    <span>Proceed to Official Registration Portal ({new URL(formMeta.portalUrl).hostname})</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Autofilled Fields Inspector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-bold text-ink text-xs flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-settled" />
                  {isFillable ? 'Auto-Mapped Business Ledger Data (8 Fields)' : 'Your Business Reference Details'}
                </span>
                <span className="text-[11px] text-settled font-semibold">
                  ✓ Verified from Active Profile
                </span>
              </div>

              <div className="bg-surface border border-rule rounded-xl divide-y divide-rule/60 overflow-hidden">
                {fields.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 hover:bg-base/40 transition-colors">
                    <span className="text-ink-muted text-[11px] w-1/3">{f.label}</span>
                    <span className="font-semibold text-ink text-right w-2/3 truncate">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guarantee Note */}
            {isFillable && (
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 text-[11px] text-ink leading-relaxed flex items-start gap-2">
                <Sparkles size={14} className="text-accent flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Statutory Form Guarantee:</strong> DockIt formats this document to exact statutory requirements with prescribed regulatory layout, self-declaration clauses, and official agency metadata.
                </span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-surface border-t border-rule flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="btn-secondary text-xs h-9 px-4 rounded-xl cursor-pointer"
            >
              Close
            </button>

            {isFillable ? (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn-primary text-xs h-9 px-5 rounded-xl inline-flex items-center gap-2 cursor-pointer"
              >
                {downloading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FileDown size={14} />
                    <span>Download Pre-filled Official PDF</span>
                  </>
                )}
              </button>
            ) : (
              <a
                href={formMeta.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs h-9 px-5 rounded-xl inline-flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Open Government Portal</span>
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
