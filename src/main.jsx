import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { DemoProvider } from './context/DemoContext.jsx';
import './i18n/index.js';
import './index.css';

// Apply dark mode preference on load
if (localStorage.getItem('darkMode') === 'true') {
  document.documentElement.classList.add('dark');
}

// Root ErrorBoundary — catches render crashes, shows debug UI instead of blank screen
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('App crashed:', error, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 40, maxWidth: 480, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 20 }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button onClick={() => window.location.reload()} style={{ background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
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
            style: { borderRadius: 12, fontSize: 14, fontFamily: 'Inter, sans-serif' },
            success: { style: { background: '#16A34A', color: '#fff' } },
            error: { style: { background: '#DC2626', color: '#fff' } },
          }} />
        </AuthProvider>
      </DemoProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
