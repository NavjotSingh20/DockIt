import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Settings, LogOut, Zap, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useDemo } from '../../context/DemoContext';
import { signOut } from '../../services/supabase';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/analytics', icon: BarChart2, key: 'nav.analytics' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
];

export default function Sidebar({ business }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo, exitDemo } = useDemo();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (isDemo) { exitDemo(); navigate('/'); return; }
    signOut().catch(console.error);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-[#0D1B2A] text-white fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight">ComplianceAI</div>
            <div className="text-blue-300 text-xs">Never miss a renewal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${isActive ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`
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
          <div className="bg-blue-600/20 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-blue-300">
            <Zap size={12} /> Demo Mode Active
          </div>
        )}
        <div className="px-3">
          <div className="text-sm font-semibold text-white truncate">{business?.business_name || user?.email || 'Demo User'}</div>
          <div className="text-xs text-white/40 truncate">{user?.email || 'demo@complianceai.in'}</div>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={16} /> {isDemo ? t('dashboard.exit_demo') : t('nav.sign_out')}
        </button>
      </div>
    </aside>
  );
}
