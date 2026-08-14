/**
 * /api/ai/prefill.js
 * Vercel Serverless Function — Generate pre-filled renewal form via Gemini.
 * POST body: { businessProfile: object, licenseType: string }
 * Response:  { formFields[], documentChecklist[], renewalInstructions[], estimatedTime, estimatedCost }
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

function stripMarkdown(text) {
  return text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { businessProfile, licenseType } = req.body || {}

  if (!businessProfile || !licenseType) {
    return res.status(400).json({ error: 'businessProfile and licenseType are required' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' })
  }

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
    { "fieldName": "string", "fieldValue": "string", "editable": true|false }
  ],
  "documentChecklist": ["string"],
  "renewalInstructions": ["string"],
  "estimatedTime": "string (e.g. '3-5 working days')",
  "estimatedCost": "string in ${currencySymbol}"
}

Use the business profile to pre-fill as many fields as possible.
Mark editable: false only for system-generated or fixed government fields.
Include all standard fields required for this specific license renewal in ${cities}.
Amounts must be in ${currencySymbol}. Instructions must be specific to the relevant municipality, state, or jurisdiction.`;

  try {
    const result = await model.generateContent(prompt)
    const rawText = result.response.text()
    const cleaned = stripMarkdown(rawText)

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return res.status(200).json({
        error: 'AI returned invalid response',
        formFields: [],
        documentChecklist: [],
        renewalInstructions: [],
        estimatedTime: 'Contact issuing authority',
        estimatedCost: 'Contact issuing authority',
      })
    }

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('[/api/ai/prefill]', err)
    return res.status(500).json({ error: 'AI service unavailable — please fill form manually' })
  }
}
