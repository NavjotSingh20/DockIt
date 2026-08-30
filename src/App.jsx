import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useDemo } from './context/DemoContext';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import MyRequirements from './pages/MyRequirements';
import LicenseDetail from './pages/LicenseDetail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import ComplianceAI from './pages/ComplianceAI';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { isDemo } = useDemo();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-base">
      <div className="space-y-3 text-center">
        <div className="w-12 h-12 bg-accent rounded-2xl mx-auto skeleton" />
        <div className="skeleton h-4 w-32 mx-auto rounded" />
      </div>
    </div>
  );
  if (!user && !isDemo) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { isDemo } = useDemo();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboard" element={<Onboarding />} />
      <Route element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/requirements" element={<MyRequirements />} />
        <Route path="/license/:id" element={<LicenseDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/ai" element={<ComplianceAI />} />
        <Route path="/compliance-ai" element={<ComplianceAI />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
