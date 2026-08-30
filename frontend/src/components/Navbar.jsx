import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LogOut, User as UserIcon, Shield, Store, Volume2, Sun, Moon, Globe, KeyRound, UserCheck } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import EditProfileModal from './EditProfileModal';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, t, isKhmer } = useLanguage();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center gap-2">
            
            {/* Logo & Brand */}
            <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
              <div className="bg-emerald-600 text-white p-1.5 sm:p-2 rounded-xl flex items-center justify-center shadow-xs shrink-0">
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('appName', 'OST Soundbox')}
                </span>
              </div>
            </div>

            {/* Navigation Links (For Admins to toggle between Admin Control and User Store Dashboard) */}
            {isAdmin && (
              <nav className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 sm:p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1 ${
                    activeTab === 'admin'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">Admin</span>
                </button>
                <button
                  onClick={() => setActiveTab('user')}
                  className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1 ${
                    activeTab === 'user'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">{t('storeBranches', 'Stores')}</span>
                </button>
              </nav>
            )}

            {/* User Info & Controls */}
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              {/* Language Switcher Button */}
              <button
                onClick={toggleLanguage}
                title={isKhmer ? "Switch to English" : "ប្តូរទៅជា ភាសាខ្មែរ"}
                className="px-1.5 sm:px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition flex items-center gap-1 border border-slate-200 dark:border-slate-700 shrink-0"
                aria-label="Toggle Language"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isKhmer ? '🇰🇭 ខ្មែរ' : '🇬🇧 EN'}</span>
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                title={isDark ? t('switchToLight', "Switch to Light Mode") : t('switchToDark', "Switch to Dark Mode")}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition shrink-0"
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Edit Profile Button */}
              <button
                onClick={() => setIsEditProfileOpen(true)}
                title={t('editProfile', 'Edit Profile')}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition shrink-0 cursor-pointer"
                aria-label="Edit Profile"
              >
                <UserCheck className="w-4 h-4" />
              </button>

              {/* Change Password Button */}
              <button
                onClick={() => setIsChangePasswordOpen(true)}
                title={t('changePassword', 'Change Password')}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition shrink-0 cursor-pointer"
                aria-label="Change Password"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              {/* User Info */}
              <div 
                onClick={() => setIsEditProfileOpen(true)}
                title={t('editProfile', 'Edit Profile')}
                className="flex items-center space-x-1.5 text-left shrink-0 cursor-pointer hover:opacity-80 transition group"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/80 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-medium text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition">
                  <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 max-w-[120px] truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    {user.full_name || user.phone_number}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {user.phone_number}
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 sm:p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition shrink-0 cursor-pointer"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal */}
      <EditProfileModal 
        isOpen={isEditProfileOpen} 
        onClose={() => setIsEditProfileOpen(false)} 
      />

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)} 
      />
    </>
  );
}

