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
import { fillOfficialForm, checkApplicationReadiness } from '../utils/formFillEngine';
import { updateBusiness } from '../services/supabase';
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

/**
 * Intelligent parser to extract structured profile attributes from conversational user input
 */
function extractProfileFields(text, expectedMissing = []) {
  const updates = {};
  if (!text) return updates;

  const trimmed = text.trim();
  const missingKeys = expectedMissing.map((m) => (m.key || m || '').toLowerCase());

  // 1. Email extraction
  const emailMatch = trimmed.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  if (emailMatch) {
    updates.email = emailMatch[0];
  }

  // 2. Phone extraction (matches US or Indian standard phone formats)
  const phoneMatch = trimmed.match(/(?:phone|call|tel|mobile|cell|number)?\s*(?:is|:)?\s*(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\+?91[\s-]?[6-9]\d{9}|\b\d{10}\b)/i);
  if (phoneMatch && phoneMatch[1]) {
    const rawDigits = phoneMatch[1].replace(/\D/g, '');
    if (rawDigits.length >= 10) {
      updates.phone = phoneMatch[1].trim();
    }
  }

  // 3. Address extraction (handles keyword prefix or standalone street pattern)
  const kwAddrMatch = trimmed.match(/(?:address|location|premises|located at|located)\s*(?:is|:)?\s*([0-9]{1,5}\s+[A-Za-z0-9\s.,#-]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Way|Place|Pl|Sector|Connaught|Broadway)[A-Za-z0-9\s.,#-]*)/i);
  if (kwAddrMatch && kwAddrMatch[1]) {
    updates.address = kwAddrMatch[1].trim().replace(/[.,]$/, '');
  } else {
    const standAddrMatch = trimmed.match(/\b([0-9]{1,5}\s+(?:[NSEW]\.?\s+)?[A-Za-z0-9\s.,#-]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Way|Place|Pl|Sector|Connaught|Broadway)[A-Za-z0-9\s.,#-]*)/i);
    if (standAddrMatch && standAddrMatch[1]) {
      updates.address = standAddrMatch[1].trim().replace(/[.,]$/, '');
    }
  }

  // 4. ZIP / Postal Code extraction (5-digit US or 6-digit Indian PIN)
  const explicitZipMatch = trimmed.match(/(?:zip|postal|pin|code)\s*(?:is|:)?\s*(\b\d{5}(?:-\d{4})?\b|\b\d{6}\b)/i);
  if (explicitZipMatch && explicitZipMatch[1]) {
    updates.zip = explicitZipMatch[1];
  } else {
    const anyZipMatch = trimmed.match(/\b\d{5}(?:-\d{4})?\b/) || trimmed.match(/\b\d{6}\b/);
    if (anyZipMatch) {
      const isPhoneSub = updates.phone && updates.phone.replace(/\D/g, '').includes(anyZipMatch[0]);
      if (!isPhoneSub || missingKeys.includes('zip')) {
        updates.zip = anyZipMatch[0];
      }
    }
  }

  // If address has ZIP inside it (e.g. "450 W 42nd St, New York, NY 10036"), also extract ZIP!
  if (updates.address && !updates.zip) {
    const addrZip = updates.address.match(/\b\d{5}(?:-\d{4})?\b/) || updates.address.match(/\b\d{6}\b/);
    if (addrZip) updates.zip = addrZip[0];
  }

  // 5. Owner / Applicant name extraction
  const ownerMatch = trimmed.match(/(?:my name is|owner is|applicant is|name is|i am)\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})/i);
  if (ownerMatch && ownerMatch[1]) {
    let candidate = ownerMatch[1].split(/\b(?:and|with|phone|email|address|call|at|zip)\b/i)[0].trim();
    if (candidate.split(/\s+/).length >= 2) {
      updates.owner_name = candidate;
    }
  }

  // 6. Business / Trade name extraction
  const bizMatch = trimmed.match(/(?:business name is|company is|truck name is|dba is|establishment is)\s+([A-Za-z0-9\s'&]+)/i);
  if (bizMatch && bizMatch[1]) {
    let candidate = bizMatch[1].split(/\b(?:and|with|phone|email|address|call|at|owned|zip)\b/i)[0].trim();
    if (candidate.length > 2) {
      updates.business_name = candidate;
    }
  }

  // 7. Direct casual single-field matching (when user replies with just the answer)
  if (missingKeys.length === 1) {
    const targetKey = missingKeys[0];
    if (targetKey === 'zip' && !updates.zip) {
      const rawNum = trimmed.match(/\b\d{5}\b/) || trimmed.match(/\b\d{6}\b/);
      if (rawNum) updates.zip = rawNum[0];
    } else if (targetKey === 'phone' && !updates.phone && trimmed.replace(/\D/g, '').length >= 10) {
      updates.phone = trimmed;
    } else if (targetKey === 'email' && !updates.email && trimmed.includes('@')) {
      updates.email = trimmed;
    } else if (targetKey === 'owner_name' && !updates.owner_name && /^[A-Za-z\s.'-]+$/.test(trimmed) && trimmed.length > 2) {
      updates.owner_name = trimmed;
    } else if (targetKey === 'address' && !updates.address && /[0-9]/.test(trimmed) && trimmed.length > 5) {
      updates.address = trimmed;
    }
  }

  return updates;
}

export default function ComplianceAI() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemo, activeProfile, activeProfileId, demoBusiness, updateDemoBusiness, demoRequirements, demoBusinessRequirements } = useDemo();
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

  // Intake State for collecting missing form requirements via Compliance AI
  const [intakeState, setIntakeState] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('dockit_ai_intake');
      if (raw) {
        sessionStorage.removeItem('dockit_ai_intake');
        const intake = JSON.parse(raw);
        if (intake && intake.requirementId) {
          setIntakeState(intake);
          const missingBullets = (intake.missingFields || [])
            .map((f) => `• **${f.label}**`)
            .join('\n');

          const greetingMsg = {
            role: 'model',
            content: `👋 Hello! I'm here to help you complete and download your official statutory application for **${intake.requirementName || 'Statutory Permit'}** (${intake.formCode || 'Official Form'}).\n\nTo ensure your application is accepted by **${intake.issuingAgency || 'the licensing authority'}** with zero omissions or rejection risk, I just need a few missing details:\n\n${missingBullets}\n\n💬 *You can reply however you like—for example, simply type your ZIP code (e.g. \`10036\`) or answer naturally. I'll automatically save it to your business records and prepare your official form!*`,
            timestamp: new Date(),
            loading: false,
          };

          setMessages((prev) => [...prev, greetingMsg]);
        }
      }
    } catch (e) {
      console.warn('Error reading dockit_ai_intake:', e);
    }
  }, []);

  // Active Business Resolution
  const activeBiz = useMemo(() => {
    const currentCountry = localStorage.getItem('country') || outletBiz?.country || 'USA';
    const defaultCity = currentCountry === 'India' ? 'Chandigarh' : 'New York, NY';
    const defaultBizName = currentCountry === 'India' ? 'Urban Tadka Kitchen' : "Rico's Curbside Kitchen";
    const defaultOwnerName = currentCountry === 'India' ? 'Rajesh Kumar' : 'Mara Rosas';

    return (isDemo ? demoBusiness : outletBiz) || {
      business_name: user?.user_metadata?.business_name || defaultBizName,
      owner_name: user?.user_metadata?.full_name || defaultOwnerName,
      city: user?.user_metadata?.city || defaultCity,
      cities: user?.user_metadata?.cities || [defaultCity],
      country: currentCountry,
      business_type: outletBiz?.business_type || 'food_truck',
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
      cities: activeBiz.cities || [activeBiz.city || (activeBiz.country === 'India' ? 'Chandigarh' : 'New York, NY')],
    };
  }, [isDemo, demoBusinessRequirements, activeBiz]);

  // Dynamic Prompt Chips based on Business Context
  const suggestedPrompts = useMemo(() => {
    const cityName = activeBiz.city || (activeBiz.country === 'India' ? 'Chandigarh' : 'New York, NY');
    const isIndia = activeBiz.country === 'India';
    return [
      { label: 'What am I missing?', icon: AlertTriangle, query: 'What am I missing?' },
      { label: "What's expiring soon?", icon: Calendar, query: "What's expiring soon?" },
      { label: `What changed in ${cityName}?`, icon: Scale, query: `What changed when I added ${cityName}?` },
      { label: 'Give me my compliance brief', icon: FileCheck2, query: 'Give me my compliance brief.' },
      {
        label: isIndia ? 'मेरे कौन से लाइसेंस बाकी हैं?' : 'Check municipal permits',
        icon: HelpCircle,
        query: isIndia ? 'मेरे कौन से लाइसेंस अभी बाकी हैं?' : 'What municipal permits and health licenses do I still need?'
      },
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
        const isIndia = (activeBiz?.country || localStorage.getItem('country')) === 'India';
        const defaultReq = isIndia ? {
          id: reqId || 'demo-req-fssai',
          requirement_name: 'FSSAI Food License (Form B)',
          fee_max: 2000,
          country: 'India',
        } : {
          id: reqId || 'demo-req-nyc-1',
          requirement_name: 'Mobile Food Vending License',
          fee_max: 50,
          country: 'USA',
        };
        const req = allReqs.find(r => r.id === reqId || r.requirement_id === reqId) || defaultReq;
        setSelectedReqForPayment(req);
        setShowPaymentModal(true);
        break;
      }

      case 'DOWNLOAD_PACKET': {
        const reqId = action.requirement_id;
        const allReqs = demoRequirements || [];
        const isIndia = (activeBiz?.country || localStorage.getItem('country')) === 'India';
        const defaultReq = isIndia ? {
          id: reqId || 'demo-req-fssai',
          requirement_name: 'FSSAI Food License (Form B)',
          issuing_agency: 'Food Safety and Standards Authority of India (FoSCoS)',
          country: 'India',
        } : {
          id: reqId || 'demo-req-nyc-1',
          requirement_name: 'Mobile Food Vending License',
          issuing_agency: 'NYC Department of Consumer and Worker Protection (DCWP)',
          country: 'USA',
        };
        const req = allReqs.find(r => r.id === reqId || r.requirement_id === reqId) || defaultReq;
        setSelectedReqForAutofill(req);
        setShowAutofillModal(true);
        break;
      }

      case 'DOWNLOAD_OFFICIAL_FORM': {
        const reqId = action.requirement_id;
        const allReqs = demoRequirements || [];
        const isIndia = (activeBiz?.country || localStorage.getItem('country')) === 'India';
        const defaultReq = isIndia ? {
          id: reqId || 'demo-req-fssai',
          requirement_name: 'FSSAI Food License (Form B)',
          issuing_agency: 'Food Safety and Standards Authority of India (FoSCoS)',
          country: 'India',
        } : {
          id: reqId || 'demo-req-nyc-1',
          requirement_name: 'Mobile Food Vending License',
          issuing_agency: 'NYC Department of Consumer and Worker Protection (DCWP)',
          country: 'USA',
        };
        const targetReq = allReqs.find(r => r.id === reqId || r.requirement_id === reqId) || defaultReq;

        const toastId = toast.loading('Generating official statutory PDF form...');
        try {
          const pdfBlob = await fillOfficialForm(targetReq, activeBiz);
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          const safeName = (targetReq.requirement_name || 'Official_Application').replace(/[^a-zA-Z0-9_]/g, '_');
          a.download = `${safeName}_Official_Application.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('Downloaded official pre-filled form!', { id: toastId });
        } catch (err) {
          console.error('Download form error:', err);
          toast.error(err.message || 'Could not generate official form.', { id: toastId });
        }
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

      // 1. Check if user is supplying profile fields conversationally
      const extracted = extractProfileFields(query, intakeState?.missingFields || []);
      const hasExtractedData = Object.keys(extracted).length > 0;

      if (hasExtractedData) {
        if (isDemo && typeof updateDemoBusiness === 'function') {
          updateDemoBusiness(extracted);
        }
        if (activeBiz?.id && !isDemo) {
          updateBusiness(activeBiz.id, extracted).catch(console.error);
        }
        Object.assign(activeBiz, extracted);
      }

      // 2. If active intake session is in progress for an official application
      if (intakeState && intakeState.requirementId) {
        const targetReq = (demoRequirements || []).find(
          (r) => r.id === intakeState.requirementId || r.requirement_id === intakeState.requirementId
        ) || {
          id: intakeState.requirementId,
          requirement_name: intakeState.requirementName,
          city: intakeState.city || activeBiz.city,
          country: intakeState.country || activeBiz.country || 'USA',
        };

        const updatedBiz = { ...activeBiz, ...extracted };
        const readiness = checkApplicationReadiness(targetReq, updatedBiz);

        if (readiness.isReady) {
          setIntakeState(null);
          setInput('');

          const updatedBullets = Object.entries(extracted)
            .map(([k, v]) => `• **${k.replace('_', ' ').toUpperCase()}**: \`${v}\``)
            .join('\n');

          const completeMsg = {
            role: 'model',
            content: `🎉 **Business Profile Updated & Official Form Ready!**\n\nI have saved your verified details into your business ledger:\n${updatedBullets || '• All profile details verified'}\n\nYour official statutory application for **${targetReq.requirement_name || intakeState.requirementName}** is now **100% complete and verified** (${readiness.readyFields}/${readiness.totalFields} fields ready). Every field is mapped with pixel precision into the prescribed government document layout.\n\nClick below to download your ready-to-file official government PDF:`,
            actions: [
              {
                type: 'DOWNLOAD_OFFICIAL_FORM',
                requirement_id: targetReq.id || intakeState.requirementId,
                requirement_name: targetReq.requirement_name || intakeState.requirementName,
                label: '📥 Download Filled Official Form',
              },
              {
                type: 'DOWNLOAD_PACKET',
                requirement_id: targetReq.id || intakeState.requirementId,
                label: '🔍 View in Prefill Inspector',
              },
            ],
            timestamp: new Date(),
            loading: false,
          };

          setMessages((prev) => [...prev, userMsg, completeMsg]);
          return;
        } else if (hasExtractedData) {
          const remainingBullets = readiness.missingFields
            .map((f) => `• **${f.label}**`)
            .join('\n');

          setIntakeState((prev) => ({
            ...prev,
            missingFields: readiness.missingFields,
          }));
          setInput('');

          const remainingLabels = readiness.missingFields.map((f) => f.label).join(', ');
          const partialMsg = {
            role: 'model',
            content: `Got it! I've updated your business records with your **${Object.keys(extracted).map(k => k.replace('_', ' ')).join(', ')}**.\n\nWe just need your **${remainingLabels}** to finalize the official application for **${targetReq.requirement_name || intakeState.requirementName}**.\n\nYou can simply reply with it here and I'll generate your official form immediately!`,
            timestamp: new Date(),
            loading: false,
          };

          setMessages((prev) => [...prev, userMsg, partialMsg]);
          return;
        }
      }

      // 3. If no active intake session, check if user is asking to fill / prepare / download an official government form
      if (!intakeState) {
        const lower = query.toLowerCase();
        const mentionsForm =
          lower.includes('fill') ||
          lower.includes('form') ||
          lower.includes('application') ||
          lower.includes('pre-fill') ||
          lower.includes('prefill') ||
          lower.includes('download') ||
          lower.includes('generate');

        const isFormIntent =
          mentionsForm &&
          (lower.includes('fill') ||
           lower.includes('prepare') ||
           lower.includes('download') ||
           lower.includes('generate') ||
           lower.includes('official') ||
           lower.includes('ready'));

        if (isFormIntent) {
          const allReqs = demoRequirements || [];
          let targetReq = null;

          if (lower.includes('ein') || lower.includes('tax id') || lower.includes('ss-4') || lower.includes('ss4') || lower.includes('irs')) {
            targetReq = allReqs.find((r) => r.id === 'demo-req-ein') || allReqs.find((r) => (r.requirement_name || '').toLowerCase().includes('ein'));
          } else if (lower.includes('permit') || lower.includes('health') || lower.includes('protection') || lower.includes('food')) {
            targetReq =
              allReqs.find((r) => (r.requirement_name || '').toLowerCase().includes('permit')) ||
              allReqs.find((r) => (r.requirement_name || '').toLowerCase().includes('vending')) ||
              allReqs.find((r) => (r.requirement_name || '').toLowerCase().includes('license'));
          } else if (lower.includes('vending') || lower.includes('vendor') || lower.includes('license')) {
            targetReq =
              allReqs.find((r) => (r.requirement_name || '').toLowerCase().includes('vending')) ||
              allReqs.find((r) => (r.requirement_name || '').toLowerCase().includes('license'));
          }

          if (!targetReq) {
            const isInd = (activeBiz?.country || localStorage.getItem('country')) === 'India';
            targetReq =
              allReqs.find((r) => (isInd ? r.id === 'demo-req-fssai' || r.id === 'demo-req-001' : r.id === 'demo-req-nyc-1' || r.id === 'demo-req-nyc-2' || r.id === 'demo-req-la-1')) ||
              allReqs[0];
          }

          if (targetReq) {
            const updatedBiz = { ...activeBiz, ...extracted };
            const readiness = checkApplicationReadiness(targetReq, updatedBiz);

            if (readiness.isReady) {
              setInput('');
              const readyMsg = {
                role: 'model',
                content: `📋 **Official Government Form Ready for ${targetReq.requirement_name}!**\n\nAll required statutory details for **${targetReq.requirement_name}** (${targetReq.issuing_agency}) are verified in your business ledger.\n\nYour information will be stamped directly into the official government application document with pixel precision. Click below to download:`,
                actions: [
                  {
                    type: 'DOWNLOAD_OFFICIAL_FORM',
                    requirement_id: targetReq.id,
                    requirement_name: targetReq.requirement_name,
                    label: '📥 Download Filled Official Form',
                  },
                  {
                    type: 'DOWNLOAD_PACKET',
                    requirement_id: targetReq.id,
                    label: '🔍 View in Prefill Inspector',
                  },
                ],
                timestamp: new Date(),
                loading: false,
              };
              setMessages((prev) => [...prev, userMsg, readyMsg]);
              return;
            } else {
              setIntakeState({
                requirementId: targetReq.id,
                requirementName: targetReq.requirement_name,
                issuingAgency: targetReq.issuing_agency,
                city: targetReq.city,
                country: targetReq.country,
                missingFields: readiness.missingFields,
              });
              setInput('');

              const missingBullets = readiness.missingFields
                .map((f) => `• **${f.label}**`)
                .join('\n');

              const askMsg = {
                role: 'model',
                content: `I'll help you prepare your official government application for **${targetReq.requirement_name}** (${targetReq.issuing_agency})!\n\nTo ensure the licensing authority accepts your form without rejection, I just need a few basic details that are missing from your business records:\n\n${missingBullets}\n\n💬 *You can reply however you like (e.g. simply typing your ZIP code \`10036\` or answering naturally). I'll automatically save it to your ledger and generate your official government form immediately!*`,
                timestamp: new Date(),
                loading: false,
              };
              setMessages((prev) => [...prev, userMsg, askMsg]);
              return;
            }
          }
        }
      }

      // 4. Standard Copilot Query
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
    [input, streaming, messages, isDemo, activeProfile, activeBiz, intakeState, demoRequirements, updateDemoBusiness]
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
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all shadow-xs cursor-pointer ${
                                    act.type === 'DOWNLOAD_OFFICIAL_FORM'
                                      ? 'bg-accent hover:bg-accent-dark text-white ring-2 ring-accent/20'
                                      : 'bg-ink hover:bg-ink/90 text-white'
                                  }`}
                                >
                                  {act.type === 'OPEN_SCAN' && <ScanLine size={12} />}
                                  {act.type === 'DOWNLOAD_PACKET' && <FileDown size={12} />}
                                  {act.type === 'DOWNLOAD_OFFICIAL_FORM' && <FileDown size={13} className="text-white" />}
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
