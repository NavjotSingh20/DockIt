/**
 * /api/ai/chat.js
 * Vercel Serverless Function — Streaming chatbot via Gemini + SSE.
 * POST body: { message: string, businessContext: object, chatHistory: Array }
 * Response:  text/event-stream — sends "data: <chunk>\n\n" per token, ends with "data: [DONE]\n\n"
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

const SYSTEM_INSTRUCTION_BASE = `You are DockIt's Evidence-First Compliance Assistant for small business owners.
You specialize in government licenses, statutory compliance, statutory fees, renewal procedures, and legal penalties.

EVIDENCE-FIRST CITATION RULE (MANDATORY):
Every compliance-related statement, requirement recommendation, or status answer MUST explicitly cite the specific matched requirement's official evidence fields inline:
- Authority: [issuing_agency]
- Source: [source_url as clickable markdown link [URL](url) or clean domain]
- Last verified: [last_verified_date]

Example format for compliance statements:
"Yes, as a [Business Type] operating in [City], you are required to hold a [Requirement Name].
- Authority: Municipal Corporation of Delhi (MCD)
- Source: [mcdonline.nic.in](https://mcdonline.nic.in)
- Last verified: 2026-02-15"

Never provide generic unsourced advice when business requirements catalog data is provided. Always ground answers directly in the verified catalog evidence rows.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, businessContext, chatHistory = [] } = req.body || {}

  if (!message) return res.status(400).json({ error: 'message is required' })
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key not configured' })

  const country = businessContext?.country || 'USA';
  const currencySymbol = country === 'India' ? 'INR (₹)' : 'USD ($)';

  const systemInstruction = `${SYSTEM_INSTRUCTION_BASE} — specifically for ${country === 'India' ? 'India' : 'the USA'} (operating jurisdictions: ${Array.isArray(businessContext?.cities) ? businessContext.cities.join(', ') : businessContext?.city || 'All'}).

Core rules:
- Always cite Authority (issuing_agency), Official Source (source_url), and Last Verified Date (last_verified_date) for every requirement discussed
- Always use ${currencySymbol} for money and fee amounts
- Be concise, direct, and action-oriented
- If asked about penalties, cite specific statutory slabs or municipal bye-laws
- If you don't know something or evidence is not in catalog, say so honestly — do not hallucinate statutory rules
- Keep responses clean with bullet points and clear markdown links`;

  // Build context-aware system prompt
  const systemPrompt = businessContext
    ? `${systemInstruction}\n\nCurrent business context:\n${JSON.stringify(businessContext, null, 2)}`
    : systemInstruction

  // Build Gemini conversation history (max last 10 messages)
  const recentHistory = chatHistory.slice(-10)
  const contents = [
    // Inject system instruction as first user/model pair
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: `Understood. I am DockIt assistant, ready to help with business compliance for ${country === 'India' ? 'India' : 'the USA'}.` }] },
    // Previous conversation
    ...recentHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    })),
    // Current message
    { role: 'user', parts: [{ text: message }] },
  ]

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    const streamResult = await model.generateContentStream({ contents })

    for await (const chunk of streamResult.stream) {
      const text = chunk.text()
      if (text) {
        // Escape newlines in SSE data field
        const escaped = text.replace(/\n/g, '\\n')
        res.write(`data: ${escaped}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('[/api/ai/chat]', err)
    res.write(`data: Sorry, I'm temporarily unavailable. Please try again in a moment.\\n\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
}
