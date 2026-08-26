import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useDemo } from '../../context/DemoContext';
import { X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getBusiness } from '../../services/supabase';

export default function AppLayout() {
  const { user } = useAuth();
  const { isDemo, demoBusiness, exitDemo } = useDemo();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(isDemo ? demoBusiness : undefined);

  useEffect(() => {
    if (isDemo) { setBusiness(demoBusiness); return; }
    if (user) {
      getBusiness(user.id)
        .then(biz => {
          if (biz) setBusiness(biz);
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
  }, [user, isDemo, navigate]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar business={business} />
      <div className="flex-1 lg:ml-64 flex flex-col">
        {/* Demo Banner */}
        {isDemo && (
          <div className="bg-blue-600 text-white text-sm font-medium px-4 py-2.5 flex items-center justify-between">
            <span>📊 Demo Mode — Sample restaurant data loaded. No real data is being saved.</span>
            <button onClick={() => { exitDemo(); navigate('/'); }} className="flex items-center gap-1 text-blue-200 hover:text-white text-xs">
              <X size={14} /> Exit Demo
            </button>
          </div>
        )}
        <main className="flex-1 px-4 py-6 lg:px-8 pb-24 lg:pb-8">
          <Outlet context={{ business }} />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
