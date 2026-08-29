import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { DemoProvider } from './context/DemoContext.jsx';
import './i18n/index.js';
import './index.css';

// Ensure default theme
document.documentElement.classList.remove('dark');

// Root ErrorBoundary — catches render crashes, shows debug UI instead of blank screen
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('App crashed:', error, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ fontFamily: '"DM Sans", system-ui, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F2EB', padding: 24 }}>
        <div style={{ background: '#FEFDFB', borderRadius: 24, padding: 40, maxWidth: 480, width: '100%', boxShadow: '0 4px 24px rgba(28,25,23,0.08)', border: '1px solid #E7E0D5' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: 22, fontWeight: 700, color: '#1C1917', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#78716C', fontSize: 14, marginBottom: 20 }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button onClick={() => window.location.reload()} style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', background: '#D97706', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
            Reload App
          </button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <DemoProvider>
        <AuthProvider>
          <App />
          <Toaster position="top-right" toastOptions={{
            duration: 4000,
            style: { borderRadius: 12, fontSize: 14, fontFamily: '"DM Sans", system-ui, sans-serif' },
            success: { style: { background: '#6B8F71', color: '#fff' } },
            error: { style: { background: '#C2410C', color: '#fff' } },
          }} />
        </AuthProvider>
      </DemoProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
