import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Shield, Minus } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';

const SUGGESTED = [
  'What licenses do I need for my business?',
  'What happens if my permit expires?',
  'How do I renew a license?',
  'What is my total penalty exposure today?',
];

/**
 * Stream from /api/ai/chat via SSE fetch.
 * The server sends: `data: <escaped_chunk>\n\n` per token, `data: [DONE]\n\n` at end.
 * Newlines inside chunks are escaped as \\n by the server — we unescape them here.
 */
async function streamChat(message, businessContext, chatHistory, onChunk) {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      businessContext,
      // Server expects { role: 'user'|'model', text: string }
      chatHistory: chatHistory.map(m => ({ role: m.role, text: m.content })),
    }),
  });

  if (!res.ok) {
    onChunk('Sorry, the AI assistant is temporarily unavailable. Please try again.');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE lines from the buffer
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6); // strip "data: "
      if (payload === '[DONE]') return;
      // Server escapes newlines as \\n — restore them
      const text = payload.replace(/\\n/g, '\n');
      if (text) onChunk(text);
    }
  }
}

export default function ChatBot() {
  return null; // Temporarily disabled
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [unread, setUnread] = useState(true);
  const { demoBusiness, isDemo } = useDemo();

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
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'model', content: 'Sorry, something went wrong. Please try again.' };
        return next;
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
              className="relative w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full shadow-xl flex items-center justify-center text-white">
              <MessageCircle size={24} />
              {unread && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[9px] flex items-center justify-center font-bold">1</span>}
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2 }}
              className="absolute bottom-0 right-0 w-[360px] max-w-[95vw] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
              style={{ height: 500 }}>

              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                    <Shield size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">DockIt Assistant</div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-400 rounded-full" /><span className="text-blue-200 text-xs">Online</span></div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setOpen(false)} className="p-1.5 text-blue-200 hover:text-white rounded-lg"><Minus size={16} /></button>
                  <button onClick={() => setOpen(false)} className="p-1.5 text-blue-200 hover:text-white rounded-lg"><X size={16} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scroll bg-gray-50">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-gray-400 py-4">Ask me anything about business compliance!</p>
                    {SUGGESTED.map((q, i) => (
                      <button key={i} onClick={() => sendMessage(q)}
                        className="w-full text-left text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl px-4 py-2.5 transition-colors">{q}</button>
                    ))}
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                    {msg.role === 'model' && <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5"><Shield size={13} className="text-white" /></div>}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'}`}>
                      {msg.content || (streaming && i === messages.length - 1
                        ? <span className="flex gap-1 items-center h-4"><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></span>
                        : null)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                <div className="flex gap-2 items-center bg-gray-50 rounded-2xl px-4 py-2.5 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                    placeholder="Ask about licenses, penalties..." className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
                  <button onClick={() => sendMessage(input)} disabled={!input.trim() || streaming}
                    className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-700 transition-colors flex-shrink-0">
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
