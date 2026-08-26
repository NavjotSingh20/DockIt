import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, CheckCircle, Bell, Zap, TrendingDown, ChevronRight } from 'lucide-react';
import { useDemo } from '../context/DemoContext';
import toast from 'react-hot-toast';

const STATS = [
  { number: '63M+', label: 'Small Businesses in India' },
  { number: '8-12', label: 'Licenses Required Per Business' },
  { number: '₹5L', label: 'Max Penalty Per Lapse' },
];

const HOW = [
  { icon: '📸', title: 'Scan Your License', desc: 'Photograph any license document — AI extracts all fields automatically' },
  { icon: '🎯', title: 'Track Everything', desc: 'One dashboard for all licenses with live expiry countdowns' },
  { icon: '🔔', title: 'Never Miss a Date', desc: 'Smart email reminders 60, 30, 7 days before expiry' },
];

const SAMPLE_LICENSES = [
  { name: 'FSSAI Food License', days: -12, status: 'expired' },
  { name: 'Fire NOC', days: 8, status: 'expiring' },
  { name: 'Trade License', days: 23, status: 'expiring' },
  { name: 'Shop & Establishment', days: 52, status: 'expiring' },
  { name: 'GST Registration', days: 240, status: 'active' },
  { name: 'Eating House License', days: 180, status: 'active' },
];

function CountUp({ target, prefix = '', suffix = '' }) {
  return <span>{prefix}{target}{suffix}</span>;
}

export default function Landing() {
  const navigate = useNavigate();
  const { enterDemo } = useDemo();

  const handleDemo = () => {
    enterDemo();
    navigate('/dashboard');
    toast.success('🎉 Demo mode loaded — explore all features!');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">ComplianceAI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleDemo} className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors px-3 py-2">
              Try Demo
            </button>
            <button onClick={() => navigate('/onboard')} className="btn-primary text-sm py-2.5">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 max-w-6xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-8 border border-blue-100">
            <Zap size={14} /> Trusted by 500+ Bengaluru businesses
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight mb-6 tracking-tight">
            Never lose your business<br />
            <span className="text-blue-600">to an expired license</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            ComplianceAI tracks all your government licenses, sends smart reminders, and pre-fills renewal forms — automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/onboard')} className="btn-primary text-base px-8 py-4">
              Get Started Free <ArrowRight size={18} />
            </button>
            <button onClick={handleDemo} className="btn-secondary text-base px-8 py-4">
              <Zap size={18} /> See Demo
            </button>
          </div>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-16 relative">
          <div className="bg-[#0D1B2A] rounded-3xl p-6 shadow-2xl max-w-3xl mx-auto text-left">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-amber-500" /><div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="flex-1 bg-white/10 rounded-lg h-6 mx-4" />
            </div>
            <div className="bg-white rounded-2xl p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div><div className="font-bold text-gray-900">Good morning, Rajesh 👋</div><div className="text-xs text-gray-400">Spice Garden Restaurant · Bengaluru</div></div>
                <div className="text-center"><div className="text-3xl font-black text-amber-600">52</div><div className="text-xs text-gray-400">Compliance Score</div></div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
                ⚠️ Critical: 1 expired license · ₹25,000 penalty exposure
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_LICENSES.slice(0, 3).map((l, i) => (
                <div key={i} className={`rounded-xl p-3 text-xs ${l.status === 'expired' ? 'bg-red-100' : l.status === 'expiring' ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <div className="font-semibold text-gray-700 mb-1 truncate">{l.name}</div>
                  <div className={`font-black text-lg ${l.status === 'expired' ? 'text-red-600' : l.status === 'expiring' ? 'text-amber-600' : 'text-green-600'}`}>
                    {l.days < 0 ? 'EXPIRED' : `${l.days}d`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="bg-[#0D1B2A] py-16 px-4">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
              <div className="text-5xl font-black text-blue-400 mb-2">{s.number}</div>
              <div className="text-gray-400 text-sm">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">How It Works</h2>
          <p className="text-gray-500">Three simple steps to full compliance</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {HOW.map((h, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }} viewport={{ once: true }}
              className="text-center p-8 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
              <div className="text-5xl mb-4">{h.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{h.title}</h3>
              <p className="text-gray-500 text-sm">{h.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Problem section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">The Problem We Solve</h2>
            <p className="text-gray-500">Most businesses don't know which licenses are expiring until it's too late</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-50">
              <div className="text-sm font-semibold text-gray-500">Spice Garden Restaurant — License Status</div>
            </div>
            {SAMPLE_LICENSES.map((l, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700 font-medium">{l.name}</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${l.status === 'expired' ? 'bg-red-100 text-red-700' : l.status === 'expiring' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {l.days < 0 ? `${Math.abs(l.days)}d overdue` : `${l.days}d left`}
                </span>
              </motion.div>
            ))}
            <div className="p-4 bg-red-50 border-t border-red-100">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                <TrendingDown size={16} /> This business has 1 expired + 3 expiring licenses · Total penalty exposure: ₹1,35,000
              </div>
            </div>
          </div>
          <div className="text-center mt-8">
            <button onClick={handleDemo} className="btn-primary text-base px-8 py-4">
              See How ComplianceAI Prevents This <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0D1B2A] text-gray-400 py-12 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Shield size={18} className="text-blue-400" />
          <span className="text-white font-bold">ComplianceAI</span>
        </div>
        <p className="text-sm">Never miss a business license renewal</p>
        <p className="text-xs mt-2 text-gray-600">Made for Indian Businesses · Bengaluru, Karnataka</p>
      </footer>
    </div>
  );
}
