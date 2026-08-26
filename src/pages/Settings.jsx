import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Bell, LogOut, Zap, Save, Pencil, Check } from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../hooks/useAuth';
import { getBusiness, updateBusiness, signOut } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const CITIES_DATA = {
  India: [
    { city: 'Mumbai', state: 'Maharashtra' },
    { city: 'Delhi', state: 'NCT' },
    { city: 'Chennai', state: 'Tamil Nadu' },
    { city: 'Kolkata', state: 'West Bengal' },
    { city: 'Hyderabad', state: 'Telangana' },
    { city: 'Pune', state: 'Maharashtra' },
    { city: 'Ahmedabad', state: 'Gujarat' },
    { city: 'Jaipur', state: 'Rajasthan' },
    { city: 'Lucknow', state: 'Uttar Pradesh' }
  ],
  USA: [
    { city: 'New York', state: 'NY' },
    { city: 'Los Angeles', state: 'CA' },
    { city: 'Chicago', state: 'IL' },
    { city: 'Houston', state: 'TX' },
    { city: 'Phoenix', state: 'AZ' },
    { city: 'Philadelphia', state: 'PA' },
    { city: 'San Antonio', state: 'TX' },
    { city: 'San Diego', state: 'CA' },
    { city: 'San Francisco', state: 'CA' },
    { city: 'Seattle', state: 'WA' },
    { city: 'Boston', state: 'MA' }
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
  const { isDemo, demoBusiness, enterDemo, exitDemo, updateDemoBusiness } = useDemo();
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

  const handleToggleEmailReminders = () => {
    const newVal = !emailReminders;
    setEmailReminders(newVal);
    localStorage.setItem('emailReminders', JSON.stringify(newVal));
    toast.success(newVal ? 'Email reminders enabled!' : 'Email reminders disabled!');
  };

  const handleToggleReminderDay = (day) => {
    setReminderDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      localStorage.setItem('reminderDays', JSON.stringify(next));
      return next;
    });
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

  const handleSignOut = async () => {
    if (isDemo) { exitDemo(); navigate('/'); return; }
    signOut().catch(console.error);
    const emailRem = localStorage.getItem('emailReminders');
    const remDays = localStorage.getItem('reminderDays');
    const country = localStorage.getItem('country');
    const cities = localStorage.getItem('cities');
    localStorage.clear();
    sessionStorage.clear();
    if (emailRem !== null) localStorage.setItem('emailReminders', emailRem);
    if (remDays !== null) localStorage.setItem('reminderDays', remDays);
    if (country !== null) localStorage.setItem('country', country);
    if (cities !== null) localStorage.setItem('cities', cities);
    window.location.href = '/';
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
      </Section>

      {/* Account */}
      <Section title="Account">
        <div className="text-sm text-ink-muted">
          Signed in as <strong>{isDemo ? demoBusiness?.email : user?.email || 'Demo User'}</strong>
        </div>
        <button onClick={handleSignOut} className="btn-danger w-full">
          <LogOut size={16} /> {isDemo ? 'Exit Demo Mode' : 'Sign Out'}
        </button>
      </Section>

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
