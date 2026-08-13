import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4 text-center">
      <div>
        <div className="text-8xl mb-6">🔍</div>
        <h1 className="text-4xl font-bold font-display text-ink mb-3">Page Not Found</h1>
        <p className="text-ink-muted mb-8">This page doesn't exist. Let's get you back on track.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary text-base px-8 py-4">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
