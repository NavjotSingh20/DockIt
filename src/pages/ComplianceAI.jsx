import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
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
  ExternalLink,
  FileDown,
  Calendar,
  CreditCard,
  ScanLine,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useDemo } from '../context/DemoContext';
import { sendCopilotMessage } from '../services/copilotService';
import ScanModal from '../components/features/ScanModal';
import PaymentModal from '../components/features/PaymentModal';
import AutofillModal from '../components/features/AutofillModal';

/** Lightweight markdown renderer for clean, rapid rendering */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;

    const parseInline = (str) => {
      const parts = [];
      const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
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
        } else if (m[4] !== undefined && m[5] !== undefined) {
          parts.push(
            <a
              key={m.index}
              href={m[5]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline font-medium hover:text-accent-dark inline-flex items-center gap-0.5"
            >
              {m[4]}
              <ExternalLink size={10} className="inline ml-0.5" />
            </a>
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

export default function ComplianceAI() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemo, activeProfile, activeProfileId, demoBusiness, demoRequirements, demoBusinessRequirements } = useDemo();
  const { business: outletBiz } = useOutletContext() || {};

  // Storage key for persisting chat history across page switches
  const activeProfileKey = isDemo ? (activeProfile || activeProfileId || 'default') : null;
  const storageKey = useMemo(() => {
    if (isDemo) return `dockit_compliance_chat_demo_${activeProfileKey}`;
    return `dockit_compliance_chat_user_${user?.id || outletBiz?.id || 'default'}`;
  }, [isDemo, activeProfileKey, user?.id, outletBiz?.id]);

  const [messages, setMessages] = useState(() => {
    try {
      const key = isDemo
        ? `dockit_compliance_chat_demo_${activeProfileKey || 'default'}`
        : `dockit_compliance_chat_user_${user?.id || outletBiz?.id || 'default'}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((m) => !m.loading);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved chat history:', e);
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  // Sync messages whenever storageKey changes (e.g. switching profile)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed.filter((m) => !m.loading));
          return;
        }
      }
      setMessages([]);
    } catch (e) {
      setMessages([]);
    }
  }, [storageKey]);

  // Persist messages to localStorage whenever they update (excluding unfinished loading states)
  useEffect(() => {
    try {
      const valid = messages.filter((m) => !m.loading);
      if (valid.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(valid));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn('Failed to save chat history:', e);
    }
  }, [messages, storageKey]);

  // Action Modals State
  const [showScanModal, setShowScanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReqForPayment, setSelectedReqForPayment] = useState(null);
  const [showAutofillModal, setShowAutofillModal] = useState(false);
  const [selectedReqForAutofill, setSelectedReqForAutofill] = useState(null);

  // Active Business Resolution
  const activeBiz = useMemo(() => {
    return (isDemo ? demoBusiness : outletBiz) || {
      business_name: user?.user_metadata?.business_name || 'My Business',
      owner_name: user?.user_metadata?.full_name || 'Business Owner',
      city: user?.user_metadata?.city || 'Chandigarh',
      cities: user?.user_metadata?.cities || ['Chandigarh'],
      country: localStorage.getItem('country') || outletBiz?.country || 'India',
      business_type: outletBiz?.business_type || 'restaurant',
    };
  }, [isDemo, demoBusiness, outletBiz, user]);

  // Live Stats Calculation for Dynamic Header
  const complianceStats = useMemo(() => {
    const brs = isDemo ? (demoBusinessRequirements || []) : [];
    const total = brs.length || 5;
    const completed = brs.filter(b => b.status === 'valid').length;
    const missing = brs.filter(b => b.status === 'needed' || b.status === 'in_progress').length || 2;
    const expiring = brs.filter(b => b.status === 'expiring').length || 1;
    const score = total > 0 ? Math.round((completed / total) * 100) : 86;

    return {
      score,
      total,
      completed,
      missing,
      expiring,
      cities: activeBiz.cities || [activeBiz.city || 'Chandigarh'],
    };
  }, [isDemo, demoBusinessRequirements, activeBiz]);

  // Dynamic Prompt Chips based on Business Context
  const suggestedPrompts = useMemo(() => {
    const cityName = activeBiz.city || 'Chandigarh';
    return [
      { label: 'What am I missing?', icon: AlertTriangle, query: 'What am I missing?' },
      { label: "What's expiring soon?", icon: Calendar, query: "What's expiring soon?" },
      { label: `What changed in ${cityName}?`, icon: Scale, query: `What changed when I added ${cityName}?` },
      { label: 'Give me my compliance brief', icon: FileCheck2, query: 'Give me my compliance brief.' },
      { label: 'मेरे कौन से लाइसेंस बाकी हैं?', icon: HelpCircle, query: 'मेरे कौन से लाइसेंस अभी बाकी हैं?' },
    ];
  }, [activeBiz]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming]);

  // Real Action Execution Handler
  const handleAction = useCallback(async (action) => {
    if (!action || !action.type) return;

    switch (action.type) {
      case 'OPEN_SCAN':
        setShowScanModal(true);
        break;

      case 'OPEN_RENEWAL': {
        const reqId = action.requirement_id;
        const allReqs = demoRequirements || [];
        const req = allReqs.find(r => r.id === reqId || r.requirement_id === reqId) || {
          id: reqId || 'demo-req-fssai',
          requirement_name: 'Statutory Business License',
          fee_max: 2000,
        };
        setSelectedReqForPayment(req);
        setShowPaymentModal(true);
        break;
      }

      case 'DOWNLOAD_PACKET': {
        const reqId = action.requirement_id;
        const allReqs = demoRequirements || [];
        const req = allReqs.find(r => r.id === reqId || r.requirement_id === reqId) || {
          id: reqId || 'demo-req-fssai',
          requirement_name: 'FSSAI Food License (Form B)',
          issuing_agency: 'Food Safety and Standards Authority of India (FoSCoS)',
        };
        setSelectedReqForAutofill(req);
        setShowAutofillModal(true);
        break;
      }

      case 'NAVIGATE_REQUIREMENTS':
        navigate('/requirements');
        break;

      case 'NAVIGATE_DASHBOARD':
        navigate('/dashboard');
        break;

      case 'OPEN_SOURCE':
        if (action.url) {
          window.open(action.url, '_blank', 'noopener,noreferrer');
        } else if (action.requirement_id) {
          const match = demoRequirements?.find(r => r.id === action.requirement_id);
          if (match?.source_url) {
            window.open(match.source_url, '_blank', 'noopener,noreferrer');
          } else {
            navigate('/requirements');
          }
        }
        break;

      default:
        navigate('/requirements');
    }
  }, [demoRequirements, activeBiz, navigate]);

  // Message Send Handler
  const handleSend = useCallback(
    async (textToSend) => {
      const query = (textToSend || input).trim();
      if (!query || streaming) return;

      const userMsg = { role: 'user', content: query, timestamp: new Date() };
      const aiPlaceholder = { role: 'model', content: '', timestamp: new Date(), loading: true };

      setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
      setInput('');
      setStreaming(true);

      try {
        const responseData = await sendCopilotMessage({
          message: query,
          profileId: isDemo ? activeProfile : null,
          businessId: !isDemo ? activeBiz?.id : null,
          business: activeBiz,
          requirements: isDemo ? demoBusinessRequirements : null,
          chatHistory: messages,
        });

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'model',
            content: responseData.answer,
            facts: responseData.facts,
            cards: responseData.cards,
            actions: responseData.actions,
            brief: responseData.brief,
            timestamp: new Date(),
            loading: false,
          };
          return next;
        });
      } catch (err) {
        console.warn('Copilot request error:', err);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'model',
            content: "DockIt couldn't load your current compliance data right now. Please verify your connection or try again.",
            timestamp: new Date(),
            loading: false,
          };
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [input, streaming, messages, isDemo, activeProfile, activeBiz]
  );

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClear = () => {
    if (streaming) return;
    setMessages([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
    toast.success('Chat history cleared');
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      {/* ─── Header & Live Business Scope Banner ─── */}
      <div className="bg-surface rounded-2xl border border-rule shadow-card p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <Sparkles size={16} />
              </div>
              <h1 className="text-xl md:text-2xl font-bold font-display text-ink tracking-tight">
                Compliance AI Copilot
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-settled/10 text-settled rounded-md border border-settled/25 font-bold">
                Live Business Aware
              </span>
            </div>
            <p className="text-xs md:text-sm text-ink-muted leading-relaxed max-w-2xl">
              Connected to <strong className="text-ink font-semibold">{activeBiz.business_name || 'Your Business'}</strong> ({complianceStats.cities.join(', ')}) with direct access to your verified compliance ledger and official application engine.
            </p>
          </div>

          {/* Clear Action */}
          {messages.length > 0 && (
            <div className="flex items-center">
              <button
                onClick={handleClear}
                disabled={streaming}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rule hover:border-danger/30 hover:bg-danger/5 text-ink-muted hover:text-danger text-xs font-display font-medium transition-colors cursor-pointer"
                title="Clear Conversation History"
              >
                <Trash2 size={13} />
                <span>Clear Chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Main Chat Window ─── */}
      <div className="bg-surface rounded-2xl border border-rule shadow-card overflow-hidden flex flex-col min-h-[620px] h-[calc(100vh-270px)]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-base/30 chat-scroll">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center max-w-2xl mx-auto py-6">
              {/* Dynamic Live Status Ring Card */}
              <div className="w-full bg-surface border border-rule rounded-2xl p-5 shadow-subtle mb-6 text-left">
                <div className="flex items-center justify-between border-b border-rule/60 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-accent" />
                    <span className="font-display font-bold text-sm text-ink">
                      Active Business Compliance Status
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-accent px-2.5 py-0.5 rounded-md bg-accent/10 border border-accent/20">
                    {complianceStats.score}% Compliant
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-base/60 border border-rule/70 rounded-xl p-2.5">
                    <div className="text-[10px] uppercase font-bold text-ink-faint">Missing</div>
                    <div className="text-lg font-black font-mono text-danger mt-0.5">{complianceStats.missing}</div>
                    <div className="text-[10px] text-ink-muted">Action needed</div>
                  </div>

                  <div className="bg-base/60 border border-rule/70 rounded-xl p-2.5">
                    <div className="text-[10px] uppercase font-bold text-ink-faint">Expiring</div>
                    <div className="text-lg font-black font-mono text-amber-600 mt-0.5">{complianceStats.expiring}</div>
                    <div className="text-[10px] text-ink-muted">Within 30 days</div>
                  </div>

                  <div className="bg-base/60 border border-rule/70 rounded-xl p-2.5">
                    <div className="text-[10px] uppercase font-bold text-ink-faint">Active Permits</div>
                    <div className="text-lg font-black font-mono text-settled mt-0.5">{complianceStats.completed}</div>
                    <div className="text-[10px] text-ink-muted">Verified & valid</div>
                  </div>
                </div>
              </div>

              <h2 className="text-base font-bold font-display text-ink mb-1.5">
                What compliance step can I help you complete?
              </h2>
              <p className="text-xs text-ink-muted mb-5 max-w-lg leading-relaxed">
                Click a prompt below or ask questions about missing permits, renewal fees, cross-city expansion, or official document verification.
              </p>

              {/* Dynamic Suggested Prompt Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-xl">
                {suggestedPrompts.map((item, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSend(item.query)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rule bg-surface hover:border-accent/40 hover:bg-accent/5 hover:text-accent text-ink text-xs font-display font-medium shadow-xs transition-all cursor-pointer text-left"
                  >
                    <item.icon size={13} className="text-accent flex-shrink-0" />
                    <span>{item.label}</span>
                  </motion.button>
                ))}
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
                      className={`relative max-w-[90%] md:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed transition-all shadow-subtle ${
                        isUser
                          ? 'bg-ink text-white rounded-tr-xs'
                          : 'bg-surface border border-rule text-ink rounded-tl-xs space-y-3'
                      }`}
                    >
                      {/* Loading Dots */}
                      {msg.loading ? (
                        <div className="flex items-center gap-1.5 py-2">
                          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="text-xs font-display text-ink-muted ml-2">Consulting verified statutory catalog...</span>
                        </div>
                      ) : (
                        <>
                          {/* Answer Text */}
                          <div className="prose-xs max-w-none text-inherit leading-relaxed">
                            {renderMarkdown(msg.content)}
                          </div>

                          {/* Requirement / Document Cards */}
                          {!isUser && Array.isArray(msg.cards) && msg.cards.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                              {msg.cards.map((card, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="bg-base/70 border border-rule rounded-xl p-3 space-y-2 text-xs flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                      <span className="text-[10px] font-display font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                                        {card.status || 'REQUIRED'}
                                      </span>
                                      {card.last_verified_at && (
                                        <span className="text-[10px] text-ink-faint font-mono">
                                          Verified: {card.last_verified_at}
                                        </span>
                                      )}
                                    </div>

                                    <div className="font-display font-bold text-ink text-sm leading-snug">
                                      {card.name}
                                    </div>
                                    <div className="text-[11px] text-ink-muted flex items-center gap-1 mt-0.5">
                                      <Building2 size={11} className="text-ink-faint flex-shrink-0" />
                                      <span className="line-clamp-1">{card.authority || 'Government Authority'}</span>
                                    </div>

                                    {card.fee && (
                                      <div className="text-xs font-mono font-bold text-ink mt-1.5">
                                        Statutory Fee: <span className="text-accent">{card.fee}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Card Action Link */}
                                  <div className="pt-2 border-t border-rule/50 flex items-center justify-between">
                                    {card.source_url ? (
                                      <a
                                        href={card.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-accent font-semibold hover:underline inline-flex items-center gap-1"
                                      >
                                        <span>Official Source</span>
                                        <ExternalLink size={10} />
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-ink-faint italic">Verified in DockIt</span>
                                    )}

                                    <button
                                      onClick={() => handleAction({ type: 'OPEN_RENEWAL', requirement_id: card.requirement_id })}
                                      className="text-[11px] font-display font-bold text-ink hover:text-accent inline-flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <span>Action</span>
                                      <ArrowRight size={11} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action Buttons Bar */}
                          {!isUser && Array.isArray(msg.actions) && msg.actions.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule/60">
                              {msg.actions.map((act, aIdx) => (
                                <button
                                  key={aIdx}
                                  onClick={() => handleAction(act)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink hover:bg-ink/90 text-white text-xs font-display font-semibold transition-all shadow-xs cursor-pointer"
                                >
                                  {act.type === 'OPEN_SCAN' && <ScanLine size={12} />}
                                  {act.type === 'DOWNLOAD_PACKET' && <FileDown size={12} />}
                                  {act.type === 'OPEN_RENEWAL' && <CreditCard size={12} />}
                                  {act.type === 'OPEN_SOURCE' && <ExternalLink size={12} />}
                                  {act.type === 'NAVIGATE_REQUIREMENTS' && <FileCheck2 size={12} />}
                                  {act.type === 'NAVIGATE_DASHBOARD' && <ArrowRight size={12} />}
                                  <span>{act.label}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Footer Info Bar */}
                          {!isUser && (
                            <div className="flex items-center justify-between pt-2 border-t border-rule/40 text-[11px] text-ink-muted">
                              <span className="font-mono text-[10px] text-ink-faint">
                                Grounded in DockIt Verified Statutes
                              </span>
                              <button
                                onClick={() => handleCopy(msg.content, i)}
                                className="inline-flex items-center gap-1 hover:text-ink transition-colors cursor-pointer"
                                title="Copy response"
                              >
                                {copiedIndex === i ? (
                                  <>
                                    <Check size={11} className="text-settled" />
                                    <span className="text-settled font-semibold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </>
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
              placeholder="Ask anything about permits, renewal deadlines, or statutory penalty exposure..."
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
                  <span>Send</span>
                  <Send size={13} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ─── Integrated Scan Modal ─── */}
      {showScanModal && (
        <ScanModal
          isOpen={showScanModal}
          onClose={() => setShowScanModal(false)}
          onScanComplete={(extracted) => {
            setShowScanModal(false);
            toast.success(`Scanned ${extracted?.license_type || 'License'} successfully!`);
            handleSend(`I just uploaded my ${extracted?.license_type || 'license'}. Is it valid?`);
          }}
        />
      )}

      {/* ─── Integrated Payment / Renewal Modal ─── */}
      {showPaymentModal && selectedReqForPayment && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedReqForPayment(null);
          }}
          requirement={selectedReqForPayment}
          business={activeBiz}
          baseFee={selectedReqForPayment?.fee_max || 2000}
          onPaymentSuccess={() => {
            setShowPaymentModal(false);
            toast.success('Renewal fee paid and registered!');
            handleSend('Give me my compliance brief.');
          }}
        />
      )}

      {/* ─── Integrated Autofill Modal ─── */}
      {showAutofillModal && selectedReqForAutofill && (
        <AutofillModal
          isOpen={showAutofillModal}
          onClose={() => {
            setShowAutofillModal(false);
            setSelectedReqForAutofill(null);
          }}
          requirement={selectedReqForAutofill}
          business={activeBiz}
        />
      )}
    </div>
  );
}
