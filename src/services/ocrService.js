/**
 * ocrService.js
 * In-browser OCR using Tesseract.js.
 * No server call — runs entirely in the browser via Web Workers.
 */
import Tesseract from 'tesseract.js'

/**
 * Convert a File object to a base64 data URL for preview display.
 * @param {File} file
 * @returns {Promise<{ preview: string, file: File }>}
 */
export function preprocessImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve({ preview: e.target.result, file })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Run Tesseract OCR on an image file.
 * @param {File} imageFile
 * @param {function(number): void} onProgress - called with 0–100 progress
 * @returns {Promise<{ text: string, confidence: number, error: string|null }>}
 */
export async function extractTextFromImage(imageFile, onProgress = () => {}) {
  try {
    const result = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100))
        }
      },
    })

    const { data } = result
    const text = data.text?.trim() || ''
    const confidence = Math.round(data.confidence || 0)

    if (!text) {
      return { text: '', confidence: 0, error: 'No text detected — try a clearer image' }
    }

    return { text, confidence, error: null }
  } catch (err) {
    return {
      text: '',
      confidence: 0,
      error: err.message || 'OCR failed — please enter license details manually',
    }
  }
}

/**
 * Validate that an uploaded file is a supported type and under size limit.
 * @param {File} file
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateFile(file) {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const MAX_SIZE_MB = 10

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Unsupported file type. Please upload JPG, PNG, WebP, or PDF.' }
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_SIZE_MB}MB.` }
  }
  return { valid: true, error: null }
}
