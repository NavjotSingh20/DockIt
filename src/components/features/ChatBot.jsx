import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Shield, Minus, Sparkles } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { streamChatResponse } from '../../services/geminiService';

/** Lightweight markdown renderer — no external lib needed */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Blank line spacer
    if (!line.trim()) return <div key={i} className="h-1" />;

    // Parse inline **bold** and *italic* within a line
    const parseInline = (str) => {
      const parts = [];
      const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
      let last = 0, m;
      while ((m = re.exec(str)) !== null) {
        if (m.index > last) parts.push(str.slice(last, m.index));
        if (m[1] !== undefined) parts.push(<strong key={m.index} className="font-bold text-ink">{m[1]}</strong>);
        else if (m[2] !== undefined) parts.push(<em key={m.index} className="italic text-ink-muted">{m[2]}</em>);
        last = re.lastIndex;
      }
      if (last < str.length) parts.push(str.slice(last));
      return parts.length ? parts : str;
    };

    // Bullet point lines (•, -, *)
    const bulletMatch = line.match(/^([•\-\*])\s+(.+)/);
    if (bulletMatch) {
      return (
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="text-accent font-bold mt-0.5 flex-shrink-0">•</span>
          <span>{parseInline(bulletMatch[2])}</span>
        </div>
      );
    }

    // Numbered list lines
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      return (
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className="text-accent font-bold text-xs mt-0.5 w-4 flex-shrink-0">{numMatch[1]}.</span>
          <span>{parseInline(numMatch[2])}</span>
        </div>
      );
    }

    // Normal paragraph
    return <p key={i} className="mb-0.5">{parseInline(line)}</p>;
  });
}

const SUGGESTED = [
  'What licenses do I need for my business?',
  'What happens if my permit expires?',
  'How do I renew a license?',
  'What is my total penalty exposure today?',
];

/** Smart local compliance knowledge engine when API key is missing or endpoint is unreachable */
async function streamChatLocalFallback(message, businessContext, onChunk) {
  const msg = message.toLowerCase();
  const city = businessContext?.city || businessContext?.cities?.[0] || 'your city';
  const biz = businessContext?.business_name || 'your business';
  let reply = '';

  // Check more-specific intents FIRST before broad catch-alls
  if (msg.includes('penalty') || msg.includes('expire') || msg.includes('fine') || msg.includes('lapsed') || msg.includes('what happens')) {
    reply = `Operating with expired licenses in **${city}** carries serious penalty risks:

• **Health Code Violations**: Fines range from **$250 to $1,000 per day**, and potential temporary closure order.
• **Unregistered Sales Tax**: Statutory fines up to **$5,000** plus interest on uncollected tax revenue.
• **Fire Code Failure**: Immediate order to cease cooking operations until compliant.

Check the **Analytics** page for your estimated penalty exposure breakdown!`;
  } else if (msg.includes('renew') || msg.includes('how do i') || msg.includes('how to')) {
    reply = `Here is the step-by-step renewal process for **${city}**:

1. Click the **Camera icon** at the bottom right to scan your current permit.
2. DockIt AI automatically extracts your license number and expiry date.
3. Review pre-filled fields and click **Submit Renewal Application**.
4. DockIt routes your application to the official municipal agency portal for **${city}**.`;
  } else if (msg.includes('license') || msg.includes('need') || msg.includes('permit') || msg.includes('what') || msg.includes('require')) {
    reply = `Based on DockIt's regulatory database for **${city}**, here are the key requirements for **${biz}**:

• **Health Department Permit**: Mandated for food preparation, storage, and handling. Requires on-site inspection.
• **Sales Tax Certificate**: Required by state tax authorities before conducting commercial sales.
• **Fire Safety Clearance**: Mandatory for commercial cooking equipment, gas lines, and emergency exits.
• **General Business License / BTRC**: Required by municipal authority for operation.

You can track all these requirements in the **Requirements** tab!`;
  } else {
    reply = `Hello! I am DockIt's Compliance Assistant. I monitor government rules, renewal deadlines, and penalty risks for **${biz}** in **${city}**.

How can I help you today?
• Ask: *"What licenses do I need?"*
• Ask: *"What are the penalty risks for expired permits?"*
• Ask: *"How do I renew my food health permit?"*`;
  }

  // Simulate smooth streaming output
  const words = reply.split(' ');
  for (let i = 0; i < words.length; i++) {
    onChunk((i === 0 ? '' : ' ') + words[i]);
    await new Promise(r => setTimeout(r, 20));
  }
}

async function streamChatClient(message, chatHistory, businessContext, onChunk) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    await streamChatLocalFallback(message, businessContext, onChunk);
    return;
  }

  try {
    const country = businessContext?.country || 'USA';
    const currencySymbol = country === 'India' ? 'INR (₹)' : 'USD ($)';
    const systemInstruction = `You are DockIt's Evidence-First Compliance Assistant for small business owners.
You specialize in business compliance, government licenses, statutory penalties, and renewal procedures specifically for ${country === 'India' ? 'India' : 'the USA'} (operating in ${Array.isArray(businessContext?.cities) ? businessContext.cities.join(', ') : businessContext?.city || 'All'}).
Every compliance statement or requirement recommendation must explicitly cite:
- Always cite verified catalog evidence fields (issuing authority, official source, last verified date)
- Be concise, direct, and action-oriented
- Keep responses under 200 words unless the user explicitly asks for detail.`;

    const success = await streamChatResponse({
      apiKey,
      systemInstruction,
      onChunk,
    });

    if (!success) {
      await streamChatLocalFallback(message, businessContext, onChunk);
    }
  } catch (err) {
    console.warn('Gemini streaming error across cascade, using local fallback:', err);
    await streamChatLocalFallback(message, businessContext, onChunk);
  }
}

