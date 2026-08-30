import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Bell, Zap, Save, Pencil, Check, Send, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../hooks/useAuth';
import { getBusiness, updateBusiness } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import PaymentHistory from '../components/features/PaymentHistory';

const CITIES_DATA = {
  India: [
    { city: 'New Delhi', state: 'Delhi' },
    { city: 'Chandigarh', state: 'Chandigarh' },
  ],
  USA: [
    { city: 'New York', state: 'NY' },
    { city: 'Los Angeles', state: 'CA' },
  ]
};

const REMINDER_OPTIONS = [
  { label: '60 days before', value: 60 },
  { label: '30 days before', value: 30 },
  { label: '7 days before', value: 7 },
  { label: '1 day before', value: 1 },
];

function Section({ title, children }) {
  return (
    <div className="bg-surface rounded-2xl border border-rule p-6 space-y-4">
      <h2 className="section-title border-b border-rule/50 pb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { isDemo, demoBusiness, demoRequirements, enterDemo, exitDemo, updateDemoBusiness } = useDemo();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [emailReminders, setEmailReminders] = useState(() => {
    const saved = localStorage.getItem('emailReminders');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [reminderDays, setReminderDays] = useState(() => {
    const saved = localStorage.getItem('reminderDays');
    return saved !== null ? JSON.parse(saved) : [60, 30, 7];
  });
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Persist reminder preferences to both localStorage (instant UI) and Supabase (for cron job)
  const syncReminderPrefs = async (enabled, days) => {
    localStorage.setItem('emailReminders', JSON.stringify(enabled));
    localStorage.setItem('reminderDays', JSON.stringify(days));
    if (!isDemo && bizId) {
      try {
        await updateBusiness(bizId, {
          email_reminders_enabled: enabled,
          reminder_days: days,
        });
      } catch (err) {
        console.warn('Failed to sync reminder prefs to DB:', err);
      }
    }
  };

  const handleToggleEmailReminders = () => {
    const newVal = !emailReminders;
    setEmailReminders(newVal);
    syncReminderPrefs(newVal, reminderDays);
    toast.success(newVal ? 'Email reminders enabled!' : 'Email reminders disabled!');
  };

  const handleToggleReminderDay = (day) => {
    setReminderDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      syncReminderPrefs(emailReminders, next);
      return next;
    });
  };

  const handleSendTestEmail = async () => {
    if (isDemo) {
      toast.success('Test email sent! (demo mode — no real email)');
      return;
    }
    const email = user?.email || profile.email;
    if (!email) {
      toast.error('No email address found. Please set your email first.');
      return;
    }
    setSendingTestEmail(true);
    try {
      const res = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          ownerName: profile.owner_name || 'Business Owner',
          licenseName: 'Test License Reminder',
          daysLeft: 7,
          expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          penalty: 500,
          renewalUrl: 'https://dockit.app/dashboard',
          country: profile.country || 'USA',
        }),
      });

      // Handle non-JSON responses (e.g. running locally without Vercel)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        toast.error('Email API not available locally. Deploy to Vercel or run "vercel dev" to test.');
        return;
      }

      const data = await res.json();
      if (data.success) {
        toast.success(`Test email sent to ${email}! Check your inbox.`);
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (err) {
      toast.error('Email API unavailable. Deploy to Vercel or run "vercel dev" to test.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({ business_name: '', owner_name: '', phone: '', address: '', city: 'New York', state: 'NY', country: 'USA', email: '' });
  const [originalProfile, setOriginalProfile] = useState(null);
  const [cityInput, setCityInput] = useState('New York, NY');
  const [originalCityInput, setOriginalCityInput] = useState('New York, NY');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bizId, setBizId] = useState(null);

  const handleCitySearch = (val) => {
    setCityInput(val);
    if (!val) {
      setSuggestions([]);
      return;
    }
    const country = profile.country || 'USA';
    const matches = (CITIES_DATA[country] || []).filter(c =>
      `${c.city}, ${c.state}`.toLowerCase().includes(val.toLowerCase())
    );
    setSuggestions(matches);
    setShowSuggest(true);
  };

  const selectSuggestion = (s) => {
    setProfile(p => ({ ...p, city: s.city, state: s.state }));
    setCityInput(`${s.city}, ${s.state}`);
    setShowSuggest(false);
  };

  useEffect(() => {
    if (isDemo) { 
      const p = { ...demoBusiness, email: demoBusiness?.email || '', country: demoBusiness?.country || 'USA' };
      const c = `${demoBusiness?.city || ''}${demoBusiness?.state ? `, ${demoBusiness.state}` : ''}`;
      setProfile(p);
      setOriginalProfile(p);
      setCityInput(c);
      setOriginalCityInput(c);
      localStorage.setItem('country', p.country);
      return;
    }
    if (user) {
      getBusiness(user.id).then(biz => {
        if (biz) {
          const firstCityState = biz.cities?.[0] || 'New York, NY';
          const parts = firstCityState.split(',').map(s => s.trim());
          const city = parts[0] || '';
          const state = parts[1] || '';
          const country = localStorage.getItem('country') || 'USA';
          const p = {
            ...biz,
            email: user.email || '',
            city,
            state,
            country
          };
          const c = firstCityState;
          setProfile(p);
          setOriginalProfile(p);
          setCityInput(c);
          setOriginalCityInput(c);
          setBizId(biz.id);
          localStorage.setItem('country', country);

          // Hydrate reminder preferences from DB (source of truth)
          if (biz.email_reminders_enabled !== undefined) {
            setEmailReminders(biz.email_reminders_enabled);
            localStorage.setItem('emailReminders', JSON.stringify(biz.email_reminders_enabled));
          }
          if (Array.isArray(biz.reminder_days) && biz.reminder_days.length > 0) {
            setReminderDays(biz.reminder_days);
            localStorage.setItem('reminderDays', JSON.stringify(biz.reminder_days));
          }
        }
      }).catch(() => {});
    }
  }, [user, isDemo, demoBusiness]);

  const toggleDark = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', isDark);
  };

  // Language switcher removed - localized monolingual English

  const handleSave = async () => {
    if (isDemo) {
      updateDemoBusiness({
        business_name: profile.business_name,
        owner_name: profile.owner_name,
        phone: profile.phone,
        address: profile.address,
        country: profile.country,
        city: profile.city,
        state: profile.state,
        cities: [`${profile.city}, ${profile.state}`],
      });
      setOriginalProfile(profile);
      setOriginalCityInput(cityInput);
      setIsEditing(false);
      localStorage.setItem('country', profile.country);
      toast.success('Changes saved successfully!');
      return;
    }
    setSaving(true);
    try {
      await updateBusiness(bizId, {
        business_name: profile.business_name,
        owner_name: profile.owner_name,
        phone: profile.phone,
        address: profile.address,
        cities: [`${profile.city}, ${profile.state}`],
      });
      setOriginalProfile(profile);
      setOriginalCityInput(cityInput);
      setIsEditing(false);
      localStorage.setItem('country', profile.country);
      toast.success('Business profile updated!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleCancel = () => {
    if (originalProfile) setProfile(originalProfile);
    if (originalCityInput) setCityInput(originalCityInput);
    setIsEditing(false);
  };

  const ProfileField = ({ label, keyName, type = 'text', readOnly = false }) => (
    <div>
      <label className="block text-xs font-bold font-display text-ink-faint uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} value={profile[keyName] || ''} readOnly={readOnly}
        onChange={e => setProfile(p => ({ ...p, [keyName]: e.target.value }))}
        className={`input ${readOnly ? 'bg-base text-ink-faint cursor-not-allowed' : ''}`} />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-title">Settings</motion.h1>

      {/* Business Profile */}
      <div className="bg-surface rounded-2xl border border-rule p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-rule/50 pb-3">
          <h2 className="section-title">Business Profile</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <Pencil size={14} /> Edit Profile
            </button>
          )}
        </div>

        <ProfileField label="Business Name" keyName="business_name" readOnly={!isEditing} />
        <ProfileField label="Owner Name" keyName="owner_name" readOnly={!isEditing} />
        <ProfileField label="Phone" keyName="phone" type="tel" readOnly={!isEditing} />
        <ProfileField label="Address" keyName="address" readOnly={!isEditing} />
        
        {/* Country dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide">Country *</label>
          <select
            value={profile.country || 'USA'}
            disabled={!isEditing}
            onChange={e => {
              const c = e.target.value;
              setProfile(p => ({ ...p, country: c, city: '', state: '' }));
              setCityInput('');
            }}
            className={`input ${!isEditing ? 'bg-base text-ink-faint cursor-not-allowed' : ''}`}
          >
            <option value="India">India</option>
            <option value="USA">USA</option>
          </select>
        </div>

        {/* Primary City, State Autocomplete dropdown */}
        <div className="relative flex flex-col gap-1.5">
          <label className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide">Primary City, State *</label>
          <input
            type="text"
            value={cityInput}
            readOnly={!isEditing}
            onChange={e => handleCitySearch(e.target.value)}
            onFocus={() => { if (isEditing) { if (cityInput) handleCitySearch(cityInput); else setShowSuggest(true); } }}
            onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
            className={`input ${!isEditing ? 'bg-base text-ink-faint cursor-not-allowed' : ''}`}
            placeholder="Type city/state (e.g. New York, Los Angeles)..."
          />
          {isEditing && showSuggest && (CITIES_DATA[profile.country] || []).length > 0 && (
            <div className="absolute z-10 w-full bg-surface border border-rule rounded-xl shadow-lg mt-[70px] max-h-48 overflow-y-auto">
              {(suggestions.length > 0 ? suggestions : CITIES_DATA[profile.country]).map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-accent-light text-ink transition-colors"
                >
                  {s.city}, {s.state}
                </button>
              ))}
              {suggestions.length === 0 && cityInput && (
                <div className="px-4 py-2 text-sm text-ink-faint italic">No matching locations found</div>
              )}
            </div>
          )}
        </div>

        {/* Operating Cities Array */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold font-display text-ink-faint uppercase tracking-wide">Active Operating Jurisdictions</label>
          <div className="flex flex-wrap items-center gap-2 bg-base p-3 rounded-xl border border-rule">
            {(profile.cities || [`${profile.city}, ${profile.state}`]).map((c, i) => (
              <span key={i} className="text-xs font-display font-bold px-3 py-1 bg-accent/10 text-accent-dark rounded-xl border border-accent/20 flex items-center gap-1">
                📍 {c}
              </span>
            ))}
            {isEditing && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    const newCity = e.target.value;
                    const existing = profile.cities || [`${profile.city}, ${profile.state}`];
                    if (!existing.includes(newCity)) {
                      setProfile(p => ({ ...p, cities: [...existing, newCity] }));
                      toast.success(`Added ${newCity} to operating jurisdictions`);
                    }
                  }
                }}
                className="text-xs bg-surface border border-rule rounded-xl px-2 py-1 font-display font-semibold text-accent"
              >
                <option value="">+ Add Another City</option>
                {(CITIES_DATA[profile.country || 'USA'] || [])
                  .map(c => `${c.city}, ${c.state}`)
                  .filter(c => !(profile.cities || []).includes(c))
                  .map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
              </select>
            )}
          </div>
        </div>

        <ProfileField label="Email" keyName="email" type="email" readOnly />
        
        {isEditing && (
          <div className="flex gap-3 pt-2">
            <button onClick={handleCancel} disabled={saving} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      <Section title="Notifications">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-ink">Email Expiry Reminders</div>
            <div className="text-xs text-ink-faint mt-0.5">Receive email alerts before any of your permits expire</div>
          </div>
          <button onClick={handleToggleEmailReminders}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${emailReminders ? 'bg-accent' : 'bg-rule'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailReminders ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {emailReminders && (
          <div className="space-y-3 mt-4 border-t border-gray-50 pt-4">
            <div className="text-xs font-bold font-display text-ink-faint uppercase tracking-wider mb-2">Send email alerts at these intervals:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {REMINDER_OPTIONS.map(({ label, value }) => {
                const active = reminderDays.includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => handleToggleReminderDay(value)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      active 
                        ? 'border-accent bg-accent/5 text-ink shadow-sm' 
                        : 'border-gray-100 bg-white text-ink-muted hover:border-gray-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold">{label}</div>
                      <div className="text-xs text-ink-faint">Alerts sent {value} day{value > 1 ? 's' : ''} prior to expiration</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      active 
                        ? 'border-accent bg-accent text-white' 
                        : 'border-gray-200 bg-white'
                    }`}>
                      {active && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Send Test Email */}
        <div className="border-t border-rule/50 pt-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink">Send Test Email</div>
              <div className="text-xs text-ink-faint mt-0.5">Verify your reminder emails are working by sending a test to your inbox</div>
            </div>
            <button
              onClick={handleSendTestEmail}
              disabled={sendingTestEmail}
              className="btn-secondary text-xs px-4 py-2 flex items-center gap-2 shrink-0"
            >
              {sendingTestEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sendingTestEmail ? 'Sending…' : 'Send Test'}
            </button>
          </div>
        </div>
      </Section>

      {/* Language & Regional Preferences */}
      <Section title="Language & Regional">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-ink">Interface Language / इंटरफ़ेस भाषा</div>
            <div className="text-xs text-ink-faint mt-0.5">Select your preferred display language across all pages</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                i18n.changeLanguage('en');
                toast.success('Language changed to English');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display border transition-all ${
                i18n.language !== 'hi'
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-surface text-ink-muted border-rule hover:text-ink'
              }`}
            >
              English
            </button>
            <button
              onClick={() => {
                i18n.changeLanguage('hi');
                toast.success('भाषा बदलकर हिन्दी कर दी गई है');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display border transition-all ${
                i18n.language === 'hi'
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-surface text-ink-muted border-rule hover:text-ink'
              }`}
            >
              हिन्दी (Hindi)
            </button>
          </div>
        </div>
      </Section>

      {/* Statutory Payment History Ledger */}
      <PaymentHistory business={profile} licenses={isDemo ? demoRequirements : []} />

      {/* Demo mode */}
      <Section title="Demo Sandbox">
        <p className="text-sm text-ink-muted">Load sample data to explore all features without signing in.</p>
        <button onClick={() => { enterDemo(); navigate('/dashboard'); toast.success('Demo mode activated!'); }}
          className="btn-secondary w-full">
          <Zap size={16} /> Load Demo Data
        </button>
      </Section>
    </div>
  );
}
