/**
 * src/services/copilotService.js
 * Client communication service for the Compliance Copilot
 */
import { DEMO_PROFILES } from '../utils/demoData';

export async function sendCopilotMessage({ message, profileId, businessId, business, requirements, authHeader, chatHistory = [] }) {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        message,
        profileId,
        businessId,
        business,
        requirements,
        chatHistory: chatHistory.slice(-6).map(m => ({ role: m.role, content: m.content || m.text })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
    throw new Error(`Server returned ${res.status}`);
  } catch (err) {
    console.warn('[copilotService] /api/ai/chat fetch error, falling back:', err.message);
    throw err;
  }
}

