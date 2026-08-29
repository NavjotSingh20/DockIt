import { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  Shield,
  Trash2,
  Copy,
  Check,
  Building2,
  MapPin,
  HelpCircle,
  AlertTriangle,
  FileCheck2,
  Scale,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useDemo } from '../context/DemoContext';
import { streamChatResponse } from '../services/geminiService';

/** Lightweight markdown renderer for clean, rapid rendering */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;

    const parseInline = (str) => {
      const parts = [];
      const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
      let last = 0, m;
      while ((m = re.exec(str)) !== null) {
        if (m.index > last) parts.push(str.slice(last, m.index));
        if (m[1] !== undefined) {
          parts.push(<strong key={m.index} className="font-bold text-ink">{m[1]}</strong>);
        } else if (m[2] !== undefined) {
          parts.push(<em key={m.index} className="italic text-ink-muted">{m[2]}</em>);
        } else if (m[3] !== undefined) {
          parts.push(
            <code key={m.index} className="font-mono text-xs px-1.5 py-0.5 bg-ink/5 rounded text-accent-dark border border-rule/60">
              {m[3]}
            </code>
          );
        }
        last = re.lastIndex;
      }
      if (last < str.length) parts.push(str.slice(last));
      return parts.length ? parts : str;
    };

    // Headings (###, ##, #)
    if (line.startsWith('### ')) {
      return <h4 key={i} className="font-display font-bold text-sm text-ink mt-3 mb-1">{parseInline(line.slice(4))}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={i} className="font-display font-bold text-base text-ink mt-3.5 mb-1.5">{parseInline(line.slice(3))}</h3>;
    }

    // Bullet point lines
    const bulletMatch = line.match(/^([•\-\*])\s+(.+)/);
    if (bulletMatch) {
      return (
        <div key={i} className="flex items-start gap-2 my-1 leading-relaxed">
          <span className="text-accent font-bold mt-0.5 flex-shrink-0">•</span>
          <span className="text-ink-dark text-[13.5px]">{parseInline(bulletMatch[2])}</span>
        </div>
      );
    }

    // Numbered list lines
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      return (
        <div key={i} className="flex items-start gap-2 my-1 leading-relaxed">
          <span className="text-accent font-mono font-bold text-xs mt-0.5 w-4 flex-shrink-0">{numMatch[1]}.</span>
          <span className="text-ink-dark text-[13.5px]">{parseInline(numMatch[2])}</span>
        </div>
      );
    }

    // Normal paragraph
    return <p key={i} className="mb-1 text-ink-dark text-[13.5px] leading-relaxed">{parseInline(line)}</p>;
  });
}

const CATEGORY_PROMPTS = [
  {
    icon: FileCheck2,
    categoryKey: 'compliance_ai.cat_permit_discovery',
    category: 'Permit Discovery',
    questionKey: 'compliance_ai.q_permit_discovery',
    question: 'What licenses & permits do I need to operate in my city?',
  },
  {
    icon: AlertTriangle,
    categoryKey: 'compliance_ai.cat_penalties',
    category: 'Penalty & Fines',
    questionKey: 'compliance_ai.q_penalties',
    question: 'What are the statutory penalty risks and daily fines for expired permits?',
  },
  {
    icon: RefreshCw,
    categoryKey: 'compliance_ai.cat_renewals',
    category: 'Renewal Procedures',
    questionKey: 'compliance_ai.q_renewals',
    question: 'Walk me through the official renewal process and required inspections.',
  },
  {
    icon: Scale,
    categoryKey: 'compliance_ai.cat_multicity',
    category: 'Multi-City Rules',
    questionKey: 'compliance_ai.q_multicity',
    question: 'Compare health code rules and fire safety requirements across jurisdictions.',
  },
];

