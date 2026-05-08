/**
 * geminiService.js
 * Client-side wrappers that call our own /api/* Vercel routes.
 * Gemini API key stays server-side — never exposed to browser.
 */

const API_BASE = '/api'

// ─────────────────────────────────────────────────────────
// OCR TEXT → LICENSE JSON
// ─────────────────────────────────────────────────────────

/**
 * Send raw OCR text to /api/ai/extract and get structured license data back.
 * @param {string} ocrText - raw text from Tesseract
 * @returns {{ data: object, confidence: number, error: string|null }}
 */
export async function extractLicenseFromText(ocrText) {
  try {
    const res = await fetch(`${API_BASE}/ai/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ocrText }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { data: null, confidence: 0, error: err.error || `Server error ${res.status}` }
    }
    return await res.json()
  } catch (err) {
    return { data: null, confidence: 0, error: err.message }
  }
}

// ─────────────────────────────────────────────────────────
// RENEWAL FORM PRE-FILL
// ─────────────────────────────────────────────────────────

/**
 * Ask Gemini to pre-fill a renewal form given business profile + license type.
 * @param {object} businessProfile
 * @param {string} licenseType - e.g. 'FSSAI'
 * @returns {{ formFields, documentChecklist, renewalInstructions, estimatedTime, estimatedCost, error }}
 */
export async function generateFormPrefill(businessProfile, licenseType) {
  try {
    const res = await fetch(`${API_BASE}/ai/prefill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessProfile, licenseType }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { data: null, error: err.error || `Server error ${res.status}` }
    }
    return await res.json()
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// ─────────────────────────────────────────────────────────
// STREAMING CHATBOT
// ─────────────────────────────────────────────────────────

/**
 * Stream a chat response from /api/ai/chat using Server-Sent Events.
 * Calls onChunk(text) for each streamed token.
 * Calls onDone() when the stream finishes.
 * Calls onError(err) on failure.
 *
 * @param {string} message
 * @param {object} businessContext
 * @param {Array<{role:'user'|'model', text:string}>} chatHistory
 * @param {{ onChunk, onDone, onError }} callbacks
 */
export async function chatWithAI(message, businessContext, chatHistory, { onChunk, onDone, onError }) {
  try {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, businessContext, chatHistory }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      onError(err.error || `Server error ${res.status}`)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      // Parse SSE lines: "data: <text>\n\n"
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const text = line.slice(6)
          if (text === '[DONE]') { onDone(); return }
          onChunk(text)
        }
      }
    }
    onDone()
  } catch (err) {
    onError(err.message)
  }
}
