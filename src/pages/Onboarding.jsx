import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Loader2,
  UtensilsCrossed, Truck, Scissors, ShoppingBag, Stethoscope,
  HardHat, GraduationCap, Factory, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase, signInWithOtp, verifyOtp, createBusiness, getBusiness, getRequirements, createBusinessRequirement } from '../services/supabase';
import { BUSINESS_TYPES } from '../utils/licenseTypes';
import { useDemo } from '../context/DemoContext';

const ICON_MAP = { UtensilsCrossed, Truck, Scissors, ShoppingBag, Stethoscope, HardHat, GraduationCap, Factory, Briefcase };
const STEPS = ['Verify Email', 'Business Type', 'Business Profile'];

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

const field = (label, key, type = 'text', required = false) => ({ label, key, type, required });
const PROFILE_FIELDS = [
  field('Business Name', 'business_name', 'text', true),
  field('Owner Name', 'owner_name', 'text', true),
  field('Phone Number', 'phone', 'tel', true),
  field('Business Address', 'address', 'text', true),
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { enterDemo } = useDemo();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [password, setPassword] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [businessType, setBusinessType] = useState('');
  const [profile, setProfile] = useState({ business_name: '', owner_name: '', phone: '', address: '', city: 'New York', state: 'NY', country: 'USA' });
  const [cityInput, setCityInput] = useState('New York, NY');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);

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
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        getBusiness(session.user.id).then((biz) => {
          if (biz) {
            navigate('/dashboard', { replace: true });
          } else {
            setStep(1);
          }
        }).catch(() => {
          setStep(1);
        });
      }
    });

    // Listen to authentication changes (e.g. Magic Link clicked)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const biz = await getBusiness(session.user.id);
          if (biz) {
            navigate('/dashboard', { replace: true });
          } else {
            setStep(1);
          }
        } catch {
          setStep(1);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Step 1 — Authenticate
  const handleAuth = async () => {
    if (!email) { toast.error('Enter your email'); return; }
    if (!useOtp && !password) { toast.error('Enter your password'); return; }
    setLoading(true);
    try {
      if (useOtp) {
        await signInWithOtp(email);
        setOtpSent(true);
        toast.success('Verification link/OTP sent to ' + email);
      } else {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          
          if (data?.session) {
            toast.success('Successfully registered!');
          } else {
            toast.success('Sign up successful! Please check your email to confirm.');
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          toast.success('Welcome back!');
        }
      }
    } catch (err) {
      console.error("Auth Error:", err);
      toast.error(err.message || err.error_description || JSON.stringify(err) || 'Authentication failed');
    }
    finally { setLoading(false); }
  };


  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[idx] = val;
    setOtp(next);
    if (val && idx < 7) document.getElementById(`otp-${idx + 1}`)?.focus();
  };

  const verifyOtpCode = async () => {
    const code = otp.join('');
    if (code.length < 8) { toast.error('Enter the complete 8-digit OTP code'); return; }
    setLoading(true);
    try {
      await verifyOtp(email, code);
      setStep(1);
    } catch (err) {
      console.error("Verify OTP Error:", err);
      toast.error(err.message || err.error_description || JSON.stringify(err) || 'Failed to verify OTP');
    }
    finally { setLoading(false); }
  };

  const completeSetup = async () => {
    let activeCity = profile.city;
    let activeState = profile.state;
    if ((!activeCity || !activeState) && cityInput) {
      const parts = cityInput.split(',').map(s => s.trim());
      activeCity = parts[0] || '';
      activeState = parts[1] || '';
    }

    if (!profile.business_name || !profile.owner_name || !profile.phone || !activeCity || !activeState) {
      toast.error('Please fill required fields (Name, Owner, Phone, City, State)'); return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newBiz = await createBusiness({
        business_name: profile.business_name,
        owner_name: profile.owner_name,
        phone: profile.phone,
        address: profile.address,
        cities: [`${activeCity}, ${activeState}`],
        business_type: businessType,
        owner_id: user.id,
        email: user.email
      });

      // Auto-populate the checklist with "needed" requirements for this business type and city
      try {
        const cityStr = `${activeCity}, ${activeState}`;
        const reqs = await getRequirements(businessType, [cityStr]);
        
        // If there are no city-specific matches, it might fall back to general ones
        if (reqs && reqs.length > 0) {
          const promises = reqs.map(req => 
            createBusinessRequirement({
              business_id: newBiz.id,
              requirement_id: req.id,
              status: 'needed',
              issuing_authority: req.issuing_agency,
            })
          );
          await Promise.all(promises);
        }
      } catch (autoErr) {
        console.error("Auto-population of checklist failed:", autoErr);
        // We don't block onboarding if auto-population fails
      }
      localStorage.setItem('country', profile.country || 'USA');
      navigate('/dashboard', { replace: true });
      toast.success('Welcome to DockIt!');
    } catch (err) {
      console.error("Save Profile Error:", err);
      toast.error(err.message || err.error_description || JSON.stringify(err) || 'Failed to save profile');
    }
    finally { setLoading(false); }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <span className="text-white font-display font-bold text-lg">D</span>
            </div>
            <span className="font-display font-bold text-xl text-ink">Dock<span className="text-accent">It</span></span>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-2 mt-4 mb-1">
            {STEPS.map((s, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-accent' : 'bg-rule'}`} />
            ))}
          </div>
          <div className="text-xs text-ink-faint">Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>
        </div>

        <div className="bg-surface rounded-3xl shadow-card border border-rule p-8">
          <AnimatePresence mode="wait">

            {/* Step 1 — Email OTP */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <form onSubmit={e => { e.preventDefault(); if (otpSent) { verifyOtpCode(); } else { handleAuth(); } }} className="space-y-5">
                {/* Sign Up / Log In Tabs */}
                {!otpSent && (
                  <div className="flex bg-base p-1 rounded-xl border border-rule mb-2">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className={`flex-1 text-center py-2 text-sm font-bold font-display rounded-lg transition-all ${isSignUp ? 'bg-surface shadow-sm text-accent' : 'text-ink-muted hover:text-ink'}`}
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className={`flex-1 text-center py-2 text-sm font-bold font-display rounded-lg transition-all ${!isSignUp ? 'bg-surface shadow-sm text-accent' : 'text-ink-muted hover:text-ink'}`}
                    >
                      Log In
                    </button>
                  </div>
                )}
                
                <div>
                  <h2 className="text-2xl font-bold font-display text-ink">
                    {isSignUp ? 'Protect your business' : 'Welcome back'}<br />
                    {isSignUp && 'in 2 minutes'}
                  </h2>
                  <p className="text-ink-muted text-sm mt-2">
                    {isSignUp ? 'Create your account to get started' : 'Log in to your account'}
                  </p>
                </div>
                <div className="space-y-3">
                  <input type="email" placeholder="you@business.com" value={email}
                    onChange={e => setEmail(e.target.value)} className="input" disabled={otpSent} />
                  
                  {!useOtp && !otpSent && (
                    <input type="password" placeholder="Enter password (min 6 characters)" value={password}
                      onChange={e => setPassword(e.target.value)} className="input" />
                  )}

                  {!otpSent
                    ? <>
                        <button type="submit" disabled={loading} className="btn-primary w-full">
                          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                          {loading ? 'Processing…' : (useOtp ? (isSignUp ? 'Send OTP' : 'Send Login Code') : (isSignUp ? 'Create Account' : 'Log In'))} <ArrowRight size={16} />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setUseOtp(!useOtp)}
                          className="w-full text-center py-3 text-sm font-display font-semibold border border-rule hover:border-accent hover:text-accent rounded-xl text-ink-muted transition-all duration-200 mt-2"
                        >
                          {useOtp ? 'Sign in with password instead' : 'Use email magic link / OTP'}
                        </button>
                      </>
                    : <>
                        <div>
                          <p className="text-sm text-ink-muted mb-3 text-center">Enter the code sent to <strong>{email}</strong></p>
                          <div className="flex gap-2 justify-center">
                            {otp.map((v, i) => (
                              <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                                value={v} onChange={e => handleOtpChange(i, e.target.value)}
                                className="w-11 h-12 text-center text-lg font-bold font-display border-2 border-rule rounded-xl focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all" />
                            ))}
                          </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary w-full">
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          Verify & Continue
                        </button>
                        <button type="button" onClick={() => setOtpSent(false)} className="text-sm text-accent w-full text-center hover:underline">← Change email</button>
                      </>
                  }
                </div>
                </form>
              </motion.div>
            )}

            {/* Step 2 — Business Type */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold font-display text-ink">What type of business<br />do you run?</h2>
                  <p className="text-ink-muted text-sm mt-2">We'll recommend the right licenses for you</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {BUSINESS_TYPES.map((bt) => {
                    const Icon = ICON_MAP[bt.icon] || Briefcase;
                    const selected = businessType === bt.id;
                    return (
                      <button key={bt.id} onClick={() => setBusinessType(bt.id)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${selected ? 'border-accent bg-accent-light' : 'border-rule hover:border-accent/50'}`}>
                        <Icon size={20} className={selected ? 'text-accent' : 'text-ink-faint'} />
                        <span className={`text-sm font-semibold ${selected ? 'text-accent-dark' : 'text-ink'}`}>{bt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => businessType ? setStep(2) : toast.error('Select a business type')} className="btn-primary w-full">
                  Continue <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* Step 3 — Profile */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <form onSubmit={e => { e.preventDefault(); completeSetup(); }} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-ink">Business Profile</h2>
                  <p className="text-ink-muted text-sm mt-1">Used to pre-fill renewal forms automatically</p>
                </div>
                {PROFILE_FIELDS.map(({ label, key, type, required }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold font-display text-ink-faint uppercase tracking-wide mb-1.5">{label}{required && ' *'}</label>
                    <input type={type} value={profile[key] || ''} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} className="input" placeholder={label} />
                  </div>
                ))}
                
                {/* Country dropdown */}
                <div>
                  <label className="block text-xs font-semibold font-display text-ink-faint uppercase tracking-wide mb-1.5">Country *</label>
                  <select
                    value={profile.country || 'USA'}
                    onChange={e => {
                      const c = e.target.value;
                      setProfile(p => ({ ...p, country: c, city: '', state: '' }));
                      setCityInput('');
                    }}
                    className="input"
                  >
                    <option value="India">India</option>
                    <option value="USA">USA</option>
                  </select>
                </div>

                {/* City, State Autocomplete dropdown */}
                <div className="relative">
                  <label className="block text-xs font-semibold font-display text-ink-faint uppercase tracking-wide mb-1.5">City, State *</label>
                  <input
                    type="text"
                    value={cityInput}
                    onChange={e => handleCitySearch(e.target.value)}
                    onFocus={() => { if (cityInput) handleCitySearch(cityInput); else setShowSuggest(true); }}
                    onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
                    className="input"
                    placeholder="Type city/state (e.g. New York, Los Angeles)..."
                  />
                  {showSuggest && (CITIES_DATA[profile.country] || []).length > 0 && (
                    <div className="absolute z-10 w-full bg-surface border border-rule rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
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

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1"><ArrowLeft size={16} /> Back</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {loading ? 'Setting up…' : 'Complete Setup'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