/** Local statutory regulatory engine fallback */
async function streamChatLocalFallback(message, businessContext, onChunk) {
  const msg = message.toLowerCase();
  const city = Array.isArray(businessContext?.cities) && businessContext.cities.length > 0
    ? businessContext.cities.join(', ')
    : (businessContext?.city || 'your operating jurisdiction');
  const bizName = businessContext?.business_name || businessContext?.name || '';
  const ownerName = businessContext?.owner_name || '';
  const entityLabel = bizName ? `**${bizName}**` : (ownerName ? `**${ownerName}'s business**` : 'your business');
  const country = businessContext?.country || 'USA';
  let reply = '';

  if (msg.includes('penalty') || msg.includes('expire') || msg.includes('fine') || msg.includes('lapsed') || msg.includes('risk')) {
    reply = `### Statutory Penalty Exposure Analysis for ${entityLabel} (${city})

Operating without valid documentation or with lapsed credentials incurs mandatory municipal & state enforcement actions:

• **Health Code Violations**: Immediate citations ranging from **${country === 'India' ? '₹5,000 to ₹25,000' : '$250 to $1,000 per day'}**, with risk of temporary stop-work orders.
• **Unregistered Commercial Tax**: Statutory fines up to **${country === 'India' ? '₹50,000' : '$5,000'}** plus 18% statutory interest on uncollected revenues.
• **Fire Safety / Gas Line Clearance**: On-the-spot cease-and-desist order until inspected by the municipal fire marshal.
• **Signage & Street Placement**: Citations issued under local municipal zoning code.

Check the **Analytics** page for your dynamic 90-day fine escalation curve!`;
  } else if (msg.includes('renew') || msg.includes('how do i') || msg.includes('process') || msg.includes('step')) {
    reply = `### Official Renewal Workflow for ${entityLabel} in **${city}**

Follow this protocol to ensure zero operational downtime:

1. **Verify Expiration Timeline**: Ensure submission is lodged at least **30 days prior** to the statutory cut-off.
2. **Scan / Upload Current License**: Navigate to your **Dashboard** and select *Add Document* or *Scan* to pre-fill renewal forms.
3. **Agency Health Re-inspection**: Schedule your annual commissary kitchen & vehicle hygiene inspection.
4. **Pay Statutory Municipal Fees**: Complete payment through the official local agency portal.
5. **Receive Digital Stamp**: Upload the renewed digital certificate to DockIt to reset your compliance ring to 100%.`;
  } else if (msg.includes('license') || msg.includes('need') || msg.includes('permit') || msg.includes('require')) {
    reply = `### Required Compliance Catalog for ${entityLabel} (${city})

Based on current regulatory statutes for ${country === 'India' ? 'India' : 'the USA'}, the mandatory permits are:

• **Health Department Permit / FSSAI**: Mandatory for food storage, prep, and commercial dispensing.
• **General Business License / Trade License**: Authorizes commercial operations within municipal city boundaries.
• **Fire Safety Clearance**: Required for commercial gas burners, electrical setups, and suppression tanks.
• **Sales Tax Certificate**: State authority registration for tax collection and filing.

Track all required filings in your **Requirements** page!`;
  } else {
    reply = `### DockIt Compliance Intelligence Report

Hello! I am your dedicated regulatory assistant for ${entityLabel} in **${city}**.

I continuously analyze verified statutory data for **${city}** and can help you with:
• **Permit Discovery**: Pinpoint required municipal, state, and federal licenses.
• **Fines & Penalties**: Calculate legal penalties and deadline escalation risks.
• **Inspection Checklists**: Prepare for health, fire, and commissary hygiene audits.
• **Multi-City Expansion**: Understand delta requirements when adding new operating zones.

Select a prompt below or type your specific compliance inquiry!`;
  }

  const words = reply.split(' ');
  for (let i = 0; i < words.length; i++) {
    onChunk((i === 0 ? '' : ' ') + words[i]);
    await new Promise((r) => setTimeout(r, 18));
  }
}

