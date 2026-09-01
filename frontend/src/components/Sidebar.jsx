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
  PanelLeftOpen,
  Smartphone,
  Warehouse,
  Activity
} from 'lucide-react';
import OstLogo from './OstLogo';

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

  // Listen to admin and merchant tab changes
  const [currentMerchantTab, setCurrentMerchantTab] = useState(() => localStorage.getItem('soundbox_merchant_tab') || 'stores');

  useEffect(() => {
    const handleTabSync = (e) => {
      if (e.detail) {
        setCurrentSubTab(e.detail);
      }
    };
    const handleMerchantTabSync = (e) => {
      if (e.detail) {
        setCurrentMerchantTab(e.detail);
      }
    };
    window.addEventListener('soundbox_admin_tab_change', handleTabSync);
    window.addEventListener('soundbox_merchant_tab_change', handleMerchantTabSync);
    return () => {
      window.removeEventListener('soundbox_admin_tab_change', handleTabSync);
      window.removeEventListener('soundbox_merchant_tab_change', handleMerchantTabSync);
    };
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

  const handleMerchantSubTabClick = (tab) => {
    setCurrentMerchantTab(tab);
    localStorage.setItem('soundbox_merchant_tab', tab);
    window.dispatchEvent(new CustomEvent('soundbox_merchant_tab_change', { detail: tab }));
    if (setActiveTab) {
      setActiveTab('user');
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out shadow-lg md:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          isCollapsed ? 'md:w-20' : 'w-64 sm:w-72'
        }`}
      >
        {/* Top Section */}
        <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
          
          {/* Sidebar Header / Brand */}
          <div className={`p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center ${
            isCollapsed ? 'md:justify-center' : 'justify-between'
          }`}>
            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'md:justify-center' : ''}`}>
              <div className="shrink-0 cursor-pointer" title={t('appName', 'OST Soundbox')}>
                <OstLogo className="w-9 h-9" />
              </div>
              
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                    {t('appName', 'OST Soundbox')}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold tracking-wide uppercase truncate">
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
                className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            {/* Close Button on Mobile Drawer */}
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu Links */}
          <nav className="flex-1 p-3 sm:p-3.5 space-y-1.5">
            
            {/* Section Category Title */}
            {!isCollapsed && (
              <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                {isAdmin ? (isKhmer ? 'ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ' : 'Administration') : (isKhmer ? 'ម៉ឺនុយ' : 'Navigation')}
              </div>
            )}

            {/* Admin Console View Navigation */}
            {isAdmin && (
              <div className="space-y-1">
                {/* Item 1: Users & Merchants */}
                <button
                  type="button"
                  onClick={() => handleAdminSubTabClick('users')}
                  title={isKhmer ? 'អ្នកប្រើប្រាស់ & អាជីវករ' : 'Users & Merchants'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentSubTab === 'users' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'users' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Users className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-emerald-400'}`} />
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
                      ? `h-12 justify-center ${currentSubTab === 'stores' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'stores' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Store className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-emerald-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'ហាង និងទីតាំង' : 'Stores & Locations'}</span>
                  )}
                </button>

                {/* Item 3: Manage Devices (Deployed Soundboxes) */}
                <button
                  type="button"
                  onClick={() => handleAdminSubTabClick('devices')}
                  title={isKhmer ? 'គ្រប់គ្រងឧបករណ៍ Soundbox' : 'Manage Devices'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentSubTab === 'devices' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'devices' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Smartphone className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-emerald-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'គ្រប់គ្រងឧបករណ៍ Soundbox' : 'Manage Devices'}</span>
                  )}
                </button>

                {/* Item 4: Stock & Inventory (Warehouse Stock) */}
                <button
                  type="button"
                  onClick={() => handleAdminSubTabClick('inventory')}
                  title={isKhmer ? 'ស្តុកឧបករណ៍ Soundbox' : 'Stock & Inventory'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentSubTab === 'inventory' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'inventory' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Warehouse className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-emerald-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'ស្តុកឧបករណ៍ Soundbox' : 'Stock & Inventory'}</span>
                  )}
                </button>

                {/* Item 5: User Activity */}
                <button
                  type="button"
                  onClick={() => handleAdminSubTabClick('user_activity')}
                  title={isKhmer ? 'សកម្មភាពអ្នកប្រើប្រាស់' : 'User Activity'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentSubTab === 'user_activity' || currentSubTab === 'user_logs' || currentSubTab === 'logs' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'user_activity' || currentSubTab === 'user_logs' || currentSubTab === 'logs' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Activity className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-emerald-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'សកម្មភាពអ្នកប្រើប្រាស់' : 'User Activity'}</span>
                  )}
                </button>

                {/* Item 6: Admin Activity */}
                <button
                  type="button"
                  onClick={() => handleAdminSubTabClick('admin_activity')}
                  title={isKhmer ? 'សកម្មភាពអ្នកគ្រប់គ្រង' : 'Admin Activity'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentSubTab === 'admin_activity' || currentSubTab === 'admin_logs' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentSubTab === 'admin_activity' || currentSubTab === 'admin_logs' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <ShieldAlert className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-emerald-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'សកម្មភាពអ្នកគ្រប់គ្រង' : 'Admin Activity'}</span>
                  )}
                </button>

              </div>
            )}

            {/* Standard Merchant View Navigation */}
            {!isAdmin && (
              <div className="space-y-1">
                {/* Item 1: Stores & Branches */}
                <button
                  type="button"
                  onClick={() => handleMerchantSubTabClick('stores')}
                  title={t('storeBranches', 'Stores & Branches')}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentMerchantTab === 'stores' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentMerchantTab === 'stores' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Store className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-emerald-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{t('storeBranches', 'Stores & Branches')}</span>
                  )}
                </button>

                {/* Item 2: Device Info & Soundbox */}
                <button
                  type="button"
                  onClick={() => handleMerchantSubTabClick('devices')}
                  title={isKhmer ? 'ព័ត៌មានឧបករណ៍' : 'Device Info & Soundbox'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentMerchantTab === 'devices' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentMerchantTab === 'devices' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Volume2 className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-emerald-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'ព័ត៌មានឧបករណ៍' : 'Device Info & Soundbox'}</span>
                  )}
                </button>

                {/* Item 3: Transaction History */}
                <button
                  type="button"
                  onClick={() => handleMerchantSubTabClick('transactions')}
                  title={isKhmer ? 'ប្រវត្តិប្រតិបត្តិការ' : 'Transaction History'}
                  className={`w-full flex items-center transition cursor-pointer rounded-xl font-semibold text-xs sm:text-sm ${
                    isCollapsed 
                      ? `h-12 justify-center ${currentMerchantTab === 'transactions' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}` 
                      : `px-3 py-2.5 gap-2.5 ${currentMerchantTab === 'transactions' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                  }`}
                >
                  <Receipt className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 text-emerald-400'}`} />
                  {!isCollapsed && (
                    <span className="truncate">{isKhmer ? 'ប្រវត្តិប្រតិបត្តិការ' : 'Transaction History'}</span>
                  )}
                </button>
              </div>
            )}

          </nav>

          {/* Bottom Collapse/Expand Footer Button */}
          <div className="p-2.5 sm:p-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={isCollapsed ? (isKhmer ? "ពង្រីករបារចំហៀង" : "Expand Sidebar") : (isKhmer ? "បង្រួមរបារចំហៀង" : "Collapse Sidebar")}
                className={`hidden md:flex items-center justify-center gap-2 w-full py-2 px-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer ${
                  isCollapsed ? 'justify-center' : ''
                }`}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-emerald-600" />
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4 text-slate-500" />
                    <span>{isKhmer ? 'បង្រួមម៉ឺនុយ' : 'Collapse Sidebar'}</span>
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

