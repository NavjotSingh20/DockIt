import { GoogleGenerativeAI } from '@google/generative-ai';

/** Centralized Model Cascade order */
export const MODEL_CASCADE = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
];

/**
 * Zero-Failure Heuristic OCR Parser
 * Extracts dates, numbers, license types, authorities, and business names
 * from OCR text completely offline without AI dependence.
 */
export function parseOcrTextHeuristically(ocrText) {
  if (!ocrText || typeof ocrText !== 'string') return {};

  const result = {
    license_type: null,
    license_number: null,
    issuing_authority: null,
    business_name: null,
    holder_name: null,
    issue_date: null,
    expiry_date: null,
    address: null,
    confidence: 40,
  };

  function normalizeDate(dStr) {
    if (!dStr) return null;
    const parts = dStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);
        const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        if (p1 > 12 && p2 <= 12) {
          return `${yr}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else {
          return `${yr}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }
    }
    return null;
  }

  // 1. Expiry Date Detection
  const expMatch = ocrText.match(/(?:expir|valid\s+until|valid\s+through|exp\.?\s*date)[\s\:\-]+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i);
  if (expMatch && expMatch[1]) result.expiry_date = normalizeDate(expMatch[1]);

  // 2. Issue Date Detection
  const issueMatch = ocrText.match(/(?:issue\s*date|date\s*of\s*issue|^date)[\s\:\-]+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i);
  if (issueMatch && issueMatch[1] && normalizeDate(issueMatch[1]) !== result.expiry_date) {
    result.issue_date = normalizeDate(issueMatch[1]);
  }

  // Fallback date matching (all dates)
  const dateMatches = [...ocrText.matchAll(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/g)].map(m => m[0]);
  if (!result.expiry_date && dateMatches.length > 0) {
    const normalized = dateMatches.map(normalizeDate).filter(Boolean).sort();
    if (normalized.length >= 2) {
      result.issue_date = normalized[0];
      result.expiry_date = normalized[normalized.length - 1];
    } else if (normalized.length === 1) {
      result.expiry_date = normalized[0];
    }
  }

  // 3. Document / ID / Permit Number
  const stopWords = new Set(['under', 'food', 'safety', 'standards', 'act', 'state', 'central', 'valid', 'issued', 'date', 'type', 'name', 'period', 'form', 'number', 'address', 'kind', 'business']);

  const einMatch = ocrText.match(/(?:ein|employer\s+identification\s+number)[\s\:\-]*([0-9]{2}\-[0-9]{7})/i) ||
                   ocrText.match(/\b([0-9]{2}\-[0-9]{7})\b/);
  if (einMatch && einMatch[1]) {
    result.license_number = einMatch[1];
    result.license_type = 'Employer Identification Number (EIN)';
    result.issuing_authority = 'Internal Revenue Service (IRS)';
  } else {
    // Check for explicit label like "License Number : 99990001000121" or Hindi "अनुज्ञप्ति संख्या"
    const certMatch = ocrText.match(/(?:certificate|license|permit|registration|cert|lic|id|संख्या)\s*(?:number|no\.?|#|संख्या)?[\s\:\-]+([A-Z0-9\-]{6,25})/i);
    if (certMatch && certMatch[1] && !stopWords.has(certMatch[1].toLowerCase().trim())) {
      result.license_number = certMatch[1].trim();
    } else {
      // 14-digit FSSAI / Standard government license number
      const fssaiMatch = ocrText.match(/\b([0-9]{14})\b/) || ocrText.match(/\b([0-9]{12,14})\b/);
      if (fssaiMatch) {
        result.license_number = fssaiMatch[1];
      } else {
        const standaloneNum = ocrText.match(/\b([0-9]{6,12})\b/);
        if (standaloneNum && !stopWords.has(standaloneNum[1].toLowerCase())) {
          result.license_number = standaloneNum[1];
        }
      }
    }
  }

  // Detect document type
  if (/fssai|food safety/i.test(ocrText)) {
    result.license_type = result.license_type || 'FSSAI Food License';
    result.issuing_authority = result.issuing_authority || 'Food Safety and Standards Authority of India';
  } else if (/trade license/i.test(ocrText)) {
    result.license_type = result.license_type || 'Trade License';
  } else if (/health permit|eating house/i.test(ocrText)) {
    result.license_type = result.license_type || 'Health Trade License';
  }

  // 4. Business Name Detection
  const businessMatch = ocrText.match(/([A-Z0-9\s\,\.\-]{3,40}\b(?:LLC|INC|CORP|CO|LIMITED|SERVICES|STORE|KITCHEN|TADKA|DHABA|RESTAURANT)\b)/i);
  if (businessMatch && businessMatch[1]) {
    result.business_name = businessMatch[1].trim();
  }

  // Confidence calculation based purely on extracted raw primitives
  if (result.expiry_date && result.license_number && result.license_type) {
    result.confidence = 75;
  } else if (result.expiry_date && result.license_number) {
    result.confidence = 65;
  } else if (result.expiry_date || result.license_number) {
    result.confidence = 50;
  } else {
    result.confidence = 30;
  }

  return result;
}

/**
 * Execute an AI function with automatic fallback cascade across supported Gemini models
 */
export async function callWithModelCascade(apiKey, apiCallFn) {
  if (!apiKey) throw new Error('Gemini API key is not configured.');

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of MODEL_CASCADE) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await apiCallFn(model, modelName);
    } catch (err) {
      console.warn(`Model ${modelName} failed or unavailable:`, err.message || err);
      lastError = err;
      // Continue to next model in cascade
    }
  }

  throw lastError || new Error('All Gemini cascade models failed.');
}



