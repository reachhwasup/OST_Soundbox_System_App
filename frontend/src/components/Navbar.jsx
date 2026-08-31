import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Store, 
  Volume2, 
  Sun, 
  Moon, 
  Globe, 
  KeyRound, 
  UserCheck, 
  ChevronDown, 
  Menu,
  Sparkles,
  BadgeCheck
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import EditProfileModal from './EditProfileModal';

export default function Navbar({ onOpenSidebar }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { toggleLanguage, t, isKhmer } = useLanguage();
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const isAdmin = String(user?.role || '').trim().toUpperCase() === 'ADMIN';

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs transition-colors duration-200 h-14 sm:h-16 px-3.5 sm:px-6 flex items-center justify-between">
        
        {/* Left Side: Mobile Menu Button & Brand Indicator */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-1.5 rounded-xl flex items-center justify-center shadow-xs">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {t('appName', 'OST Soundbox')}
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {isAdmin ? 'Admin Console' : 'Merchant Portal'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Actions & Profile Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={isKhmer ? "Switch to English" : "ប្តូរទៅជា ភាសាខ្មែរ"}
            className="px-2 sm:px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isKhmer ? '🇰🇭 ខ្មែរ' : '🇬🇧 EN'}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? t('switchToLight', "Switch to Light Mode") : t('switchToDark', "Switch to Dark Mode")}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Profile Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            
            {/* Header Profile Trigger Button */}
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 p-1 sm:py-1.5 sm:px-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer group shadow-2xs"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 transition">
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="hidden sm:block text-left max-w-[120px]">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user.full_name || user.phone_number}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {user.phone_number}
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
            </button>

            {/* Floating Profile Dropdown Popover */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* User Info Header */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/50 mb-1.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1">
                      <span>{user.full_name || user.phone_number}</span>
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      isAdmin ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {isAdmin ? 'Admin' : 'Merchant'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {user.phone_number}
                  </div>
                </div>

                {/* Action 1: Change Name / Edit Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setIsEditProfileOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isKhmer ? 'ប្តូរឈ្មោះ & ព័ត៌មាន (Edit Profile)' : 'Edit Name & Profile'}</span>
                  </div>
                </button>

                {/* Action 2: Change Password */}
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('changePassword', 'Change Password')}</span>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* Action 3: Sign Out */}
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('signOut', 'Sign Out')}</span>
                </button>

              </div>
            )}
          </div>

        </div>
      </header>

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

