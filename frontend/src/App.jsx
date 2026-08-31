import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { RefreshCw } from 'lucide-react';

function MainLayout() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('soundbox_active_tab') || 'user';
  });

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

  // Unauthenticated Flow
  if (!user) {
    if (authMode === 'register') {
      return <Register onSwitchToLogin={() => setAuthMode('login')} />;
    }
    return <Login onSwitchToRegister={() => setAuthMode('register')} />;
  }

  // Authenticated Flow (Case-insensitive role validation)
  const isAdmin = String(user?.role || '').trim().toUpperCase() === 'ADMIN';
  const showAdminView = isAdmin && activeTab === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        isMobileOpen={isMobileSidebarOpen} 
        setIsMobileOpen={setIsMobileSidebarOpen} 
      />
      
      {/* Main Content Area (Offset by sidebar width on tablet & desktop) */}
      <div className="md:pl-64 lg:pl-72 flex flex-col min-h-screen">
        {/* Top App Header with Profile Dropdown & Language/Theme controls */}
        <Navbar onOpenSidebar={() => setIsMobileSidebarOpen(true)} />

        <main className="flex-1">
          {showAdminView ? <AdminDashboard /> : <UserDashboard />}
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          OST Soundbox & Merchant Management Portal &copy; {new Date().getFullYear()}
        </footer>
      </div>

    </div>
  );
}



import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <MainLayout />
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}



