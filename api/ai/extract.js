import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
)

async function getCatalogNames(businessType, cities = []) {
  if (!businessType) return []
  try {
    const { data, error } = await supabase
      .from('requirements')
      .select('requirement_name')
      .ilike('business_type', businessType)

    if (error || !data) return []

    const lowerCities = cities.map(c => c.toLowerCase())
    const filtered = data.filter(r =>
      lowerCities.length === 0 ||
      lowerCities.some(c => r.city?.toLowerCase() === c || c.includes(r.city?.toLowerCase()))
    )
    return [...new Set(filtered.map(r => r.requirement_name).filter(Boolean))]
  } catch {
    return []
  }
}

function deriveCountry(cities = []) {
  const indiaStates = ['maharashtra', 'karnataka', 'delhi', 'gujarat', 'rajasthan', 'tamil nadu', 'telangana', 'kerala', 'west bengal', 'punjab', 'uttar pradesh']
  for (const city of cities) {
    const lower = city.toLowerCase()
    if (indiaStates.some(s => lower.includes(s))) return 'India'
  }
  return 'USA'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { ocrText, businessType, cities = [] } = req.body || {}

  if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 10) {
    return res.status(400).json({ data: null, confidence: 0, error: 'ocrText is required and must be at least 10 characters' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ data: null, confidence: 0, error: 'Gemini API key not configured' })
  }

  const catalogNames = await getCatalogNames(businessType, cities)
  const country = deriveCountry(cities)
  const jurisdiction = cities.length > 0 ? cities.join(', ') : country

  const systemPrompt = `You are an expert data extractor for any government, tax, business license, or permit document in ${jurisdiction}.
Extract fields and return ONLY a valid JSON object matching the requested schema.
CRITICAL: Ignore any background "DEMO" or "SAMPLE" watermarks stamped across the page. Focus purely on the actual document data.

Schema requirements:
- license_type: The formal name of the document or license (e.g. "Employer Identification Number", "Health Permit"). Must be a string or null.
- license_number: The primary identification number (e.g. EIN, License No, Permit #). Must be a string or null.
- issuing_authority: The government body or agency issuing the document (e.g. "IRS", "Dept of Public Health"). Must be a string or null.
- business_name: The legal name of the business receiving the document. Must be a string or null.
- holder_name: The name of the individual holding the document (if applicable). Must be a string or null.
- issue_date: The date the document was issued, strictly in "YYYY-MM-DD" format, or null.
- expiry_date: The date the document expires, strictly in "YYYY-MM-DD" format, or null.
- address: The address of the business or individual. Must be a string or null.
- confidence: Your confidence score from 0 to 100 based on how readable the document is. Integer.

Return valid JSON. Do not guess any fields you cannot clearly read.`

  try {
    const prompt = `${systemPrompt}\n\nOCR Text:\n${ocrText.slice(0, 4000)}`
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
    
    const rawText = result.response.text()
    
    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return res.status(200).json({
        data: null,
        confidence: 0,
        error: 'AI returned invalid JSON — please fill fields manually',
        raw: rawText,
      })
    }

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(100, Math.max(0, parsed.confidence))
      : 50

    return res.status(200).json({ data: parsed, confidence, error: null, catalogNames })
  } catch (err) {
    console.error('[/api/ai/extract]', err)
    return res.status(500).json({
      data: null,
      confidence: 0,
      error: 'AI service unavailable — please enter details manually',
    })
  }
}
