import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, BarChart2, Settings, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/requirements', icon: ClipboardList, key: 'nav.requirements' },
  { to: '/analytics', icon: BarChart2, key: 'nav.analytics' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
];

export default function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-rule safe-area-bottom">
      <div className="flex">
        {NAV.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-accent' : 'text-ink-faint'}`
          }>
            {({ isActive }) => (
              <>
                <Icon size={22} className={isActive ? 'text-accent' : 'text-ink-faint'} />
                <span>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
