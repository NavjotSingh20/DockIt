import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const VISION_MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

async function generateWithModelCascade(genAI, parts) {
  let lastErr = null
  for (const modelName of VISION_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: "application/json" }
        })
        const text = result?.response?.text()
        if (text) {
          return JSON.parse(text)
        }
      } catch (err) {
        lastErr = err
        const is429 = err.status === 429 || (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')))
        if (is429 && attempt === 0) {
          console.warn(`[api/ai/extract] Model ${modelName} 429 rate-limited, waiting 2s for quota refresh...`)
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
        console.warn(`[api/ai/extract] Model ${modelName} failed (${err.status || err.message}), trying next model...`)
        break
      }
    }
  }
  throw lastErr || new Error('All vision models in cascade exhausted')
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null

async function getCatalogNames(businessType, cities = []) {
  if (!supabase || !businessType) return []
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
  const indiaStates = ['maharashtra', 'karnataka', 'delhi', 'gujarat', 'rajasthan', 'tamil nadu', 'telangana', 'kerala', 'west bengal', 'punjab', 'uttar pradesh', 'chandigarh']
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

  const { imageBase64, mimeType = 'image/jpeg', ocrText, businessType, cities = [] } = req.body || {}

  if (!imageBase64 && (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 10)) {
    return res.status(400).json({
      data: null,
      confidence: 0,
      error: 'Either imageBase64 or ocrText (at least 10 chars) is required'
    })
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ data: null, confidence: 0, error: 'Gemini API key not configured' })
  }

  const catalogNames = await getCatalogNames(businessType, cities)
  const country = deriveCountry(cities)
  const jurisdiction = cities.length > 0 ? cities.join(', ') : country

  const systemPrompt = `You are an expert document parser and data extraction system specialized in official government licenses, permits, tax certificates, and regulatory filings from ${jurisdiction}.

CRITICAL INSTRUCTIONS:
1. BILINGUAL DOCUMENTS (HINDI / DEVANAGARI & ENGLISH):
   - Many official Indian government forms (e.g. FSSAI, Trade License, MCD Eating House, Fire NOC, Shop & Establishment) display bilingual text.
   - Prioritize the English line for the actual extracted values (e.g. "URBAN TADKA", "SECTOR 12, CHANDIGARH", "State", "Restaurants").
   - Use the Devanagari text for cross-validation (e.g., verifying licensee/owner name if mentioned like 'मालिक: हरप्रीत सिंह').
2. TIERED & CATEGORY LICENSES (INDIA-CENTRIC):
   - For FSSAI-style tiered licenses, map license_category to "Basic", "State", or "Central".
3. DUAL / DISTINCT ADDRESSES:
   - Extract registered_office_address and authorized_premises_address separately when distinct, and also populate generic address with the operating premises address.
4. VALIDITY PERIOD & DATES:
   - Extract period_of_validity_start and period_of_validity_end strictly formatted as "YYYY-MM-DD", while keeping generic issue_date and expiry_date populated.
5. WATERMARKS / DEMO LABELS:
   - Completely ignore any background or header "DEMO", "SAMPLE", "FOR OCR TESTING ONLY" watermarks/banners. Focus strictly on official document data.
6. OUTPUT FORMAT:
   - Return ONLY a valid JSON object matching the schema below. No markdown fences, no conversational text.

Schema:
{
  "license_type": string or null (e.g. "FSSAI Food License", "Trade License", "Health Permit", "Employer Identification Number (EIN)"),
  "license_number": string or null (the full alphanumeric/numeric permit or license number),
  "issuing_authority": string or null (e.g. "Food Safety and Standards Authority of India / Chandigarh Administration", "IRS", "NYC DCWP"),
  "business_name": string or null (legal or registered trade name of business),
  "owner_name": string or null (proprietor/owner name, in English or transliterated),
  "address": string or null (generic or primary operating address),
  "registered_office_address": string or null (registered office address of licensee),
  "authorized_premises_address": string or null (address of authorized premises),
  "kind_of_business": string or null (e.g. "Restaurants", "Food Truck", "Retail"),
  "license_category": string or null (e.g. "Basic", "State", "Central"),
  "category_of_license": string or null (e.g. "State", "Central", "Registration"),
  "issue_date": string or null (strictly formatted as "YYYY-MM-DD"),
  "expiry_date": string or null (strictly formatted as "YYYY-MM-DD"),
  "period_of_validity_start": string or null (strictly formatted as "YYYY-MM-DD"),
  "period_of_validity_end": string or null (strictly formatted as "YYYY-MM-DD"),
  "license_fee_paid": string or number or null (e.g. "Rs.6000" or 6000),
  "confidence": integer (0 to 100 based on legibility and completeness)
}`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    let parts = []

    if (imageBase64) {
      // Clean base64 string if it has data URL prefix
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '')
      parts = [
        { text: `${systemPrompt}\n\nExtract all license data directly from this document image.` },
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'image/jpeg'
          }
        }
      ]
    } else {
      parts = [
        { text: `${systemPrompt}\n\nOCR Text:\n${ocrText.slice(0, 4000)}` }
      ]
    }

    const parsed = await generateWithModelCascade(genAI, parts)

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(100, Math.max(0, parsed.confidence))
      : 85

    const normalized = {
      // Common & US-shaped fields
      license_type: parsed.license_type || null,
      license_number: parsed.license_number || null,
      issuing_authority: parsed.issuing_authority || null,
      business_name: parsed.business_name || null,
      owner_name: parsed.owner_name || null,
      address: parsed.address || parsed.authorized_premises_address || parsed.registered_office_address || null,
      issue_date: parsed.issue_date || parsed.period_of_validity_start || null,
      expiry_date: parsed.expiry_date || parsed.period_of_validity_end || null,

      // India-centric additive fields
      license_category: parsed.license_category || parsed.category_of_license || null,
      kind_of_business: parsed.kind_of_business || null,
      registered_office_address: parsed.registered_office_address || null,
      authorized_premises_address: parsed.authorized_premises_address || null,
      license_fee_paid: parsed.license_fee_paid || null,
      period_of_validity_start: parsed.period_of_validity_start || parsed.issue_date || null,
      period_of_validity_end: parsed.period_of_validity_end || parsed.expiry_date || null,

      confidence
    }

    return res.status(200).json({ data: normalized, confidence, error: null, catalogNames })
  } catch (err) {
    console.error('[/api/ai/extract]', err)
    return res.status(500).json({
      data: null,
      confidence: 0,
      error: err.message || 'AI vision extraction unavailable — please enter details manually',
    })
  }
}

