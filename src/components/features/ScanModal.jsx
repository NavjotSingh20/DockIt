import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { extractTextFromImage, preprocessImage } from '../../services/ocrService';
import { extractLicenseDocument } from '../../services/geminiService';

const STATES = { UPLOAD: 'upload', SCANNING: 'scanning', RESULTS: 'results', SUCCESS: 'success' };

export default function ScanModal({ onClose, onSave, businessType, cities = [] }) {
  const { t } = useTranslation();
  const [state, setState] = useState(STATES.UPLOAD);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [fields, setFields] = useState({});
  const [dragging, setDragging] = useState(false);
  const [catalogNames, setCatalogNames] = useState([]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const { preview: prev } = await preprocessImage(file);
    setPreview(prev);
    setState(STATES.SCANNING);

    try {
      setStatusText('Reading document text...');
      const { text: ocrText, confidence: ocrConf } = await extractTextFromImage(file, (p) => {
        setProgress(Math.round(p * 0.5));
      });

      setStatusText('Analyzing with AI Cascade...');
      setProgress(60);

      // Perform extraction using centralized Gemini service & cascade
      const { data, confidence: aiConf } = await extractLicenseDocument({
        ocrText,
        imageFile: file,
        businessType,
        cities,
      });

      setProgress(90);

      const finalFields = {
        license_type: data?.license_type || '',
        license_number: data?.license_number || '',
        issuing_authority: data?.issuing_authority || '',
        issue_date: data?.issue_date || '',
        expiry_date: data?.expiry_date || '',
        business_name: data?.business_name || '',
      };

      setExtracted(data);
      setFields(finalFields);
      setConfidence(aiConf || ocrConf || 50);

      setProgress(100);
      setState(STATES.RESULTS);
    } catch (err) {
      console.error('Scan process exception:', err);
      toast('Could not auto-read all fields — please enter details manually.', { icon: 'ℹ️' });

      setFields({ license_type: '', license_number: '', issuing_authority: '', expiry_date: '', issue_date: '' });
      setConfidence(30);
      setProgress(100);
      setState(STATES.RESULTS);
    }
  }, [businessType, cities]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSave = async () => {
    if (!fields.expiry_date) { toast.error('Expiry date is required'); return; }
    try {
      await onSave?.(fields);
      setState(STATES.SUCCESS);
    } catch (err) { toast.error(err.message); }
  };

  const defaultSuggestions = [
    'Employer Identification Number (EIN)',
    'California Food Handler Card',
    'ServSafe Food Safety Certificate',
    'Mobile Food Vending License',
    'Mobile Food Vendor (MFV) Permit',
    'Health Department Permit',
    'Fire Safety Clearance / NOC',
    'Trade License',
    'General Business License',
    'NYS Certificate of Authority (Sales Tax)',
    'FSSAI Food License',
  ];

  const suggestionsList = catalogNames.length > 0 ? catalogNames : defaultSuggestions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className={`bg-surface rounded-3xl w-full ${state === STATES.RESULTS ? 'max-w-4xl' : 'max-w-2xl'} max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-rule`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-rule bg-surface">
          <h2 className="text-xl font-bold font-display text-ink">{t('scan.title')}</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-ink-faint hover:text-ink hover:bg-base transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-surface">
          <AnimatePresence mode="wait">

            {/* UPLOAD */}
            {state === STATES.UPLOAD && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <label onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)} onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${dragging ? 'border-accent bg-accent-light' : 'border-rule hover:border-accent hover:bg-base'}`}>
                  <Upload size={40} className="text-ink-faint mb-4" />
                  <p className="text-base font-semibold text-ink font-display">{t('scan.upload_sub')}</p>
                  <p className="text-xs text-ink-faint mt-1">{t('scan.supported')}</p>
                  <input type="file" accept="image/*,.pdf" className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])} />
                </label>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex-1 h-px bg-rule" />
                  <span className="text-xs text-ink-faint uppercase font-bold tracking-wide">or</span>
                  <div className="flex-1 h-px bg-rule" />
                </div>
                <button className="btn-secondary w-full mt-3 font-display flex items-center justify-center gap-2"
                  onClick={() => document.querySelector('input[type=file]')?.click()}>
                  <Camera size={18} /> {t('scan.take_photo')}
                </button>
              </motion.div>
            )}

            {/* SCANNING */}
            {state === STATES.SCANNING && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="relative rounded-2xl overflow-hidden bg-base flex items-center justify-center" style={{ height: 220 }}>
                  {preview && <img src={preview} alt="doc" className="w-full h-full object-cover opacity-80" />}
                  <div className="scan-laser absolute left-0 right-0 h-0.5 bg-accent shadow-lg shadow-accent/50" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-display">
                    <span className="text-ink-muted font-medium">{statusText}</span>
                    <span className="text-accent font-bold">{progress}%</span>
                  </div>
                  <div className="h-2 bg-rule rounded-full overflow-hidden">
                    <motion.div className="h-full bg-accent rounded-full"
                      animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* RESULTS */}
            {state === STATES.RESULTS && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Confidence banner */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${confidence >= 70 ? 'bg-green-50 text-green-700 border-green-200' : confidence >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  <AlertTriangle size={16} />
                  <span>AI Confidence: <strong>{confidence}%</strong></span>
                  {confidence < 60 && <span className="ml-1 text-xs opacity-80">(Please review extracted details below)</span>}
                </div>

                <div className="grid md:grid-cols-12 gap-6 items-stretch">
                  {/* Left Pane - Document Preview */}
                  <div className="md:col-span-5 flex flex-col gap-3">
                    <span className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide">Document Scan</span>
                    {preview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-rule bg-base flex items-center justify-center p-2 h-96">
                        <img src={preview} alt="doc" className="max-w-full max-h-full object-contain rounded-lg" />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-rule bg-base h-96 flex items-center justify-center text-ink-faint text-xs font-display">No Preview Available</div>
                    )}
                  </div>

                  {/* Right Pane - Form inputs & details */}
                  <div className="md:col-span-7 flex flex-col gap-4">
                    <span className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide">Extracted Metadata</span>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {/* License Type */}
                      <div>
                        <label className="text-xs font-semibold text-ink-faint font-display uppercase tracking-wide block mb-1.5">
                          License Type *
                        </label>
                        <input
                          type="text"
                          list="scan-license-type-suggestions"
                          value={fields.license_type || ''}
                          onChange={e => setFields(f => ({ ...f, license_type: e.target.value }))}
                          placeholder="e.g. Employer Identification Number"
                          className="input text-sm w-full"
                        />
                        <datalist id="scan-license-type-suggestions">
                          {suggestionsList.map((name, idx) => (
                            <option key={idx} value={name} />
                          ))}
                        </datalist>
                      </div>

                      {/* License Number */}
                      <div>
                        <label className="text-xs font-semibold text-ink-faint font-display uppercase tracking-wide block mb-1.5">
                          License / Document Number
                        </label>
                        <input
                          type="text"
                          value={fields.license_number || ''}
                          onChange={e => setFields(f => ({ ...f, license_number: e.target.value }))}
                          placeholder="e.g. 21-7893456"
                          className="input text-sm w-full"
                        />
                      </div>

                      {/* Issuing Authority */}
                      <div>
                        <label className="text-xs font-semibold text-ink-faint font-display uppercase tracking-wide block mb-1.5">
                          Issuing Authority
                        </label>
                        <input
                          type="text"
                          value={fields.issuing_authority || ''}
                          onChange={e => setFields(f => ({ ...f, issuing_authority: e.target.value }))}
                          placeholder="e.g. IRS / Dept of Public Health"
                          className="input text-sm w-full"
                        />
                      </div>

                      {/* Issue Date */}
                      <div>
                        <label className="text-xs font-semibold text-ink-faint font-display uppercase tracking-wide block mb-1.5">
                          Issue Date
                        </label>
                        <input
                          type="date"
                          value={fields.issue_date || ''}
                          onChange={e => setFields(f => ({ ...f, issue_date: e.target.value }))}
                          className="input text-sm w-full"
                        />
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <label className="text-xs font-semibold text-ink-faint font-display uppercase tracking-wide block mb-1.5">
                          Expiry Date *
                        </label>
                        <input
                          type="date"
                          value={fields.expiry_date || ''}
                          onChange={e => setFields(f => ({ ...f, expiry_date: e.target.value }))}
                          className="input text-sm w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-rule">
                  <button onClick={() => { setState(STATES.UPLOAD); setPreview(null); }} className="btn-secondary flex-1 font-display">{t('scan.retake')}</button>
                  <button onClick={handleSave} className="btn-primary flex-1 font-display">{t('scan.confirm_save')}</button>
                </div>
              </motion.div>
            )}

            {/* SUCCESS */}
            {state === STATES.SUCCESS && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-green-50 text-green-600 border border-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-2xl font-bold font-display text-ink mb-2">{t('scan.success')}</h3>
                <button onClick={onClose} className="btn-primary mt-6 font-display">{t('scan.view_dashboard')}</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
