/**
 * geminiService.js
 *
 * NOTE: All Gemini calls have been moved to serverless routes to prevent
 * the API key from being bundled into the client-side JS.
 *
 *   - extractLicenseFromText  → POST /api/ai/extract  (used by ScanModal.jsx)
 *   - generateFormPrefill     → POST /api/ai/prefill  (used by RenewalForm.jsx)
 *   - chatWithAI              → POST /api/ai/chat     (used by ChatBot.jsx via SSE)
 *
 * This file is kept as a placeholder so no import paths break during the
 * transition — it exports nothing and initialises no Gemini client.
 */
