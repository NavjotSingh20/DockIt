import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ClipboardList, BarChart2, Settings, Map, LogOut, Bell, Zap, Sparkles, Globe, Mail, Send, Check, Loader2, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useDemo } from '../../context/DemoContext';
import { useTheme } from '../../context/ThemeContext';
import { signOut, updateBusiness } from '../../services/supabase';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import DockItLogo from '../ui/DockItLogo';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/requirements', icon: ClipboardList, key: 'nav.requirements' },
  { to: '/analytics', icon: BarChart2, key: 'nav.analytics' },
  { to: '/ai', icon: Sparkles, key: 'nav.compliance_ai' },
];

function UserMenu({ business, user, isDemo, onSignOut }) {
  const { i18n, t } = useTranslation();
  const { updateDemoBusiness } = useDemo();

  // Expiry reminders state
  const [emailReminders, setEmailReminders] = useState(() => {
    const saved = localStorage.getItem('emailReminders');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [reminderDays, setReminderDays] = useState(() => {
    const saved = localStorage.getItem('reminderDays');
    return saved !== null ? JSON.parse(saved) : [60, 30, 7];
  });

  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  useEffect(() => {
    if (business?.email_reminders_enabled !== undefined) {
      setEmailReminders(business.email_reminders_enabled);
    }
    if (Array.isArray(business?.reminder_days) && business.reminder_days.length > 0) {
      setReminderDays(business.reminder_days);
    }
  }, [business]);

  const syncReminderPrefs = async (enabled, days) => {
    localStorage.setItem('emailReminders', JSON.stringify(enabled));
    localStorage.setItem('reminderDays', JSON.stringify(days));

    if (isDemo) {
      updateDemoBusiness({ email_reminders_enabled: enabled, reminder_days: days });
      return;
    }

    if (business?.id) {
      try {
        await updateBusiness(business.id, { email_reminders_enabled: enabled, reminder_days: days });
      } catch (err) {
        console.error('Failed to sync reminder preferences:', err);
      }
    }
  };

  const handleToggleEmailReminders = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !emailReminders;
    setEmailReminders(next);
    syncReminderPrefs(next, reminderDays);
    toast.success(next ? 'Email expiry reminders enabled' : 'Email expiry reminders paused');
  };

  const handleToggleReminderDay = (day, e) => {
    e.preventDefault();
    e.stopPropagation();
    let next;
    if (reminderDays.includes(day)) {
      if (reminderDays.length === 1) {
        toast.error('Keep at least one reminder interval active');
        return;
      }
      next = reminderDays.filter(d => d !== day);
    } else {
      next = [...reminderDays, day].sort((a, b) => b - a);
    }
    setReminderDays(next);
    syncReminderPrefs(emailReminders, next);
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDemo) {
      toast.success('Test email sent! (Demo mode — no real email dispatched)');
      return;
    }
    const targetEmail = user?.email || business?.email;
    if (!targetEmail) {
      toast.error('No email address found');
      return;
    }
    setSendingTestEmail(true);
    try {
      const res = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          ownerName: business?.owner_name || 'Business Owner',
          licenseName: 'Test License Reminder',
          daysLeft: 7,
          expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          penalty: 500,
          renewalUrl: window.location.origin + '/dashboard',
          country: business?.country || 'USA',
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        toast.error('Email API not reachable locally. Available in production environment.');
        return;
      }

      const data = await res.json();
      if (data.success) {
        toast.success(`Test email sent to ${targetEmail}!`);
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch {
      toast.error('Email API service currently offline');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const initials = (business?.business_name || user?.email || 'DU')
    .split(/[\s@]+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-full p-0 flex items-center justify-center overflow-hidden">
          <Avatar className="h-8 w-8 flex items-center justify-center">
            <AvatarFallback className="bg-ink text-white text-xs font-semibold font-display flex items-center justify-center leading-none select-none">
              <span className="leading-none select-none flex items-center justify-center">
                {initials}
              </span>
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden shadow-card border border-rule-dark bg-surface">
        {/* User Profile Info Header */}
        <div className="p-3.5 bg-base/60 border-b border-rule flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-rule-dark">
            <AvatarFallback className="bg-ink text-white text-xs font-bold font-display">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="text-sm font-bold font-display text-ink truncate leading-tight">
              {business?.business_name || 'Demo User'}
            </p>
            <p className="text-xs text-ink-muted truncate font-mono mt-0.5">
              {user?.email || business?.email || 'demo@dockit.in'}
            </p>
          </div>
        </div>

        {/* Section 1: Language & Regional Preferences */}
        <div className="p-3.5 border-b border-rule space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold font-display text-ink">
              <Globe size={14} className="text-accent" />
              <span>Interface Language / भाषा</span>
            </div>
            <span className="text-[10px] font-mono text-ink-faint uppercase font-semibold">
              {i18n.language === 'hi' ? 'हिन्दी' : 'English'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                i18n.changeLanguage('en');
                toast.success('Language set to English');
              }}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-bold font-display border transition-all flex items-center justify-center gap-1.5 ${
                i18n.language !== 'hi'
                  ? 'bg-accent text-white border-accent shadow-xs'
                  : 'bg-base text-ink-muted border-rule hover:border-accent/40 hover:text-ink'
              }`}
            >
              <span>English</span>
              {i18n.language !== 'hi' && <Check size={12} strokeWidth={3} />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                i18n.changeLanguage('hi');
                toast.success('भाषा बदलकर हिन्दी कर दी गई है');
              }}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-bold font-display border transition-all flex items-center justify-center gap-1.5 ${
                i18n.language === 'hi'
                  ? 'bg-accent text-white border-accent shadow-xs'
                  : 'bg-base text-ink-muted border-rule hover:border-accent/40 hover:text-ink'
              }`}
            >
              <span>हिन्दी (Hindi)</span>
              {i18n.language === 'hi' && <Check size={12} strokeWidth={3} />}
            </button>
          </div>
        </div>

        {/* Section 2: Email Expiry Reminders */}
        <div className="p-3.5 border-b border-rule space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold font-display text-ink">
              <Mail size={14} className="text-accent" />
              <span>Email Expiry Reminders</span>
            </div>

            {/* Switch Toggle */}
            <button
              type="button"
              onClick={handleToggleEmailReminders}
              className={`w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0 p-0.5 ${
                emailReminders ? 'bg-accent' : 'bg-rule'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 bg-white rounded-full shadow-xs transition-transform ${
                  emailReminders ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {emailReminders && (
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-semibold text-ink-faint uppercase font-display tracking-wider">
                Send Alerts (Days in advance):
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '60d', value: 60 },
                  { label: '30d', value: 30 },
                  { label: '7d', value: 7 },
                  { label: '1d', value: 1 },
                ].map(({ label, value }) => {
                  const active = reminderDays.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={(e) => handleToggleReminderDay(value, e)}
                      className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                        active
                          ? 'bg-accent/10 border-accent text-accent-dark ring-1 ring-accent/30 font-bold'
                          : 'bg-base border-rule text-ink-muted hover:border-accent/40'
                      }`}
                      title={`Send alert ${value} days prior to expiration`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Send Test Email Button */}
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail}
                className="w-full mt-1.5 py-1.5 px-3 rounded-xl border border-rule hover:border-accent hover:text-accent text-[11px] font-display font-bold text-ink-muted flex items-center justify-center gap-1.5 transition-all bg-base/60"
              >
                {sendingTestEmail ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                {sendingTestEmail ? 'Sending…' : 'Send Test Reminder Email'}
              </button>
            </div>
          )}
        </div>

        {/* Navigation & Logout Links */}
        <div className="p-1.5 space-y-0.5">
          <DropdownMenuItem asChild>
            <NavLink to="/settings" className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg text-xs font-semibold text-ink hover:bg-base">
              <Settings size={14} className="text-ink-muted" />
              <span>Settings & Business Profile</span>
            </NavLink>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-2 text-danger focus:text-danger cursor-pointer rounded-lg text-xs font-semibold hover:bg-red-50/50"
          >
            <LogOut size={14} />
            <span>{isDemo ? 'Exit Demo' : 'Sign Out'}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationBell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 relative rounded-full">
          <Bell size={16} />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center font-bold"
          >
            3
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
        <DropdownMenuLabel className="flex items-center justify-between p-3">
          Notifications
          <Badge variant="secondary" className="text-[11px]">3 new</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-80 overflow-y-auto chat-scroll p-1 space-y-1">
          <DropdownMenuItem className="flex-col items-start p-3 cursor-pointer rounded-lg">
            <div className="flex w-full items-center justify-between">
              <span className="font-medium text-xs text-ink">NYC License Renewal</span>
              <span className="text-[10px] text-ink-faint">2m ago</span>
            </div>
            <span className="text-xs text-ink-muted mt-1 leading-snug">
              Food Service Establishment permit expires in 28 days
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex-col items-start p-3 cursor-pointer rounded-lg">
            <div className="flex w-full items-center justify-between">
              <span className="font-medium text-xs text-ink">Smart-Diff Updated</span>
              <span className="text-[10px] text-ink-faint">1h ago</span>
            </div>
            <span className="text-xs text-ink-muted mt-1 leading-snug">
              Added Los Angeles, CA requirements to catalog
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex-col items-start p-3 cursor-pointer rounded-lg">
            <div className="flex w-full items-center justify-between">
              <span className="font-medium text-xs text-ink">Compliance Score</span>
              <span className="text-[10px] text-ink-faint">3h ago</span>
            </div>
            <span className="text-xs text-ink-muted mt-1 leading-snug">
              Current status: 100% compliant in active jurisdictions
            </span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function NavBar({ business }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isDemo, exitDemo, activeProfileId, switchDemoProfile, demoProfiles } = useDemo();
  const navigate = useNavigate();
  const location = useLocation();

  const navContainerRef = useRef(null);
  const navItemRefs = useRef({});
  const [activeUnderline, setActiveUnderline] = useState({ left: 0, width: 0, opacity: 0 });

  const updateActiveUnderline = useCallback(() => {
    const activeNav = NAV.find(
      ({ to }) => location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
    );
    if (activeNav && navItemRefs.current[activeNav.to] && navContainerRef.current) {
      const containerRect = navContainerRef.current.getBoundingClientRect();
      const itemRect = navItemRefs.current[activeNav.to].getBoundingClientRect();
      const left = itemRect.left - containerRect.left + 8;
      const width = Math.max(0, itemRect.width - 16);
      setActiveUnderline({ left, width, opacity: 1 });
    } else {
      setActiveUnderline((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [location.pathname]);

  useEffect(() => {
    // Run immediately and after a tick to ensure font renders
    updateActiveUnderline();
    const timeout = setTimeout(updateActiveUnderline, 50);
    const handleResize = () => updateActiveUnderline();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [updateActiveUnderline, i18n.language]);

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-b border-rule">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-6 relative">
        {/* Left side: Mobile Trigger + Logo */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile menu trigger */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="group size-8 md:hidden"
                variant="ghost"
                size="icon"
              >
                <svg
                  className="pointer-events-none"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 12L20 12"
                    className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
                  />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-1.5 md:hidden bg-surface border border-rule shadow-card">
              <nav className="flex flex-col gap-1">
                {NAV.map(({ to, icon: Icon, key }) => {
                  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold font-display transition-all ${
                        isActive
                          ? 'bg-accent/10 text-accent font-bold border-l-2 border-accent'
                          : 'text-ink-muted hover:text-ink hover:bg-base'
                      }`}
                    >
                      <Icon size={15} className={isActive ? 'text-accent' : 'text-ink-faint'} />
                      <span>{t(key)}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </PopoverContent>
          </Popover>

          {/* Logo */}
          <NavLink to="/dashboard" className="inline-flex items-center">
            <DockItLogo size="sm" />
          </NavLink>
        </div>

        {/* Center: Desktop horizontal navigation links in centered flex container */}
        <div className="hidden md:flex flex-1 items-center justify-center px-2 min-w-0">
          <nav
            ref={navContainerRef}
            className="relative inline-flex items-center gap-1 bg-base/60 p-1 rounded-xl border border-rule/50 shadow-subtle shrink-0"
          >
            {/* Smooth gliding active indicator underline */}
            <motion.span
              className="absolute -bottom-1 h-[2.5px] bg-accent rounded-full shadow-sm z-10 pointer-events-none"
              initial={false}
              animate={{
                left: activeUnderline.left,
                width: activeUnderline.width,
                opacity: activeUnderline.opacity,
              }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />

            {NAV.map(({ to, key, icon: Icon }) => {
              const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <NavLink
                  key={to}
                  to={to}
                  ref={(el) => {
                    if (el) navItemRefs.current[to] = el;
                  }}
                  className={`relative z-10 px-3 py-1.5 text-xs font-semibold font-display transition-colors rounded-lg inline-flex items-center gap-1.5 select-none leading-none ${
                    isActive ? 'text-ink font-bold' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-accent' : 'text-ink-faint transition-colors'} />
                  <span className="leading-none">{t(key)}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Right side: Action Cluster */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Demo mode indicator */}
          {isDemo && (
            <div className="hidden sm:inline-flex items-center h-8 gap-1.5 bg-accent/10 px-2.5 rounded-xl leading-none">
              <Zap size={12} className="text-accent shrink-0" />
              <select
                value={activeProfileId}
                onChange={(e) => switchDemoProfile(e.target.value)}
                className="bg-transparent text-accent font-bold text-xs focus:outline-none cursor-pointer font-display leading-none"
              >
                {(demoProfiles || []).map((p) => (
                  <option key={p.id} value={p.id} className="text-ink font-medium bg-surface">
                    {t(`profiles.${p.id}`, p.label)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ThemeToggle />
          <NotificationBell />
          <UserMenu
            business={business}
            user={user}
            isDemo={isDemo}
            onSignOut={handleSignOut}
          />
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggle}
      type="button"
      className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-base border border-rule/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 relative flex items-center justify-center shrink-0 cursor-pointer pointer-events-auto select-none"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      <motion.div
        key={isDark ? 'dark' : 'light'}
        initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center pointer-events-none"
      >
        {isDark ? (
          <Sun size={17} className="text-amber-400 hover:text-amber-300" />
        ) : (
          <Moon size={17} className="text-ink-muted hover:text-ink" />
        )}
      </motion.div>
    </button>
  );
}
