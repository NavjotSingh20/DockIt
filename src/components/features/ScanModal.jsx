import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractTextFromImage, preprocessImage } from '../../services/ocrService';
import { formatDate } from '../../utils/formatters';

const STATES = { UPLOAD: 'upload', SCANNING: 'scanning', RESULTS: 'results', SUCCESS: 'success' };

async function extractLicenseClient(ocrText, businessType, cities = []) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not configured in client environment.');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const country = cities.some(c => c.toLowerCase().includes('maharashtra') || c.toLowerCase().includes('mumbai') || c.toLowerCase().includes('india')) ? 'India' : 'USA';
  const jurisdiction = cities.length > 0 ? cities.join(', ') : country;

  const systemPrompt = `You are an expert at reading government license and permit documents for businesses operating in ${jurisdiction}.
Extract fields from the following OCR text and return ONLY a valid JSON object.
No markdown fences, no explanation, no code blocks — just raw JSON.

Required fields:
- license_type: extract the license type as free text from the document — do not guess if unclear
- license_number: string or null
- issuing_authority: string or null
- business_name: string or null
- holder_name: string or null
- issue_date: "YYYY-MM-DD" or null
- expiry_date: "YYYY-MM-DD" or null
- address: string or null
- confidence: integer 0-100 — how clearly readable was this document? (100 = perfect quality, 0 = unreadable)

Use null for fields you cannot confidently read. Do not guess.`;

  const prompt = `${systemPrompt}\n\nOCR Text:\n${ocrText.slice(0, 4000)}`;
  const result = await model.generateContent(prompt);
  const rawText = result.response.text();
  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  return JSON.parse(cleaned);
}

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
      setStatusText('Reading document...');
      const { text, confidence: ocrConf } = await extractTextFromImage(file, (p) => {
        setProgress(Math.round(p * 0.6));
      });

      setStatusText('Extracting fields with AI...');
      setProgress(65);

      let data = null;
      let aiConf = 0;
      let names = [];

      try {
        const response = await fetch('/api/ai/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ocrText: text, businessType, cities }),
        });

        if (response.ok) {
          const resJson = await response.json();
          data = resJson.data;
          aiConf = resJson.confidence;
          names = resJson.catalogNames || [];
        } else {
          // Fallback directly to client-side extraction
          data = await extractLicenseClient(text, businessType, cities);
          aiConf = data.confidence || ocrConf;
        }
      } catch (apiErr) {
        // Fallback directly to client-side extraction
        data = await extractLicenseClient(text, businessType, cities);
        aiConf = data.confidence || ocrConf;
      }

      setProgress(90);

      if (names && names.length > 0) setCatalogNames(names);

      if (!data) {
        setExtracted(null);
        setFields({ license_type: '', license_number: '', issuing_authority: '', expiry_date: '', issue_date: '' });
        setConfidence(ocrConf);
      } else {
        setExtracted(data);
        setFields({
          license_type: data.license_type || '',
          license_number: data.license_number || '',
          issuing_authority: data.issuing_authority || '',
          issue_date: data.issue_date || '',
          expiry_date: data.expiry_date || '',
          business_name: data.business_name || '',
        });
        setConfidence(aiConf || ocrConf);
      }
      setProgress(100);
      setState(STATES.RESULTS);
    } catch (err) {
      toast.error('Scan failed: ' + err.message);
      setState(STATES.UPLOAD);
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
                <button className="btn-secondary w-full mt-3 font-display"
                  onClick={() => document.querySelector('input[type=file]')?.click()}>
                  <Camera size={18} /> {t('scan.take_photo')}
                </button>
              </motion.div>
            )}

            {/* SCANNING */}
            {state === STATES.SCANNING && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="relative rounded-2xl overflow-hidden bg-base" style={{ height: 220 }}>
                  {preview && <img src={preview} alt="doc" className="w-full h-full object-cover opacity-80" />}
                  <div className="scan-laser absolute left-0 right-0 h-0.5 bg-accent shadow-lg shadow-accent/50" style={{ position: 'absolute' }} />
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

            {/* RESULTS (ENHANCED SPLIT VIEW) */}
            {state === STATES.RESULTS && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Confidence banner */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${confidence >= 70 ? 'bg-green-50 text-green-700 border-green-200' : confidence >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  <AlertTriangle size={16} />
                  <span>{t('license.confidence')}: <strong>{confidence}%</strong></span>
                  {confidence < 60 && <span className="ml-1 text-xs opacity-80">({t('scan.low_confidence')})</span>}
                </div>

                <div className="grid md:grid-cols-12 gap-6 items-stretch">
                  {/* Left Pane - Document Preview with visual overlay */}
                  <div className="md:col-span-5 flex flex-col gap-3">
                    <span className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide">Document Scan</span>
                    {preview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-rule bg-base flex items-center justify-center p-2 h-96">
                        <img src={preview} alt="doc" className="max-w-full max-h-full object-contain rounded-lg" />
                        <div className="absolute inset-0 border-2 border-dashed border-accent/20 rounded-2xl pointer-events-none" />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-rule bg-base h-96 flex items-center justify-center text-ink-faint text-xs font-display">No Preview Available</div>
                    )}
                  </div>

                  {/* Right Pane - Form inputs & details */}
                  <div className="md:col-span-7 flex flex-col gap-4">
                    <span className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide">Extracted Metadata</span>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {[
                        { key: 'license_type', label: 'License Type', type: 'select' },
                        { key: 'license_number', label: 'License Number' },
                        { key: 'issuing_authority', label: 'Issuing Authority' },
                        { key: 'issue_date', label: 'Issue Date', type: 'date' },
                        { key: 'expiry_date', label: 'Expiry Date *', type: 'date' },
                      ].map(({ key, label, type }) => (
                        <div key={key}>
                          <label className="text-xs font-semibold text-ink-faint font-display uppercase tracking-wide block mb-1.5">{label}</label>
                          {type === 'select'
                            ? <select value={fields[key] || ''} onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))} className="input text-sm">
                                <option value="">Select type…</option>
                                {catalogNames.length > 0
                                  ? catalogNames.map(name => <option key={name} value={name}>{name}</option>)
                                  : fields[key]
                                    ? <option value={fields[key]}>{fields[key]}</option>
                                    : null
                                }
                              </select>
                            : <input type={type || 'text'} value={fields[key] || ''} onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))} className="input text-sm" />
                          }
                        </div>
                      ))}
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
