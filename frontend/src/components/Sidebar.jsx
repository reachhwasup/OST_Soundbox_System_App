import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Volume2, 
  Store, 
  Shield, 
  X, 
  ChevronRight,
  ChevronDown,
  Users,
  Receipt,
  ShieldAlert
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isMobileOpen, setIsMobileOpen }) {
  const { user } = useAuth();
  const { t, isKhmer } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(true);
  const [currentSubTab, setCurrentSubTab] = useState(() => localStorage.getItem('soundbox_admin_tab') || 'users');

  const isOpen = isMobileOpen !== undefined ? isMobileOpen : internalOpen;
  const setIsOpen = setIsMobileOpen || setInternalOpen;

  // Close sidebar on route/tab change or resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsOpen]);

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
          <div className="p-3.5 sm:p-4 md:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
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
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-2.5 sm:px-3 md:px-4 py-3 space-y-1.5">
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

          {/* Footer in Sidebar */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center mt-auto">
            <div className="text-[10px] text-slate-400">
              OST Soundbox &copy; {new Date().getFullYear()}
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}

