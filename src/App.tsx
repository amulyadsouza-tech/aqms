import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { DocumentationPage } from './pages/DocumentationPage';

function AppContent() {
  const { currentUser, loading } = useAuth();
  
  // Track current route based on browser URL pathname
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Listen to popstate (browser forward/back buttons)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark text-slate-600 dark:text-slate-300">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-institute-blue rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium tracking-wide">Initializing SJEC AQMS Platform...</span>
      </div>
    );
  }

  // Documentation Route: "/admin/documentation"
  if (currentPath === '/admin/documentation' || currentPath.startsWith('/admin/documentation')) {
    return (
      <DocumentationPage
        isStandalone={true}
        onNavigateHome={() => navigateTo('/')}
        onNavigateAdmin={() => navigateTo('/admin')}
        onNavigateTab={(tab: string) => {
          if (tab === 'overview') navigateTo('/admin');
        }}
      />
    );
  }

  // Admin Routes
  if (currentPath === '/admin' || currentPath.startsWith('/admin')) {
    if (currentUser) {
      return (
        <AdminDashboardPage
          onNavigateHome={() => navigateTo('/')}
          onLogout={() => navigateTo('/admin')}
        />
      );
    } else {
      return (
        <AdminLoginPage
          onLoginSuccess={() => navigateTo('/admin')}
          onNavigateHome={() => navigateTo('/')}
        />
      );
    }
  }

  // Default Route: "/"
  return (
    <DashboardPage
      onNavigateAdmin={() => navigateTo('/admin')}
    />
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="relative min-h-screen text-[#24272D] dark:text-white">
          {/* Universal Mountain Landscape Background across all views (public, login, admin, documentation) */}
          <div
            className="fixed inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: 'url(/bg-landscape.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
            }}
            aria-hidden="true"
          />
          {/* Light Mode Overlay: soft subtle tint so mountain stays clearly visible and cards pop */}
          <div
            className="fixed inset-0 z-0 pointer-events-none dark:hidden transition-opacity duration-300"
            style={{ background: 'rgba(232, 244, 253, 0.22)' }}
            aria-hidden="true"
          />
          {/* Dark Mode Overlay: deep charcoal tint keeping mountain clearly visible while ensuring high contrast for dark cards */}
          <div
            className="fixed inset-0 z-0 pointer-events-none hidden dark:block transition-opacity duration-300"
            style={{ background: 'rgba(10, 10, 10, 0.78)' }}
            aria-hidden="true"
          />

          <div className="relative z-10 min-h-screen flex flex-col">
            <AppContent />
          </div>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