/**
 * AI Renewal Form Prefill with cascade
 */
export async function prefillLicenseForm(businessProfile, licenseType) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const country = businessProfile?.country || 'USA';
  const currencySymbol = country === 'India' ? 'INR (₹)' : 'USD ($)';
  const cities = Array.isArray(businessProfile?.cities) ? businessProfile.cities.join(', ') : businessProfile?.city || country;

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

  if (!apiKey) {
    return getLocalPrefillFallback(businessProfile, licenseType, currencySymbol);
  }

  try {
    return await callWithModelCascade(apiKey, async (model) => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      const text = result.response.text();
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      return JSON.parse(cleaned);
    });
  } catch (err) {
    console.warn('AI Prefill failed across cascade, using local fallback:', err);
    return getLocalPrefillFallback(businessProfile, licenseType, currencySymbol);
  }
}

function getLocalPrefillFallback(businessProfile, licenseType, currencySymbol) {
  return {
    formFields: [
      { fieldName: 'Business Name', fieldValue: businessProfile?.businessName || businessProfile?.name || 'Rico Curbside Kitchen', editable: true },
      { fieldName: 'Business Type', fieldValue: businessProfile?.businessType || 'Food Truck', editable: true },
      { fieldName: 'Operating City', fieldValue: Array.isArray(businessProfile?.cities) ? businessProfile.cities.join(', ') : 'New York, NY', editable: true },
      { fieldName: 'Contact Email', fieldValue: businessProfile?.email || 'rico@curbsidekitchen.com', editable: true },
      { fieldName: 'License Category', fieldValue: licenseType || 'General Business License', editable: true },
    ],
    documentChecklist: [
      'Copy of Current License / Permit',
      'Government Issued Photo ID',
      'Proof of Business Address',
      'Recent Utility Bill or Lease Agreement',
    ],
    renewalInstructions: [
      'Verify all pre-filled business details in the form fields.',
      'Gather the required documents from the checklist above.',
      'Submit the application online or print & submit to your local issuing authority office.',
    ],
    estimatedTime: '2-4 business days',
    estimatedCost: currencySymbol === 'INR (₹)' ? '₹1,500' : '$150',
  };
}

/**
 * AI Chat Stream with model cascade
 */
export async function streamChatResponse({ apiKey, message, chatHistory = [], systemInstruction, onChunk }) {
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not configured.');
  }

  return await callWithModelCascade(apiKey, async (model, modelName) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelWithSystem = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction,
    });

    const validHistory = chatHistory
      .filter(m => m.content && m.content.trim().length > 0)
      .slice(-6)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const contents = [
      ...validHistory,
      { role: 'user', parts: [{ text: message }] }
    ];

    const result = await modelWithSystem.generateContentStream({ contents });
    let receivedChunks = false;

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        receivedChunks = true;
        onChunk(text);
      }
    }

    return receivedChunks;
  });
}
