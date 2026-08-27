/**
 * /api/ai/chat.js
 * Vercel Serverless Function — Streaming chatbot via Gemini + SSE.
 * POST body: { message: string, businessContext: object, chatHistory: Array }
 * Response:  text/event-stream — sends "data: <chunk>\n\n" per token, ends with "data: [DONE]\n\n"
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

const SYSTEM_INSTRUCTION_BASE = `You are DockIt's helpful assistant for small business owners.
You specialize in business compliance, government licenses, penalties, and renewal procedures.`;

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

  const systemInstruction = `${SYSTEM_INSTRUCTION_BASE} — specifically for ${country === 'India' ? 'India' : 'the USA'} (and the city/state in the business context).

Core rules:
- Always use ${currencySymbol} for money amounts
- Be concise, practical, and action-oriented
- Cite specific laws, regulations, or ordinances when discussing penalties
- Give exact portal URLs when relevant
- If asked about specific penalties, give exact amounts from the relevant local/state regulations
- If you don't know something, say so honestly — don't guess
- Use bullet points for lists of steps or documents
- Keep responses under 200 words unless the user explicitly asks for detail`;

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
