/**
 * /api/ai/extract.js
 * Vercel Serverless Function — Gemini OCR text → structured license JSON.
 * POST body: { ocrText: string }
 * Response:  { data: object, confidence: number, error: string|null }
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const SYSTEM_PROMPT = `You are an expert at reading Indian government license documents.
Extract fields from the following OCR text and return ONLY a valid JSON object.
No markdown fences, no explanation, no code blocks — just raw JSON.

Required fields:
- license_type: one of [FSSAI, FIRE_NOC, TRADE_LICENSE, SHOP_ESTABLISHMENT, EATING_HOUSE, GST, SIGNAGE, DRUG_LICENSE] — pick the closest match
- license_number: string or null
- issuing_authority: string or null
- business_name: string or null
- holder_name: string or null
- issue_date: "YYYY-MM-DD" or null
- expiry_date: "YYYY-MM-DD" or null
- address: string or null
- confidence: integer 0-100 — how clearly readable was this document? (100 = perfect quality, 0 = unreadable)

Use null for fields you cannot confidently read. Do not guess.`

function stripMarkdown(text) {
  return text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { ocrText } = req.body || {}

  if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 10) {
    return res.status(400).json({ data: null, confidence: 0, error: 'ocrText is required and must be at least 10 characters' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ data: null, confidence: 0, error: 'Gemini API key not configured' })
  }

  try {
    const prompt = `${SYSTEM_PROMPT}\n\nOCR Text:\n${ocrText.slice(0, 4000)}`
    const result = await model.generateContent(prompt)
    const rawText = result.response.text()
    const cleaned = stripMarkdown(rawText)

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return res.status(200).json({
        data: null,
        confidence: 0,
        error: 'AI returned invalid JSON — please fill fields manually',
        raw: cleaned,
      })
    }

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(100, Math.max(0, parsed.confidence))
      : 50

    return res.status(200).json({ data: parsed, confidence, error: null })
  } catch (err) {
    console.error('[/api/ai/extract]', err)
    return res.status(500).json({
      data: null,
      confidence: 0,
      error: 'AI service unavailable — please enter details manually',
    })
  }
}
