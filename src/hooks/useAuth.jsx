import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getBusiness } from '../services/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session (also handles magic link hash in URL)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes — fires when magic link is clicked or OTP verified
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (event === 'SIGNED_IN' && currentUser) {
        // If user is already on /onboard, let Onboarding.jsx control its own step flow
        if (window.location.pathname === '/onboard') return;

        // Otherwise navigate based on whether they have a business profile
        try {
          const biz = await getBusiness(currentUser.id);
          navigate(biz ? '/dashboard' : '/onboard', { replace: true });
        } catch {
          navigate('/onboard', { replace: true });
        }
      }

      if (event === 'SIGNED_OUT') {
        navigate('/', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
