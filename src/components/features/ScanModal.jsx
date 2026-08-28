import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, CheckCircle, AlertTriangle, Link2, ShieldCheck, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { extractTextFromImage, preprocessImage } from '../../services/ocrService';
import { parseOcrTextHeuristically } from '../../services/geminiService';
import { getRequirements } from '../../services/supabase';
import { useDemo } from '../../context/DemoContext';

const STATES = { UPLOAD: 'upload', SCANNING: 'scanning', RESULTS: 'results', SUCCESS: 'success' };

export default function ScanModal({ onClose, onSave, businessType, cities = [] }) {
  const { t } = useTranslation();
  const { isDemo, demoRequirements } = useDemo();
  const [state, setState] = useState(STATES.UPLOAD);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [fields, setFields] = useState({});
  const [dragging, setDragging] = useState(false);
  const [catalogRequirements, setCatalogRequirements] = useState([]);
  const [matchedRequirement, setMatchedRequirement] = useState(null);
  const [manualRequirementOverride, setManualRequirementOverride] = useState(false);

  // Fetch live requirement rows on mount for linkage matching
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        if (isDemo) {
          const matched = (demoRequirements || []).filter(r => {
            if (!businessType) return true;
            return r.business_type === businessType || r.business_type === 'all';
          });
          if (isMounted) setCatalogRequirements(matched);
        } else {
          const reqs = await getRequirements(businessType, cities);
          if (isMounted) setCatalogRequirements(reqs || []);
        }
      } catch (err) {
        console.warn('Error loading catalog requirements for scan matching:', err);
        if (isMounted && demoRequirements) setCatalogRequirements(demoRequirements);
      }
    }
    loadCatalog();
    return () => { isMounted = false; };
  }, [isDemo, demoRequirements, businessType, cities]);

  // Intelligent real-time matcher against live requirements
  const matchRequirementRow = useCallback((extractedData, catalogList) => {
    if (!catalogList || catalogList.length === 0) return null;
    const typeName = (extractedData?.license_type || '').toLowerCase().trim();
    const authority = (extractedData?.issuing_authority || '').toLowerCase().trim();
    const ocrSnippet = (extractedData?.rawOcr || '').toLowerCase();

    // 1. Exact or Substring match on requirement_name or legacy_type_id
    const directMatch = catalogList.find(r => {
      const name = (r.requirement_name || '').toLowerCase().trim();
      const legacyId = (r.legacy_type_id || '').toLowerCase().trim();
      return (
        (typeName && (name === typeName || name.includes(typeName) || typeName.includes(name))) ||
        (legacyId && (legacyId === typeName || typeName.includes(legacyId)))
      );
    });
    if (directMatch) return directMatch;

    // 2. Issuing Agency Match
    if (authority) {
      const agencyMatch = catalogList.find(r => {
        const agency = (r.issuing_agency || '').toLowerCase().trim();
        return agency && (agency === authority || agency.includes(authority) || authority.includes(agency));
      });
      if (agencyMatch) return agencyMatch;
    }

    // 3. Keyword / OCR Content Match
    const keywordMatch = catalogList.find(r => {
      const name = (r.requirement_name || '').toLowerCase();
      if (name.includes('ein') && (typeName.includes('ein') || ocrSnippet.includes('employer identification'))) return true;
      if (name.includes('fssai') && (typeName.includes('fssai') || ocrSnippet.includes('fssai'))) return true;
      if (name.includes('food handler') && (typeName.includes('food handler') || ocrSnippet.includes('food handler'))) return true;
      if (name.includes('fire') && (typeName.includes('fire') || ocrSnippet.includes('fire'))) return true;
      if (name.includes('sales tax') && (typeName.includes('tax') || ocrSnippet.includes('sales tax'))) return true;
      return false;
    });

    return keywordMatch || null;
  }, []);

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

      setStatusText('Analyzing with AI...');
      setProgress(60);

      let data = null;
      let aiConf = null;

      try {
        const res = await fetch('/api/ai/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ocrText,
            businessType,
            cities,
          }),
        });

        if (res.ok) {
          const resJson = await res.json();
          data = resJson.data;
          aiConf = resJson.confidence;
        } else {
          const fallback = parseOcrTextHeuristically(ocrText);
          data = fallback;
          aiConf = fallback.confidence || 40;
        }
      } catch (apiErr) {
        console.warn('API extract call failed, using heuristic parser:', apiErr);
        const fallback = parseOcrTextHeuristically(ocrText);
        data = fallback;
        aiConf = fallback.confidence || 40;
      }

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
      const computedConf = aiConf || ocrConf || 50;
      setConfidence(computedConf);

      // Perform real-time requirement linkage match
      const matched = matchRequirementRow({ ...finalFields, rawOcr: ocrText }, catalogRequirements);
      if (matched) {
        setMatchedRequirement(matched);
        if (!finalFields.license_type) {
          setFields(prevF => ({ ...prevF, license_type: matched.requirement_name }));
        }
        if (!finalFields.issuing_authority && matched.issuing_agency) {
          setFields(prevF => ({ ...prevF, issuing_authority: matched.issuing_agency }));
        }
      }

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
  }, [businessType, cities, catalogRequirements, matchRequirementRow]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRequirementSelect = (reqId) => {
    const selected = catalogRequirements.find(r => r.id === reqId);
    if (selected) {
      setMatchedRequirement(selected);
      setFields(f => ({
        ...f,
        license_type: selected.requirement_name,
        issuing_authority: selected.issuing_agency || f.issuing_authority,
      }));
      setManualRequirementOverride(true);
    }
  };

  const handleSave = async () => {
    if (!fields.expiry_date) {
      toast.error('Expiry date is required');
      return;
    }
    try {
      await onSave?.({
        ...fields,
        requirement_id: matchedRequirement?.id,
        requirement: matchedRequirement,
      });
      setState(STATES.SUCCESS);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const isLowConfidence = confidence < 60;

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
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                {/* Confidence banner */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium border ${confidence >= 70 ? 'bg-green-50 text-green-800 border-green-200' : confidence >= 40 ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle size={17} className={confidence >= 70 ? 'text-green-600' : confidence >= 40 ? 'text-amber-600' : 'text-red-600'} />
                    <span>AI Extraction Confidence: <strong>{confidence}%</strong></span>
                  </div>
                  {isLowConfidence && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-100/80 text-amber-800 border border-amber-200">
                      Manual Verification Advised
                    </span>
                  )}
                </div>

                {/* Requirement Linkage Visibility Card */}
                <div className="bg-base/70 rounded-2xl border border-rule p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold font-display text-ink uppercase tracking-wide">
                      <Link2 size={15} className="text-accent" />
                      <span>Linked Requirement Checklist Item</span>
                    </div>
                    {matchedRequirement?.jurisdiction_level && (
                      <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-accent-light text-accent border border-accent/20">
                        {matchedRequirement.jurisdiction_level} level
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface rounded-xl p-3.5 border border-rule/60">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-ink flex items-center gap-1.5">
                        <ShieldCheck size={16} className={matchedRequirement ? "text-settled flex-shrink-0" : "text-ink-faint flex-shrink-0"} />
                        <span>{matchedRequirement ? matchedRequirement.requirement_name : 'No direct catalog match — select from list'}</span>
                      </div>
                      {matchedRequirement?.issuing_agency ? (
                        <div className="text-xs text-ink-faint">
                          Issuing Agency: <span className="text-ink-muted font-medium">{matchedRequirement.issuing_agency}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-ink-faint">
                          Map this scan to one of your tracked business requirements
                        </div>
                      )}
                    </div>

                    {catalogRequirements.length > 0 && (
                      <div className="flex items-center gap-1.5 self-start sm:self-center">
                        <label className="text-[11px] font-semibold text-ink-faint uppercase whitespace-nowrap">
                          {matchedRequirement ? 'Change:' : 'Select:'}
                        </label>
                        <select
                          value={matchedRequirement?.id || ''}
                          onChange={(e) => handleRequirementSelect(e.target.value)}
                          className="text-xs font-medium bg-base border border-rule rounded-lg px-2.5 py-1.5 text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="">-- Choose Requirement --</option>
                          {catalogRequirements.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.requirement_name} ({r.jurisdiction_level || 'city'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-12 gap-6 items-stretch">
                  {/* Left Pane - Document Preview */}
                  <div className="md:col-span-5 flex flex-col gap-2.5">
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
                  <div className="md:col-span-7 flex flex-col gap-3.5">
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
                          {catalogRequirements.map((r, idx) => (
                            <option key={idx} value={r.requirement_name} />
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

                      {/* Expiry Date with Low-Confidence Verification Prompt */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-ink-faint font-display uppercase tracking-wide block">
                            Expiry Date *
                          </label>
                          {isLowConfidence && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                              ⚠️ Please verify this date
                            </span>
                          )}
                        </div>

                        <input
                          type="date"
                          value={fields.expiry_date || ''}
                          onChange={e => setFields(f => ({ ...f, expiry_date: e.target.value }))}
                          className={`input text-sm w-full transition-all ${isLowConfidence ? 'border-amber-300 ring-1 ring-amber-300/60 bg-amber-50/20 focus:ring-amber-500' : ''}`}
                        />

                        {isLowConfidence && (
                          <p className="text-[11px] text-amber-800 leading-tight">
                            AI confidence is below 60%. Please verify this expiration date matches the document scan on the left before confirming.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-rule">
                  <button onClick={() => { setState(STATES.UPLOAD); setPreview(null); setMatchedRequirement(null); }} className="btn-secondary flex-1 font-display">{t('scan.retake')}</button>
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

