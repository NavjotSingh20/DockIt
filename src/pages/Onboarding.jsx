import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, ArrowLeft, Check, Loader2,
  UtensilsCrossed, Scissors, ShoppingBag, Stethoscope,
  HardHat, GraduationCap, Factory, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase, signInWithOtp, verifyOtp, createBusiness } from '../services/supabase';
import { BUSINESS_TYPES } from '../utils/licenseTypes';

const ICON_MAP = { UtensilsCrossed, Scissors, ShoppingBag, Stethoscope, HardHat, GraduationCap, Factory, Briefcase };
const STEPS = ['Verify Email', 'Business Type', 'Business Profile'];

const field = (label, key, type = 'text', required = false) => ({ label, key, type, required });
const PROFILE_FIELDS = [
  field('Business Name', 'business_name', 'text', true),
  field('Owner Name', 'owner_name', 'text', true),
  field('Phone Number', 'phone', 'tel', true),
  field('Business Address', 'address', 'text', true),
  field('City', 'city'),
  field('State', 'state'),
  field('GSTIN (optional)', 'gstin'),
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [businessType, setBusinessType] = useState('');
  const [profile, setProfile] = useState({ city: 'Bengaluru', state: 'Karnataka' });

  // Step 1 — OTP
  const sendOtp = async () => {
    if (!email) { toast.error('Enter your email'); return; }
    setLoading(true);
    try {
      await signInWithOtp(email);
      setOtpSent(true);
      toast.success('OTP sent to ' + email);
    } catch (err) { toast.error(err.message); }
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
    if (code.length < 8) { toast.error('Enter the complete OTP code'); return; }
    setLoading(true);
    try {
      await verifyOtp(email, code);
      setStep(1);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  // Step 3 — Save profile
  const completeSetup = async () => {
    if (!profile.business_name || !profile.owner_name || !profile.phone) {
      toast.error('Please fill required fields'); return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await createBusiness({ ...profile, business_type: businessType, owner_id: user.id, email: user.email, compliance_score: 100 });
      navigate('/dashboard', { replace: true });
      toast.success('🎉 Welcome to ComplianceAI!');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">ComplianceAI</span>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-2 mt-4 mb-1">
            {STEPS.map((s, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
          <div className="text-xs text-gray-400">Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <AnimatePresence mode="wait">

            {/* Step 1 — Email OTP */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Protect your business<br />in 2 minutes</h2>
                  <p className="text-gray-500 text-sm mt-2">Enter your email to get started</p>
                </div>
                <div className="space-y-3">
                  <input type="email" placeholder="you@business.com" value={email}
                    onChange={e => setEmail(e.target.value)} className="input" disabled={otpSent} />
                  {!otpSent
                    ? <button onClick={sendOtp} disabled={loading} className="btn-primary w-full">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        {loading ? 'Sending…' : 'Send OTP'} <ArrowRight size={16} />
                      </button>
                    : <>
                        <div>
                          <p className="text-sm text-gray-600 mb-3 text-center">Enter the code sent to <strong>{email}</strong></p>
                          <div className="flex gap-2 justify-center">
                            {otp.map((v, i) => (
                              <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1}
                                value={v} onChange={e => handleOtpChange(i, e.target.value)}
                                className="w-11 h-12 text-center text-lg font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                            ))}
                          </div>
                        </div>
                        <button onClick={verifyOtpCode} disabled={loading} className="btn-primary w-full">
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          Verify & Continue
                        </button>
                        <button onClick={() => setOtpSent(false)} className="text-sm text-blue-600 w-full text-center hover:underline">← Change email</button>
                      </>
                  }
                </div>
              </motion.div>
            )}

            {/* Step 2 — Business Type */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">What type of business<br />do you run?</h2>
                  <p className="text-gray-500 text-sm mt-2">We'll recommend the right licenses for you</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {BUSINESS_TYPES.map((bt) => {
                    const Icon = ICON_MAP[bt.icon] || Briefcase;
                    const selected = businessType === bt.id;
                    return (
                      <button key={bt.id} onClick={() => setBusinessType(bt.id)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                        <Icon size={20} className={selected ? 'text-blue-600' : 'text-gray-400'} />
                        <span className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-gray-700'}`}>{bt.label}</span>
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
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Business Profile</h2>
                  <p className="text-gray-500 text-sm mt-1">Used to pre-fill renewal forms automatically</p>
                </div>
                {PROFILE_FIELDS.map(({ label, key, type, required }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}{required && ' *'}</label>
                    <input type={type} value={profile[key] || ''} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} className="input" placeholder={label} />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1"><ArrowLeft size={16} /> Back</button>
                  <button onClick={completeSetup} disabled={loading} className="btn-primary flex-1">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {loading ? 'Setting up…' : 'Complete Setup'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
