import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FileDown, ExternalLink, CheckSquare, Square, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateRenewalPDF } from '../../services/pdfService';
import { getLicenseById } from '../../utils/licenseTypes';

async function prefillLicenseClient(businessProfile, licenseType) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not configured in client environment.');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const country = businessProfile.country || 'USA';
  const currencySymbol = country === 'India' ? 'INR (₹)' : 'USD ($)';
  const cities = Array.isArray(businessProfile.cities) ? businessProfile.cities.join(', ') : businessProfile.city || country;

  const prompt = `You are a compliance expert specializing in business licensing for ${country}.
Given the business profile and license type, generate a pre-filled renewal form as JSON.
Return ONLY valid JSON — no markdown, no explanation.

Business Profile:
${JSON.stringify(businessProfile, null, 2)}

License Type: ${licenseType}

Return this exact structure:
{
  "formFields": [
    { "fieldName": "string", "fieldValue": "string", "editable": true }
  ],
  "documentChecklist": ["string"],
  "renewalInstructions": ["string"],
  "estimatedTime": "string (e.g. '3-5 working days')",
  "estimatedCost": "string in ${currencySymbol}"
}

Use the business profile to pre-fill as many fields as possible.
Include all standard fields required for this specific license renewal in ${cities}.`;

  const result = await model.generateContent(prompt);
  const rawText = result.response.text();
  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  return JSON.parse(cleaned);
}

export default function RenewalForm({ license, business }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [checked, setChecked] = useState({});

  const def = getLicenseById(license.license_type);

  const handlePrefill = async () => {
    setLoading(true);
    try {
      let data = null;
      try {
        const res = await fetch('/api/ai/prefill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessProfile: business, licenseType: license.license_type }),
        });
        if (res.ok) {
          data = await res.json();
        } else {
          data = await prefillLicenseClient(business, license.license_type);
        }
      } catch (apiErr) {
        data = await prefillLicenseClient(business, license.license_type);
      }

      if (data.error) throw new Error(data.error);
      setFormData(data);
    } catch (err) {
      toast.error('AI unavailable — using standard checklist');
      setFormData({
        formFields: [],
        documentChecklist: def?.documents_required || [],
        renewalInstructions: ['Visit the official renewal portal', 'Upload all required documents', 'Pay the renewal fee', 'Download the renewed license'],
        estimatedTime: '3-7 business days',
        estimatedCost: 'Varies by license type',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const url = generateRenewalPDF(business, license.license_type, formData);
    const a = document.createElement('a');
    a.href = url; a.download = `${license.license_type}-renewal.pdf`; a.click();
  };

  const docs = formData?.documentChecklist || def?.documents_required || [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      <h3 className="section-title">Ready to Renew?</h3>

      {/* Document checklist */}
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-3">Documents Required</div>
        <div className="space-y-2">
          {docs.map((doc, i) => (
            <button key={i} onClick={() => setChecked(c => ({ ...c, [i]: !c[i] }))}
              className="flex items-center gap-3 w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors">
              {checked[i]
                ? <CheckSquare size={18} className="text-green-500 flex-shrink-0" />
                : <Square size={18} className="text-gray-300 flex-shrink-0" />}
              <span className={`text-sm ${checked[i] ? 'line-through text-gray-400' : 'text-gray-700'}`}>{doc}</span>
            </button>
          ))}
        </div>
        {docs.length > 0 && (
          <div className="mt-2 text-xs text-gray-400">
            {Object.values(checked).filter(Boolean).length}/{docs.length} documents ready
          </div>
        )}
      </div>

      {/* Instructions */}
      {formData?.renewalInstructions && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3">Steps to Renew</div>
          <div className="space-y-2">
            {formData.renewalInstructions.map((step, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
          {(formData.estimatedTime || formData.estimatedCost) && (
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              {formData.estimatedTime && <span>Est. Time: {formData.estimatedTime}</span>}
              {formData.estimatedCost && <span>Est. Cost: {formData.estimatedCost}</span>}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-2">
        {!formData ? (
          <button onClick={handlePrefill} disabled={loading} className="btn-primary w-full">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Generating with AI…</> : 'Pre-fill Renewal Form with AI'}
          </button>
        ) : (
          <button onClick={handleDownloadPDF} className="btn-secondary w-full">
            <FileDown size={16} /> Download as PDF
          </button>
        )}
        {def?.renewal_portal && (
          <a href={def.renewal_portal} target="_blank" rel="noopener noreferrer" className="btn-primary w-full text-center">
            <ExternalLink size={16} /> Go to Official Portal
          </a>
        )}
      </div>
    </div>
  );
}
