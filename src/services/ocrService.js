import Tesseract from 'tesseract.js';

export async function extractTextFromImage(file, onProgress) {
  try {
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.(Math.round(m.progress * 100));
        }
      },
    });
    return { text: result.data.text, confidence: Math.round(result.data.confidence), error: null };
  } catch (err) {
    return { text: '', confidence: 0, error: err.message };
  }
}

export async function preprocessImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ preview: e.target.result, file });
    reader.readAsDataURL(file);
  });
}
