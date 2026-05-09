import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const getModel = (isJson = false) => genAI?.getGenerativeModel({ 
  model: 'gemini-flash-latest',
  ...(isJson && { generationConfig: { responseMimeType: 'application/json' } })
});

export async function extractLicenseFromText(ocrText) {
  try {
    const model = getModel(true);
    if (!model) return { data: null, confidence: 0, error: 'Gemini not configured' };

    const prompt = `You are an expert at reading Indian government license documents. Extract fields from the following OCR text and return a valid JSON object.
Required JSON schema:
{
  "license_type": "FSSAI or FIRE_NOC or TRADE_LICENSE or SHOP_ESTABLISHMENT or EATING_HOUSE or GST or SIGNAGE or DRUG_LICENSE (Pick the closest one)",
  "license_number": "extracted number, or empty string",
  "issuing_authority": "extracted authority, or empty string",
  "business_name": "extracted business name, or empty string",
  "holder_name": "extracted owner name, or empty string",
  "issue_date": "YYYY-MM-DD or empty string",
  "expiry_date": "YYYY-MM-DD or empty string",
  "address": "extracted address, or empty string",
  "confidence": integer between 0 and 100 representing how clearly readable the document was
}

OCR Text:
${ocrText}`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());
    
    // Normalize dates if they are not in YYYY-MM-DD
    const normalizeDate = (d) => {
      if (!d || d.trim() === '') return '';
      // Let standard input type=date handle whatever if it's formatted right, else keep raw
      return d;
    };

    return { 
      data: {
        ...data,
        issue_date: normalizeDate(data.issue_date),
        expiry_date: normalizeDate(data.expiry_date)
      }, 
      confidence: data.confidence || 50, 
      error: null 
    };
  } catch (err) {
    console.error("Gemini Extraction Error:", err);
    return { data: null, confidence: 0, error: err.message };
  }
}

export async function generateFormPrefill(businessProfile, licenseType) {
  try {
    const model = getModel(true);
    if (!model) return { data: null, error: 'Gemini not configured' };

    const prompt = `You are a compliance expert for Indian SMBs. Given the business profile and license type, generate a pre-filled renewal form as JSON. Return valid JSON matching this schema:
{
  "formFields": [{"fieldName": "string", "fieldValue": "string", "editable": boolean}],
  "documentChecklist": ["string"],
  "renewalInstructions": ["string"],
  "estimatedTime": "string",
  "estimatedCost": "string"
}

Business profile: ${JSON.stringify(businessProfile)}
License type: ${licenseType}`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function chatWithAI(message, businessContext, chatHistory, onChunk) {
  try {
    const model = getModel();
    if (!model) {
      onChunk?.('Gemini AI is not configured. Please add your VITE_GEMINI_API_KEY to .env.local');
      return;
    }

    const systemPrompt = `You are ComplianceAI's helpful assistant for Indian small business owners. You specialize in Indian business compliance, government licenses, penalties, and renewal procedures — specifically for Karnataka and Bengaluru. Always use INR (₹) for money. Be concise and practical. Current business: ${JSON.stringify(businessContext || {})}.`;

    const history = (chatHistory || []).slice(-10).map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: [{ role: 'user', parts: [{ text: systemPrompt }] }, { role: 'model', parts: [{ text: 'Understood! I am ready to help with Indian business compliance questions.' }] }, ...history],
    });

    const result = await chat.sendMessageStream(message);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) onChunk?.(text);
    }
  } catch (err) {
    onChunk?.(`Error: ${err.message}`);
  }
}