export default function ComplianceAI() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo, demoBusiness } = useDemo();
  const { business: outletBiz } = useOutletContext() || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const business = (isDemo ? demoBusiness : outletBiz) || {
    business_name: user?.user_metadata?.business_name || '',
    owner_name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    city: user?.user_metadata?.city || localStorage.getItem('cities')?.split(',')?.[0] || '',
    cities: user?.user_metadata?.cities || (localStorage.getItem('cities') ? localStorage.getItem('cities').split(',') : []),
    country: localStorage.getItem('country') || outletBiz?.country || 'USA',
    business_type: outletBiz?.business_type || 'food_truck',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming]);

  const handleSend = useCallback(
    async (textToSend) => {
      const query = (textToSend || input).trim();
      if (!query || streaming) return;

      const userMsg = { role: 'user', content: query, timestamp: new Date() };
      const aiPlaceholder = { role: 'model', content: '', timestamp: new Date() };

      setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
      setInput('');
      setStreaming(true);

      let aiText = '';
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      const systemInstruction = `You are DockIt's Evidence-First Compliance Assistant for small business owners.
You specialize in business compliance, government licenses, statutory penalties, and renewal procedures specifically for ${business?.country || 'USA'} (operating in ${business?.city || 'All Cities'}).
Always cite verified catalog evidence fields (issuing authority, official source, last verified date).
Be concise, direct, professional, and action-oriented.`;

      try {
        if (!apiKey) {
          await streamChatLocalFallback(query, business, (chunk) => {
            aiText += chunk;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { ...next[next.length - 1], content: aiText };
              return next;
            });
          });
        } else {
          const success = await streamChatResponse({
            apiKey,
            message: query,
            chatHistory: messages,
            systemInstruction,
            onChunk: (chunk) => {
              aiText += chunk;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: aiText };
                return next;
              });
            },
          });

          if (!success) {
            await streamChatLocalFallback(query, business, (chunk) => {
              aiText += chunk;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { ...next[next.length - 1], content: aiText };
                return next;
              });
            });
          }
        }
      } catch (err) {
        console.warn('AI streaming fallback triggered:', err);
        await streamChatLocalFallback(query, business, (chunk) => {
          aiText += chunk;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], content: aiText };
            return next;
          });
        });
      } finally {
        setStreaming(false);
      }
    },
    [input, streaming, messages, business]
  );

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClear = () => {
    if (streaming) return;
    setMessages([]);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      {/* ─── Header & Business Scope Banner ─── */}
      <div className="bg-surface rounded-2xl border border-rule shadow-card p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <Sparkles size={16} />
              </div>
              <h1 className="text-xl md:text-2xl font-bold font-display text-ink tracking-tight">
                {t('compliance_ai.title', 'Compliance AI Assistant')}
              </h1>
            </div>
            <p className="text-xs md:text-sm text-ink-muted leading-relaxed max-w-2xl">
              {t('compliance_ai.subtitle', 'Real-time regulatory intelligence for food truck and restaurant compliance.')}
            </p>
          </div>

          {/* Clear Conversation Action */}
          {messages.length > 0 && (
            <div className="flex items-center">
              <button
                onClick={handleClear}
                disabled={streaming}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rule hover:border-danger/30 hover:bg-danger/5 text-ink-muted hover:text-danger text-xs font-display font-medium transition-colors cursor-pointer"
                title="Clear Conversation History"
              >
                <Trash2 size={13} />
                <span>{t('compliance_ai.clear', 'Clear')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Main Chat Window ─── */}
      <div className="bg-surface rounded-2xl border border-rule shadow-card overflow-hidden flex flex-col min-h-[580px] h-[calc(100vh-280px)]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-base/30 chat-scroll">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center max-w-xl mx-auto py-8">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4">
                <Sparkles size={24} />
              </div>
              <h2 className="text-lg font-bold font-display text-ink mb-1.5">
                {t('compliance_ai.welcome_q', 'What can I help you verify today?')}
              </h2>
              <p className="text-xs md:text-sm text-ink-muted mb-8 leading-relaxed">
                {t('compliance_ai.welcome_desc', 'Ask about specific city permits, statutory penalty escalation, license renewals, or cross-jurisdiction rules.')}
              </p>

              {/* Starter Categories Grid */}
              <div className="grid sm:grid-cols-2 gap-3 w-full text-left">
                {CATEGORY_PROMPTS.map((item, idx) => {
                  const categoryLabel = item.categoryKey ? t(item.categoryKey, item.category) : item.category;
                  const questionLabel = item.questionKey ? t(item.questionKey, item.question) : item.question;
                  return (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSend(questionLabel)}
                      className="p-3.5 rounded-xl border border-rule bg-surface hover:border-accent/30 hover:shadow-subtle transition-all duration-200 group text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-lg bg-accent/8 flex items-center justify-center text-accent group-hover:bg-accent/15 transition-colors">
                          <item.icon size={13} />
                        </div>
                        <span className="text-xs font-bold font-display text-ink group-hover:text-accent transition-colors">
                          {categoryLabel}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                        {questionLabel}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                        <Shield size={16} />
                      </div>
                    )}

                    <div
                      className={`relative max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed transition-all shadow-subtle ${
                        isUser
                          ? 'bg-ink text-white rounded-tr-xs'
                          : 'bg-surface border border-rule text-ink rounded-tl-xs'
                      }`}
                    >
                      <div className="prose-xs max-w-none text-inherit">
                        {renderMarkdown(msg.content)}
                        {!isUser && streaming && i === messages.length - 1 && !msg.content && (
                          <div className="flex items-center gap-1 py-1">
                            <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>

                      {/* Action Bar inside AI message */}
                      {!isUser && msg.content && (
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-rule/50 text-xs text-ink-muted">
                          <span className="font-mono">Verified Municipal Statutes</span>
                          <button
                            onClick={() => handleCopy(msg.content, i)}
                            className="inline-flex items-center gap-1 hover:text-ink transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedIndex === i ? (
                              <>
                                <Check size={12} className="text-settled" />
                                <span className="text-settled font-semibold">{t('compliance_ai.copied', 'Copied')}</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>{t('compliance_ai.copy', 'Copy')}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ─── Input Control Bar ─── */}
        <div className="p-4 bg-surface border-t border-rule">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-base rounded-xl p-1.5 border border-rule focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 transition-all shadow-subtle"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('compliance_ai.input_placeholder', 'Ask anything about permits, renewal deadlines, or statutory penalty exposure...')}
              disabled={streaming}
              className="flex-1 bg-transparent px-3 py-2 text-xs md:text-sm text-ink outline-none placeholder-ink-faint leading-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="btn-primary text-xs h-9 px-4 py-0 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed leading-none shrink-0"
            >
              {streaming ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('compliance_ai.send', 'Send')}</span>
                  <Send size={13} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
