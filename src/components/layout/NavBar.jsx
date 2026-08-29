import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ClipboardList, BarChart2, Settings, Map, LogOut, Bell, Zap, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useDemo } from '../../context/DemoContext';
import { signOut } from '../../services/supabase';
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold font-display text-ink leading-none">
              {business?.business_name || 'Demo User'}
            </p>
            <p className="text-xs text-ink-faint leading-none">
              {user?.email || 'demo@dockit.in'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <NavLink to="/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings size={14} />
            Settings
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSignOut}
          className="text-danger focus:text-danger cursor-pointer"
        >
          <LogOut size={14} className="mr-2" />
          {isDemo ? 'Exit Demo' : 'Sign Out'}
        </DropdownMenuItem>
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

          {/* Language Switcher (EN / HI) */}
          <button
            onClick={() => {
              const newLang = i18n.language === 'hi' ? 'en' : 'hi';
              i18n.changeLanguage(newLang);
            }}
            className="inline-flex items-center justify-center h-8 px-2.5 rounded-xl text-xs font-bold font-display border border-rule bg-surface hover:bg-base text-ink transition-colors cursor-pointer leading-none select-none"
            title="Switch Language / भाषा बदलें"
          >
            <span className="text-[11px] uppercase tracking-wider leading-none">{i18n.language === 'hi' ? 'हिन्दी' : 'EN'}</span>
          </button>

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
