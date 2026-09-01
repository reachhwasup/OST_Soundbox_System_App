import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Phone, Lock, Eye, EyeOff, LogIn, Sun, Moon, Globe } from 'lucide-react';
import OstLogo from '../components/OstLogo';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { toggleLanguage, t, isKhmer } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!phoneNumber.trim()) {
      setError(t('enterPhone', 'Please enter your phone number'));
      return;
    }
    if (!password) {
      setError(t('enterPassword', 'Please enter your password'));
      return;
    }

    try {
      setLoading(true);
      await login(phoneNumber.trim(), password);
    } catch (err) {
      setError(err.response?.data?.detail || t('loginFailed', 'Login failed. Please check credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-200">
      {/* Top Floating Controls: Language & Dark Mode */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-20">
        <button
          onClick={toggleLanguage}
          title={isKhmer ? "Switch to English" : "ប្តូរទៅជា ភាសាខ្មែរ"}
          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
          aria-label="Toggle Language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{isKhmer ? '🇰🇭 ខ្មែរ' : '🇬🇧 EN'}</span>
        </button>

        <button
          onClick={toggleTheme}
          title={isDark ? t('switchToLight', "Switch to Light Mode") : t('switchToDark', "Switch to Dark Mode")}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs transition"
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        
        {/* Brand Icon & Heading */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <OstLogo className="w-14 h-14" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('appName', 'OST Soundbox')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('appSubtitle', 'IoT Payment Audio Notification Gateway')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('phoneNumber', 'Phone Number')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="012345678"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('password', 'Password')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>{t('signingIn', 'Signing in...')}</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {t('signIn', 'Sign In')}
              </>
            )}
          </button>
        </form>

        {/* Switch to Register */}
        <div className="mt-6 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {t('noAccount', "Don't have an account?")}{' '}
          <button
            onClick={onSwitchToRegister}
            className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition"
          >
            {t('signUp', 'Sign up now')}
          </button>
        </div>

      </div>
    </div>
  );
}
