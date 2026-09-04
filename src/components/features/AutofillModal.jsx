import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
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
  AlertTriangle,
  Globe,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { fillOfficialForm, hasOfficialForm, detectCountry, checkApplicationReadiness } from '../../utils/formFillEngine';

export default function AutofillModal({ isOpen, onClose, requirement, business }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  const country = detectCountry(requirement, business);
  const reqName = (requirement?.requirement_name || '').toLowerCase();
  const agency = (requirement?.issuing_agency || requirement?.issuing_authority || '').toLowerCase();
  const city = (requirement?.city || business?.city || (country === 'India' ? 'Chandigarh' : 'New York, NY'));
  const isFillable = hasOfficialForm(requirement, business);

  // Derive official statutory form metadata strictly isolated by jurisdiction
  const formMeta = useMemo(() => {
    // ── USA JURISDICTIONS ──
    if (country === 'USA') {
      // 1. NYC DCWP Mobile Food Vendor License
      if (
        (city.toLowerCase().includes('new york') || agency.includes('dcwp') || agency.includes('consumer and worker') || agency.includes('dohmh')) &&
        (reqName.includes('vending') || reqName.includes('vendor') || reqName.includes('food') || reqName.includes('mobile food'))
      ) {
        return {
          formCode: 'FORM MFV-1',
          formTitle: 'NYC Mobile Food Vendor License Application (Form MFV-1)',
          actName: 'NYC Administrative Code § 17-307 & Rules of the City of New York Title 6',
          authority: 'NYC Department of Consumer and Worker Protection (DCWP)',
          portalUrl: 'https://www.nyc.gov/site/dca/businesses/licenses-apply.page',
          tier: 'Mobile Food Vendor Full-Term License (2-Year Term)',
          annualFee: `$${requirement?.fee_min ?? 50} USD`,
          processingTime: '10-15 business days',
        };
      }

      // 2. Federal EIN (IRS Form SS-4)
      if (
        reqName.includes('ein') ||
        reqName.includes('ss-4') ||
        reqName.includes('ss4') ||
        reqName.includes('employer identification') ||
        agency.includes('irs') ||
        agency.includes('internal revenue')
      ) {
        return {
          formCode: 'FORM SS-4',
          formTitle: 'Application for Employer Identification Number (Form SS-4)',
          actName: 'Internal Revenue Code § 6109 (26 U.S.C. § 6109)',
          authority: 'Internal Revenue Service · US Department of the Treasury',
          portalUrl: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online',
          tier: 'Federal Tax Registration (Sole Proprietorship / LLC)',
          annualFee: '$0 (No Statutory Fee Charged by IRS)',
          processingTime: 'Instant Online / 4 business days',
        };
      }

      // 3. LA County Public Health Mobile Food Facility Permit
      if (
        city.toLowerCase().includes('los angeles') ||
        agency.includes('lacdph') ||
        agency.includes('public health')
      ) {
        return {
          formCode: 'MFF PERMIT',
          formTitle: 'Mobile Food Facility (MFF) Public Health Permit Application',
          actName: 'California Health & Safety Code (CALCODE) & LA County Code Title 8',
          authority: 'County of Los Angeles Department of Public Health (LACDPH)',
          portalUrl: 'http://publichealth.lacounty.gov/eh/business/mobile-food-facilities.htm',
          tier: 'Category 4 (Full Food Preparation & Mobile Cooking)',
          annualFee: `$${requirement?.fee_min ?? 200} USD / Year`,
          processingTime: '14-21 business days',
        };
      }

      // 4. Universal US Requirement
      return {
        formCode: 'OFFICIAL APP',
        formTitle: `${requirement?.requirement_name || 'Statutory Permit Application'}`,
        actName: requirement?.issuing_agency ? `Governed by ${requirement.issuing_agency}` : 'State & Municipal Commercial Regulations',
        authority: requirement?.issuing_agency || 'Municipal Licensing Authority',
        portalUrl: requirement?.source_url || 'https://www.usa.gov',
        tier: 'Municipal Commercial Operating License',
        annualFee: requirement?.fee_min ? `$${requirement.fee_min} USD` : (requirement?.fee_max ? `$${requirement.fee_max} USD` : 'Standard Regulatory Fee'),
        processingTime: requirement?.processing_time || '7-14 business days',
      };
    }

    // ── INDIA JURISDICTIONS ──
    // 1. FSSAI Form B
    if (reqName.includes('fssai') || reqName.includes('food') || agency.includes('fssai') || agency.includes('foscos')) {
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

    // 4. Online-only requirement (GST, PAN, etc.)
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
  }, [country, reqName, agency, city, requirement]);

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

  const readiness = useMemo(() => checkApplicationReadiness(requirement, business), [requirement, business]);

  const handleCompleteWithAI = () => {
    const intakeContext = {
      requirementId: requirement?.id,
      requirementName: formMeta?.formTitle || requirement?.requirement_name,
      formCode: formMeta?.formCode,
      issuingAgency: formMeta?.authority || requirement?.issuing_agency,
      missingFields: readiness?.missingFields || [],
      businessName: business?.business_name || '',
      city,
      country,
    };
    try {
      sessionStorage.setItem('dockit_ai_intake', JSON.stringify(intakeContext));
    } catch (e) {
      console.error('Failed to set dockit_ai_intake:', e);
    }
    onClose();
    navigate('/compliance-ai');
  };

  const fields = [
    {
      label: 'Establishment / Trade Name',
      value: business?.business_name || 'Not provided in profile',
      isMissing: !business?.business_name,
    },
    {
      label: 'Applicant / Managing Operator',
      value: business?.owner_name || 'Not provided in profile',
      isMissing: !business?.owner_name,
    },
    {
      label: 'Authorized Premises Address',
      value: business?.address || 'Not provided in profile',
      isMissing: !business?.address,
    },
    {
      label: 'Jurisdiction / Operating City',
      value: business?.city || city || 'Not specified',
      isMissing: !business?.city && !city,
    },
    {
      label: 'Contact Phone Number',
      value: business?.phone || 'Not provided in profile',
      isMissing: !business?.phone,
    },
    {
      label: 'Contact Email Address',
      value: business?.email || 'Not provided in profile',
      isMissing: !business?.email,
    },
    {
      label: 'Category & Regulatory Tier',
      value: formMeta.tier,
      isMissing: false,
    },
    {
      label: 'Prescribed Statutory Fee',
      value: formMeta.annualFee,
      isMissing: false,
    },
    {
      label: 'Target Authority',
      value: formMeta.authority,
      isMissing: false,
    },
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

            {/* Missing Profile Information Alert Card & AI Intake CTA */}
            {isFillable && !readiness.isReady && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-display font-bold text-ink text-sm">
                      Missing Information for Official Form Filling
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed mt-0.5">
                      Government regulatory bodies require complete, verified applicant details before processing statutory filings. The following fields are not set on your profile:
                    </p>
                  </div>
                </div>

                {/* Missing Field Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {readiness.missingFields.map((f, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {f.label}
                    </span>
                  ))}
                </div>

                {/* AI Assistant Banner Footer */}
                <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[11px] text-ink-muted leading-tight">
                    Our Compliance AI can ask you these missing details conversationally and pre-fill your form automatically.
                  </span>
                  <button
                    onClick={handleCompleteWithAI}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-dark text-white font-display font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Sparkles size={13} />
                    <span>Complete with Compliance AI</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* If NOT fillable: Honest Notice */}
            {!isFillable && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-bold text-xs font-display">
                  <AlertCircle size={15} className="text-amber-700 shrink-0" />
                  <span>No Offline / Fillable PDF Form Prescribed</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-amber-800">
                  This statutory authority (e.g. <strong>{formMeta.authority}</strong>) {country === 'India'
                    ? 'requires direct online registration through their official electronic portal via Aadhaar OTP or Digital Signature (DSC).'
                    : 'requires direct online electronic filing and credentials through their official licensing web portal.'} No manual or downloadable fillable form is accepted for this process.
                </p>
                <div className="pt-1">
                  <a
                    href={formMeta.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-display font-semibold text-xs shadow-xs"
                  >
                    <span>Proceed to Official Registration Portal ({(() => {
                      try { return new URL(formMeta.portalUrl).hostname; } catch (e) { return 'Government Portal'; }
                    })()})</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Autofilled Fields Inspector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-bold text-ink text-xs flex items-center gap-1.5">
                  {readiness.isReady ? (
                    <CheckCircle2 size={14} className="text-settled" />
                  ) : (
                    <AlertTriangle size={14} className="text-amber-500" />
                  )}
                  {isFillable ? 'Auto-Mapped Business Ledger Data' : 'Your Business Reference Details'}
                </span>
                <span className={`text-[11px] font-semibold flex items-center gap-1 ${readiness.isReady ? 'text-settled' : 'text-amber-600'}`}>
                  {readiness.isReady
                    ? `✓ Verified from Active Profile (${readiness.readyFields}/${readiness.totalFields} ready)`
                    : `⚠️ Missing Details (${readiness.readyFields}/${readiness.totalFields} ready)`}
                </span>
              </div>

              <div className="bg-surface border border-rule rounded-xl divide-y divide-rule/60 overflow-hidden">
                {fields.map((f, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2.5 transition-colors ${f.isMissing ? 'bg-amber-500/5' : 'hover:bg-base/40'}`}
                  >
                    <span className="text-ink-muted text-[11px] w-5/12 flex items-center gap-1.5">
                      <span>{f.label}</span>
                      {f.isMissing && (
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Missing
                        </span>
                      )}
                    </span>
                    <span className={`text-right w-7/12 truncate ${f.isMissing ? 'text-amber-700 italic font-medium' : 'font-semibold text-ink'}`}>
                      {f.value}
                    </span>
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
          <div className="p-4 bg-surface border-t border-rule flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="btn-secondary text-xs h-9 px-4 rounded-xl cursor-pointer w-full sm:w-auto"
            >
              Close
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {isFillable ? (
                <>
                  {!readiness.isReady ? (
                    <>
                      <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="btn-secondary text-xs h-9 px-3 rounded-xl inline-flex items-center gap-1.5 cursor-pointer text-ink-muted hover:text-ink"
                        title="Download available information as a draft PDF"
                      >
                        <FileDown size={13} />
                        <span>Download Draft</span>
                      </button>

                      <button
                        onClick={handleCompleteWithAI}
                        className="btn-primary text-xs h-9 px-4 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Sparkles size={13} />
                        <span>Complete with Compliance AI</span>
                        <ArrowRight size={13} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="btn-primary text-xs h-9 px-5 rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm"
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
                  )}
                </>
              ) : (
                <a
                  href={formMeta.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs h-9 px-5 rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <ExternalLink size={14} />
                  <span>Open Government Portal</span>
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
