import React, { useState, useEffect } from 'react';
import { User, Phone, CheckCircle2, AlertCircle, Shield, Store, Calendar, BadgeCheck, Sparkles, KeyRound, ChevronRight } from 'lucide-react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export default function EditProfileModal({ isOpen, onClose, onOpenChangePassword }) {
  const { user, updateProfile } = useAuth();
  const { t, isKhmer } = useLanguage();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.full_name || '');
      setPhoneNumber(user.phone_number || '');
      setError('');
    }
  }, [user, isOpen]);

  if (!user) return null;

  const isAdmin = String(user?.role || '').trim().toUpperCase() === 'ADMIN';

  const formattedDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError(t('fullNamePlaceholder', 'Please enter a valid full name (min 2 characters).'));
      return;
    }

    if (!trimmedPhone || trimmedPhone.length < 6) {
      setError(t('invalidPhone', 'Please enter a valid phone number.'));
      return;
    }

    setLoading(true);
    try {
      await updateProfile(trimmedName, trimmedPhone);

      showToast({
        type: 'update',
        title: t('editProfile', 'Edit Profile'),
        message: t('profileUpdatedSuccess', 'Profile updated successfully.'),
        duration: 4000
      });

      handleClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update profile.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('editProfile', 'Edit Profile & Name')}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Account Summary Banner */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-sm border border-emerald-200 dark:border-emerald-800">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{user.full_name || user.phone_number}</span>
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  ID: #{user.id}
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
              isAdmin 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}>
              {isAdmin ? <Shield className="w-3 h-3" /> : <Store className="w-3 h-3" />}
              <span>{isAdmin ? t('administrator', 'System Administrator') : t('merchant', 'Store Merchant')}</span>
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {t('status', 'Status')}: <strong className="text-emerald-600 dark:text-emerald-400">{user.status || 'ACTIVE'}</strong>
              </span>
            </div>
            {formattedDate && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('memberSince', 'Member Since')}: {formattedDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Field 1: Full Name (User can change their name) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              {t('fullName', 'Full Name')} <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {isKhmer ? 'អាចកែប្រែឈ្មោះបាន' : 'Editable'}
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('fullNamePlaceholder', 'e.g. Sokha Chan')}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              required
              minLength={2}
            />
          </div>
        </div>

        {/* Field 2: Phone Number */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
            {t('phoneNumber', 'Phone Number')} <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t('phonePlaceholder', 'e.g. 012345678')}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              required
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {isKhmer 
              ? 'លេខទូរស័ព្ទនេះប្រើប្រាស់សម្រាប់ចូលគណនី និងភ្ជាប់ជាមួយហាងរបស់អ្នក។' 
              : 'This phone number is used for logging into your account and linking stores.'}
          </p>
        </div>

        {/* Quick Shortcut to Change Password */}
        {onOpenChangePassword && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{isKhmer ? 'ចង់ប្តូរពាក្យសម្ងាត់គណនី?' : 'Need to change your password?'}</span>
            </div>
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{t('changePassword', 'Change Password')}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium cursor-pointer transition"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? t('saving', 'Saving...') : t('saveChanges', 'Save Changes')}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
