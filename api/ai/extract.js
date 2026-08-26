/**
 * /api/ai/extract.js
 * Vercel Serverless Function — Gemini OCR text → structured license JSON.
 * POST body: { ocrText: string, businessType?: string, cities?: string[] }
 * Response:  { data: object, confidence: number, error: string|null }
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

// Initialize Supabase for server-side catalog lookup
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
)

/**
 * Fetch distinct requirement names from the catalog filtered by this business's
 * type and cities. Returns an empty array if the catalog has no matching rows.
 */
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

    // Return distinct names
    return [...new Set(filtered.map(r => r.requirement_name).filter(Boolean))]
  } catch {
    return []
  }
}

/**
 * Derive the country context from the cities list (e.g. "New York, NY" → USA,
 * "Mumbai, Maharashtra" → India). Falls back to USA if ambiguous.
 */
function deriveCountry(cities = []) {
  const indiaStates = ['maharashtra', 'karnataka', 'delhi', 'gujarat', 'rajasthan', 'tamil nadu', 'telangana', 'kerala', 'west bengal', 'punjab', 'uttar pradesh']
  for (const city of cities) {
    const lower = city.toLowerCase()
    if (indiaStates.some(s => lower.includes(s))) return 'India'
  }
  return 'USA'
}

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

  const { ocrText, businessType, cities = [] } = req.body || {}

  if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 10) {
    return res.status(400).json({ data: null, confidence: 0, error: 'ocrText is required and must be at least 10 characters' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ data: null, confidence: 0, error: 'Gemini API key not configured' })
  }

  // Dynamically fetch valid license names for this specific business
  const catalogNames = await getCatalogNames(businessType, cities)
  const country = deriveCountry(cities)
  const jurisdiction = cities.length > 0 ? cities.join(', ') : country

  // Build the license_type instruction depending on catalog availability
  const licenseTypeInstruction = catalogNames.length > 0
    ? `- license_type: one of [${catalogNames.map(n => `"${n}"`).join(', ')}] — pick the closest match from this list, or use the literal text from the document if none match`
    : `- license_type: extract the license type as free text from the document — do not guess if unclear`

  const systemPrompt = `You are an expert at reading government license and permit documents for businesses operating in ${jurisdiction}.
Extract fields from the following OCR text and return ONLY a valid JSON object.
No markdown fences, no explanation, no code blocks — just raw JSON.

Required fields:
${licenseTypeInstruction}
- license_number: string or null
- issuing_authority: string or null
- business_name: string or null
- holder_name: string or null
- issue_date: "YYYY-MM-DD" or null
- expiry_date: "YYYY-MM-DD" or null
- address: string or null
- confidence: integer 0-100 — how clearly readable was this document? (100 = perfect quality, 0 = unreadable)

Use null for fields you cannot confidently read. Do not guess.`

  try {
    const prompt = `${systemPrompt}\n\nOCR Text:\n${ocrText.slice(0, 4000)}`
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

    // Also return the catalog names so the client can populate the dropdown
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