async function streamChat(message, businessContext, chatHistory, onChunk) {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        businessContext,
        chatHistory: chatHistory.map(m => ({ role: m.role, text: m.content })),
      }),
    });

    if (!res.ok) {
      await streamChatClient(message, businessContext, chatHistory, onChunk);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedData = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') return;
        const text = payload.replace(/\\n/g, '\n');
        if (text) {
          receivedData = true;
          onChunk(text);
        }
      }
    }

    if (!receivedData) {
      await streamChatClient(message, businessContext, chatHistory, onChunk);
    }
  } catch (err) {
    await streamChatClient(message, businessContext, chatHistory, onChunk);
  }
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('dockit_floating_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(m => m.content);
      }
    } catch (e) {}
    return [];
  });
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [unread, setUnread] = useState(false);
  const { demoBusiness, isDemo } = useDemo();

  useEffect(() => {
    try {
      const valid = messages.filter(m => m.content);
      if (valid.length > 0) {
        localStorage.setItem('dockit_floating_chat_history', JSON.stringify(valid));
      } else {
        localStorage.removeItem('dockit_floating_chat_history');
      }
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      setUnread(false);
    };
    window.addEventListener('dockit:open-chat', handleOpen);
    return () => window.removeEventListener('dockit:open-chat', handleOpen);
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || streaming) return;
    setUnread(false);
    const userMsg = { role: 'user', content: text };
    const aiPlaceholder = { role: 'model', content: '' };
    setMessages(prev => [...prev, userMsg, aiPlaceholder]);
    setInput('');
    setStreaming(true);

    let aiText = '';
    try {
      await streamChat(text, isDemo ? demoBusiness : null, messages, (chunk) => {
        aiText += chunk;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'model', content: aiText };
          return next;
        });
      });
    } catch (err) {
      await streamChatLocalFallback(text, isDemo ? demoBusiness : null, (chunk) => {
        aiText += chunk;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'model', content: aiText };
          return next;
        });
      });
    }
    setStreaming(false);
  }, [streaming, messages, isDemo, demoBusiness]);

  return (
    <>
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40">
        <AnimatePresence>
          {!open && (
            <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => { setOpen(true); setUnread(false); }}
              className="relative w-14 h-14 bg-accent rounded-full shadow-xl flex items-center justify-center text-white">
              <MessageCircle size={24} />
              {unread && <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-white text-[9px] flex items-center justify-center font-bold">1</span>}
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2 }}
              className="absolute bottom-0 right-0 w-[360px] max-w-[95vw] bg-surface rounded-3xl shadow-2xl border border-rule overflow-hidden flex flex-col"
              style={{ height: 500 }}>

              <div className="bg-ink px-5 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
                    <Shield size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm font-display">DockIt Assistant</div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-400 rounded-full" /><span className="text-ink-faint text-xs">Online</span></div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setOpen(false)} className="p-1.5 text-ink-faint hover:text-white rounded-lg"><Minus size={16} /></button>
                  <button onClick={() => setOpen(false)} className="p-1.5 text-ink-faint hover:text-white rounded-lg"><X size={16} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scroll bg-base/40">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-ink-muted py-4">Ask me anything about business compliance!</p>
                    {SUGGESTED.map((q, i) => (
                      <button key={i} onClick={() => sendMessage(q)}
                        className="w-full text-left text-sm text-accent bg-accent-light hover:bg-accent-light/80 rounded-xl px-4 py-2.5 transition-colors border border-rule font-medium">{q}</button>
                    ))}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                    {msg.role === 'model' && <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5"><Shield size={13} className="text-white" /></div>}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-accent text-white rounded-tr-sm'
                        : 'bg-surface text-ink border border-rule shadow-sm rounded-tl-sm'
                    }`}>
                      {msg.content
                        ? (msg.role === 'model'
                            ? <div className="space-y-0.5 text-sm">{renderMarkdown(msg.content)}</div>
                            : msg.content)
                        : (streaming && i === messages.length - 1
                          ? <span className="flex gap-1 items-center h-4"><span className="w-1.5 h-1.5 bg-ink-faint rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 bg-ink-faint rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-ink-faint rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></span>
                          : null)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-surface border-t border-rule flex-shrink-0">
                <div className="flex gap-2 items-center bg-base/50 rounded-2xl px-4 py-2.5 border border-rule focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-light transition-all">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                    onClick={e => e.target.focus()}
                    autoComplete="off"
                    placeholder="Ask about licenses, penalties..." className="flex-1 bg-transparent text-sm outline-none placeholder-ink-faint text-ink" />
                  <button onClick={() => sendMessage(input)} disabled={!input.trim() || streaming}
                    className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:bg-accent-dark transition-colors flex-shrink-0">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
