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
  ChevronDown,
  Smartphone,
  Layers,
  KeyRound,
  UserCheck,
  Users,
  Activity,
  Receipt,
  ShieldAlert
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import EditProfileModal from './EditProfileModal';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { toggleLanguage, t, isKhmer } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(true);
  const [currentSubTab, setCurrentSubTab] = useState(() => localStorage.getItem('soundbox_admin_tab') || 'users');

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

  // Listen to admin tab changes from dashboard
  useEffect(() => {
    const handleTabSync = (e) => {
      if (e.detail) {
        setCurrentSubTab(e.detail);
      }
    };
    window.addEventListener('soundbox_admin_tab_change', handleTabSync);
    return () => window.removeEventListener('soundbox_admin_tab_change', handleTabSync);
  }, []);

  if (!user) return null;

  const isAdmin = String(user?.role || '').trim().toUpperCase() === 'ADMIN';

  const handleNavClick = (tab) => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
    setIsOpen(false);
  };

  const handleAdminSubTabClick = (subTab) => {
    setCurrentSubTab(subTab);
    localStorage.setItem('soundbox_admin_tab', subTab);
    window.dispatchEvent(new CustomEvent('soundbox_admin_tab_change', { detail: subTab }));
    if (setActiveTab) {
      setActiveTab('admin');
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

          {/* User Profile Card Dropdown in Sidebar */}
          <div className="mx-2.5 sm:mx-3 my-2 sm:my-2.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 overflow-hidden transition shadow-2xs">
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-slate-100/80 dark:hover:bg-slate-800 cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user.full_name || user.phone_number}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono truncate">
                    {user.phone_number}
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="p-1.5 space-y-0.5 border-t border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 animate-in fade-in slide-in-from-top-1 duration-150">
                
                {/* Option 1: Edit Profile / Change Name */}
                <button
                  type="button"
                  onClick={() => {
                    setIsEditProfileOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{isKhmer ? 'ប្តូរឈ្មោះ & គណនី' : 'Edit Name & Profile'}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>

                {/* Option 2: Change Password */}
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{t('changePassword', 'Change Password')}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </button>

                {/* Account Status / Role Footer */}
                <div className="px-2.5 py-1.5 mt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Status: Active</span>
                  </div>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] uppercase ${
                    isAdmin ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {isAdmin ? 'Admin' : 'Merchant'}
                  </span>
                </div>

              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-2.5 sm:px-3 md:px-4 py-1.5 space-y-1">
            <div className="px-2 pb-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>

            {/* Admin View Switcher (If user is Admin) */}
            {isAdmin && (
              <div className="space-y-1.5">
                
                {/* Collapsible Admin Console Dropdown */}
                <div className="rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 transition">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab !== 'admin') {
                        handleNavClick('admin');
                      }
                      setIsAdminDropdownOpen(!isAdminDropdownOpen);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{t('systemAdministration', 'System Administration')}</span>
                    </div>
                    {isAdminDropdownOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 opacity-80" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 opacity-80" />
                    )}
                  </button>

                  {/* Dropdown Items List */}
                  {isAdminDropdownOpen && (
                    <div className="bg-slate-50/90 dark:bg-slate-800/50 p-1.5 space-y-0.5 border-t border-slate-100 dark:border-slate-800/80">
                      
                      {/* Sub-item: Users & Merchants */}
                      <button
                        type="button"
                        onClick={() => handleAdminSubTabClick('users')}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                          activeTab === 'admin' && currentSubTab === 'users'
                            ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                        <span>{isKhmer ? 'អ្នកប្រើប្រាស់ & អាជីវករ' : 'Users & Merchants'}</span>
                      </button>

                      {/* Sub-item: Stores & Locations */}
                      <button
                        type="button"
                        onClick={() => handleAdminSubTabClick('stores')}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                          activeTab === 'admin' && currentSubTab === 'stores'
                            ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Store className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                        <span>{isKhmer ? 'ហាង និងទីតាំង' : 'Stores & Locations'}</span>
                      </button>

                      {/* Sub-item: Soundboxes */}
                      <button
                        type="button"
                        onClick={() => handleAdminSubTabClick('devices')}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                          activeTab === 'admin' && currentSubTab === 'devices'
                            ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        <span>{isKhmer ? 'ឧបករណ៍ Soundbox' : 'Soundbox Devices'}</span>
                      </button>

                      {/* Sub-item: User & Payment Logs */}
                      <button
                        type="button"
                        onClick={() => handleAdminSubTabClick('user_logs')}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                          activeTab === 'admin' && (currentSubTab === 'user_logs' || currentSubTab === 'logs')
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span>{isKhmer ? 'កំណត់ត្រាអតិថិជន (User Logs)' : 'User & Payment Logs'}</span>
                      </button>

                      {/* Sub-item: Admin & Security Logs */}
                      <button
                        type="button"
                        onClick={() => handleAdminSubTabClick('admin_logs')}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                          activeTab === 'admin' && currentSubTab === 'admin_logs'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                        <span>{isKhmer ? 'កំណត់ត្រាប្រព័ន្ធ (Admin Logs)' : 'Admin & Security Logs'}</span>
                      </button>

                    </div>
                  )}
                </div>

                {/* Merchant Store View Switcher */}
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
                    <span>{t('storeBranches', 'Merchant Store View')}</span>
                  </div>
                  {activeTab === 'user' && <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />}
                </button>

              </div>
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
              className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
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
              className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />}
                <span>{isDark ? t('lightMode', 'Light Mode') : t('darkMode', 'Dark Mode')}</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                {isDark ? t('dark', 'Dark') : t('light', 'Light')}
              </span>
            </button>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 rounded-lg sm:rounded-xl text-xs font-bold border border-rose-200/80 dark:border-rose-900/60 transition cursor-pointer mt-1"
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

      {/* Edit Profile Modal */}
      <EditProfileModal 
        isOpen={isEditProfileOpen} 
        onClose={() => setIsEditProfileOpen(false)}
        onOpenChangePassword={() => {
          setIsEditProfileOpen(false);
          setIsChangePasswordOpen(true);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)}
        onOpenEditProfile={() => {
          setIsChangePasswordOpen(false);
          setIsEditProfileOpen(true);
        }}
      />
    </>
  );
}

