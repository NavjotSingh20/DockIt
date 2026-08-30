/**
 * /api/ai/chat.js
 * Grounded Business-Aware Compliance Copilot
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  resolveBusinessContext,
  detectIntent,
  tools,
  generateGroundedResponse,
  validateCopilotResponse,
} from './copilotTools.js';

const VISION_MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

async function callGeminiCascade(genAI, systemInstruction, userPrompt) {
  let lastErr = null;
  for (const modelName of VISION_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        });

        const text = result?.response?.text();
        if (text) {
          const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
          return JSON.parse(cleaned);
        }
      } catch (err) {
        lastErr = err;
        const is429 = err.status === 429 || (err.message && (err.message.includes('429') || err.message.includes('quota')));
        if (is429 && attempt === 0) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        break;
      }
    }
  }
  throw lastErr || new Error('Gemini cascade exhausted');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, profileId, businessId, business, requirements, chatHistory = [] } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    // 1. Resolve Server-Side Trusted Business Context
    const authHeader = req.headers?.authorization || '';
    const context = await resolveBusinessContext({ profileId, businessId, authHeader, business, requirements });

    // 2. Intent Routing
    const intent = detectIntent(message);

    // 3. Fast Grounded Generation (Grounded In-Memory Verification Engine)
    const groundedResult = generateGroundedResponse(intent, context, message);

    // 4. If Gemini API Key is configured, enhance conversational tone while strictly preserving grounded evidence
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const systemInstruction = `You are DockIt's Business-Aware Compliance Copilot for ${context.business.name} in ${context.business.cities.join(', ')} (${context.business.country}).
You MUST return ONLY valid JSON matching this schema:
{
  "intent": "${intent}",
  "language": "${groundedResult.language}",
  "answer": "Concise, professional, helpful response directly answering the user query",
  "facts": [{"label": "string", "value": "string", "source": "string"}],
  "cards": [{"type": "requirement", "requirement_id": "string", "name": "string", "status": "string", "authority": "string", "fee": "string", "source_url": "string", "last_verified_at": "string"}],
  "actions": [{"type": "string", "requirement_id": "string", "label": "string"}]
}
STRICT EVIDENCE RULE:
Never invent requirements, fees, deadlines, or agencies. Ground all claims ONLY in the provided trusted business context:
${JSON.stringify({ business: context.business, compliance: context.compliance, requirements: context.requirements }, null, 2)}`;

        const geminiResponse = await callGeminiCascade(
          genAI,
          systemInstruction,
          `User Query: "${message}"\nVerified Baseline: ${JSON.stringify(groundedResult)}`
        );

        const validated = validateCopilotResponse(geminiResponse, context, intent);
        return res.status(200).json(validated);
      } catch (err) {
        console.warn('[/api/ai/chat] Gemini fallback to deterministic grounded engine:', err.status || err.message);
      }
    }

    // 5. Grounded Deterministic Output
    return res.status(200).json(groundedResult);
  } catch (err) {
    console.error('[/api/ai/chat handler error]:', err);
    return res.status(500).json({
      error: 'DockIt could not load your business compliance data right now.',
      details: err.message,
    });
  }
}
