import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, BarChart2, Settings, LogOut, Zap, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useDemo } from '../../context/DemoContext';
import { signOut } from '../../services/supabase';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/requirements', icon: ClipboardList, key: 'nav.requirements' },
  { to: '/map', icon: Map, key: 'nav.map' },
  { to: '/analytics', icon: BarChart2, key: 'nav.analytics' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
];

export default function Sidebar({ business }) {
  const { t } = useTranslation();
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
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-ink text-white fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">D</span>
          </div>
          <div>
            <div className="font-display font-bold text-base tracking-tight">Dock<span className="text-accent">It</span></div>
            <div className="text-accent/60 text-xs font-display">Compliance discovery</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${isActive ? 'bg-accent text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`
            }
          >
            <Icon size={18} />
            {t(key)}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-6 border-t border-white/10 space-y-3">
        {isDemo && (
          <div className="bg-accent/20 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-accent font-bold">
              <Zap size={13} /> Demo Mode Active
            </div>
            <select
              value={activeProfileId}
              onChange={(e) => switchDemoProfile(e.target.value)}
              className="w-full bg-ink/80 text-white border border-white/20 rounded-lg px-2 py-1 text-xs focus:outline-none"
            >
              {(demoProfiles || []).map((p) => (
                <option key={p.id} value={p.id} className="bg-ink text-white">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="px-3">
          <div className="text-sm font-semibold text-white truncate">{business?.business_name || user?.email || 'Demo User'}</div>
          <div className="text-xs text-white/40 truncate">{user?.email || 'demo@dockit.in'}</div>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={16} /> {isDemo ? t('dashboard.exit_demo') : t('nav.sign_out')}
        </button>
      </div>
    </aside>
  );
}
