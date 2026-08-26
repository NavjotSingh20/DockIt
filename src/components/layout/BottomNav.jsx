import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/analytics', icon: BarChart2, key: 'nav.analytics' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
];

export default function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-bottom">
      <div className="flex">
        {NAV.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'}`
          }>
            {({ isActive }) => (
              <>
                <Icon size={22} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                <span>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
