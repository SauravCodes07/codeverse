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
import { api } from './lib/api';
import { NotificationToast } from './components/NotificationToast';

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
      // Set the token in the store first so subsequent requests use it
      useAppStore.getState().setAuth(null, token); 
      
      api.getMe()
        .then(user => {
          if (user && !user.error) {
            useAppStore.getState().setAuth(user, token);
            useAppStore.getState().addNotification({ 
              type: 'success', 
              message: `Welcome, ${user.full_name || user.username}!` 
            });
            setPage('ide');
          }
        })
        .catch(err => {
          console.error('OAuth profile fetch failed', err);
          useAppStore.getState().addNotification({ 
            type: 'error', 
            message: 'Authentication failed. Please try again.' 
          });
        })
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
