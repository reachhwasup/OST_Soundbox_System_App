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
  ChevronLeft,
  Users,
  Receipt,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isMobileOpen, 
  setIsMobileOpen,
  isCollapsed = false,
  onToggleCollapse
}) {
  const { user } = useAuth();
  const { t, isKhmer } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
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
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl w-64 sm:w-68' : '-translate-x-full md:shadow-none'
        } ${
          isCollapsed ? 'md:w-20' : 'md:w-64 lg:w-72'
        }`}
      >
        {/* Top Section */}
        <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
          
          {/* Sidebar Header / Brand */}
          <div className={`p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center ${
            isCollapsed ? 'md:justify-center' : 'justify-between'
          }`}>
            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'md:justify-center' : ''}`}>
              <div 
                className="bg-emerald-600 text-white p-2 rounded-xl flex items-center justify-center shadow-xs shrink-0 cursor-pointer"
                title={t('appName', 'OST Soundbox')}
                onClick={onToggleCollapse}
              >
                <Volume2 className="w-5 h-5" />
              </div>
              
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {t('appName', 'OST Soundbox')}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-wide uppercase truncate">
                    {isAdmin ? 'Admin Console' : 'Merchant Portal'}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle Button (Top) */}
            {!isCollapsed && onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={isKhmer ? "បង្រួម Sidebar" : "Collapse Sidebar"}
                className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            {/* Close Button on Mobile Drawer */}
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links (Flat, Direct Navigation without Dropdowns) */}
          <nav className={`flex-1 py-3 space-y-1.5 ${isCollapsed ? 'px-2' : 'px-2.5 sm:px-3 md:px-4'}`}>
            
            {!isCollapsed && (
              <div className="px-2 pb-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {isAdmin ? (isKhmer ? 'ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ' : 'Administration') : (isKhmer ? 'ម៉ឺនុយ' : 'Navigation')}
              </div>
            )}

            {/* Admin Flat Navigation Items */}
            {isAdmin && (
              <div className="space-y-1">
                
                {/* Item 1: Users & Merchants */}
                <button
                  type="button"
                  onClick={() => handleAdminSubTabClick('users')}
                  title={isKhmer ? 'អ្នកប្រើប្រាស់ & អាជីវករ' : 'Users & Merchants'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentSubTab === 'users' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'users' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Users className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-indigo-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'អ្នកប្រើប្រាស់ & អាជីវករ' : 'Users & Merchants'}</span>
                  )}
                </button>

                {/* Item 2: Stores & Locations */}
                <button
                  type="button"
                  onClick={() => handleAdminSubTabClick('stores')}
                  title={isKhmer ? 'ហាង និងទីតាំង' : 'Stores & Locations'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentSubTab === 'stores' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'stores' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Store className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-blue-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'ហាង និងទីតាំង' : 'Stores & Locations'}</span>
                  )}
                </button>

                {/* Item 3: Soundboxes */}
                <button
                  type="button"
                  onClick={() => handleAdminSubTabClick('devices')}
                  title={isKhmer ? 'ឧបករណ៍ Soundbox' : 'Soundbox Devices'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentSubTab === 'devices' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'devices' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Volume2 className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-amber-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'ឧបករណ៍ Soundbox' : 'Soundbox Devices'}</span>
                  )}
                </button>

                {/* Item 4: User & Payment Logs */}
                <button
                  type="button"
                  onClick={() => handleAdminSubTabClick('user_logs')}
                  title={isKhmer ? 'កំណត់ត្រាអតិថិជន (User Logs)' : 'User & Payment Logs'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentSubTab === 'user_logs' || currentSubTab === 'logs' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'user_logs' || currentSubTab === 'logs' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Receipt className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-emerald-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'កំណត់ត្រាអតិថិជន (User Logs)' : 'User & Payment Logs'}</span>
                  )}
                </button>

                {/* Item 5: Admin & Security Logs */}
                <button
                  type="button"
                  onClick={() => handleAdminSubTabClick('admin_logs')}
                  title={isKhmer ? 'កំណត់ត្រាប្រព័ន្ធ (Admin Logs)' : 'Admin & Security Logs'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentSubTab === 'admin_logs' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'admin_logs' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <ShieldAlert className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-rose-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'កំណត់ត្រាប្រព័ន្ធ (Admin Logs)' : 'Admin & Security Logs'}</span>
                  )}
                </button>

              </div>
            )}

            {/* Standard Merchant View Navigation */}
            {!isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleNavClick('user')}
                  title={t('storeBranches', 'Stores & Branches')}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm bg-emerald-600 text-white shadow-xs ${
                    isCollapsed 
                      ? 'h-12 justify-center' 
                      : 'px-3.5 py-2.5 gap-2.5 justify-between'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Store className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{t('storeBranches', 'Stores & Branches')}</span>}
                  </div>
                  {!isCollapsed && <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />}
                </button>
              </>
            )}

          </nav>

          {/* Bottom Collapse/Expand Footer Button */}
          <div className="p-2.5 sm:p-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={isCollapsed ? (isKhmer ? "ពង្រីក Sidebar (Expand)" : "Expand Sidebar") : (isKhmer ? "បង្រួម Sidebar (Collapse)" : "Collapse Sidebar")}
                className={`hidden md:flex items-center justify-center gap-2 w-full py-2 px-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer ${
                  isCollapsed ? 'justify-center' : ''
                }`}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-emerald-600" />
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4 text-slate-500" />
                    <span>{isKhmer ? 'បង្រួមម៉ឺនុយ (Collapse)' : 'Collapse Sidebar'}</span>
                  </>
                )}
              </button>
            )}

            {!isCollapsed && (
              <div className="text-center pt-2 text-[10px] text-slate-400">
                OST Soundbox &copy; {new Date().getFullYear()}
              </div>
            )}
          </div>

        </div>
      </aside>
    </>
  );
}

