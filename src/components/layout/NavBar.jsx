import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, BarChart2, Settings, Map, LogOut, Bell, Zap } from 'lucide-react';
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
        <Button variant="ghost" size="icon" className="size-8 rounded-full p-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-ink text-white text-xs font-semibold font-display">
              {initials}
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
        <div className="flex items-center gap-3">
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
            <PopoverContent align="start" className="w-48 p-1 md:hidden">
              <nav className="flex flex-col gap-0.5">
                {NAV.map(({ to, icon: Icon, key }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-accent text-white'
                          : 'text-ink-muted hover:text-ink hover:bg-base-dark'
                      }`
                    }
                  >
                    <Icon size={16} />
                    {t(key)}
                  </NavLink>
                ))}
              </nav>
            </PopoverContent>
          </Popover>

          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center">
            <DockItLogo size="sm" />
          </NavLink>
        </div>

        {/* Center: Desktop horizontal clean text navigation links */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
          {NAV.map(({ to, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors py-1.5 ${
                  isActive
                    ? 'text-ink font-semibold'
                    : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {t(key)}
            </NavLink>
          ))}
        </div>

        {/* Right side: Action Cluster */}
        <div className="flex items-center gap-3">
          {/* Demo mode indicator */}
          {isDemo && (
            <div className="hidden sm:flex items-center gap-1.5 bg-accent/10 px-2.5 py-1 rounded-xl">
              <Zap size={12} className="text-accent" />
              <select
                value={activeProfileId}
                onChange={(e) => switchDemoProfile(e.target.value)}
                className="bg-transparent text-accent font-bold text-xs focus:outline-none cursor-pointer font-display"
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold font-display border border-rule bg-surface hover:bg-base text-ink transition-colors cursor-pointer"
            title="Switch Language / भाषा बदलें"
          >
            <span className="text-[11px] uppercase tracking-wider">{i18n.language === 'hi' ? 'हिन्दी' : 'EN'}</span>
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
