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

  // 3. EIN / Tax / License Number
  const einMatch = ocrText.match(/(?:ein|employer\s+identification\s+number)[\s\:\-]*([0-9]{2}\-[0-9]{7})/i) ||
                   ocrText.match(/\b([0-9]{2}\-[0-9]{7})\b/);
  if (einMatch && einMatch[1]) {
    result.license_number = einMatch[1];
    result.license_type = 'Employer Identification Number (EIN)';
    result.issuing_authority = 'IRS (Internal Revenue Service)';
  } else {
    const certMatch = ocrText.match(/(?:certificate|license|permit|registration|cert|lic|id)\s*(?:number|no\.?|#)?[\s\:\-]+([A-Z0-9\-]{4,25})/i);
    if (certMatch && certMatch[1]) {
      result.license_number = certMatch[1];
    } else {
      const standaloneNum = ocrText.match(/\b([0-9]{6,12})\b/);
      if (standaloneNum) result.license_number = standaloneNum[1];
    }
  }

  // 4. Common Document Type / Authority Detection
  if (!result.license_type) {
    if (/servsafe|food\s*handler|food\s*safety/i.test(ocrText)) {
      result.license_type = /california/i.test(ocrText) ? 'California Food Handler Card' : 'Food Handler Certificate';
      result.issuing_authority = /servsafe/i.test(ocrText) ? 'ServSafe / National Restaurant Association' : 'Health Department';
    } else if (/fssai/i.test(ocrText)) {
      result.license_type = 'FSSAI Food License';
      result.issuing_authority = 'Food Safety and Standards Authority of India';
    } else if (/fire/i.test(ocrText)) {
      result.license_type = 'Fire Safety Clearance / NOC';
      result.issuing_authority = 'Fire Department';
    } else if (/mobile\s*food|vending|vendor/i.test(ocrText)) {
      result.license_type = 'Mobile Food Vending License';
      result.issuing_authority = 'Dept. of Consumer Affairs';
    } else if (/irs|treasury|internal\s+revenue/i.test(ocrText)) {
      result.license_type = 'Employer Identification Number (EIN)';
      result.issuing_authority = 'IRS (Internal Revenue Service)';
    }
  }

  // 5. Business Name Detection
  const businessMatch = ocrText.match(/([A-Z0-9\s\,\.\-]{3,40}\b(?:LLC|INC|CORP|CO|LIMITED|SERVICES|STORE|KITCHEN)\b)/i);
  if (businessMatch && businessMatch[1]) {
    result.business_name = businessMatch[1].trim();
  }

  if (result.expiry_date || result.license_number) {
    result.confidence = 75;
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
 * Document extraction with AI cascade & heuristic fallback
 */
export async function extractLicenseDocument({ ocrText = '', imageFile = null, businessType = '', cities = [] }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const heuristicData = parseOcrTextHeuristically(ocrText);

  if (!apiKey) {
    return { data: heuristicData, confidence: heuristicData.confidence || 40 };
  }

  const country = cities.some(c => c.toLowerCase().includes('maharashtra') || c.toLowerCase().includes('mumbai') || c.toLowerCase().includes('india')) ? 'India' : 'USA';
  const jurisdiction = cities.length > 0 ? cities.join(', ') : country;

  const systemPrompt = `You are an expert data extractor for any government, tax, business license, or permit document in ${jurisdiction}.
Extract fields and return ONLY a valid JSON object matching the requested schema.
CRITICAL: Ignore any background "DEMO" or "SAMPLE" watermarks stamped across the page. Focus purely on the actual document data.

Schema requirements:
- license_type: The formal name of the document or license (e.g. "Employer Identification Number (EIN)", "California Food Handler Card"). Must be a string or null.
- license_number: The primary identification number (e.g. EIN, License No, Permit #). Must be a string or null.
- issuing_authority: The government body or agency issuing the document (e.g. "IRS", "Dept of Public Health"). Must be a string or null.
- business_name: The legal name of the business receiving the document. Must be a string or null.
- holder_name: The name of the individual holding the document (if applicable). Must be a string or null.
- issue_date: The date the document was issued, strictly in "YYYY-MM-DD" format, or null.
- expiry_date: The date the document expires, strictly in "YYYY-MM-DD" format, or null.
- address: The address of the business or individual. Must be a string or null.
- confidence: Your confidence score from 0 to 100 based on how readable the document is. Integer.

Return valid JSON. Do not guess any fields you cannot clearly read.`;

  let parts;
  if (imageFile) {
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      const partsArr = dataUrl.split(',');
      const mimeType = partsArr[0].match(/:(.*?);/)?.[1] || imageFile.type || 'image/jpeg';
      const base64 = partsArr[1];
      parts = [
        { text: systemPrompt },
        { inlineData: { mimeType, data: base64 } },
      ];
    } catch {
      parts = [{ text: `${systemPrompt}\n\nOCR Text:\n${ocrText.slice(0, 4000)}` }];
    }
  } else {
    parts = [{ text: `${systemPrompt}\n\nOCR Text:\n${ocrText.slice(0, 4000)}` }];
  }

  try {
    const aiData = await callWithModelCascade(apiKey, async (model) => {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      const text = result.response.text();
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      return JSON.parse(cleaned);
    });

    const merged = {
      license_type: aiData?.license_type || heuristicData.license_type || '',
      license_number: aiData?.license_number || heuristicData.license_number || '',
      issuing_authority: aiData?.issuing_authority || heuristicData.issuing_authority || '',
      issue_date: aiData?.issue_date || heuristicData.issue_date || '',
      expiry_date: aiData?.expiry_date || heuristicData.expiry_date || '',
      business_name: aiData?.business_name || heuristicData.business_name || '',
      holder_name: aiData?.holder_name || heuristicData.holder_name || '',
      address: aiData?.address || heuristicData.address || '',
    };

    const conf = Math.max(aiData?.confidence || 0, heuristicData.confidence || 0, (merged.expiry_date || merged.license_number) ? 80 : 50);

    return { data: merged, confidence: conf };
  } catch (err) {
    console.warn('AI Extraction failed across cascade, using heuristic parser:', err);
    return { data: heuristicData, confidence: heuristicData.confidence || 40 };
  }
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
