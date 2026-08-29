import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Volume2, 
  Store, 
  Shield, 
  CreditCard, 
  LogOut, 
  Sun, 
  Moon, 
  Globe, 
  Menu, 
  X, 
  User as UserIcon,
  ChevronRight,
  Smartphone,
  Layers,
  KeyRound
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { toggleLanguage, t, isKhmer } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);


  // Close sidebar on route/tab change or resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) return null;

  const isAdmin = String(user?.role || '').trim().toUpperCase() === 'ADMIN';

  const handleNavClick = (tab) => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
    setIsOpen(false);
  };


  return (
    <>
      {/* Mobile Top Header (Visible only on < md screens) */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs transition-colors duration-200 px-3.5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-1.5 rounded-xl flex items-center justify-center shadow-xs">
              <Volume2 className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              {t('appName', 'OST Soundbox')}
            </span>
          </div>
        </div>

        {/* Mobile Quick Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Quick Language Toggle */}
          <button
            onClick={toggleLanguage}
            title={isKhmer ? "Switch to English" : "ប្តូរទៅជា ភាសាខ្មែរ"}
            className="px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition border border-slate-200 dark:border-slate-700 flex items-center gap-1"
          >
            <Globe className="w-3 h-3 text-emerald-600" />
            <span>{isKhmer ? 'ខ្មែរ' : 'EN'}</span>
          </button>

          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-68 md:w-64 lg:w-72 max-w-[82vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'
        }`}
      >

        {/* Top Section */}
        <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
          
          {/* Sidebar Header / Brand */}
          <div className="p-3 sm:p-4 md:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="bg-emerald-600 text-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xs">
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {t('appName', 'OST Soundbox')}
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                  {isAdmin ? 'Admin Console' : 'Merchant Portal'}
                </div>
              </div>
            </div>

            {/* Close Button on Mobile */}
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Profile Card in Sidebar */}
          <div className="p-2.5 sm:p-3 mx-2.5 sm:mx-3 my-2 sm:my-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs sm:text-sm border border-emerald-200 dark:border-emerald-800 shrink-0">
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user.full_name || user.phone_number}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono truncate">
                  {user.phone_number}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-2.5 sm:px-3 md:px-4 py-1.5 space-y-1">
            <div className="px-2 pb-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>

            {/* Admin View Switcher (If user is Admin) */}
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick('admin')}
                  className={`w-full flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{t('systemAdministration', 'System Administration')}</span>
                  </div>
                  {activeTab === 'admin' && <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('user')}
                  className={`w-full flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    activeTab === 'user'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{t('storeBranches', 'Stores & Soundboxes')}</span>
                  </div>
                  {activeTab === 'user' && <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />}
                </button>
              </>
            )}

            {/* Standard Merchant View Navigation */}
            {!isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick('user')}
                  className="w-full flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 text-white shadow-xs transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{t('storeBranches', 'Stores & Branches')}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />
                </button>
              </>
            )}

          </nav>

          {/* Bottom Settings & Actions */}
          <div className="p-2.5 sm:p-3 md:p-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5 sm:space-y-2 mt-auto">
            
            {/* Language Switcher Button */}
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                <span>{t('language', 'Language')}</span>
              </div>
              <span className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200">
                {isKhmer ? '🇰🇭 ខ្មែរ' : '🇬🇧 EN'}
              </span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
            >
              <div className="flex items-center gap-2">
                {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />}
                <span>{isDark ? t('lightMode', 'Light Mode') : t('darkMode', 'Dark Mode')}</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                {isDark ? t('dark', 'Dark') : t('light', 'Light')}
              </span>
            </button>

            {/* Change Password Button */}
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                <span>{t('changePassword', 'Change Password')}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 rounded-lg sm:rounded-xl text-xs font-bold border border-rose-200/80 dark:border-rose-900/60 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t('signOut', 'Sign Out')}</span>
            </button>

            {/* Version Note */}
            <div className="text-center pt-0.5 text-[9px] sm:text-[10px] text-slate-400">
              OST Soundbox System &copy; {new Date().getFullYear()}
            </div>
          </div>

        </div>
      </aside>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)} 
      />
    </>
  );
}

