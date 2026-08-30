import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NavBar from './NavBar';
import { useDemo } from '../../context/DemoContext';
import { X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getBusiness } from '../../services/supabase';

export default function AppLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDemo, demoBusiness, exitDemo, activeProfileId, switchDemoProfile, demoProfiles } = useDemo();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(isDemo ? demoBusiness : undefined);

  useEffect(() => {
    if (isDemo) { 
      setBusiness(demoBusiness); 
      localStorage.setItem('country', demoBusiness?.country || 'USA');
      return; 
    }
    if (user) {
      getBusiness(user.id)
        .then(biz => {
          if (biz) {
            setBusiness(biz);
            localStorage.setItem('country', biz.country || 'India');
          }
          else {
            setBusiness(null);
            window.location.href = '/onboard';
          }
        })
        .catch((e) => {
          console.error(e);
          setBusiness(null);
          window.location.href = '/onboard';
        });
    }
  }, [user, isDemo, navigate, demoBusiness]);

  return (
    <div className="min-h-screen bg-base">
      <NavBar business={business} />
      <div className="pt-16 flex flex-col min-h-screen">
        {/* Demo Banner */}
        {isDemo && (
          <div className="bg-accent text-white text-xs sm:text-sm font-display font-medium px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span><strong>{t('dashboard.demo_mode_active', 'Demo Mode Active')}</strong> —</span>
              <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-xl sm:hidden">
                <span className="text-[11px] text-white/80">Profile:</span>
                <select
                  value={activeProfileId}
                  onChange={(e) => switchDemoProfile(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {(demoProfiles || []).map((p) => (
                    <option key={p.id} value={p.id} className="text-ink font-medium">
                      {t(`profiles.${p.id}`, p.label)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button onClick={() => { exitDemo(); navigate('/'); }} className="flex items-center gap-1 text-white/80 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-all">
              <X size={14} /> {t('dashboard.exit_demo', 'Exit Demo')}
            </button>
          </div>
        )}
        <main className="flex-1 px-4 py-6 lg:px-8 max-w-7xl mx-auto w-full">
          <Outlet context={{ business: isDemo ? demoBusiness : business }} />
        </main>
      </div>
    </div>
  );
}
