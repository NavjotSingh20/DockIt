import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Loader2, Eye, EyeOff,
  UtensilsCrossed, Truck, MapPin, Building2, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase, signInWithOtp, verifyOtp, createBusiness, getBusiness } from '../services/supabase';
import { BUSINESS_TYPES, SUPPORTED_CITIES } from '../utils/licenseTypes';
import { useDemo } from '../context/DemoContext';

const ICON_MAP = { UtensilsCrossed, Truck, Building2, Briefcase };
const STEPS = ['Account Setup', 'Location & Category', 'Business Profile'];

const PROFILE_FIELDS = [
  { label: 'Business Name', key: 'business_name', type: 'text', required: true, placeholder: 'e.g. Acme Food Co.' },
  { label: 'Owner / Contact Name', key: 'owner_name', type: 'text', required: true, placeholder: 'e.g. Jane Doe' },
  { label: 'Phone Number', key: 'phone', type: 'tel', required: true, placeholder: 'e.g. +1 212 555 0199' },
  { label: 'Business Address', key: 'address', type: 'text', required: true, placeholder: 'e.g. 123 Main Street' },
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [useOtp, setUseOtp] = useState(false);

  // Locked to the 4 supported cities only
  const [selectedCityId, setSelectedCityId] = useState('nyc');
  const selectedCity = SUPPORTED_CITIES.find(c => c.id === selectedCityId) || SUPPORTED_CITIES[0];

  // Business type constrained to selected city's verified data
  const availableBusinessTypes = BUSINESS_TYPES.filter(bt =>
    (selectedCity.supportedBusinessTypes || []).includes(bt.id)
  );

  const [businessType, setBusinessType] = useState('food_truck');

  // Ensure businessType remains valid whenever selected city changes
  useEffect(() => {
    if (!selectedCity.supportedBusinessTypes.includes(businessType)) {
      setBusinessType(selectedCity.supportedBusinessTypes[0] || 'restaurant');
    }
  }, [selectedCityId, selectedCity, businessType]);

  const [profile, setProfile] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        getBusiness(session.user.id).then((biz) => {
          if (biz) {
            navigate('/requirements', { replace: true });
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
            navigate('/requirements', { replace: true });
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
    if (!useOtp) {
      if (!password) { toast.error('Enter your password'); return; }
      if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
      if (isSignUp) {
        if (!confirmPassword) { toast.error('Please confirm your password'); return; }
        if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
      }
    }
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
            setStep(1);
          } else {
            toast.success('Sign up successful! Please check your email to confirm.');
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          toast.success('Welcome back!');
          setStep(1);
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
    if (!profile.business_name?.trim() || !profile.owner_name?.trim() || !profile.phone?.trim() || !profile.address?.trim()) {
      toast.error('Please fill in all required profile fields (Business Name, Owner, Phone, Address)');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user session found');

      await createBusiness({
        business_name: profile.business_name.trim(),
        owner_name: profile.owner_name.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
        city: selectedCity.city,
        state: selectedCity.state,
        country: selectedCity.country,
        cities: [selectedCity.label],
        business_type: businessType,
        owner_id: user.id,
        email: user.email
      });

      // Always derive country directly from the selected verified city
      localStorage.setItem('country', selectedCity.country);
      toast.success('Welcome to DockIt! We loaded your official compliance requirements.');
      navigate('/requirements', { replace: true });
    } catch (err) {
      console.error("Save Profile Error:", err);
      toast.error(err.message || err.error_description || JSON.stringify(err) || 'Failed to save profile');
    }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-xs">
              <span className="text-white font-display font-bold text-lg">D</span>
            </div>
            <span className="font-display font-bold text-2xl text-ink">Dock<span className="text-accent">It</span></span>
          </div>
          {/* Progress — shown only during sign up & onboarding steps, hidden for login */}
          {(step > 0 || isSignUp) && (
            <>
              <div className="flex items-center gap-2 mt-4 mb-1 max-w-xs mx-auto">
                {STEPS.map((s, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-accent' : 'bg-rule'}`} />
                ))}
              </div>
              <div className="text-xs font-semibold font-display text-ink-muted">Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>
            </>
          )}
        </div>

        <div className="bg-surface rounded-3xl shadow-card border border-rule p-6 sm:p-8">
          <AnimatePresence mode="wait">

            {/* Step 0 — Email Auth */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <form onSubmit={e => { e.preventDefault(); if (otpSent) { verifyOtpCode(); } else { handleAuth(); } }} className="space-y-5">
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
                    <p className="text-ink-muted text-sm mt-1.5">
                      {isSignUp ? 'Create your account to get verified regulatory requirements' : 'Log in to your account'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="you@business.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input"
                      disabled={otpSent}
                      required
                    />
                    
                    {!useOtp && !otpSent && (
                      <>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password (min 6 characters)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="input pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors p-1"
                            tabIndex={-1}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        
                        {isSignUp && (
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm password"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              className="input pr-10"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors p-1"
                              tabIndex={-1}
                              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            >
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {!otpSent ? (
                      <>
                        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                          {loading ? 'Processing…' : (useOtp ? (isSignUp ? 'Send OTP' : 'Send Login Code') : (isSignUp ? 'Create Account' : 'Log In'))} <ArrowRight size={16} />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setUseOtp(!useOtp)}
                          className="w-full text-center py-2.5 px-4 text-sm font-display font-semibold border border-rule hover:border-accent hover:text-accent rounded-xl text-ink-muted transition-all duration-200"
                        >
                          {useOtp ? 'Sign in with password instead' : 'Use email magic link / OTP'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm text-ink-muted mb-3 text-center">Enter the code sent to <strong>{email}</strong></p>
                          <div className="flex gap-2 justify-center">
                            {otp.map((v, i) => (
                              <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                                value={v} onChange={e => handleOtpChange(i, e.target.value)}
                                className="w-10 h-12 text-center text-lg font-bold font-display border-2 border-rule rounded-xl focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all" />
                            ))}
                          </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary w-full">
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          Verify & Continue
                        </button>
                        <button type="button" onClick={() => setOtpSent(false)} className="text-xs text-accent w-full text-center hover:underline">← Change email</button>
                      </>
                    )}
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 1 — City Location & Business Type */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold font-display text-ink">Select Operating Location</h2>
                  <p className="text-ink-muted text-sm mt-1">
                    Choose one of DockIt's 4 fully-verified official catalog jurisdictions
                  </p>
                </div>

                {/* 4 Supported Cities Only */}
                <div className="grid grid-cols-2 gap-2.5">
                  {SUPPORTED_CITIES.map((c) => {
                    const isSelected = selectedCityId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCityId(c.id)}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all relative ${
                          isSelected
                            ? 'border-accent bg-accent/5 ring-1 ring-accent/30 shadow-xs'
                            : 'border-rule hover:border-accent/40 bg-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-lg">{c.flag}</span>
                          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${isSelected ? 'bg-accent/15 text-accent' : 'bg-base text-ink-muted'}`}>
                            {c.country}
                          </span>
                        </div>
                        <div className={`font-display font-bold text-sm leading-tight ${isSelected ? 'text-accent-dark' : 'text-ink'}`}>
                          {c.city}
                        </div>
                        <div className="text-[11px] font-mono text-ink-faint">
                          {c.state}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Business Type Constrained per City */}
                <div className="pt-2 border-t border-rule/60">
                  <label className="block text-xs font-semibold font-display text-ink-faint uppercase tracking-wide mb-2.5">
                    Select Business Category for {selectedCity.city}
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availableBusinessTypes.map((bt) => {
                      const Icon = ICON_MAP[bt.icon] || Briefcase;
                      const selected = businessType === bt.id;
                      return (
                        <button
                          key={bt.id}
                          type="button"
                          onClick={() => setBusinessType(bt.id)}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                            selected
                              ? 'border-accent bg-accent/5 ring-1 ring-accent/30 shadow-xs'
                              : 'border-rule hover:border-accent/40 bg-surface'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-accent text-white' : 'bg-base text-ink-muted'}`}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <div className={`text-xs sm:text-sm font-bold font-display ${selected ? 'text-accent-dark' : 'text-ink'}`}>
                              {bt.label}
                            </div>
                            <div className="text-[10px] font-mono text-ink-muted">
                              Verified in {selectedCity.city}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (businessType && selectedCityId) {
                        setStep(2);
                      } else {
                        toast.error('Please select both your location and business category');
                      }
                    }}
                    className="btn-primary w-full"
                  >
                    Continue to Business Profile <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2 — Business Profile */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <form onSubmit={e => { e.preventDefault(); completeSetup(); }} className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold font-display text-ink">Business Profile</h2>
                    <p className="text-ink-muted text-sm mt-1">Used to pre-fill official government filings & track renewals</p>
                  </div>

                  {/* Summary of Locked Location & Category */}
                  <div className="p-3 bg-base/80 border border-rule rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold font-display text-ink">
                          {selectedCity.flag} {selectedCity.label} ({selectedCity.country})
                        </div>
                        <div className="text-[11px] font-mono text-ink-muted">
                          Category: {BUSINESS_TYPES.find(b => b.id === businessType)?.label || businessType}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-accent hover:underline px-2 py-1"
                    >
                      Change
                    </button>
                  </div>

                  {PROFILE_FIELDS.map(({ label, key, type, required, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold font-display text-ink-faint uppercase tracking-wide mb-1">
                        {label}{required && ' *'}
                      </label>
                      <input
                        type={type}
                        value={profile[key] || ''}
                        onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                        className="input"
                        placeholder={placeholder}
                        required={required}
                      />
                    </div>
                  ))}

                  <div className="flex gap-3 pt-3">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                      <ArrowLeft size={16} /> Back
                    </button>
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

