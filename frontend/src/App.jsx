import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
const RegisterStore = lazy(() => import('./pages/RegisterStore'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
import { RefreshCw } from 'lucide-react';

function MainLayout() {
  const { user, loading, authError, retryAuth, logout } = useAuth();
  const [authMode, setAuthMode] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/register') {
      return 'register';
    }
    return 'login';
  });

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/register') {
        setAuthMode('register');
      } else if (window.location.pathname === '/login') {
        setAuthMode('login');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const needsStore = !!user && String(user.role).trim().toUpperCase() !== 'ADMIN' && !user.has_store;
  useEffect(() => {
    if (loading || !user) return undefined;
    const syncPath = () => {
      if (needsStore) {
        window.history.replaceState(null, '', '/register-store');
      } else if (['/login', '/register', '/register-store'].includes(window.location.pathname)) {
        window.history.replaceState(null, '', '/');
      }
    };
    syncPath();
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, [user, loading, needsStore]);

  const handleSwitchToRegister = () => {
    setAuthMode('register');
    if (window.location.pathname !== '/register') {
      window.history.pushState(null, '', '/register');
    }
  };

  const handleSwitchToLogin = () => {
    setAuthMode('login');
    if (window.location.pathname !== '/login') {
      window.history.pushState(null, '', '/login');
    }
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('soundbox_sidebar_collapsed');
    if (saved !== null) return saved === 'true';
    return typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('soundbox_active_tab') || 'user';
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('soundbox_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    localStorage.setItem('soundbox_active_tab', newTab);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Starting Soundbox Portal...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 p-6">
        <p role="alert" className="text-sm text-slate-600 dark:text-slate-300">{authError}</p>
        <button onClick={retryAuth} className="rounded-xl bg-emerald-600 text-white px-5 py-2 cursor-pointer">Try again</button>
        <button onClick={logout} className="text-sm text-slate-500 cursor-pointer">Sign out</button>
      </div>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    if (authMode === 'register') {
      return <Register onSwitchToLogin={handleSwitchToLogin} />;
    }
    return <Login onSwitchToRegister={handleSwitchToRegister} />;
  }

  if (needsStore) return <RegisterStore key={user.id} />;

  // Authenticated Flow (Case-insensitive role validation)
  const isAdmin = String(user?.role || '').trim().toUpperCase() === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        isMobileOpen={isMobileSidebarOpen} 
        setIsMobileOpen={setIsMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      
      {/* Main Content Area (Offset by sidebar width on tablet & desktop, smoothly animating on collapse/expand) */}
      <div className={`transition-all duration-300 flex flex-col min-h-screen ${
        isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64 lg:pl-72'
      }`}>
        {/* Top App Header with Profile Dropdown & Language/Theme controls */}
        <Navbar onOpenSidebar={() => setIsMobileSidebarOpen(true)} />

        <main className="flex-1">
          {isAdmin ? <AdminDashboard /> : <UserDashboard />}
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          OST Soundbox &copy; {new Date().getFullYear()}
        </footer>
      </div>

    </div>
  );
}



import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><RefreshCw aria-label="Loading page" className="w-8 h-8 text-emerald-600 animate-spin" /></div>}>
                <MainLayout />
              </Suspense>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}



