import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store/useAppStore';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import OTPPage from './pages/OTPPage';
import IDEWorkspace from './pages/IDEWorkspace';

import { PageType } from './types';
import { SmoothScroll } from './components/SmoothScroll';
import { PageTransition } from './components/PageTransition';

// ============================================================
// NOTIFICATION TOAST
// ============================================================

const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useAppStore();

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {notifications.map((n) => {
        const colors: Record<string, string> = {
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
          info: '#4f7cff',
        };
        return (
          <div
            key={n.id}
            className="animate-slide-in-right"
            style={{
              padding: '12px 20px',
              background: 'rgba(22, 27, 44, 0.95)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${colors[n.type]}40`,
              borderLeft: `3px solid ${colors[n.type]}`,
              borderRadius: '10px',
              color: '#e2e8f0',
              fontSize: '14px',
              maxWidth: '360px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onClick={() => removeNotification(n.id)}
          >
            <span style={{ fontSize: '16px' }}>
              {n.type === 'success'
                ? '✓'
                : n.type === 'error'
                ? '✕'
                : n.type === 'warning'
                ? '⚠'
                : 'ℹ'}
            </span>
            {n.message}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// APP
// ============================================================

function App() {
  const { isAuthenticated } = useAppStore();
  const [page, setPage] = useState<PageType>('landing');
  const [pendingEmail, setPendingEmail] = useState('');

  // Handle OAuth Token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      // We need to fetch the user profile using the token
      // For now, we'll just set it and the store should handle the rest or we fetch 'me'
      fetch('http://localhost:3000/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(user => {
        if (user && !user.error) {
          useAppStore.getState().setAuth(user, token);
          useAppStore.getState().addNotification({ 
            type: 'success', 
            message: `Welcome, ${user.full_name}!` 
          });
          setPage('ide');
        }
      })
      .catch(err => console.error('OAuth profile fetch failed', err))
      .finally(() => {
        // Clean the URL
        window.history.replaceState({}, document.title, "/");
      });
    }
  }, []);

  // If user is already authenticated, send to IDE
  useEffect(() => {
    if (isAuthenticated && page === 'landing') {
      setPage('ide');
    }
  }, [isAuthenticated, page]);

  const handleNavigate = useCallback(
    (nextPage: PageType, email?: string) => {
      if (email) setPendingEmail(email);
      setPage(nextPage);
    },
    []
  );

  const renderPage = () => {
    switch (page) {
      case 'landing':
        return (
          <LandingPage
            onNavigate={handleNavigate}
          />
        );
      case 'login':
        return (
          <LoginPage onNavigate={handleNavigate} />
        );
      case 'register':
        return (
          <RegisterPage onNavigate={handleNavigate} />
        );
      case 'forgot':
        return (
          <ForgotPasswordPage onNavigate={handleNavigate} />
        );
      case 'otp':
        return (
          <OTPPage
            email={pendingEmail}
            onNavigate={handleNavigate}
          />
        );
      case 'ide':
        return <IDEWorkspace onNavigate={handleNavigate} />;
      default:
        return (
          <LandingPage onNavigate={handleNavigate} />
        );
    }
  };

  return (
    <ErrorBoundary>
      <div style={{ height: '100%', isolation: 'isolate' }}>
        <ErrorBoundary
          fallback={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                background: 'var(--color-bg-primary)',
                color: 'var(--color-text-secondary)',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <span style={{ fontSize: '32px' }}>🚀</span>
              <p style={{ fontSize: '14px' }}>
                Page error — returning to home
              </p>
              <button
                className="btn-primary"
                onClick={() => setPage('landing')}
              >
                Go Home
              </button>
            </div>
          }
        >
          <SmoothScroll>
            <PageTransition pageKey={page}>
              {renderPage()}
            </PageTransition>
          </SmoothScroll>
        </ErrorBoundary>
        <NotificationToast />
      </div>
    </ErrorBoundary>
  );
}

export default App;
