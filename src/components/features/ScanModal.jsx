import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { extractTextFromImage, preprocessImage } from '../../services/ocrService';
import { formatDate } from '../../utils/formatters';

const STATES = { UPLOAD: 'upload', SCANNING: 'scanning', RESULTS: 'results', SUCCESS: 'success' };

/**
 * ScanModal — OCR scan + AI extraction.
 * Receives businessType and cities from the parent so the server can build
 * a catalog-matched extraction prompt rather than using hardcoded categories.
 */
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
  // catalogNames comes back from /api/ai/extract so the dropdown is always
  // aligned with what the AI matched against — no stale hardcoded list.
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

      // Call the serverless route — Gemini API key stays server-side
      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText: text, businessType, cities }),
      });
      const { data, confidence: aiConf, error, catalogNames: names } = await response.json();
      setProgress(90);

      // Populate dropdown with names returned by the server
      if (names && names.length > 0) setCatalogNames(names);

      if (error || !data) {
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
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{t('scan.title')}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">

            {/* UPLOAD */}
            {state === STATES.UPLOAD && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <label onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)} onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}>
                  <Upload size={40} className="text-gray-300 mb-4" />
                  <p className="text-base font-semibold text-gray-700">{t('scan.upload_sub')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('scan.supported')}</p>
                  <input type="file" accept="image/*,.pdf" className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])} />
                </label>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <button className="btn-secondary w-full mt-3"
                  onClick={() => document.querySelector('input[type=file]')?.click()}>
                  <Camera size={18} /> {t('scan.take_photo')}
                </button>
              </motion.div>
            )}

            {/* SCANNING */}
            {state === STATES.SCANNING && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ height: 220 }}>
                  {preview && <img src={preview} alt="doc" className="w-full h-full object-cover opacity-80" />}
                  <div className="scan-laser absolute left-0 right-0 h-0.5 bg-blue-500 shadow-lg shadow-blue-500/50" style={{ position: 'absolute' }} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">{statusText}</span>
                    <span className="text-blue-600 font-bold">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-blue-600 rounded-full"
                      animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* RESULTS */}
            {state === STATES.RESULTS && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {/* Confidence badge */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${confidence >= 70 ? 'bg-green-50 text-green-700' : confidence >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  <AlertTriangle size={16} />
                  {t('license.confidence')}: {confidence}%
                  {confidence < 60 && <span className="ml-1">— {t('scan.low_confidence')}</span>}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {preview && <div className="rounded-2xl overflow-hidden border border-gray-100 h-48">
                    <img src={preview} alt="doc" className="w-full h-full object-cover" />
                  </div>}
                  <div className="space-y-3">
                    {[
                      { key: 'license_type', label: 'License Type', type: 'select' },
                      { key: 'license_number', label: 'License Number' },
                      { key: 'issuing_authority', label: 'Issuing Authority' },
                      { key: 'issue_date', label: 'Issue Date', type: 'date' },
                      { key: 'expiry_date', label: 'Expiry Date *', type: 'date' },
                    ].map(({ key, label, type }) => (
                      <div key={key}>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
                        {type === 'select'
                          ? <select value={fields[key] || ''} onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))} className="input text-sm">
                              <option value="">Select type…</option>
                              {/* Dynamic list from the server — reflects actual catalog for this business */}
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

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setState(STATES.UPLOAD); setPreview(null); }} className="btn-secondary flex-1">{t('scan.retake')}</button>
                  <button onClick={handleSave} className="btn-primary flex-1">{t('scan.confirm_save')}</button>
                </div>
              </motion.div>
            )}

            {/* SUCCESS */}
            {state === STATES.SUCCESS && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle size={40} className="text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('scan.success')}</h3>
                <button onClick={onClose} className="btn-primary mt-6">{t('scan.view_dashboard')}</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
