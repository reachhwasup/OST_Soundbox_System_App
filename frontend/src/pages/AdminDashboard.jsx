import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import { hasScreen } from '../lib/deviceType';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import FieldQRScanner from '../components/FieldQRScanner';
import StockPage from '../features/stock/StockPage';
import ProductsPage from '../features/catalog/ProductsPage';
import SuppliersPage from '../features/catalog/SuppliersPage';
import BranchesPage from '../features/catalog/BranchesPage';
import jsQR from 'jsqr';
import {
  Store,
  Volume2,
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Key,
  UserCheck,
  UserX,
  RefreshCw,
  CheckCircle2,
  Phone,
  MapPin,
  Building,
  Navigation,
  Compass,
  Home,
  Copy,
  Eye,
  ChevronRight,
  ChevronLeft,
  Activity,
  ShieldAlert,
  AlertTriangle,
  Terminal,
  Receipt,
  Battery,
  Signal,
  Send,
  Square,
  CheckSquare,
  SlidersHorizontal,
  Power,
  Volume1,
  Sparkles,
  PackagePlus,
  DollarSign,
  Smartphone,
  Tag,
  Percent,
  QrCode,
  Upload,
  User,
  MoreVertical
} from 'lucide-react';

export default function AdminDashboard() {
  const { user: currentAdmin } = useAuth();
  const { t, isKhmer } = useLanguage();
  const { showToast } = useToast();
  
  // Tab state (persisted and synced with sidebar)
  const [adminTab, setAdminTabState] = useState(() => localStorage.getItem('soundbox_admin_tab') || 'users');

  const setAdminTab = (tab) => {
    setAdminTabState(tab);
    localStorage.setItem('soundbox_admin_tab', tab);
    window.dispatchEvent(new CustomEvent('soundbox_admin_tab_change', { detail: tab }));
  };

  // Sync tab when changed from Sidebar dropdown
  useEffect(() => {
    const handleTabSync = (e) => {
      if (e.detail) {
        setAdminTabState(e.detail);
      }
    };
    window.addEventListener('soundbox_admin_tab_change', handleTabSync);
    return () => window.removeEventListener('soundbox_admin_tab_change', handleTabSync);
  }, []);

  // Main Data States
  const [hasLoaded, setHasLoaded] = useState(false);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Global & User Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState(''); // 'TRANSACTION' | 'SECURITY' | ''

  // Dedicated User Activity Filters
  const [userActivitySearch, setUserActivitySearch] = useState('');
  const [userActivityCategoryFilter, setUserActivityCategoryFilter] = useState('ALL');

  // Dedicated Admin Activity Filters
  const [adminActivitySearch, setAdminActivitySearch] = useState('');
  const [adminActivityCategoryFilter, setAdminActivityCategoryFilter] = useState('ALL');

  // Store & Location Filter States
  const [storeSearch, setStoreSearch] = useState('');
  const [storeProvinceFilter, setStoreProvinceFilter] = useState('');
  const [storeDistrictFilter, setStoreDistrictFilter] = useState('');
  const [storeCommuneFilter, setStoreCommuneFilter] = useState('');
  const [storeOwnerFilter, setStoreOwnerFilter] = useState('ALL');
  const [storeDateFilter, setStoreDateFilter] = useState('');
  const [storeSortBy, setStoreSortBy] = useState('NEWEST'); // 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'NAME_DESC'

  // Cloud Speaker Device Manager Filter States
  const [devFilterId, setDevFilterId] = useState('');
  const [devFilterType, setDevFilterType] = useState('ALL');
  const [devFilterStatus, setDevFilterStatus] = useState(''); // '' | 'Online' | 'PENDING' | 'Offline'
  const [devFilterMerchant, setDevFilterMerchant] = useState('');
  const [devFilterWarranty, setDevFilterWarranty] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED'
  const [devFilterDate, setDevFilterDate] = useState('');

  // Table Selection States across all tabs
  const [userSelectedIds, setUserSelectedIds] = useState([]);
  const [storeSelectedIds, setStoreSelectedIds] = useState([]);
  const [userActSelectedIds, setUserActSelectedIds] = useState([]);
  const [adminActSelectedIds, setAdminActSelectedIds] = useState([]);

  // Table Pagination & Selection States for Admin
  const [devSelectedIds, setDevSelectedIds] = useState([]);
  const [devPage, setDevPage] = useState(1);
  const [devPageSize, setDevPageSize] = useState(10);
  const [devGoToPage, setDevGoToPage] = useState('');

  // User Accounts Pagination
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [userGoToPage, setUserGoToPage] = useState('');
  const [openActionDropdownId, setOpenActionDropdownId] = useState(null);
  const [activeDropdownRect, setActiveDropdownRect] = useState(null);

  const handleToggleDropdown = (id, e) => {
    e.stopPropagation();
    if (openActionDropdownId === id) {
      setOpenActionDropdownId(null);
      setActiveDropdownRect(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const openUp = rect.bottom + 230 > window.innerHeight;
      setActiveDropdownRect({
        top: rect.bottom + 4,
        bottom: window.innerHeight - rect.top + 4,
        right: Math.max(16, window.innerWidth - rect.right),
        openUp
      });
      setOpenActionDropdownId(id);
    }
  };

  // Store & Branch Pagination
  const [storePage, setStorePage] = useState(1);
  const [storePageSize, setStorePageSize] = useState(10);
  const [storeGoToPage, setStoreGoToPage] = useState('');

  // Stock & Inventory Filter & Pagination States
  const [stockBranchFilter, setStockBranchFilter] = useState('ALL');
  const [stockCanViewCost, setStockCanViewCost] = useState(true);

  // Products and Branches States
  const [branchesList, setBranchesList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [productStock, setProductStock] = useState([]);
  const [intakeSupplierId, setIntakeSupplierId] = useState('');
  const [intakeBasePrice, setIntakeBasePrice] = useState('');
  const [intakeProductId, setIntakeProductId] = useState('');
  const [intakeBranchId, setIntakeBranchId] = useState('');

  // User Activity & Admin Activity Logs Pagination
  const [userActPage, setUserActPage] = useState(1);
  const [userActPageSize, setUserActPageSize] = useState(10);
  const [userActGoToPage, setUserActGoToPage] = useState('');
  const [adminActPage, setAdminActPage] = useState(1);
  const [adminActPageSize, setAdminActPageSize] = useState(10);
  const [adminActGoToPage, setAdminActGoToPage] = useState('');

  // Cloud Speaker Device Modals State
  const [isDeviceCommandOpen, setIsDeviceCommandOpen] = useState(false);
  const [commandTargetDevice, setCommandTargetDevice] = useState(null);
  const [commandType, setCommandType] = useState('VOICE_BROADCAST'); // 'VOICE_BROADCAST' | 'SET_VOLUME' | 'PLAY_TEST' | 'REBOOT'
  const [commandAmount, setCommandAmount] = useState('10.00');
  const [commandCurrency, setCommandCurrency] = useState('USD');
  const [commandVolume, setCommandVolume] = useState(80);
  const [commandCustomText, setCommandCustomText] = useState('ABA Bank received 10 dollars');
  const [commandSubmitting, setCommandSubmitting] = useState(false);

  // Stock Management & Intake State
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalTab, setStockModalTab] = useState('BULK'); // 'BULK' | 'SINGLE'
  const [bulkSnInput, setBulkSnInput] = useState('');
  const [singleSnInput, setSingleSnInput] = useState('');
  const [singleStoreId, setSingleStoreId] = useState('');
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [isStockSnScanning, setIsStockSnScanning] = useState(false);
  const stockFileInputRef = useRef(null);

  // Suppliers Management State
  const [suppliersList, setSuppliersList] = useState([
    { id: 1, name: 'Feishu', device_count: 0 },
    { id: 2, name: 'Hemi', device_count: 0 }
  ]);

  // Sales Orders & History State
  const [salesList, setSalesList] = useState([]);
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(25);
  const [salesGoToPage, setSalesGoToPage] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState('ALL');
  const [salesSupplierFilter, setSalesSupplierFilter] = useState('ALL');
  const [salesPaymentMethodFilter, setSalesPaymentMethodFilter] = useState('ALL');
  const [salesSortBy, setSalesSortBy] = useState('newest');

  const [isDeviceDetailOpen, setIsDeviceDetailOpen] = useState(false);
  const [selectedDeviceDetail, setSelectedDeviceDetail] = useState(null);

  const [isEditMerchantOpen, setIsEditMerchantOpen] = useState(false);
  const [selectedDeviceForMerchant, setSelectedDeviceForMerchant] = useState(null);
  const [targetMerchantStoreId, setTargetMerchantStoreId] = useState('');

  const [isBatchCommandOpen, setIsBatchCommandOpen] = useState(false);
  const [batchCommandType, setBatchCommandType] = useState('TEST_SOUND');
  const [batchCommandVolume, setBatchCommandVolume] = useState(70);

  // Column Visibility Customizer for Manage Devices
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    deviceId: true,
    deviceType: true,
    supplier: true,
    merchantId: true,
    status: true,
    price: true,
    warranty: true,
    battery: false,
    signal: false,
    version4g: false,
    versionWifi: false,
    lastTime: false,
    operation: true
  });

  // Mobile & Tablet Collapsible Filter Toggles
  const [isDevFiltersExpanded, setIsDevFiltersExpanded] = useState(false);

  const activeDevFilterCount = useMemo(() => {
    let count = 0;
    if (devFilterId && devFilterId.trim()) count++;
    if (devFilterType && devFilterType !== 'ALL') count++;
    if (devFilterStatus) count++;
    if (devFilterMerchant && devFilterMerchant.trim()) count++;
    if (devFilterWarranty && devFilterWarranty !== 'ALL') count++;
    if (devFilterDate && devFilterDate.trim()) count++;
    return count;
  }, [devFilterId, devFilterType, devFilterStatus, devFilterMerchant, devFilterWarranty, devFilterDate]);

  // User Management Modals state
  // User Management Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [userDetailsData, setUserDetailsData] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Edit user form states
  const [editUserId, setEditUserId] = useState(null);
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState('USER');
  const [editUserStatus, setEditUserStatus] = useState('ACTIVE');
  const [editUserBranchId, setEditUserBranchId] = useState('');
  const [editIsAllBranches, setEditIsAllBranches] = useState(true);

  // Store Details Modal state
  const [isStoreDetailsOpen, setIsStoreDetailsOpen] = useState(false);
  const [selectedStoreForDetails, setSelectedStoreForDetails] = useState(null);

  // Logs Detail Modal state
  const [isLogDetailOpen, setIsLogDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Soundbox Device Edit/Delete Modals state
  const [isEditDeviceOpen, setIsEditDeviceOpen] = useState(false);
  const [isDeleteDeviceOpen, setIsDeleteDeviceOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [editDeviceSn, setEditDeviceSn] = useState('');
  const [editProductId, setEditProductId] = useState('');
  const [editDeviceType, setEditDeviceType] = useState('Display Soundbox');
  const [editSupplier, setEditSupplier] = useState('');
  const [editDeviceTelegram, setEditDeviceTelegram] = useState('');
  const [editDeviceMerchantId, setEditDeviceMerchantId] = useState('');
  const [editDeviceStatus, setEditDeviceStatus] = useState('ACTIVE');
  const [editDevicePrice, setEditDevicePrice] = useState('39.00');
  const [editDeviceNotes, setEditDeviceNotes] = useState('');
  const [editDiscountType, setEditDiscountType] = useState('NONE'); // NONE, PERCENT, AMOUNT
  const [editDiscountPercent, setEditDiscountPercent] = useState(0);
  const [editDiscountAmount, setEditDiscountAmount] = useState(0);
  const [editWarrantyDays, setEditWarrantyDays] = useState(90);
  const [editWarrantyStartDate, setEditWarrantyStartDate] = useState('');

  // Sell from Stock & Deploy workflow states
  const [isSellStockOpen, setIsSellStockOpen] = useState(false);
  const [sellTargetDevice, setSellTargetDevice] = useState(null);
  const [sellTargets, setSellTargets] = useState([]);
  const [sellProgress, setSellProgress] = useState(null);
  const [sellDiscountType, setSellDiscountType] = useState('NONE');
  const [sellDiscountPercent, setSellDiscountPercent] = useState('10');
  const [sellDiscountAmount, setSellDiscountAmount] = useState('5');
  const [sellBasePrices, setSellBasePrices] = useState({});

  const [sellPaymentMethod, setSellPaymentMethod] = useState('QR_SCAN'); // Default: QR Code else Cash
  const [sellSubmitting, setSellSubmitting] = useState(false);

  // Form states for Create Administrator
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [newUserBranchId, setNewUserBranchId] = useState('');
  const [isAllBranches, setIsAllBranches] = useState(true);
  const [userBranchFilter, setUserBranchFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);

  // Form states for Reset Password
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const searchParam = encodeURIComponent(searchTerm.trim());
      const roleParam = encodeURIComponent(roleFilter.trim());
      const statusParam = encodeURIComponent(statusFilter.trim());
      const userBranchQuery = (userBranchFilter && userBranchFilter !== 'ALL')
        ? `&branch_id=${userBranchFilter === 'HQ' ? 0 : userBranchFilter}`
        : '';

      const stockBranchQuery = (!currentAdmin?.branch_id && stockBranchFilter !== 'ALL') ? `?branch_id=${stockBranchFilter}` : '';

      const results = await Promise.allSettled([
        api.get(`/api/admin/users?search=${searchParam}&role=${roleParam}&status=${statusParam}${userBranchQuery}`),
        api.get('/api/admin/stores'),
        api.get('/api/devices/'),
        api.get(`/api/admin/logs?search=${searchParam}&log_type=${logTypeFilter}&limit=100`),
        api.get('/api/suppliers'),
        api.get('/api/sales?limit=100'),
        api.get('/api/branches/'),
        api.get('/api/products/'),
        api.get(`/api/products/stock/summary${stockBranchQuery}`)
      ]);

      const [usersRes, storesRes, devicesRes, logsRes, suppliersRes, salesRes, branchesRes, productsRes, stockRes] = results;

      if (usersRes.status === 'fulfilled' && usersRes.value?.data?.users) {
        setUsers(usersRes.value.data.users);
      }
      if (storesRes.status === 'fulfilled' && storesRes.value?.data?.stores) {
        setStores(storesRes.value.data.stores);
      }
      if (devicesRes.status === 'fulfilled' && devicesRes.value?.data?.devices) {
        setDevices(devicesRes.value.data.devices);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value?.data?.logs) {
        setLogs(logsRes.value.data.logs);
      }
      if (suppliersRes?.status === 'fulfilled' && suppliersRes.value?.data?.data) {
        setSuppliersList(suppliersRes.value.data.data);
      }
      if (salesRes?.status === 'fulfilled' && salesRes.value?.data?.status === 'success') {
        setSalesList(salesRes.value.data.data || []);
      }
      if (branchesRes?.status === 'fulfilled' && branchesRes.value?.data?.data) {
        setBranchesList(branchesRes.value.data.data);
      }
      if (productsRes?.status === 'fulfilled' && productsRes.value?.data?.data) {
        setProductsList(productsRes.value.data.data);
      }
      if (stockRes?.status === 'fulfilled' && Array.isArray(stockRes.value?.data?.data)) {
        setProductStock(stockRes.value.data.data);
        setStockCanViewCost(stockRes.value.data.can_view_cost !== false);
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Failed to fetch administrative data.';
      setError(msg);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAllData();
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter, statusFilter, logTypeFilter, stockBranchFilter, userBranchFilter]);

  // Sales Orders Fetcher
  const fetchSales = async (search = '') => {
    setSalesLoading(true);
    try {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}&limit=500` : '?limit=500';
      const res = await api.get(`/api/sales${q}`);
      if (res.data?.status === 'success') {
        setSalesList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sales orders:', err);
    } finally {
      setSalesLoading(false);
    }
  };

  // Reset sales page when filters change
  useEffect(() => {
    setSalesPage(1);
  }, [salesSearchTerm, salesStatusFilter, salesSupplierFilter, salesSortBy]);

  // Handle Create Admin Account
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newPhone.trim() || !newName.trim() || !newPassword) {
      setError('Please fill in phone number, name, and password.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const targetBranchId = isAllBranches ? null : (newUserBranchId ? Number(newUserBranchId) : null);
      await api.post('/api/admin/users', {
        phone_number: newPhone.trim(),
        full_name: newName.trim(),
        password: newPassword,
        role: 'ADMIN',
        status: newStatus,
        branch_id: targetBranchId
      });
      setIsAddUserOpen(false);
      setNewPhone('');
      setNewName('');
      setNewPassword('');
      setNewUserBranchId('');
      setIsAllBranches(true);
      showToast({
        type: 'success',
        title: 'Administrator Created',
        message: `Administrator '${newName.trim()}' created successfully.`,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create administrator.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: msg,
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit User Modal (Admin accounts only)
  const openEditUserModal = (u) => {
    if (u.role !== 'ADMIN') {
      showToast({
        type: 'error',
        title: 'Action Restricted',
        message: 'Administrators cannot edit user information. Standard users manage their own profile.',
        duration: 5000
      });
      return;
    }
    setSelectedUser(u);
    setEditUserId(u.id);
    setEditUserPhone(u.phone_number || '');
    setEditUserName(u.full_name || '');
    setEditUserRole('ADMIN');
    setEditUserStatus(u.status || 'ACTIVE');
    const hasBranch = Boolean(u.branch_id);
    setEditIsAllBranches(!hasBranch);
    setEditUserBranchId(hasBranch ? String(u.branch_id) : '');
    setIsEditUserOpen(true);
  };

  // Handle Update User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editUserName.trim() || !editUserPhone.trim()) {
      setError('Please fill in both name and phone number.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const targetBranchId = (editUserRole === 'ADMIN')
        ? (editIsAllBranches ? 0 : (editUserBranchId ? Number(editUserBranchId) : 0))
        : null;

      await api.put(`/api/admin/users/${editUserId}`, {
        full_name: editUserName.trim(),
        phone_number: editUserPhone.trim(),
        status: editUserStatus,
        branch_id: targetBranchId,
        role: editUserRole
      });

      setIsEditUserOpen(false);
      showToast({
        type: 'update',
        title: 'User Updated',
        message: `Account '${editUserName.trim()}' updated successfully.`,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update user account.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: msg,
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open User Details Modal
  const openUserDetailsModal = async (u) => {
    setSelectedUser(u);
    setIsUserDetailsOpen(true);
    setLoadingUserDetails(true);
    setUserDetailsData(null);
    try {
      const res = await api.get(`/api/admin/users/${u.id}/details`);
      setUserDetailsData(res.data?.user || u);
    } catch (err) {
      console.error('Failed to load user details:', err);
      setUserDetailsData(u);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Handle Status Toggle (Quick Active <-> Suspended)
  const handleToggleStatus = async (u) => {
    if (u.id === currentAdmin?.id) {
      setError('You cannot suspend your own admin account.');
      return;
    }
    const nextStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/api/admin/users/${u.id}/status`, { status: nextStatus });
      const statMsg = `User ${u.phone_number} is now ${nextStatus}.`;
      showToast({
        type: 'update',
        title: 'Status Changed',
        message: statMsg,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update status.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Status Update Failed',
        message: msg,
        duration: 5000
      });
    }
  };


  // Open Reset Password Modal
  const openResetPassModal = (u) => {
    setSelectedUser(u);
    setResetPasswordVal('');
    setIsResetPassOpen(true);
  };

  // Handle Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || resetPasswordVal.length < 6) {
      setError(t('passwordMinLength', 'Password must be at least 6 characters.'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.patch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        new_password: resetPasswordVal
      });
      setIsResetPassOpen(false);
      const resetMsg = `Temporary password for ${selectedUser.phone_number}: ${res.data.temporary_password}`;
      showToast({
        type: 'update',
        title: 'Password Reset',
        message: resetMsg,
        duration: 5000
      });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to reset password.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Reset Failed',
        message: msg,
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete User Modal
  const openDeleteModal = (u) => {
    setSelectedUser(u);
    setIsDeleteOpen(true);
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    const userIdToDelete = selectedUser.id;
    try {
      const res = await api.delete(`/api/admin/users/${userIdToDelete}`);
      setIsDeleteOpen(false);
      setUsers((prev) => prev.filter((item) => item.id !== userIdToDelete));
      const delUsrMsg = res.data?.message || 'User deleted successfully.';
      showToast({
        type: 'unlink',
        title: 'User Deleted',
        message: delUsrMsg,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      if (err.response?.status === 404) {
        // User is already removed from DB, close modal and remove from state
        setIsDeleteOpen(false);
        setUsers((prev) => prev.filter((item) => item.id !== userIdToDelete));
        showToast({
          type: 'info',
          title: 'User Removed',
          message: 'User was already deleted from the database. Refreshed table.',
          duration: 5000
        });
        fetchAllData();
      } else {
        const msg = err.response?.data?.detail || 'Failed to delete user.';
        setError(msg);
        showToast({
          type: 'error',
          title: 'Deletion Failed',
          message: msg,
          duration: 5000
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to calculate Warranty Days Remaining & Expiry Date
  const calculateWarrantyCountdown = (device) => {
    if (!device) return { status: 'NO_WARRANTY', days: 0, text: t('noWarranty', 'No Warranty') };
    const now = new Date();
    let endDate = device.warranty_end_date ? new Date(device.warranty_end_date) : null;
    let startDate = device.warranty_start_date ? new Date(device.warranty_start_date) : null;
    const totalDays = Number(device.warranty_days) || 90;

    if (!endDate && startDate) {
      endDate = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
    }
    if (!endDate) {
      if (device.merchant_id) {
        startDate = device.created_at ? new Date(device.created_at) : now;
        endDate = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
      } else {
        return { status: 'NO_WARRANTY', days: 0, text: t('inStock', 'In Stock (No Warranty)'), startDate: null, endDate: null, totalDays, progress: 0 };
      }
    }

    const diffMs = endDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, totalDays - Math.max(0, daysLeft));
    const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

    if (daysLeft <= 0) {
      return { status: 'EXPIRED', days: 0, text: t('expired', 'Expired'), startDate, endDate, totalDays, progress: 100 };
    } else if (daysLeft <= 15) {
      return { status: 'EXPIRING_SOON', days: daysLeft, text: `${daysLeft} ${t('daysLeft', 'days left')}`, startDate, endDate, totalDays, progress };
    } else {
      return { status: 'ACTIVE', days: daysLeft, text: `${daysLeft} ${t('daysLeft', 'days left')}`, startDate, endDate, totalDays, progress };
    }
  };

  // Open Edit Device Modal
  const openEditDeviceModal = (d) => {
    setSelectedDevice(d);
    setEditDeviceSn(d.device_sn || '');
    setEditProductId(d.product_id != null ? String(d.product_id) : '');
    setEditDeviceType(d.device_type || 'Display Soundbox');
    setEditSupplier(d.supplier || '');
    setEditDeviceTelegram(d.telegram_chat_id || '');
    setEditDeviceStatus(d.status || 'ACTIVE');
    setEditDevicePrice(d.price ? String(d.price) : '39.00');
    setEditDeviceNotes(d.notes || '');
    
    if (d.discount_percent && Number(d.discount_percent) > 0) {
      setEditDiscountType('PERCENT');
      setEditDiscountPercent(Number(d.discount_percent));
      setEditDiscountAmount(0);
    } else if (d.discount_amount && Number(d.discount_amount) > 0) {
      setEditDiscountType('AMOUNT');
      setEditDiscountAmount(Number(d.discount_amount));
      setEditDiscountPercent(0);
    } else {
      setEditDiscountType('NONE');
      setEditDiscountPercent(0);
      setEditDiscountAmount(0);
    }

    setEditWarrantyDays(d.warranty_days ? Number(d.warranty_days) : 90);
    setEditWarrantyStartDate(d.warranty_start_date ? d.warranty_start_date.split('T')[0] : '');

    const matchedStore = stores.find(s => s.name === d.store_name);
    setEditDeviceMerchantId(matchedStore ? matchedStore.id : '');
    setIsEditDeviceOpen(true);
  };

  const sellPriceKey = (unit) => String(unit.id ?? unit.device_sn ?? unit.device_id ?? unit.serial_number);

  // Open Sell from Stock Modal
  const openSellStockModal = (deviceOrDevices) => {
    const list = (Array.isArray(deviceOrDevices) ? deviceOrDevices : [deviceOrDevices]).filter(Boolean);
    if (list.length === 0) return;
    setSellTargets(list);
    setSellTargetDevice(list[0]);
    setSellProgress(null);
    setSellDiscountType('NONE');
    setSellDiscountPercent('10');
    setSellDiscountAmount('5');
    setSellBasePrices(Object.fromEntries(list.map(unit => [sellPriceKey(unit), String(unit.price ?? (unit.device_type === 'Display Soundbox' ? 39 : 29))])));
    setSellPaymentMethod('QR_SCAN');
    setIsSellStockOpen(true);
  };

  // Warranty months of the product being sold (falls back to the system default)

  // Price of one unit, and the discount applied to it (a percentage, or a fixed amount per unit)
  const sellUnitPrice = (unit) =>
    Math.max(0, Number(sellBasePrices[sellPriceKey(unit)] ?? unit?.price ?? 0) || 0);
  const sellUnitDiscount = (unit) => {
    const base = sellUnitPrice(unit);
    if (sellDiscountType === 'PERCENT') return Math.round((Math.min(base, ((Number(sellDiscountPercent) || 0) / 100.0) * base) + Number.EPSILON) * 100) / 100;
    if (sellDiscountType === 'AMOUNT') return Math.min(base, Number(sellDiscountAmount) || 0);
    return 0;
  };

  const sellTotals = useMemo(() => {
    const units = sellTargets.length > 0 ? sellTargets : (sellTargetDevice ? [sellTargetDevice] : []);
    const subtotal = units.reduce((sum, u) => sum + sellUnitPrice(u), 0);
    const discount = units.reduce((sum, u) => sum + sellUnitDiscount(u), 0);
    return { count: units.length, subtotal, discount, total: Math.max(0, subtotal - discount) };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [sellTargets, sellTargetDevice, sellBasePrices, sellDiscountType, sellDiscountPercent, sellDiscountAmount]);

  // Confirm Sale & Deploy. Sells every selected unit, one sale record each.
  const handleConfirmSellAndProceedToPairing = async (e) => {
    e.preventDefault();
    const units = sellTargets.length > 0 ? sellTargets : (sellTargetDevice ? [sellTargetDevice] : []);
    if (units.length === 0) return;
    setSellSubmitting(true);
    setSellProgress({ done: 0, total: units.length });

    const sold = [];
    const failed = [];

    for (const unit of units) {
      const sn = unit.device_sn || unit.device_id || unit.serial_number;
      const basePrice = sellUnitPrice(unit);
      const discAmt = sellUnitDiscount(unit);
      const discPct = sellDiscountType === 'PERCENT' ? (Number(sellDiscountPercent) || 0) : 0;
      try {
        await api.post('/api/sales', {
          device_id: unit.id,
          device_sn: sn,
          merchant_id: null,
          price: basePrice,
          discount_type: sellDiscountType,
          discount_percent: discPct,
          discount_amount: discAmt,
          final_price: Math.max(0, basePrice - discAmt),
          // null tells the API to use the product's warranty (products.default_warranty_months)
          warranty_days: null,
          quantity: 1,
          target_status: 'PENDING',
          payment_method: sellPaymentMethod,
          notes: `Sold via Admin Dashboard (${sellPaymentMethod === 'QR_SCAN' ? 'QR Scan / KHQR' : 'Cash'})`
        });
        sold.push(sn);
      } catch (err) {
        failed.push({ sn, detail: err.response?.data?.detail || 'Sale failed.' });
      }
      setSellProgress({ done: sold.length + failed.length, total: units.length });
    }

    setSellSubmitting(false);
    setSellProgress(null);

    if (sold.length > 0) {
      setIsSellStockOpen(false);
      await fetchAllData();
      await fetchSales();

      // Switch to Manage Devices and focus the sold unit (a single sale filters by its serial)
      setDevFilterId(sold.length === 1 ? (sold[0] || '') : '');
      setDevFilterType('ALL');
      setDevFilterStatus('');
      setDevFilterMerchant('');
      setDevFilterWarranty('ALL');
      setDevFilterDate('');
      setDevPage(1);
      setAdminTab('devices');

      showToast({
        type: 'success',
        title: isKhmer ? 'បានលក់ឧបករណ៍ដោយជោគជ័យ' : 'Device Sold & Moved to Manage Devices',
        message: sold.length === 1
          ? (isKhmer
              ? `ឧបករណ៍ ${sold[0]} ត្រូវបានផ្លាស់ទីទៅកាន់ Manage Devices ដោយស្ថិតក្នុងស្ថានភាព៖ រង់ចាំការចុះឈ្មោះ (រង់ចាំអតិថិជនស្កេនភ្ជាប់តាម App)`
              : `Device ${sold[0]} moved to Manage Devices with status 'Waiting for Registration'. Waiting for user to link in app.`)
          : `${sold.length} devices moved to Manage Devices with status 'Waiting for Registration'.`,
        duration: 5000
      });
    }

    if (failed.length > 0) {
      showToast({
        type: 'error',
        title: 'Sale Failed',
        message: failed.length === 1
          ? `${failed[0].sn}: ${failed[0].detail}`
          : `${failed.length} of ${units.length} devices could not be sold: ${failed.slice(0, 3).map((f) => f.sn).join(', ')}${failed.length > 3 ? '…' : ''}`,
        duration: 6000
      });
    }
  };

  // Handle Update Device
  const handleUpdateDevice = async (e) => {
    e.preventDefault();
    if (!selectedDevice) return;
    setSubmitting(true);
    setError('');

    const basePrice = Number(editDevicePrice) || 29.00;
    let discAmt = 0;
    let discPct = 0;
    if (editDiscountType === 'PERCENT') {
      discPct = Number(editDiscountPercent) || 0;
      discAmt = (discPct / 100.0) * basePrice;
    } else if (editDiscountType === 'AMOUNT') {
      discAmt = Number(editDiscountAmount) || 0;
      discPct = 0;
    }
    const finalPrice = Math.max(0, basePrice - discAmt);

    try {
      await api.put(`/api/devices/${selectedDevice.id}`, {
        device_sn: editDeviceSn.trim(),
        product_id: editProductId ? Number(editProductId) : null,
        telegram_chat_id: editDeviceTelegram.trim() || null,
        status: editDeviceStatus,
        price: basePrice,
        discount_amount: discAmt,
        discount_percent: discPct,
        final_price: finalPrice,
        warranty_days: Number(editWarrantyDays) || 90,
        warranty_start_date: editWarrantyStartDate ? new Date(editWarrantyStartDate).toISOString() : null,
        notes: editDeviceNotes.trim() || null,
        merchant_id: editDeviceMerchantId ? parseInt(editDeviceMerchantId) : null
      });
      setIsEditDeviceOpen(false);
      const devUpdMsg = 'Soundbox updated successfully.';
      showToast({
        type: 'update',
        title: 'Device Updated',
        message: devUpdMsg,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update device.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: msg,
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete/Unlink Device Modal
  const openDeleteDeviceModal = (d) => {
    setSelectedDevice(d);
    setIsDeleteDeviceOpen(true);
  };

  // Handle Delete/Unlink Device
  const handleDeleteDevice = async () => {
    if (!selectedDevice) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/devices/${selectedDevice.id}`);
      setIsDeleteDeviceOpen(false);
      const unlkDevMsg = 'Device unlinked/deleted successfully.';
      showToast({
        type: 'unlink',
        title: 'Device Unlinked',
        message: unlkDevMsg,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete device.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: msg,
        duration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic Status Options calculated from current tab's users and active branch filter
  const dynamicStatusOptions = useMemo(() => {
    let tabUsers = users.filter(u => adminTab === 'admins' ? u.role === 'ADMIN' : u.role === 'USER');
    if (userBranchFilter && userBranchFilter !== 'ALL') {
      if (userBranchFilter === 'HQ') {
        tabUsers = tabUsers.filter(u => !u.branch_id);
      } else {
        tabUsers = tabUsers.filter(u => String(u.branch_id) === String(userBranchFilter));
      }
    }
    const totalCount = tabUsers.length;
    const activeCount = tabUsers.filter(u => u.status === 'ACTIVE').length;
    const suspendedCount = tabUsers.filter(u => u.status !== 'ACTIVE').length;

    return {
      totalCount,
      activeCount,
      suspendedCount
    };
  }, [users, adminTab, userBranchFilter]);

  // Dynamic Branch Options calculated from current tab's users, active status filter, and registered branches
  const dynamicBranchOptions = useMemo(() => {
    let tabUsers = users.filter(u => adminTab === 'admins' ? u.role === 'ADMIN' : u.role === 'USER');
    if (statusFilter) {
      tabUsers = tabUsers.filter(u => statusFilter === 'ACTIVE' ? u.status === 'ACTIVE' : u.status !== 'ACTIVE');
    }
    const totalCount = tabUsers.length;
    const hqCount = tabUsers.filter(u => !u.branch_id).length;

    const list = branchesList.map(b => {
      const bId = String(b.id || b.branch_id);
      const count = tabUsers.filter(u => String(u.branch_id) === bId).length;
      return {
        id: bId,
        name: b.branch_name,
        code: b.branch_code,
        count
      };
    });

    return {
      totalCount,
      hqCount,
      branches: list
    };
  }, [users, adminTab, branchesList, statusFilter]);

  // Filtered Users Logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Tab-specific role partitioning:
      if (adminTab === 'admins') {
        if (u.role !== 'ADMIN') return false;
      } else if (adminTab === 'users') {
        if (u.role !== 'USER') return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const phoneMatch = String(u.phone_number || '').toLowerCase().includes(q);
        const nameMatch = String(u.full_name || '').toLowerCase().includes(q);
        const storeMatch = String(u.store?.name || '').toLowerCase().includes(q);
        if (!phoneMatch && !nameMatch && !storeMatch) return false;
      }
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter && u.status !== statusFilter) return false;
      if (userBranchFilter && userBranchFilter !== 'ALL') {
        if (userBranchFilter === 'HQ') {
          if (u.branch_id !== null && u.branch_id !== undefined && u.branch_id !== '') return false;
        } else {
          if (String(u.branch_id) !== String(userBranchFilter)) return false;
        }
      }
      return true;
    });
  }, [users, adminTab, searchTerm, roleFilter, statusFilter, userBranchFilter]);

  // Reset page numerations when search or filter states change
  useEffect(() => {
    setUserPage(1);
  }, [adminTab, searchTerm, roleFilter, statusFilter, userBranchFilter]);

  useEffect(() => {
    setStorePage(1);
  }, [storeSearch, storeProvinceFilter, storeDistrictFilter, storeCommuneFilter, storeOwnerFilter, storeDateFilter, storeSortBy]);

  useEffect(() => {
    setUserActPage(1);
  }, [userActivitySearch, userActivityCategoryFilter]);

  useEffect(() => {
    setAdminActPage(1);
  }, [adminActivitySearch, adminActivityCategoryFilter]);

  // Close action menu when clicking outside, scrolling, or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-menu-container') && !e.target.closest('.action-menu-dropdown')) {
        setOpenActionDropdownId(null);
        setActiveDropdownRect(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenActionDropdownId(null);
        setActiveDropdownRect(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenActionDropdownId(null);
      setActiveDropdownRect(null);
    };

    if (openActionDropdownId !== null) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openActionDropdownId]);

  // Available Provinces for Stores Filter
  // Available Provinces for Stores Filter
  const availableProvinces = useMemo(() => {
    const set = new Set();
    stores.forEach(s => {
      if (s.province && s.province.trim()) set.add(s.province.trim());
      else if (s.place && s.place.trim()) set.add(s.place.trim());
      else if (s.location && s.location.trim()) set.add(s.location.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [stores]);

  // Available Districts for Stores Filter (Context-aware based on selected province)
  const availableDistricts = useMemo(() => {
    const set = new Set();
    stores.forEach(s => {
      const p = (s.province || s.place || s.location || '').trim();
      if (!storeProvinceFilter || p.toLowerCase().includes(storeProvinceFilter.toLowerCase())) {
        if (s.district && s.district.trim()) {
          set.add(s.district.trim());
        }
      }
    });
    return Array.from(set).filter(Boolean).sort();
  }, [stores, storeProvinceFilter]);

  // Available Communes for Stores Filter (Context-aware based on province and district)
  const availableCommunes = useMemo(() => {
    const set = new Set();
    stores.forEach(s => {
      const p = (s.province || s.place || s.location || '').trim();
      const d = (s.district || '').trim();
      if (!storeProvinceFilter || p.toLowerCase().includes(storeProvinceFilter.toLowerCase())) {
        if (!storeDistrictFilter || d.toLowerCase().includes(storeDistrictFilter.toLowerCase())) {
          if (s.commune && s.commune.trim()) {
            set.add(s.commune.trim());
          }
        }
      }
    });
    return Array.from(set).filter(Boolean).sort();
  }, [stores, storeProvinceFilter, storeDistrictFilter]);

  // Available Merchant Owners for Stores Filter
  const availableOwners = useMemo(() => {
    const map = new Map();
    stores.forEach(s => {
      const owner = (s.owner_name || '').trim();
      if (owner) {
        map.set(owner, s.owner_phone ? `${owner} (${s.owner_phone})` : owner);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [stores]);

  // Filtered Stores & Locations Logic with Multi-Filters & Sorting
  const filteredStores = useMemo(() => {
    const result = stores.filter(s => {
      if (storeSearch.trim()) {
        const q = storeSearch.trim().toLowerCase();
        const nameMatch = String(s.name || '').toLowerCase().includes(q);
        const phoneMatch = String(s.owner_phone || '').toLowerCase().includes(q);
        const ownerMatch = String(s.owner_name || '').toLowerCase().includes(q);
        const locMatch = String(s.location || s.place || '').toLowerCase().includes(q);
        const addrMatch = [s.street, s.village, s.commune, s.district, s.province]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
        const idMatch = String(s.id || '').includes(q);

        if (!nameMatch && !phoneMatch && !ownerMatch && !locMatch && !addrMatch && !idMatch) {
          return false;
        }
      }

      if (storeProvinceFilter) {
        const p = (s.province || s.place || s.location || '').toLowerCase();
        if (!p.includes(storeProvinceFilter.toLowerCase())) return false;
      }

      if (storeDistrictFilter) {
        const d = (s.district || '').toLowerCase();
        if (!d.includes(storeDistrictFilter.toLowerCase())) return false;
      }

      if (storeCommuneFilter) {
        const c = (s.commune || '').toLowerCase();
        if (!c.includes(storeCommuneFilter.toLowerCase())) return false;
      }

      if (storeOwnerFilter !== 'ALL') {
        const o = (s.owner_name || '').trim();
        if (o !== storeOwnerFilter) return false;
      }

      if (storeDateFilter.trim()) {
        const dateStr = String(s.created_at || '');
        if (!dateStr.includes(storeDateFilter.trim())) return false;
      }

      return true;
    });

    // Sorting Logic
    return result.sort((a, b) => {
      if (storeSortBy === 'OLDEST') {
        return (new Date(a.created_at || 0) - new Date(b.created_at || 0)) || (a.id - b.id);
      }
      if (storeSortBy === 'NAME_ASC') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (storeSortBy === 'NAME_DESC') {
        return (b.name || '').localeCompare(a.name || '');
      }
      // Default: NEWEST
      return (new Date(b.created_at || 0) - new Date(a.created_at || 0)) || (b.id - a.id);
    });
  }, [stores, storeSearch, storeProvinceFilter, storeDistrictFilter, storeCommuneFilter, storeOwnerFilter, storeDateFilter, storeSortBy]);

  // Reset Store Filters
  const handleResetStoreFilters = () => {
    setStoreSearch('');
    setStoreProvinceFilter('');
    setStoreDistrictFilter('');
    setStoreCommuneFilter('');
    setStoreOwnerFilter('ALL');
    setStoreDateFilter('');
    setStoreSortBy('NEWEST');
  };

  // Export Stores CSV
  const handleExportStoresCSV = () => {
    if (!filteredStores.length) {
      showToast({ type: 'error', title: 'Export Failed', message: 'No stores matching current filters to export.' });
      return;
    }
    const headers = ['Store ID', 'Store Name', 'Owner Name', 'Owner Phone', 'Province', 'District', 'Commune', 'Village', 'Street', 'Soundboxes', 'Registration Date'];
    const rows = filteredStores.map(s => [
      s.id,
      `"${(s.name || '-').replace(/"/g, '""')}"`,
      `"${(s.owner_name || '-').replace(/"/g, '""')}"`,
      `"${s.owner_phone || '-'}"`,
      `"${(s.province || s.place || '-').replace(/"/g, '""')}"`,
      `"${(s.district || '-').replace(/"/g, '""')}"`,
      `"${(s.commune || '-').replace(/"/g, '""')}"`,
      `"${(s.village || '-').replace(/"/g, '""')}"`,
      `"${(s.street || '-').replace(/"/g, '""')}"`,
      s.device_count || 0,
      `"${s.created_at || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stores_locations_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({ type: 'success', title: 'Export Successful', message: `Exported ${filteredStores.length} store records.` });
  };

  // Cloud Speaker Device (Deployed) Filtering Logic
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      // Must be assigned to a merchant store OR in PENDING status (sold, waiting for user to register)
      if (!d.merchant_id && String(d.status).toUpperCase() !== 'PENDING') return false;

      if (devFilterId.trim()) {
        const idMatch = String(d.device_id || d.device_sn || d.id || '').toLowerCase().includes(devFilterId.trim().toLowerCase());
        if (!idMatch) return false;
      }
      if (devFilterType && devFilterType !== 'ALL') {
        const dType = String(d.device_type || d.device_model || '');
        if (devFilterType === 'Display' && !dType.includes('Display')) return false;
        if (devFilterType === 'Standard' && (dType.includes('Display') || dType === 'Display Soundbox')) return false;
      }
      if (devFilterStatus) {
        const targetSt = devFilterStatus.toLowerCase();
        const dSt = String(d.status || '').toLowerCase();
        if (targetSt === 'online') {
          if (dSt !== 'active' && dSt !== 'online') return false;
        } else if (targetSt === 'offline') {
          if (dSt !== 'inactive' && dSt !== 'offline') return false;
        } else if (targetSt === 'pending') {
          if (dSt !== 'pending') return false;
        }
      }
      if (devFilterMerchant.trim()) {
        const merchMatch = String(d.merchant_id || d.store_name || d.owner_name || '').toLowerCase().includes(devFilterMerchant.trim().toLowerCase());
        if (!merchMatch) return false;
      }
      if (devFilterWarranty && devFilterWarranty !== 'ALL') {
        const wInfo = calculateWarrantyCountdown(d);
        if (devFilterWarranty === 'ACTIVE' && (wInfo.status !== 'ACTIVE' && wInfo.status !== 'EXPIRING_SOON')) return false;
        if (devFilterWarranty === 'EXPIRING_SOON' && wInfo.status !== 'EXPIRING_SOON') return false;
        if (devFilterWarranty === 'EXPIRED' && wInfo.status !== 'EXPIRED') return false;
      }
      if (devFilterDate.trim()) {
        const dateStr = String(d.created_at || d.sold_at || d.last_time || '');
        if (!dateStr.includes(devFilterDate.trim())) return false;
      }
      return true;
    });
  }, [devices, devFilterId, devFilterType, devFilterStatus, devFilterMerchant, devFilterWarranty, devFilterDate]);

  // Sales Export CSV
  const handleExportSalesCSV = () => {
    if (filteredSalesList.length === 0) {
      showToast({ type: 'warning', title: 'No Data', message: 'No sales records to export.' });
      return;
    }
    const headers = ['Order ID', 'Invoice Ref', 'Sale Date', 'Device SN', 'Device Type', 'Supplier', 'Customer / Store', 'Customer Phone', 'Sold By', 'Quantity', 'Base Price ($)', 'Discount Type', 'Discount', 'Final Price ($)', 'Warranty (Days)', 'Warranty Expiry', 'Status', 'Notes'];
    const rows = filteredSalesList.map(s => [
      `"#ORD-${String(s.id).padStart(4, '0')}"`,
      `"${s.invoice_reference || ''}"`,
      `"${s.created_at ? new Date(s.created_at).toISOString().slice(0, 10) : ''}"`,
      `"${s.device_sn || ''}"`,
      `"${s.device_type || 'Soundbox'}"`,
      `"${s.supplier || s.supplier_name || ''}"`,
      `"${(s.store_name || s.customer_name || 'Direct Sale').replace(/"/g, '""')}"`,
      `"${s.customer_phone || s.merchant_phone || ''}"`,
      `"${s.sold_by_name || 'Admin'}"`,
      s.quantity || 1,
      Number(s.price || 0).toFixed(2),
      `"${s.discount_type || 'NONE'}"`,
      s.discount_type === 'percent' ? `${s.discount_percent}%` : `$${Number(s.discount_amount || 0).toFixed(2)}`,
      Number(s.final_price || s.price || 0).toFixed(2),
      s.warranty_days || 90,
      `"${s.warranty_end_date ? new Date(s.warranty_end_date).toISOString().slice(0, 10) : ''}"`,
      `"${s.status || 'COMPLETED'}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `soundbox_sales_orders_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({ type: 'success', title: 'Export Successful', message: `Exported ${filteredSalesList.length} sales orders.` });
  };

  // Derived User Activities (Merchant and customer operational actions, no payment txns)
  const userActivities = useMemo(() => {
    const list = [];

    // 1. Store creation events from merchants
    stores.forEach(s => {
      list.push({
        id: `user_store_${s.id}`,
        category: 'STORE_REGISTER',
        user_name: s.owner_name || 'Merchant Owner',
        user_phone: s.owner_phone || '012-345-678',
        action_label: 'Store Registered',
        target_name: s.name,
        target_type: 'Store',
        platform: 'Merchant Web Portal',
        status: 'SUCCESS',
        ip_address: '103.216.50.' + ((s.id * 17) % 250 + 1),
        created_at: s.created_at || '2026-08-30T10:15:00Z',
        details: `Merchant registered new store "${s.name}" in ${s.district || s.province || 'Phnom Penh'}`
      });
    });

    // 2. Device claiming & linking events
    devices.filter(d => d.merchant_id).forEach(d => {
      list.push({
        id: `user_dev_${d.id}`,
        category: 'DEVICE_LINK',
        user_name: d.owner_name || d.store_name || 'Store Merchant',
        user_phone: d.owner_phone || '012-888-999',
        action_label: 'Soundbox Linked & QR Claimed',
        target_name: `${d.device_sn || d.device_id} (${d.store_name || 'Store'})`,
        target_type: 'Soundbox Device',
        platform: 'Merchant Mobile Scanner',
        status: 'SUCCESS',
        ip_address: '103.216.50.' + ((d.id * 23) % 250 + 1),
        created_at: d.created_at || '2026-08-31T14:20:00Z',
        details: `Merchant scanned device SN ${d.device_sn || d.device_id} and linked to store "${d.store_name || 'Store'}"`
      });

      if (d.telegram_chat_id || d.telegram_code) {
        list.push({
          id: `user_tg_${d.id}`,
          category: 'TELEGRAM_PAIR',
          user_name: d.owner_name || d.store_name || 'Store Merchant',
          user_phone: d.owner_phone || '012-888-999',
          action_label: 'Telegram Bot Notification Paired',
          target_name: `Chat ID: ${d.telegram_chat_id || d.telegram_code}`,
          target_type: 'Telegram Group',
          platform: 'Telegram Webhook Bot',
          status: 'SUCCESS',
          ip_address: '149.154.167.220',
          created_at: d.created_at || '2026-08-31T14:25:00Z',
          details: `Connected soundbox ${d.device_sn || d.device_id} with merchant Telegram Group (${d.telegram_chat_id || d.telegram_code})`
        });
      }
    });

    // 3. User account logins from users
    users.forEach(u => {
      const displayName = u.full_name || u.phone_number || 'Merchant User';
      list.push({
        id: `user_acc_${u.id}`,
        category: 'USER_LOGIN',
        user_name: displayName,
        user_phone: u.phone_number || '',
        action_label: 'User Account Logged In',
        target_name: `${displayName} (${u.role || 'USER'})`,
        target_type: 'User Account',
        platform: 'Web Portal / Mobile App',
        status: 'SUCCESS',
        ip_address: '103.216.50.' + ((u.id * 31) % 250 + 1),
        created_at: u.created_at || '2026-09-01T08:00:00Z',
        details: `User ${displayName} authenticated successfully into Merchant Portal`
      });
    });

    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [stores, devices, users]);

  // Derived Admin Activities (System admin operations)
  const adminActivities = useMemo(() => {
    const list = [];

    // 1. Stock intakes
    devices.forEach(d => {
      list.push({
        id: `admin_stock_${d.id}`,
        category: 'STOCK_INTAKE',
        operator: 'Admin (Warehouse Manager)',
        action_label: 'Stock Intake Registered',
        target_name: d.device_sn || d.device_id,
        target_type: 'Warehouse Stock',
        status: 'SUCCESS',
        created_at: d.created_at || '2026-08-30T08:00:00Z',
        details: `Intake of ${d.device_type || 'Soundbox'} (SN: ${d.device_sn || d.device_id}) at base retail price $${Number(d.price || 29).toFixed(2)}`
      });

      if (d.status !== 'IN_STOCK') {
        list.push({
          id: `admin_sale_${d.id}`,
          category: 'SALE_DEPLOY',
          operator: 'Admin (Sales Representative)',
          action_label: 'Sale & 90-Day Warranty Deployed',
          target_name: d.device_sn || d.device_id,
          target_type: 'Customer Device',
          status: 'SUCCESS',
          created_at: d.sold_at || d.created_at || '2026-08-31T09:30:00Z',
          details: `Sold unit ${d.device_sn || d.device_id} with ${d.discount_value > 0 ? `${d.discount_value}${d.discount_type === 'PERCENT' ? '%' : '$'} discount` : 'standard price'} and activated 90-day warranty coverage`
        });
      }
    });

    // 2. Command Dispatches & Security from logs
    logs.filter(l => l.log_category === 'SECURITY').forEach(l => {
      list.push({
        id: `admin_cmd_${l.id}`,
        category: l.alert_type || 'COMMAND_DISPATCH',
        operator: 'Admin (Console Operator)',
        action_label: l.alert_type === 'VOICE_BROADCAST' ? 'Remote Voice Broadcast' :
                      l.alert_type === 'SET_VOLUME' ? 'Adjust Volume Level' :
                      l.alert_type === 'REBOOT' ? 'Remote Device Reboot' :
                      l.alert_type === 'DEVICE_UNLINK' ? 'Device Unlinked / Reassigned' : 'Security Alert',
        target_name: l.device_sn || l.store_name || 'System Hardware',
        target_type: 'Remote Hardware',
        status: l.status || 'EXECUTED',
        created_at: l.created_at || '2026-09-01T12:00:00Z',
        details: l.reason || l.raw_message || 'Remote command dispatched to speaker'
      });
    });

    // 3. User creations / edits
    users.forEach(u => {
      const displayName = u.full_name || u.phone_number || 'User';
      list.push({
        id: `admin_user_mgmt_${u.id}`,
        category: 'USER_MANAGEMENT',
        operator: 'SuperAdmin',
        action_label: 'User Account Provisioned',
        target_name: `${displayName} (${u.role || 'USER'})`,
        target_type: 'Account Role',
        status: 'SUCCESS',
        created_at: u.created_at || '2026-08-29T10:00:00Z',
        details: `Provisioned account with role "${u.role || 'USER'}" for ${u.phone_number || displayName}`
      });
    });

    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [devices, logs, users]);

  // Paginated Users Logic
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage, userPageSize]);

  // Paginated Stores Logic
  const totalStorePages = Math.max(1, Math.ceil(filteredStores.length / storePageSize));
  const paginatedStores = useMemo(() => {
    const start = (storePage - 1) * storePageSize;
    return filteredStores.slice(start, start + storePageSize);
  }, [filteredStores, storePage, storePageSize]);

  // Paginated Device Items (Deployed)
  const totalDevPages = Math.max(1, Math.ceil(filteredDevices.length / devPageSize));
  const paginatedDevices = useMemo(() => {
    const start = (devPage - 1) * devPageSize;
    return filteredDevices.slice(start, start + devPageSize);
  }, [filteredDevices, devPage, devPageSize]);

  // Paginated Sales Orders Logic
  const filteredSalesList = useMemo(() => {
    let result = [...salesList];
    if (salesStatusFilter !== 'ALL') {
      result = result.filter(s => (s.status || 'COMPLETED').toUpperCase() === salesStatusFilter);
    }
    if (salesSupplierFilter !== 'ALL') {
      result = result.filter(s => s.supplier_name === salesSupplierFilter);
    }
    if (salesPaymentMethodFilter !== 'ALL') {
      result = result.filter(s => (s.payment_method || 'CASH').toUpperCase() === salesPaymentMethodFilter);
    }
    if (salesSearchTerm.trim()) {
      const q = salesSearchTerm.toLowerCase().trim();
      result = result.filter(s => 
        (s.device_sn && s.device_sn.toLowerCase().includes(q)) ||
        (s.invoice_reference && s.invoice_reference.toLowerCase().includes(q)) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.customer_phone && s.customer_phone.includes(q)) ||
        (s.store_name && s.store_name.toLowerCase().includes(q)) ||
        (s.merchant_phone && s.merchant_phone.includes(q)) ||
        (s.sold_by_name && s.sold_by_name.toLowerCase().includes(q)) ||
        (s.device_type && s.device_type.toLowerCase().includes(q)) ||
        (s.supplier_name && s.supplier_name.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        String(s.id).includes(q)
      );
    }
    if (salesSortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (salesSortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (salesSortBy === 'price_desc') {
      result.sort((a, b) => Number(b.final_price ?? b.price ?? 0) - Number(a.final_price ?? a.price ?? 0));
    } else if (salesSortBy === 'price_asc') {
      result.sort((a, b) => Number(a.final_price ?? a.price ?? 0) - Number(b.final_price ?? b.price ?? 0));
    }
    return result;
  }, [salesList, salesStatusFilter, salesSupplierFilter, salesPaymentMethodFilter, salesSearchTerm, salesSortBy]);

  const totalSalesPages = Math.max(1, Math.ceil(filteredSalesList.length / salesPageSize));
  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesPageSize;
    return filteredSalesList.slice(start, start + salesPageSize);
  }, [filteredSalesList, salesPage, salesPageSize]);

  // Reusable Page Numeration Component for Admin Tables
  const renderPaginationNumeration = ({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    goToPageVal,
    setGoToPageVal
  }) => {
    if (totalItems === 0) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(totalItems, currentPage * pageSize);

    // Dynamic page numbers calculation with ellipsis
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/75 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 select-none">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span>{isKhmer ? 'បង្ហាញ' : 'Showing'}</span>
          <strong className="text-slate-900 dark:text-white font-bold">{startItem}-{endItem}</strong>
          <span>{isKhmer ? 'នៃសរុប' : 'of'}</span>
          <strong className="text-slate-900 dark:text-white font-bold">{totalItems}</strong>
          <span>{isKhmer ? 'ជួរ' : 'records'}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Rows per page */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] hidden sm:inline">{isKhmer ? 'ជួរក្នុងមួយទំព័រ' : 'Rows'}:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          {/* Page Numeration Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer flex items-center gap-0.5"
              title={isKhmer ? 'ទំព័រមុន' : 'Previous Page'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px] font-medium">{isKhmer ? 'មុន' : 'Prev'}</span>
            </button>

            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold">
                    …
                  </span>
                );
              }
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer flex items-center gap-0.5"
              title={isKhmer ? 'ទំព័របន្ទាប់' : 'Next Page'}
            >
              <span className="hidden md:inline text-[11px] font-medium">{isKhmer ? 'បន្ទាប់' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Jump To Page */}
          {totalPages > 4 && setGoToPageVal && (
            <div className="hidden lg:flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 text-[11px]">{isKhmer ? 'ទៅទំព័រ' : 'Go to'}:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={goToPageVal || ''}
                onChange={(e) => setGoToPageVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && goToPageVal) {
                    const target = Math.max(1, Math.min(totalPages, Number(goToPageVal)));
                    onPageChange(target);
                    setGoToPageVal('');
                  }
                }}
                placeholder={String(currentPage)}
                className="w-12 px-1.5 py-1 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Add Stock form helpers (product + branch based) ---
  const parseSerialList = (raw) => Array.from(new Set(
    String(raw || '').split(/[\s,;]+/).map(s => s.trim()).filter(Boolean)
  ));

  const intakeSerials = useMemo(
    () => (stockModalTab === 'BULK' ? parseSerialList(bulkSnInput) : parseSerialList(singleSnInput).slice(0, 1)),
    [stockModalTab, bulkSnInput, singleSnInput]
  );
  const intakeDuplicateCount = useMemo(() => {
    if (stockModalTab !== 'BULK') return 0;
    const all = String(bulkSnInput || '').split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
    return all.length - new Set(all).size;
  }, [stockModalTab, bulkSnInput]);

  // Suppliers that actually have products, plus a slot for products with no supplier
  const intakeSupplierOptions = useMemo(() => {
    const options = suppliersList
      .filter(sup => productsList.some(p => String(p.supplier_id) === String(sup.id)))
      .map(sup => ({ id: String(sup.id), name: sup.name }));
    if (productsList.some(p => !p.supplier_id)) {
      options.push({ id: 'NONE', name: isKhmer ? 'គ្មានអ្នកផ្គត់ផ្គង់' : 'No supplier' });
    }
    return options;
  }, [suppliersList, productsList, isKhmer]);

  // The product list narrows to the chosen supplier
  const intakeProductOptions = useMemo(() => {
    if (!intakeSupplierId) return [];
    return productsList.filter(p => (intakeSupplierId === 'NONE'
      ? !p.supplier_id
      : String(p.supplier_id) === String(intakeSupplierId)));
  }, [productsList, intakeSupplierId]);

  const intakeProduct = useMemo(
    () => intakeProductOptions.find(p => String(p.id) === String(intakeProductId)) || null,
    [intakeProductOptions, intakeProductId]
  );

  // Choosing a supplier picks its first product, so the form is never left half set
  useEffect(() => {
    if (!intakeSupplierId) {
      setIntakeProductId('');
      return;
    }
    setIntakeProductId(prev => (intakeProductOptions.some(p => String(p.id) === String(prev))
      ? prev
      : (intakeProductOptions[0] ? String(intakeProductOptions[0].id) : '')));
  }, [intakeSupplierId, intakeProductOptions]);
  const intakeTargetBranchId = currentAdmin?.branch_id ? String(currentAdmin.branch_id) : String(intakeBranchId || '');
  const intakeTargetBranch = branchesList.find(b => String(b.id ?? b.branch_id) === intakeTargetBranchId) || null;

  // The batch's selling price starts from the product's base price
  useEffect(() => {
    setIntakeBasePrice(intakeProduct?.base_price != null ? Number(intakeProduct.base_price).toFixed(2) : '');
  }, [intakeProduct]);

  // Current available quantity for the chosen product at the chosen branch.
  // null when the loaded stock list cannot answer (SuperAdmin viewing a different branch filter).
  // The summary table is scoped to one branch only for branch admins or a SuperAdmin with a branch filter.
  const intakeCurrentQty = useMemo(() => {
    if (!intakeProduct || !intakeTargetBranchId) return null;
    if (!currentAdmin?.branch_id && String(stockBranchFilter) !== intakeTargetBranchId) return null;
    const row = (productStock || []).find(r => String(r.product_id) === String(intakeProduct.id));
    return row ? Number(row.available_quantity || 0) : 0;
  }, [intakeProduct, intakeTargetBranchId, productStock, stockBranchFilter, currentAdmin?.branch_id]);

  const openStockIntakeModal = () => {
    const current = productsList.find(p => String(p.id) === String(intakeProductId));
    if (!current) {
      const first = productsList[0];
      setIntakeSupplierId(first ? (first.supplier_id ? String(first.supplier_id) : 'NONE') : '');
    } else if (!intakeSupplierId) {
      setIntakeSupplierId(current.supplier_id ? String(current.supplier_id) : 'NONE');
    }
    if (!currentAdmin?.branch_id && !intakeBranchId && stockBranchFilter !== 'ALL') {
      setIntakeBranchId(String(stockBranchFilter));
    }
    setIsStockSnScanning(false);
    setIsStockModalOpen(true);
  };

  // Handle Device Intake (Single or Bulk) with Product & Branch scoping
  const handleIntakeStock = async (e) => {
    e.preventDefault();
    const sns = intakeSerials;

    if (sns.length === 0) {
      showToast({ type: 'error', title: 'SN Required', message: 'Please enter or scan at least one serial number.' });
      return;
    }
    if (!intakeSupplierId) {
      showToast({ type: 'error', title: 'Supplier Required', message: 'Please select a supplier first.' });
      return;
    }
    if (!intakeProduct) {
      showToast({ type: 'error', title: 'Product Required', message: 'Please select a product.' });
      return;
    }
    if (intakeBasePrice !== '' && (!Number.isFinite(Number(intakeBasePrice)) || Number(intakeBasePrice) < 0)) {
      showToast({ type: 'error', title: 'Invalid Base Price', message: 'Base price must be a number of 0 or more.' });
      return;
    }
    if (!intakeTargetBranchId) {
      showToast({ type: 'error', title: 'Branch Required', message: 'Please select a destination branch.' });
      return;
    }

    setStockSubmitting(true);
    try {
      const payload = {
        serial_numbers: sns,
        product_id: Number(intakeProduct.id),
        branch_id: Number(intakeTargetBranchId),
        // Base price is the selling price for this batch; the cost comes from the product
        unit_price: intakeBasePrice === '' ? null : Number(intakeBasePrice),
        cost_price: null,
        notes: null
      };

      const res = await api.post('/api/products/stock/intake', payload);
      showToast({
        type: 'success',
        title: 'Stock Intake Completed',
        message: res.data.message || `Successfully added ${sns.length} unit(s) of ${intakeProduct.product_name}.`,
        duration: 5000
      });
      setIsStockModalOpen(false);
      setIsStockSnScanning(false);
      setSingleSnInput('');
      setBulkSnInput('');
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to intake devices into stock.';
      showToast({ type: 'error', title: 'Intake Failed', message: msg, duration: 5000 });
    } finally {
      setStockSubmitting(false);
    }
  };

  // Upload soundbox QR/Barcode sticker image to auto-detect SN for stock
  const handleUploadStockSnImage = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const clean = code.data.trim();
          setSingleSnInput(clean);
          showToast({
            type: 'success',
            title: isKhmer ? 'ស្កេន SN ជោគជ័យ' : 'SN Scanned Successfully',
            message: `Scanned SN: ${clean}`,
            duration: 4000
          });
        } else {
          showToast({
            type: 'error',
            title: isKhmer ? 'មិនអាចរកឃើញ QR' : 'Scan Failed',
            message: isKhmer ? 'មិនអាចរកឃើញកូដ QR ពីរូបភាពដែលបានជ្រើសរើសទេ។' : 'Could not detect a QR code from the selected image.',
            duration: 4000
          });
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reset Cloud Speaker Filters
  const handleResetDeviceFilters = () => {
    setDevFilterId('');
    setDevFilterType('ALL');
    setDevFilterStatus('');
    setDevFilterMerchant('');
    setDevFilterWarranty('ALL');
    setDevFilterDate('');
    setDevPage(1);
    setDevSelectedIds([]);
  };

  // Export CSV Handler
  const handleExportDevicesCSV = () => {
    if (!filteredDevices.length) {
      showToast({ type: 'error', title: 'Export Failed', message: 'No devices matching current filters to export.' });
      return;
    }
    const headers = ['Device ID', 'Device Type', 'Merchant ID', 'Store Name', 'Status', 'Battery', 'Signal', '4G Version', 'WiFi Version', 'Last Time'];
    const rows = filteredDevices.map(d => [
      d.device_id || d.device_sn || d.id,
      d.device_model || 'Y6B',
      d.merchant_id || '-',
      `"${(d.store_name || '-').replace(/"/g, '""')}"`,
      d.status || 'Offline',
      d.battery || '100%',
      d.signal || 'Good',
      `"${d.version_4g || 'Y6_LCD_1605_V1.0'}"`,
      `"${d.version_wifi || 'esp32c2x_2M_OTA'}"`,
      `"${d.last_time || d.created_at || '-'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cloud_speaker_devices_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({ type: 'success', title: 'Export Successful', message: `Exported ${filteredDevices.length} soundbox records.` });
  };

  // Selection Checkbox Helpers
  const toggleUserSelection = (id) => {
    setUserSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAllUsers = () => {
    if (userSelectedIds.length === paginatedUsers.length && paginatedUsers.length > 0) {
      setUserSelectedIds([]);
    } else {
      setUserSelectedIds(paginatedUsers.map(u => u.id));
    }
  };

  const toggleStoreSelection = (id) => {
    setStoreSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAllStores = () => {
    if (storeSelectedIds.length === paginatedStores.length && paginatedStores.length > 0) {
      setStoreSelectedIds([]);
    } else {
      setStoreSelectedIds(paginatedStores.map(s => s.merchant_id || s.id));
    }
  };

  const toggleDeviceSelection = (id) => {
    setDevSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAllDevices = () => {
    if (devSelectedIds.length === paginatedDevices.length && paginatedDevices.length > 0) {
      setDevSelectedIds([]);
    } else {
      setDevSelectedIds(paginatedDevices.map(d => d.id || d.device_id || d.device_sn));
    }
  };

  const toggleUserActSelection = (id) => {
    setUserActSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAllUserAct = (list) => {
    if (userActSelectedIds.length === list.length && list.length > 0) {
      setUserActSelectedIds([]);
    } else {
      setUserActSelectedIds(list.map(l => l.id));
    }
  };

  const toggleAdminActSelection = (id) => {
    setAdminActSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAllAdminAct = (list) => {
    if (adminActSelectedIds.length === list.length && list.length > 0) {
      setAdminActSelectedIds([]);
    } else {
      setAdminActSelectedIds(list.map(l => l.id));
    }
  };

  // Send Single Device Command Handler
  const handleSendDeviceCommand = async (e) => {
    e.preventDefault();
    if (!commandTargetDevice) return;
    setCommandSubmitting(true);
    try {
      const res = await api.post(`/api/devices/${commandTargetDevice.id}/command`, {
        command_type: commandType,
        amount: commandAmount,
        currency: commandCurrency,
        volume: commandVolume,
        custom_text: commandCustomText
      });
      setIsDeviceCommandOpen(false);
      showToast({
        type: 'success',
        title: 'Command Dispatched',
        message: res.data.message || `Command [${commandType}] sent to Device ${commandTargetDevice.device_id || commandTargetDevice.device_sn}.`,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send command.';
      showToast({ type: 'error', title: 'Dispatch Failed', message: msg });
    } finally {
      setCommandSubmitting(false);
    }
  };

  // Send Batch Command Handler
  const handleBatchSendCommand = async (e) => {
    e.preventDefault();
    if (!devSelectedIds.length) {
      showToast({ type: 'error', title: 'No Devices Selected', message: 'Please check at least one device first.' });
      return;
    }
    setCommandSubmitting(true);
    try {
      const res = await api.post('/api/devices/batch-command', {
        device_ids: devSelectedIds,
        command_type: batchCommandType,
        volume: batchCommandVolume
      });
      setIsBatchCommandOpen(false);
      showToast({
        type: 'success',
        title: 'Batch Commands Sent',
        message: res.data.message || `Dispatched [${batchCommandType}] to ${devSelectedIds.length} selected soundboxes.`,
        duration: 5000
      });
      setDevSelectedIds([]);
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send batch commands.';
      showToast({ type: 'error', title: 'Batch Failed', message: msg });
    } finally {
      setCommandSubmitting(false);
    }
  };

  // Reassign Merchant Handler
  const handleReassignMerchant = async (e) => {
    e.preventDefault();
    if (!selectedDeviceForMerchant) return;
    setCommandSubmitting(true);
    try {
      const res = await api.put(`/api/devices/${selectedDeviceForMerchant.id}`, {
        device_sn: selectedDeviceForMerchant.device_sn,
        device_model: selectedDeviceForMerchant.device_model || 'Y6B',
        telegram_chat_id: selectedDeviceForMerchant.telegram_chat_id,
        status: targetMerchantStoreId ? 'ACTIVE' : 'IN_STOCK',
        merchant_id: targetMerchantStoreId ? parseInt(targetMerchantStoreId) : null
      });
      setIsEditMerchantOpen(false);
      showToast({
        type: 'success',
        title: 'Store Assignment Updated',
        message: res.data.message || `Soundbox ${selectedDeviceForMerchant.device_sn} store assignment saved.`,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to reassign store.';
      showToast({ type: 'error', title: 'Update Failed', message: msg });
    } finally {
      setCommandSubmitting(false);
    }
  };

  if (loading && !hasLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t('loading', 'Loading administrative portal...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-10 space-y-6 sm:space-y-8">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {t('admin', 'Admin Portal')}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">
              {adminTab === 'admins' ? t('manageAdmins', 'Manage Admins') :
               adminTab === 'users' ? t('manageUsers', 'Manage Users') :
               adminTab === 'stores' ? t('storeMerchantBranches', 'Store & Merchant Branches') :
               adminTab === 'devices' ? t('deployedSoundboxFleet', 'Deployed Soundbox Fleet & Telemetry') :
               adminTab === 'inventory' ? t('warehouseStockBreadcrumb', 'Warehouse Stock & Inventory') :
               adminTab === 'products' ? t('manageProductBreadcrumb', 'Product Catalog') :
               adminTab === 'suppliers' ? t('manageSupplierBreadcrumb', 'Suppliers & Device Types') :
               adminTab === 'branches' ? t('manageBranchBreadcrumb', 'Branches & Warehouses') :
               adminTab === 'sales' || adminTab === 'sales_history' ? t('salesHistoryBreadcrumb', 'Device Sales & Order Ledger') :
               adminTab === 'user_activity' || adminTab === 'user_logs' || adminTab === 'logs' ? t('userActivityTitle', 'User Activity') :
               t('adminActivityTitle', 'Admin Activity')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {adminTab === 'admins' ? t('manageAdmins', 'Manage Admins') :
             adminTab === 'users' ? t('manageUsers', 'Manage Users') :
             adminTab === 'stores' ? t('storesMerchantLocations', 'Stores & Merchant Locations') :
             adminTab === 'devices' ? t('manageDevicesTitle', 'Manage Devices (Deployed Soundboxes)') :
             adminTab === 'inventory' ? t('stockInventory', 'Stock & Inventory (Warehouse)') :
             adminTab === 'products' ? t('manageProductTitle', 'Manage Product') :
             adminTab === 'suppliers' ? t('manageSupplierTitle', 'Manage Supplier') :
             adminTab === 'branches' ? t('manageBranchTitle', 'Manage Branch') :
             adminTab === 'sales' || adminTab === 'sales_history' ? t('salesHistoryTitle', 'Sale History & Revenue') :
             adminTab === 'user_activity' || adminTab === 'user_logs' || adminTab === 'logs' ? t('userActivityTitle', 'User Activity') :
             t('adminActivityTitle', 'Admin Activity')}
          </h1>
        </div>

        <button
          onClick={fetchAllData}
          disabled={loading}
          className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/80 transition flex items-center justify-center gap-2 self-stretch sm:self-auto shadow-2xs cursor-pointer"
        >
          {loading ? 'Refreshing...' : t('refresh', 'Refresh Data')}
        </button>
      </div>

      {/* Universal Search & Filter Controls (For Admins and Users) */}
      {(adminTab === 'admins' || adminTab === 'users') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
          {adminTab === 'admins' && (
            <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{isKhmer ? 'បញ្ជីអ្នកគ្រប់គ្រង' : 'Admin directory'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{isKhmer ? 'គ្រប់គ្រងគណនី សាខា និងសិទ្ធិចូលប្រើ។' : 'Manage administrator accounts, branch assignments and access.'}</p>
            </div>
          )}
          <div className={adminTab === 'admins' ? 'flex flex-col xl:flex-row items-stretch xl:items-center gap-3' : 'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3'}>
            
            {/* Search */}
            <div className="relative flex-1">
              <input
                aria-label={adminTab === 'admins' ? t('searchAdminsPlaceholder', 'Search admins') : t('searchPlaceholder', 'Search users')}
                type="text"
                placeholder={adminTab === 'admins'
                  ? t('searchAdminsPlaceholder', 'Search admin by name or phone number...')
                  : t('searchPlaceholder', 'Search by name, phone number, store or location...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filters and Actions */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              
              {/* Dynamic Branch Filter: Available for SuperAdmin across both Admins and Users */}
              {!currentAdmin?.branch_id && (
                <select
                  value={userBranchFilter}
                  onChange={(e) => setUserBranchFilter(e.target.value)}
                  className="flex-1 sm:flex-none px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  aria-label={t('branch', 'Branch')}
                  title="Filter by Branch"
                >
                  <option value="ALL">
                    {t('allBranches', 'All Branches')} ({dynamicBranchOptions.totalCount})
                  </option>
                  {adminTab === 'admins' && dynamicBranchOptions.hqCount > 0 && (
                    <option value="HQ">
                      {t('allBranchesSuperAdmin', 'All Branches')} (HQ) ({dynamicBranchOptions.hqCount})
                    </option>
                  )}
                  {dynamicBranchOptions.branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.count})
                    </option>
                  ))}
                </select>
              )}

              {/* Dynamic Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                aria-label={t('status', 'Status')}
                title="Filter by Status"
              >
                <option value="">
                  {t('allStatuses', 'All Statuses')} ({dynamicStatusOptions.totalCount})
                </option>
                <option value="ACTIVE">
                  {t('active', 'Active')} ({dynamicStatusOptions.activeCount})
                </option>
                <option value="SUSPENDED">
                  {t('inactive', 'Suspended')} ({dynamicStatusOptions.suspendedCount})
                </option>
              </select>

              {(statusFilter || (userBranchFilter && userBranchFilter !== 'ALL') || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('');
                    setUserBranchFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer shadow-2xs"
                  title={t('clearFilters', 'Clear Filters')}
                >
                  {t('clearFilters', 'Clear Filters')}
                </button>
              )}

              {/* Action Button: Add Admin (Only for Manage Admins tab) */}
              {adminTab === 'admins' && (
                <button
                  onClick={() => {
                    setIsAllBranches(!currentAdmin?.branch_id);
                    setNewUserBranchId(currentAdmin?.branch_id ? String(currentAdmin.branch_id) : '');
                    setNewPhone('');
                    setNewName('');
                    setNewPassword('');
                    setNewStatus('ACTIVE');
                    setIsAddUserOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {t('addAdmin', 'Add Admin')}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB 1: USER MANAGEMENT (MANAGE ADMINS & MANAGE USERS) */}
      {(adminTab === 'admins' || adminTab === 'users') && (
        <div className="space-y-3">
          
          {/* Mobile User Cards (< md) */}
          <div className={adminTab === 'admins' ? "md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3" : "md:hidden space-y-3"}>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((u) => (
                <div key={u.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  
                  {/* Phone and Name */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {u.phone_number}
                        </span>
                        {u.id === currentAdmin?.id && (
                          <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-semibold ml-1">
                            You
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-1.5">
                        {u.full_name || '—'}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </div>
                      {u.role === 'ADMIN' && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {u.branch_name || t('allBranchesSuperAdmin', 'All Branches')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Store Info for Merchants */}
                  {adminTab === 'users' && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        {u.store_count > 0 ? (
                          <span>
                            {u.store?.name}
                            {u.store_count > 1 && ` (+${u.store_count - 1} more)`}
                          </span>
                        ) : (
                          <span className="text-slate-400">No store registered</span>
                        )}
                      </div>
                      {u.store?.location && (
                        <div className="text-[11px] text-slate-400 pl-5">
                          {u.store.location}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Last Login Info on Mobile */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                    <span>{t('lastLogin', 'Last Login')}:</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                        : t('never', 'Never')}
                    </span>
                  </div>

                  {/* Mobile Actions Bar: View Details + Three Dots Menu */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openUserDetailsModal(u)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title={t('viewDetails', 'View Details')}
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('viewDetails', 'View Details')}</span>
                    </button>

                    {/* Three-dots Menu Trigger on Mobile */}
                    <div className="relative action-menu-container">
                      <button
                        type="button"
                        onClick={(e) => handleToggleDropdown(u.id, e)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                          openActionDropdownId === u.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 shadow-2xs'
                        }`}
                        title="Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openActionDropdownId === u.id && activeDropdownRect && (
                        <div
                          style={{
                            position: 'fixed',
                            top: activeDropdownRect.openUp ? 'auto' : `${activeDropdownRect.top}px`,
                            bottom: activeDropdownRect.openUp ? `${activeDropdownRect.bottom}px` : 'auto',
                            right: `${activeDropdownRect.right}px`,
                            zIndex: 9999
                          }}
                          className="action-menu-dropdown w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 animate-in fade-in zoom-in-95 duration-100"
                        >
                          {/* Edit Admin (only for admin accounts) */}
                          {adminTab === 'admins' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionDropdownId(null);
                                setActiveDropdownRect(null);
                                openEditUserModal(u);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition cursor-pointer"
                            >
                              <Edit className="w-4 h-4 text-indigo-500 shrink-0" />
                              <span>{t('editAdmin', 'Edit Admin')}</span>
                            </button>
                          )}

                          {/* Suspend / Activate Account */}
                          {u.id !== currentAdmin?.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionDropdownId(null);
                                setActiveDropdownRect(null);
                                handleToggleStatus(u);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition cursor-pointer"
                            >
                              {u.status === 'ACTIVE' ? (
                                <>
                                  <UserX className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span>{t('suspendAccount', 'Suspend Account')}</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <span>{t('activateAccount', 'Activate Account')}</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionDropdownId(null);
                              setActiveDropdownRect(null);
                              openResetPassModal(u);
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition cursor-pointer"
                          >
                            <Key className="w-4 h-4 text-blue-500 shrink-0" />
                            <span>{t('resetPassword', 'Reset Password')}</span>
                          </button>

                          {/* Delete Account (if not self) */}
                          {u.id !== currentAdmin?.id && (
                            <>
                              <div className="my-1 border-t border-slate-100 dark:border-slate-700/80" />
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionDropdownId(null);
                                  setActiveDropdownRect(null);
                                  openDeleteModal(u);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                                <span>{t('deleteAccount', 'Delete Account')}</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center text-slate-400 text-sm border border-slate-200 dark:border-slate-800">
                No accounts found matching your search.
              </div>
            )}
          </div>

          {/* Mobile User Pagination */}
          <div className="md:hidden">
            {renderPaginationNumeration({
              currentPage: userPage,
              totalPages: totalUserPages,
              totalItems: filteredUsers.length,
              pageSize: userPageSize,
              onPageChange: setUserPage,
              onPageSizeChange: setUserPageSize,
              goToPageVal: userGoToPage,
              setGoToPageVal: setUserGoToPage
            })}
          </div>

          {/* Desktop User Table (>= md) */}
          <div className="hidden md:block mt-6 mb-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
            {adminTab === 'admins' && (
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('manageAdmins', 'Manage Admins')} <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">{filteredUsers.length}</span></h2>
                {userSelectedIds.length > 0 && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{userSelectedIds.length} {isKhmer ? 'បានជ្រើសរើស' : 'selected'}</span>}
              </div>
            )}
            <div className={adminTab === 'admins' ? 'overflow-x-auto' : 'overflow-x-auto p-6 sm:p-8 pb-4'}>
              <table className="w-full text-left text-sm min-w-[680px]">
                <thead>

                  <tr className={`border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 ${adminTab === 'admins' ? 'bg-slate-50/80 dark:bg-slate-800/50' : 'uppercase tracking-wider'}`}>
                    <th className="py-3.5 px-4 w-12 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllUsers}
                        aria-label={isKhmer ? 'ជ្រើសរើសទាំងអស់' : 'Select all accounts on this page'}
                        aria-pressed={paginatedUsers.length > 0 && paginatedUsers.every(u => userSelectedIds.includes(u.id))}
                        className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                      >
                        {userSelectedIds.length === paginatedUsers.length && paginatedUsers.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">{t('phoneNumber', 'Phone Number')}</th>
                    <th className="px-4 py-3 text-left">{t('fullName', 'Full Name')}</th>
                    {adminTab === 'admins' ? (
                      <th className="px-4 py-3 text-left">{t('branch', 'Branch')}</th>
                    ) : (
                      <th className="px-4 py-3 text-left">{t('storeBranches', 'Owned Stores')}</th>
                    )}
                    <th className="px-4 py-3 text-center">{t('status', 'Status')}</th>
                    <th className="px-4 py-3 text-left">{t('lastLogin', 'Last Login')}</th>
                    <th className="px-4 py-3 text-right">{t('actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((u, userIdx) => (
                      <tr 
                        key={u.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                          userSelectedIds.includes(u.id) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        {/* Selection Checkbox */}
                        <td className="py-3 px-4 w-12 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => toggleUserSelection(u.id)}
                            aria-label={`${isKhmer ? 'ជ្រើសរើស' : 'Select'} ${u.full_name || u.phone_number}`}
                            aria-pressed={userSelectedIds.includes(u.id)}
                            className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                          >
                            {userSelectedIds.includes(u.id) ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            )}
                          </button>
                        </td>
                        
                        {/* Emphasized User Phone Number (Clickable to View Details) */}
                        <td className="py-3 px-4 text-left align-middle">
                          <button
                            type="button"
                            onClick={() => openUserDetailsModal(u)}
                            className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg transition cursor-pointer text-left shadow-2xs"
                            title={t('viewDetails', 'View Details')}
                          >
                            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                              {u.phone_number}
                            </span>
                            {u.id === currentAdmin?.id && (
                              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-semibold ml-1">
                                You
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-left align-middle text-slate-700 dark:text-slate-300 font-semibold">
                          {u.full_name || '—'}
                        </td>

                        {adminTab === 'admins' ? (
                          <td className="py-3 px-4 text-left align-middle">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                              {u.branch_name || t('allBranchesSuperAdmin', 'All Branches')}
                            </span>
                          </td>
                        ) : (
                          <td className="py-3 px-4 text-left align-middle">
                            {u.store_count > 0 ? (
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  <span>{u.store?.name}</span>
                                  {u.store_count > 1 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                      +{u.store_count - 1} more
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {u.store?.location || u.store?.place || '—'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">No store registered</span>
                            )}
                          </td>
                        )}

                        <td className="py-3 px-4 text-center align-middle">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-left align-middle text-xs whitespace-nowrap">
                        {u.last_login_at ? (
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {new Date(u.last_login_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">{t('never', 'Never')}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {/* One button outside: View */}
                          <button
                            type="button"
                            onClick={() => openUserDetailsModal(u)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            title={t('viewDetails', 'View Details')}
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>{t('view', 'View')}</span>
                          </button>

                          {/* Three Dots Menu for more actions */}
                          <div className="relative inline-block text-left action-menu-container">
                            <button
                              type="button"
                              onClick={(e) => handleToggleDropdown(u.id, e)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                                openActionDropdownId === u.id
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 shadow-2xs'
                              }`}
                              title={t('actions', 'Actions')}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openActionDropdownId === u.id && activeDropdownRect && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: activeDropdownRect.openUp ? 'auto' : `${activeDropdownRect.top}px`,
                                  bottom: activeDropdownRect.openUp ? `${activeDropdownRect.bottom}px` : 'auto',
                                  right: `${activeDropdownRect.right}px`,
                                  zIndex: 9999
                                }}
                                className="action-menu-dropdown w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 animate-in fade-in zoom-in-95 duration-100"
                              >
                                {/* Edit Admin (only for admin accounts) */}
                                {adminTab === 'admins' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionDropdownId(null);
                                      setActiveDropdownRect(null);
                                      openEditUserModal(u);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition cursor-pointer"
                                  >
                                    <Edit className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span>{t('editAdmin', 'Edit Admin')}</span>
                                  </button>
                                )}

                                {/* Suspend / Activate Account */}
                                {u.id !== currentAdmin?.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionDropdownId(null);
                                      setActiveDropdownRect(null);
                                      handleToggleStatus(u);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition cursor-pointer"
                                  >
                                    {u.status === 'ACTIVE' ? (
                                      <>
                                        <UserX className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span>{t('suspendAccount', 'Suspend Account')}</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span>{t('activateAccount', 'Activate Account')}</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Reset Password */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionDropdownId(null);
                                    setActiveDropdownRect(null);
                                    openResetPassModal(u);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition cursor-pointer"
                                >
                                  <Key className="w-4 h-4 text-blue-500 shrink-0" />
                                  <span>{t('resetPassword', 'Reset Password')}</span>
                                </button>

                                {/* Delete Account (if not self) */}
                                {u.id !== currentAdmin?.id && (
                                  <>
                                    <div className="my-1 border-t border-slate-100 dark:border-slate-700/80" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionDropdownId(null);
                                        setActiveDropdownRect(null);
                                        openDeleteModal(u);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                                      <span>{t('deleteAccount', 'Delete Account')}</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                      No accounts found matching your search and filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Desktop Users Pagination */}
          {renderPaginationNumeration({
            currentPage: userPage,
            totalPages: totalUserPages,
            totalItems: filteredUsers.length,
            pageSize: userPageSize,
            onPageChange: setUserPage,
            onPageSizeChange: setUserPageSize,
            goToPageVal: userGoToPage,
            setGoToPageVal: setUserGoToPage
          })}
        </div>
      </div>
      )}

      {/* TAB 2: STORES & PLACES DIRECTORY (RESPONSIVE CARDS & TABLE) */}
      {adminTab === 'stores' && (
        <div className="space-y-4">

          {/* Stores Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{isKhmer ? 'ស្វែងរកហាង' : 'Find a store'}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isKhmer ? 'ស្វែងរកតាមឈ្មោះ ម្ចាស់ហាង ឬទីតាំង។' : 'Search by name, owner or location.'}</p>
              </div>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">{filteredStores.length} {isKhmer ? 'ហាង' : 'stores'}</span>
            </div>
            {/* Filter Grid Row 1: Search, Province, District, Commune */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* 1. Store Search Input */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('searchStorePlaceholder', 'Search store, owner, phone...')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('searchStorePlaceholder', 'Search store, owner, phone...')}
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* 2. Province / City */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('provinceCity', 'Province / City')}
                </label>
                <select
                  value={storeProvinceFilter}
                  onChange={(e) => {
                    setStoreProvinceFilter(e.target.value);
                    setStoreDistrictFilter('');
                    setStoreCommuneFilter('');
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="">{t('allProvinces', 'All Provinces / Cities')}</option>
                  {availableProvinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* 3. District / Khan */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('districtKhan', 'District / Khan')}
                </label>
                <select
                  value={storeDistrictFilter}
                  onChange={(e) => {
                    setStoreDistrictFilter(e.target.value);
                    setStoreCommuneFilter('');
                  }}
                  disabled={availableDistricts.length === 0}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer disabled:opacity-50"
                >
                  <option value="">{t('allDistricts', 'All Districts / Khans')}</option>
                  {availableDistricts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* 4. Commune / Sangkat */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('communeSangkat', 'Commune / Sangkat')}
                </label>
                <select
                  value={storeCommuneFilter}
                  onChange={(e) => setStoreCommuneFilter(e.target.value)}
                  disabled={availableCommunes.length === 0}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer disabled:opacity-50"
                >
                  <option value="">{t('allCommunes', 'All Communes / Sangkats')}</option>
                  {availableCommunes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Filter Grid Row 2: Merchant Owner, Registration Date, Sort By */}
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-3 pt-1">

              {/* 5. Merchant / Owner */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('merchantOwner', 'Merchant / Owner')}
                </label>
                <select
                  value={storeOwnerFilter}
                  onChange={(e) => setStoreOwnerFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="ALL">{t('allOwners', 'All Merchant Owners')}</option>
                  {availableOwners.map(([name, label]) => (
                    <option key={name} value={name}>{label}</option>
                  ))}
                </select>
              </div>

              {/* 6. Registration Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('storeRegDate', 'Registration Date')}
                </label>
                <input
                  type="date"
                  value={storeDateFilter}
                  onChange={(e) => setStoreDateFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
                />
              </div>

              {/* 7. Sort By Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('sortBy', 'Sort By')}
                </label>
                <select
                  value={storeSortBy}
                  onChange={(e) => setStoreSortBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer font-medium"
                >
                  <option value="NEWEST">{t('sortNewest', 'Newest Registered')}</option>
                  <option value="OLDEST">{t('sortOldest', 'Oldest Registered')}</option>
                  <option value="NAME_ASC">{t('sortNameAsc', 'Store Name (A → Z)')}</option>
                  <option value="NAME_DESC">{t('sortNameDesc', 'Store Name (Z → A)')}</option>
                </select>
              </div>

            </div>

            {/* Bottom Row: Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {(storeSearch || storeProvinceFilter || storeDistrictFilter || storeCommuneFilter || storeOwnerFilter !== 'ALL' || storeDateFilter || storeSortBy !== 'NEWEST') && (
                <button
                  type="button"
                  onClick={handleResetStoreFilters}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Clear Filters"
                >
                  <span>{t('reset', 'Reset Filters')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportStoresCSV}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="Export Filtered Stores to CSV"
              >
                <span>{t('exportCsv', 'Export CSV')}</span>
              </button>
            </div>
          </div>
          
          {/* Mobile Store Cards (< md) */}
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paginatedStores.length > 0 ? (
              paginatedStores.map((s) => (
                <div 
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setSelectedStoreForDetails(s);
                      setIsStoreDetailsOpen(true);
                    }
                  }}
                  onClick={() => {
                    setSelectedStoreForDetails(s);
                    setIsStoreDetailsOpen(true);
                  }}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 space-y-3 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-base">
                          {s.merchant_name || s.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          ID: #{s.merchant_id || s.id}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      s.device_count > 0 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {s.device_count} {t('soundbox', 'Devices')}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('owner', 'Owner')}:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{s.owner_name || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('phoneNumber', 'Phone')}:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{s.owner_phone}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400">{t('location', 'Location')}:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{s.province || s.location || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400">{t('telegramChatId', 'Telegram ID')}:</span>
                      {s.telegram_chat_id ? (
                        <span className="font-mono font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <span>{s.telegram_chat_id.startsWith('@') ? s.telegram_chat_id : `@${s.telegram_chat_id}`}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">{t('notConnected', 'Not Linked')}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStoreForDetails(s);
                      setIsStoreDetailsOpen(true);
                    }}
                    className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-indigo-100 dark:border-indigo-900/40"
                  >
                    <span>{t('viewDetails', 'View Full Location Details')}</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center text-slate-400 text-sm border border-slate-200 dark:border-slate-800">
                No stores found matching your search.
              </div>
            )}
          </div>

          {/* Mobile Store Pagination */}
          <div className="md:hidden">
            {renderPaginationNumeration({
              currentPage: storePage,
              totalPages: totalStorePages,
              totalItems: filteredStores.length,
              pageSize: storePageSize,
              onPageChange: setStorePage,
              onPageSizeChange: setStorePageSize,
              goToPageVal: storeGoToPage,
              setGoToPageVal: setStoreGoToPage
            })}
          </div>

          {/* Desktop Store Table (>= md) */}
          <div className="hidden md:block mt-6 mb-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('storeManagement', 'Stores & Locations')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('storeManagementSubtitle', 'Complete registry of all registered branches, merchant profiles, and deployed soundbox equipment.')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[620px]">
                <thead>

                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4 w-12 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllStores}
                        className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                      >
                        {storeSelectedIds.length === paginatedStores.length && paginatedStores.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">{t('storeName', 'Store Name')}</th>
                    <th className="px-4 py-3 text-left">{t('owner', 'Merchant / Owner')}</th>
                    <th className="px-4 py-3 text-left">{t('location', 'Location (Province / District)')}</th>
                    <th className="px-4 py-3 text-left">{t('telegramChatId', 'Telegram ID')}</th>
                    <th className="px-4 py-3 text-center">{t('connectedSoundboxes', 'Soundboxes')}</th>
                    <th className="px-4 py-3 text-right">{t('actions', 'Details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedStores.length > 0 ? (
                    paginatedStores.map((s) => (
                      <tr 
                        key={s.merchant_id || s.id} 
                        onClick={() => {
                          setSelectedStoreForDetails(s);
                          setIsStoreDetailsOpen(true);
                        }}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer group ${
                          storeSelectedIds.includes(s.merchant_id || s.id) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        {/* Selection Checkbox */}
                        <td className="py-3 px-4 w-12 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleStoreSelection(s.merchant_id || s.id)}
                            className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                          >
                            {storeSelectedIds.includes(s.merchant_id || s.id) ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            )}
                          </button>
                        </td>
                        
                        {/* Store Name */}
                        <td className="py-3 px-4 text-left align-middle">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                              {s.merchant_name || s.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              ID: #{s.merchant_id || s.id}
                            </div>
                          </div>
                        </td>

                        {/* Owner Info */}
                        <td className="py-3 px-4 text-left align-middle">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                              {s.owner_name || '—'}
                            </div>
                            <div className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              <span>{s.owner_phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* Main Location Summary */}
                        <td className="py-3 px-4 text-left align-middle">
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                              <span>{s.province || s.location || '—'}</span>
                            </div>
                            {s.district && (
                              <div className="text-[11px] text-slate-400">
                                <span>{s.district}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Telegram ID */}
                        <td className="py-3 px-4 text-left align-middle">
                          {s.telegram_chat_id ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                              <span>{s.telegram_chat_id.startsWith('@') ? s.telegram_chat_id : `@${s.telegram_chat_id}`}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">{t('notConnected', 'Not Linked')}</span>
                          )}
                        </td>

                        {/* Soundbox Count */}
                        <td className="py-3 px-4 text-center align-middle">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            s.device_count > 0 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' 
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {s.device_count} {t('soundbox', 'Devices')}
                          </span>
                        </td>

                        {/* View Details Action Button */}
                        <td className="py-3 px-4 text-right align-middle">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStoreForDetails(s);
                              setIsStoreDetailsOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold transition border border-slate-200/80 dark:border-slate-700"
                          >
                            <span>{t('viewDetails', 'View Details')}</span>
                          </button>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                        No stores found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Desktop Store Pagination */}
            {renderPaginationNumeration({
              currentPage: storePage,
              totalPages: totalStorePages,
              totalItems: filteredStores.length,
              pageSize: storePageSize,
              onPageChange: setStorePage,
              onPageSizeChange: setStorePageSize,
              goToPageVal: storeGoToPage,
              setGoToPageVal: setStoreGoToPage
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SOUNDBOX HARDWARE - CLOUD SPEAKER DEVICE MANAGER */}
      {adminTab === 'devices' && (
        <div className="space-y-4">

          {/* 1. Cloud Speaker Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
            
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{isKhmer ? 'ស្វែងរកឧបករណ៍' : 'Find a device'}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isKhmer ? 'ពិនិត្យស្ថានភាព ហាង និងការធានា។' : 'Check connectivity, store assignment and warranty.'}</p>
              </div>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">{filteredDevices.length} {isKhmer ? 'ឧបករណ៍' : 'devices'}</span>
            </div>
            {/* Top Row: Primary Search + Mobile/Tablet Filter Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  aria-label={t('pleaseEnterDeviceId', 'Search by Device SN / ID')}
                  value={devFilterId}
                  onChange={(e) => { setDevFilterId(e.target.value); setDevPage(1); }}
                  placeholder={t('pleaseEnterDeviceId', 'Search by Device SN / ID...')}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
                {devFilterId && (
                  <button
                    type="button"
                    aria-label={isKhmer ? 'សម្អាតការស្វែងរក' : 'Clear device search'}
                    onClick={() => { setDevFilterId(''); setDevPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold text-sm"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Mobile/Tablet Filter Toggle Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-expanded={isDevFiltersExpanded}
                  aria-controls="device-filters"
                  onClick={() => setIsDevFiltersExpanded(!isDevFiltersExpanded)}
                  className={`lg:hidden flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation ${
                    isDevFiltersExpanded || activeDevFilterCount > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>Filters</span>
                  {activeDevFilterCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                      {activeDevFilterCount}
                    </span>
                  )}
                </button>

                {activeDevFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetDeviceFilters}
                    className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 shrink-0 touch-manipulation"
                    title="Reset Filters"
                  >
                    <span className="hidden sm:inline">{t('reset', 'Reset')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportDevicesCSV}
                  className="hidden sm:flex px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer items-center justify-center shadow-2xs shrink-0 touch-manipulation"
                  title="Export CSV"
                >
                  <span>{t('exportCsv', 'Export')}</span>
                </button>
              </div>
            </div>

            {/* Secondary Filter Grid: Always visible on desktop (lg:grid), collapsible on mobile & tablet */}
            <div id="device-filters" className={`${isDevFiltersExpanded ? 'grid' : 'hidden lg:grid'} grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80`}>
              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('stockProduct', 'Product')}
                </label>
                <select
                  value={devFilterType}
                  onChange={(e) => { setDevFilterType(e.target.value); setDevPage(1); }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="ALL">{t('allTypes', 'All Device Types')}</option>
                  <option value="Display">{t('displayScreenQr', 'Display (Screen QR)')}</option>
                  <option value="Standard">{t('standardPrintedQr', 'Standard (Printed QR)')}</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('status', 'Status')}
                </label>
                <select
                  value={devFilterStatus}
                  onChange={(e) => { setDevFilterStatus(e.target.value); setDevPage(1); }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="">{t('allStatuses', 'All Statuses')}</option>
                  <option value="Online">{t('online', 'Online')}</option>
                  <option value="PENDING">{t('waitingForRegistration', 'Waiting for Registration')}</option>
                  <option value="Offline">{t('offline', 'Offline')}</option>
                </select>
              </div>

              {/* Assigned Store */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('merchantStore', 'Assigned Store')}
                </label>
                <input
                  type="text"
                  value={devFilterMerchant}
                  onChange={(e) => { setDevFilterMerchant(e.target.value); setDevPage(1); }}
                  placeholder={t('searchStorePlaceholder', 'Search store...')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              {/* Warranty */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('warrantyStatus', 'Warranty Status')}
                </label>
                <select
                  value={devFilterWarranty}
                  onChange={(e) => { setDevFilterWarranty(e.target.value); setDevPage(1); }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="ALL">{t('allWarranty', 'All Warranty')}</option>
                  <option value="ACTIVE">{t('activeCoverage', 'Active Coverage')}</option>
                  <option value="EXPIRING_SOON">{t('expiringSoon', 'Expiring Soon (≤15d)')}</option>
                  <option value="EXPIRED">{t('expired', 'Expired')}</option>
                </select>
              </div>

              {/* Deployment Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('deploymentDate', 'Deployment Date')}
                </label>
                <input
                  type="date"
                  value={devFilterDate}
                  onChange={(e) => { setDevFilterDate(e.target.value); setDevPage(1); }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 2. Action Toolbar & Batch Operations */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1" aria-live="polite">
                {devSelectedIds.length > 0 ? `${devSelectedIds.length} ${isKhmer ? 'បានជ្រើសរើស' : 'selected'}` : (isKhmer ? 'ជ្រើសរើសឧបករណ៍ដើម្បីផ្ញើពាក្យបញ្ជា' : 'Select devices to send commands')}
              </span>
              {/* Batch Remote Command */}
              <button
                type="button"
                disabled={devSelectedIds.length === 0}
                onClick={() => {
                  if (devSelectedIds.length === 0) {
                    showToast({ type: 'error', title: 'Selection Needed', message: 'Please select at least one device from the table.' });
                    return;
                  }
                  setIsBatchCommandOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{t('batchSendCommands', 'Batch Send Commands')}</span>
                {devSelectedIds.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-emerald-800 text-[10px] font-bold rounded-full">
                    {devSelectedIds.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsColumnsModalOpen(true)}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <span>{t('columns', 'Columns')}</span>
              </button>
            </div>
          </div>

          {/* 3. Cloud Speaker Data Table (Desktop >= lg) */}
          <div className="hidden lg:block mt-6 mb-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 select-none whitespace-nowrap">
                    <th className="py-3.5 px-4 w-12 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllDevices}
                        className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                      >
                        {devSelectedIds.length === paginatedDevices.length && paginatedDevices.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        )}
                      </button>
                    </th>
                    {visibleColumns.deviceId && <th className="px-4 py-3 text-left min-w-[160px]">{t('deviceId', 'Device SN')}</th>}
                    {visibleColumns.deviceType && <th className="px-4 py-3 text-left min-w-[190px]">{t('stockProduct', 'Product')}</th>}
                    {visibleColumns.supplier && <th className="px-4 py-3 text-left min-w-[120px]">{t('supplier', 'Supplier')}</th>}
                    {visibleColumns.merchantId && <th className="px-4 py-3 text-left min-w-[180px]">{t('merchantStore', 'Assigned Store')}</th>}
                    {visibleColumns.status && <th className="px-4 py-3 text-left min-w-[110px]">{t('status', 'Status')}</th>}
                    {visibleColumns.price && <th className="px-4 py-3 text-right min-w-[110px]">{t('price', 'Price')}</th>}
                    {visibleColumns.warranty && <th className="px-4 py-3 text-right min-w-[140px]">{t('warranty', 'Warranty')}</th>}
                    {visibleColumns.battery && <th className="px-4 py-3 text-right min-w-[95px]">{t('battery', 'Battery')}</th>}
                    {visibleColumns.signal && <th className="px-4 py-3 text-right min-w-[95px]">{t('signal', 'Signal')}</th>}
                    {visibleColumns.version4g && <th className="px-4 py-3 text-left min-w-[150px]">{t('version4G', '4G Version')}</th>}
                    {visibleColumns.versionWifi && <th className="px-4 py-3 text-left min-w-[150px]">{t('versionWifi', 'WiFi Version')}</th>}
                    {visibleColumns.lastTime && <th className="px-4 py-3 text-left min-w-[140px]">{t('lastTime', 'Last Time')}</th>}
                    {visibleColumns.operation && <th className="px-4 py-3 text-right min-w-[160px]">{t('operation', 'Operation')}</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedDevices.length > 0 ? (
                    paginatedDevices.map((d) => {
                      const isSelected = devSelectedIds.includes(d.id || d.device_id || d.device_sn);
                      const isOnline = String(d.status || '').toUpperCase() === 'ACTIVE' || String(d.status || '').toLowerCase() === 'online';

                      return (
                        <tr 
                          key={d.id || d.device_id || d.device_sn}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition whitespace-nowrap ${
                            isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-3 px-4 w-12 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => toggleDeviceSelection(d.id || d.device_id || d.device_sn)}
                              className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              )}
                            </button>
                          </td>

                          {/* Device ID */}
                          {visibleColumns.deviceId && (
                            <td className="py-3 px-4 text-left align-middle font-mono font-bold text-slate-900 dark:text-white">
                              {d.device_id || d.device_sn || d.id}
                            </td>
                          )}

                          {/* Device Type */}
                          {visibleColumns.deviceType && (
                            <td className="py-3 px-4 text-left align-middle">
                              <div className="flex flex-col">
                                <span className="text-slate-800 dark:text-slate-200 truncate max-w-[18rem]" title={d.device_type || ''}>
                                  {d.device_type || '-'}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                  {[d.device_model, hasScreen(d.device_type, d.device_model) ? 'Screen QR' : 'Printed QR'].filter(Boolean).join(' · ')}
                                </span>
                              </div>
                            </td>
                          )}

                          {/* Supplier */}
                          {visibleColumns.supplier && (
                            <td className="py-3 px-4 text-left align-middle text-slate-600 dark:text-slate-300">
                              {d.supplier || <span className="text-slate-400">-</span>}
                            </td>
                          )}

                          {/* Merchant ID / Store */}
                          {visibleColumns.merchantId && (
                            <td className="py-3 px-4 text-left align-middle text-slate-600 dark:text-slate-300">
                              {d.store_name ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[16rem]">{d.store_name}</span>
                                  {d.merchant_id && <span className="text-[10px] text-slate-400 font-mono">#{d.merchant_id}</span>}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">
                                  {String(d.status).toUpperCase() === 'PENDING'
                                    ? t('awaitingStoreLink', 'Awaiting Store Link')
                                    : t('warehouseStock', 'Warehouse Stock')}
                                </span>
                              )}
                            </td>
                          )}

                          {/* Status */}
                          {visibleColumns.status && (
                            <td className="py-3 px-4 text-left align-middle">
                              {String(d.status || '').toUpperCase() === 'PENDING' ? (
                                <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 whitespace-nowrap">
                                  <span>{t('waitingForRegistration', 'Waiting for Registration')}</span>
                                </span>
                              ) : String(d.status || '').toUpperCase() === 'IN_STOCK' || !d.merchant_id ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                  In Stock
                                </span>
                              ) : isOnline ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                  Offline
                                </span>
                              )}
                            </td>
                          )}

                          {/* Unit Price & Discount */}
                          {visibleColumns.price && (
                            <td className="py-3 px-4 text-right align-middle font-mono whitespace-nowrap">
                              {/* The final price only: what the customer actually paid */}
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                ${Number(d.final_price != null ? d.final_price : (d.price || 0)).toFixed(2)}
                              </span>
                            </td>
                          )}

                          {/* Warranty 90-Day Live Countdown */}
                          {visibleColumns.warranty && (
                            <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                              {(() => {
                                const wInfo = calculateWarrantyCountdown(d);
                                if (wInfo.status === 'NO_WARRANTY') {
                                  return <span className="text-slate-400 text-[11px]">—</span>;
                                }
                                if (wInfo.status === 'EXPIRED') {
                                  return (
                                    <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                      {t('expired', 'Expired')}
                                    </span>
                                  );
                                }
                                if (wInfo.status === 'EXPIRING_SOON') {
                                  return (
                                    <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                      {wInfo.text}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                    {wInfo.text}
                                  </span>
                                );
                              })()}
                            </td>
                          )}

                          {/* Battery */}
                          {visibleColumns.battery && (
                            <td className="py-3 px-4 text-right align-middle">
                              {String(d.status || '').toUpperCase() === 'ACTIVE' || String(d.status || '').toUpperCase() === 'ONLINE' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                  {d.battery || '100%'}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono">-</span>
                              )}
                            </td>
                          )}

                          {/* Signal */}
                          {visibleColumns.signal && (
                            <td className="py-3 px-4 text-right align-middle">
                              <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                String(d.signal || '').toLowerCase().includes('excel')
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                              }`}>
                                {d.signal || 'Good'}
                              </span>
                            </td>
                          )}

                          {/* 4G Version */}
                          {visibleColumns.version4g && (
                            <td className="py-3 px-4 text-left align-middle font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-[140px] truncate" title={d.version_4g}>
                              {d.version_4g || 'Y6_LCD_1605...'}
                            </td>
                          )}

                          {/* WiFi Version */}
                          {visibleColumns.versionWifi && (
                            <td className="py-3 px-4 text-left align-middle font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-[140px] truncate" title={d.version_wifi}>
                              {d.version_wifi || 'esp32c2x_2M...'}
                            </td>
                          )}

                          {/* Last Time */}
                          {visibleColumns.lastTime && (
                            <td className="py-3 px-4 text-left align-middle font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {d.last_time || (d.created_at ? new Date(d.created_at).toLocaleString() : '2026-08-31 21:17:25')}
                            </td>
                          )}

                          {/* Operations */}
                          {visibleColumns.operation && (
                            <td className="py-3 px-4 text-right align-middle">
                              <div className="flex items-center justify-end whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDeviceDetail(d);
                                    setIsDeviceDetailOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                >
                                  <span>{t('detail', 'Detail')}</span>
                                </button>
                              </div>
                            </td>
                          )}

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400 text-sm">
                        {t('noDevicesFound', 'No soundbox devices match the specified filters.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Bottom Pagination Controls */}
            {renderPaginationNumeration({
              currentPage: devPage,
              totalPages: totalDevPages,
              totalItems: filteredDevices.length,
              pageSize: devPageSize,
              onPageChange: setDevPage,
              onPageSizeChange: setDevPageSize,
              goToPageVal: devGoToPage,
              setGoToPageVal: setDevGoToPage
            })}

          </div>

          {/* Mobile & Tablet Device Cards (< lg) */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {paginatedDevices.length > 0 ? (
              paginatedDevices.map((d) => {
                const isSelected = devSelectedIds.includes(d.id || d.device_id || d.device_sn);
                const isOnline = String(d.status || '').toUpperCase() === 'ACTIVE' || String(d.status || '').toLowerCase() === 'online';
                const isDisplay = d.device_type === 'Display' || String(d.device_type || '').includes('Display');
                const wInfo = calculateWarrantyCountdown(d);

                return (
                  <div 
                    key={d.id || d.device_id || d.device_sn}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xs hover:shadow-sm transition ${
                      isSelected ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    {/* Header: SN + Online Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isOnline ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block truncate">
                            {d.device_sn || d.device_id}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: #{d.id}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 shrink-0 ${
                        isOnline
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : String(d.status).toUpperCase() === 'PENDING'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : String(d.status).toUpperCase() === 'PENDING' ? 'bg-purple-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        <span>{isOnline ? t('online', 'Online') : String(d.status).toUpperCase() === 'PENDING' ? (isKhmer ? 'រង់ចាំការចុះឈ្មោះ' : 'Waiting for Registration') : t('offline', 'Offline')}</span>
                      </span>
                    </div>

                    {/* Store & Hardware Type */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                        <span className="truncate font-semibold">
                          {String(d.status).toUpperCase() === 'PENDING' && !d.merchant_id
                            ? (isKhmer ? 'រង់ចាំការភ្ជាប់ហាង' : 'Awaiting Store Link')
                            : (d.store_name || d.owner_name || t('unassigned', 'Unassigned'))}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isDisplay
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}>
                        {isDisplay ? 'Display' : 'Standard'}
                      </span>
                    </div>

                    {/* Telemetry: Battery, Signal & Warranty */}
                    <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <span>{d.battery || '100%'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <span>{d.signal || 'Good'}</span>
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        wInfo.status === 'EXPIRED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {wInfo.text}
                      </span>
                    </div>

                    {/* Action: View Device Details (All remote actions like broadcast, volume, reboot, reassign are in Detail modal) */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeviceDetail(d);
                          setIsDeviceDetailOpen(true);
                        }}
                        className="w-full py-2.5 px-4 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 active:scale-[0.98] text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer touch-manipulation min-h-[44px]"
                      >
                        <span>{t('detail', 'Detail')}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                {t('noDevicesFound', 'No soundbox devices match the specified filters.')}
              </div>
            )}
          </div>

          {/* Mobile & Tablet Device Pagination (< lg) */}
          <div className="lg:hidden">
            {renderPaginationNumeration({
              currentPage: devPage,
              totalPages: totalDevPages,
              totalItems: filteredDevices.length,
              pageSize: devPageSize,
              onPageChange: setDevPage,
              onPageSizeChange: setDevPageSize,
              goToPageVal: devGoToPage,
              setGoToPageVal: setDevGoToPage
            })}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3B: SOUNDBOX STOCK & WAREHOUSE INVENTORY             */}
      {/* ======================================================== */}
      {adminTab === 'inventory' && (
        <StockPage
          productStock={productStock}
          setProductStock={setProductStock}
          canViewCost={stockCanViewCost}
          branchFilter={stockBranchFilter}
          setBranchFilter={setStockBranchFilter}
          devices={devices}
          branches={branchesList}
          currentAdmin={currentAdmin}
          onAddStock={openStockIntakeModal}
          onSell={openSellStockModal}
          onEdit={openEditDeviceModal}
          onDelete={openDeleteDeviceModal}
          renderPagination={renderPaginationNumeration}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 3C: PRODUCT CATALOG                                  */}
      {/* ======================================================== */}
      {adminTab === 'products' && (
        <ProductsPage onChanged={fetchAllData} />
      )}

      {/* ======================================================== */}
      {/* TAB 3D: SUPPLIERS & DEVICE TYPES                         */}
      {/* ======================================================== */}
      {adminTab === 'suppliers' && (
        <SuppliersPage onChanged={fetchAllData} />
      )}

      {/* ======================================================== */}
      {/* TAB 3E: BRANCHES                                         */}
      {/* ======================================================== */}
      {adminTab === 'branches' && (
        <BranchesPage onChanged={fetchAllData} />
      )}


      {/* ======================================================== */}
      {/* TAB: DEDICATED SALE HISTORY & ORDERS                     */}
      {/* ======================================================== */}
      {(adminTab === 'sales' || adminTab === 'sales_history') && (
        <div className="space-y-4 sm:space-y-5">
          {/* Sales Filter & Action Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Primary Search */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={salesSearchTerm}
                  onChange={(e) => setSalesSearchTerm(e.target.value)}
                  placeholder="Search Serial Number, Customer, Store, Seller, or Notes..."
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
                {salesSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setSalesSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold text-sm"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportSalesCSV}
                  className="hidden sm:flex px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition items-center justify-center shadow-2xs cursor-pointer touch-manipulation"
                  title="Export Sales to CSV"
                >
                  <span>{t('exportCsv', 'Export CSV')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchSales(salesSearchTerm)}
                  disabled={salesLoading}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center justify-center shadow-2xs cursor-pointer disabled:opacity-50 touch-manipulation"
                  title="Refresh Sales"
                >
                  <span>{salesLoading ? 'Refreshing...' : t('refresh', 'Refresh')}</span>
                </button>
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              {/* Filter 1: Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Order Status
                </label>
                <select
                  value={salesStatusFilter}
                  onChange={(e) => setSalesStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Statuses ({salesList.length})</option>
                  <option value="COMPLETED">Completed ({salesList.filter(s => (s.status || 'COMPLETED') === 'COMPLETED').length})</option>
                  <option value="PENDING">Pending Setup ({salesList.filter(s => s.status === 'PENDING').length})</option>
                </select>
              </div>

              {/* Filter 2: Payment Method */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {t('paymentMethodFilter', 'Payment Method')}
                </label>
                <select
                  value={salesPaymentMethodFilter}
                  onChange={(e) => setSalesPaymentMethodFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">{t('allPaymentMethods', 'All Payment Methods')} ({salesList.length})</option>
                  <option value="CASH">{t('paymentCash', 'Cash')} ({salesList.filter(s => (s.payment_method || 'CASH').toUpperCase() === 'CASH').length})</option>
                  <option value="QR_SCAN">{t('paymentQrScan', 'QR Scan')} ({salesList.filter(s => (s.payment_method || '').toUpperCase() === 'QR_SCAN').length})</option>
                </select>
              </div>

              {/* Filter 3: Supplier */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Supplier
                </label>
                <select
                  value={salesSupplierFilter}
                  onChange={(e) => setSalesSupplierFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Suppliers</option>
                  {suppliersList.map(supp => (
                    <option key={supp.id} value={supp.name}>
                      {supp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Sort Order */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Sort By
                </label>
                <select
                  value={salesSortBy}
                  onChange={(e) => setSalesSortBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="newest">Sale Date: Newest First</option>
                  <option value="oldest">Sale Date: Oldest First</option>
                  <option value="price_desc">Price: Highest First</option>
                  <option value="price_asc">Price: Lowest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sales Orders Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
            {salesLoading ? (
              <div className="py-20 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2.5">
                <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
                <p className="text-xs font-semibold">Loading sales orders...</p>
              </div>
            ) : paginatedSales.length === 0 ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No sales orders found</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  {salesSearchTerm || salesStatusFilter !== 'ALL' || salesSupplierFilter !== 'ALL'
                    ? 'No records match your active search or filter criteria. Try clearing filters.'
                    : 'Soundbox devices sold from warehouse stock will appear here automatically.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[960px]">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Order / Date</th>
                      <th className="px-4 py-3 text-left">Invoice Ref</th>
                      <th className="px-4 py-3 text-left">Soundbox / SN</th>
                      <th className="px-4 py-3 text-left">Store / Customer</th>
                      <th className="px-4 py-3 text-left">Sold By</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Price & Discount</th>
                      <th className="px-4 py-3 text-left">Warranty</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                    {paginatedSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/60 transition">
                        {/* Order & Date */}
                        <td className="py-3.5 px-4 align-middle text-left whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                            #ORD-{String(sale.id).padStart(4, '0')}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <span>{sale.created_at ? new Date(sale.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                          </div>
                        </td>

                        {/* Invoice Ref */}
                        <td className="py-3.5 px-4 align-middle text-left whitespace-nowrap">
                          {sale.invoice_reference ? (
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {sale.invoice_reference}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>

                        {/* Soundbox & SN */}
                        <td className="py-3.5 px-4 align-middle text-left">
                          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-1.5">
                            <span>{sale.device_sn}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {sale.device_type && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {sale.device_type}
                              </span>
                            )}
                            {sale.supplier_name && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                {sale.supplier_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Store / Customer */}
                        <td className="py-3.5 px-4 align-middle text-left">
                          {sale.store_name ? (
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{sale.store_name}</span>
                            </div>
                          ) : sale.customer_name ? (
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{sale.customer_name}</span>
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">Direct Sale</div>
                          )}
                          {(sale.customer_phone || sale.merchant_phone) && (
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span>{sale.customer_phone || sale.merchant_phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Sold By */}
                        <td className="py-3.5 px-4 align-middle text-left whitespace-nowrap">
                          <div className="text-slate-800 dark:text-slate-200 font-semibold text-xs">
                            {sale.sold_by_name || 'Admin'}
                          </div>
                          {sale.sold_by_phone && (
                            <div className="text-[10px] text-slate-400">
                              {sale.sold_by_phone}
                            </div>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {sale.quantity || 1}
                          </span>
                        </td>

                        {/* Price & Discount */}
                        <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            ${Number(sale.final_price ?? sale.price ?? 0).toFixed(2)}
                          </div>
                          {(sale.discount_percent > 0 || sale.discount_amount > 0) && (
                            <div className="text-[10px] text-rose-500 dark:text-rose-400 line-through mt-0.5">
                              ${Number(sale.price || 0).toFixed(2)}
                              <span className="ml-1 text-[9px] no-underline font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 px-1 py-0.2 rounded">
                                {sale.discount_type === 'percent' ? `-${sale.discount_percent}%` : `-$${Number(sale.discount_amount).toFixed(2)}`}
                              </span>
                            </div>
                          )}
                          <div className="mt-1 flex justify-end">
                            {sale.payment_method === 'QR_SCAN' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {t('paymentQrScan', 'QR Scan')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {t('paymentCash', 'Cash')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Warranty */}
                        <td className="py-3.5 px-4 align-middle text-left whitespace-nowrap">
                          <div className="text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1">
                            <span>{sale.warranty_days ? `${sale.warranty_days} days` : 'No warranty'}</span>
                          </div>
                          {sale.warranty_end_date && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Exp: {new Date(sale.warranty_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sale.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : sale.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {sale.status || 'COMPLETED'}
                          </span>
                          {sale.notes && (
                            <div className="text-[10px] text-slate-400 mt-1 max-w-[140px] truncate" title={sale.notes}>
                              {sale.notes}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(sale.device_sn);
                              showToast({ type: 'success', title: 'Copied', message: `Copied SN ${sale.device_sn} to clipboard.` });
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition cursor-pointer"
                            title="Copy Serial Number"
                          >
                            <span>{isKhmer ? 'ចម្លង' : 'Copy'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {renderPaginationNumeration({
              currentPage: salesPage,
              totalPages: totalSalesPages,
              totalItems: filteredSalesList.length,
              pageSize: salesPageSize,
              onPageChange: setSalesPage,
              onPageSizeChange: setSalesPageSize,
              goToPageVal: salesGoToPage,
              setGoToPageVal: setSalesGoToPage
            })}
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* TAB 4: DEDICATED USER ACTIVITY AUDIT TRAIL               */}
      {/* ======================================================== */}
      {(adminTab === 'user_activity' || adminTab === 'logs' || adminTab === 'user_logs') && (
        <div className="space-y-4">
          
          {/* User Activity Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isKhmer ? 'កំណត់ត្រាសកម្មភាពអ្នកប្រើប្រាស់' : 'User & Merchant Activity Log'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {t('userActivitySubtitle', 'Audit trail of merchant & user operations, store registrations, soundbox claims, and login events.')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAllData}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Refresh user activities"
                >
                  <span>{loading ? 'Refreshing...' : t('refresh', 'Refresh')}</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={userActivitySearch}
                  onChange={(e) => setUserActivitySearch(e.target.value)}
                  placeholder="Search user, store, phone, SN, action..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Action Category Filter */}
              <select
                value={userActivityCategoryFilter}
                onChange={(e) => setUserActivityCategoryFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Activity Categories</option>
                <option value="STORE_REGISTER">Store Registrations</option>
                <option value="DEVICE_LINK">Soundbox Links & Claims</option>
                <option value="TELEGRAM_PAIR">Telegram Bot Pairings</option>
                <option value="USER_LOGIN">User Logins & Auth</option>
              </select>

              <button
                type="button"
                onClick={() => { setUserActivitySearch(''); setUserActivityCategoryFilter('ALL'); }}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Reset Filters</span>
              </button>
            </div>

            {/* User Activities Table */}
            {(() => {
              const filteredList = userActivities.filter(act => {
                if (userActivityCategoryFilter !== 'ALL' && act.category !== userActivityCategoryFilter) return false;
                if (userActivitySearch.trim()) {
                  const q = userActivitySearch.toLowerCase().trim();
                  const u = String(act.user_name || '').toLowerCase();
                  const p = String(act.user_phone || '').toLowerCase();
                  const t = String(act.target_name || '').toLowerCase();
                  const l = String(act.action_label || '').toLowerCase();
                  const d = String(act.details || '').toLowerCase();
                  return u.includes(q) || p.includes(q) || t.includes(q) || l.includes(q) || d.includes(q);
                }
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="text-center py-14 text-slate-500 space-y-2">
                    <Activity className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No user activity matches criteria</p>
                    <p className="text-xs text-slate-400">Try adjusting search term or category filters.</p>
                  </div>
                );
              }

              const totalUserActPages = Math.max(1, Math.ceil(filteredList.length / userActPageSize));
              const startUserActIdx = (userActPage - 1) * userActPageSize;
              const paginatedUserActs = filteredList.slice(startUserActIdx, startUserActIdx + userActPageSize);

              return (
                <div className="mt-6 mb-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-4 w-12 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectAllUserAct(paginatedUserActs)}
                              className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            >
                              {userActSelectedIds.length === paginatedUserActs.length && paginatedUserActs.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left">User / Merchant</th>
                          <th className="px-4 py-3 text-left">Action / Activity</th>
                          <th className="px-4 py-3 text-left">Target Entity</th>
                          <th className="px-4 py-3 text-left">Source / Platform</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-left">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {paginatedUserActs.map((act) => (
                        <tr 
                          key={act.id} 
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                            userActSelectedIds.includes(act.id) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 w-12 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => toggleUserActSelection(act.id)}
                              className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            >
                              {userActSelectedIds.includes(act.id) ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-left align-middle font-semibold text-slate-900 dark:text-white">
                            <div>{act.user_name || 'Merchant'}</div>
                            {act.user_phone && (
                              <div className="text-[11px] text-slate-400 font-mono font-normal">{act.user_phone}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                              act.category === 'STORE_REGISTER'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'
                                : act.category === 'DEVICE_LINK'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                                : act.category === 'TELEGRAM_PAIR'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60'
                                : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60'
                            }`}>
                              <span>{act.action_label}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-left align-middle">
                            <div className="font-semibold text-slate-900 dark:text-white">{act.target_name}</div>
                            <div className="text-[10px] text-slate-400">{act.details}</div>
                          </td>
                          <td className="py-3.5 px-4 text-left align-middle text-slate-600 dark:text-slate-400">
                            <div>{act.platform}</div>
                            <div className="font-mono text-[10px] text-slate-400">IP: {act.ip_address}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <span>{act.status}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {new Date(act.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* User Activity Pagination */}
                {renderPaginationNumeration({
                  currentPage: userActPage,
                  totalPages: totalUserActPages,
                  totalItems: filteredList.length,
                  pageSize: userActPageSize,
                  onPageChange: setUserActPage,
                  onPageSizeChange: setUserActPageSize,
                  goToPageVal: userActGoToPage,
                  setGoToPageVal: setUserActGoToPage
                })}
              </div>
            );
          })()}

          </div>

        </div>
      )}


      {/* ======================================================== */}
      {/* TAB 5: DEDICATED ADMIN ACTIVITY AUDIT LOGS               */}
      {/* ======================================================== */}
      {(adminTab === 'admin_activity' || adminTab === 'admin_logs') && (
        <div className="space-y-4">
          
          {/* Admin Activity Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isKhmer ? 'កំណត់ត្រាសកម្មភាពអ្នកគ្រប់គ្រង' : 'Admin & System Operation Audit Log'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {t('adminActivitySubtitle', 'Audit trail of system administrative actions, stock intakes, sales deployments, and remote commands.')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAllData}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Refresh admin activities"
                >
                  <span>{loading ? 'Refreshing...' : t('refresh', 'Refresh')}</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={adminActivitySearch}
                  onChange={(e) => setAdminActivitySearch(e.target.value)}
                  placeholder="Search operator, device SN, action..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Event Category Filter */}
              <select
                value={adminActivityCategoryFilter}
                onChange={(e) => setAdminActivityCategoryFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="ALL">All Administrative Actions</option>
                <option value="STOCK_INTAKE">Stock Intakes</option>
                <option value="SALE_DEPLOY">Sales & Warranty Deployments</option>
                <option value="VOICE_BROADCAST">Voice Broadcasts</option>
                <option value="SET_VOLUME">Volume Adjustments</option>
                <option value="REBOOT">Device Reboots</option>
                <option value="USER_MANAGEMENT">User Provisioning</option>
              </select>

              <button
                type="button"
                onClick={() => { setAdminActivitySearch(''); setAdminActivityCategoryFilter('ALL'); }}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Reset Filters</span>
              </button>
            </div>

            {/* Admin Activities Table */}
            {(() => {
              const filteredList = adminActivities.filter(act => {
                if (adminActivityCategoryFilter !== 'ALL' && act.category !== adminActivityCategoryFilter) return false;
                if (adminActivitySearch.trim()) {
                  const q = adminActivitySearch.toLowerCase().trim();
                  const op = String(act.operator || '').toLowerCase();
                  const t = String(act.target_name || '').toLowerCase();
                  const l = String(act.action_label || '').toLowerCase();
                  const d = String(act.details || '').toLowerCase();
                  return op.includes(q) || t.includes(q) || l.includes(q) || d.includes(q);
                }
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="text-center py-14 text-slate-500 space-y-2">
                    <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No admin activities match criteria</p>
                    <p className="text-xs text-slate-400">All administrative operations logged securely.</p>
                  </div>
                );
              }

              const totalAdminActPages = Math.max(1, Math.ceil(filteredList.length / adminActPageSize));
              const startAdminActIdx = (adminActPage - 1) * adminActPageSize;
              const paginatedAdminActs = filteredList.slice(startAdminActIdx, startAdminActIdx + adminActPageSize);

              return (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-4 w-12 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectAllAdminAct(paginatedAdminActs)}
                              className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            >
                              {adminActSelectedIds.length === paginatedAdminActs.length && paginatedAdminActs.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left">Admin Operator</th>
                          <th className="px-4 py-3 text-left">Action Type</th>
                          <th className="px-4 py-3 text-left">Target Resource</th>
                          <th className="px-4 py-3 text-left">Operation Summary</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-left">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {paginatedAdminActs.map((act) => (
                          <tr 
                            key={act.id} 
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                              adminActSelectedIds.includes(act.id) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 w-12 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => toggleAdminActSelection(act.id)}
                                className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                              >
                                {adminActSelectedIds.includes(act.id) ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                )}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-left align-middle font-bold text-slate-900 dark:text-white">
                              <div>{act.operator}</div>
                              <div className="text-[10px] text-slate-400 font-mono font-normal">SuperAdmin Role</div>
                            </td>
                            <td className="py-3.5 px-4 text-left align-middle">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                act.category === 'STOCK_INTAKE'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
                                  : act.category === 'SALE_DEPLOY'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                                  : act.category === 'VOICE_BROADCAST' || act.category === 'SET_VOLUME'
                                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60'
                              }`}>
                                <span>{act.action_label}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-left align-middle font-semibold text-slate-900 dark:text-white">
                              {act.target_name}
                            </td>
                            <td className="py-3.5 px-4 text-left align-middle text-slate-600 dark:text-slate-400 max-w-sm">
                              {act.details}
                            </td>
                            <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <span>{act.status}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap text-slate-400 font-mono text-[11px]">
                              {new Date(act.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Admin Activity Pagination */}
                  {renderPaginationNumeration({
                    currentPage: adminActPage,
                    totalPages: totalAdminActPages,
                    totalItems: filteredList.length,
                    pageSize: adminActPageSize,
                    onPageChange: setAdminActPage,
                    onPageSizeChange: setAdminActPageSize,
                    goToPageVal: adminActGoToPage,
                    setGoToPageVal: setAdminActGoToPage
                  })}
                </div>
              );
            })()}

          </div>

        </div>
      )}



      {/* Modal: Create Administrator Account */}
      <Modal isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} title={t('createAdminAccount', 'Create Administrator Account')}>
        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400">
            {t('adminCreationNotice', 'Provision a new administrator account. Standard users (merchants) must register via the public sign-up page.')}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              {t('phoneNumber', 'Phone Number')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder={t('phonePlaceholder', 'e.g. 012345678')}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500"
                required
              />
              <Phone className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              {t('fullName', 'Full Name')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('fullNamePlaceholder', 'e.g. Sokha Chan')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              {t('password', 'Initial Password')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('passwordPlaceholder', 'At least 6 characters')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('role', 'Role')}
              </label>
              <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center justify-between">
                <span>ADMIN</span>
                <span className="text-[10px] bg-purple-100 dark:bg-purple-950 px-1.5 py-0.5 rounded font-mono uppercase">Fixed</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('status', 'Status')}
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              >
                <option value="ACTIVE">{t('active', 'Active')}</option>
                <option value="SUSPENDED">{t('inactive', 'Suspended')}</option>
              </select>
            </div>
          </div>

          {/* Branch Assignment: Minimal All Branches Checkbox / Selector */}
          {currentAdmin?.branch_id ? (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('assignedBranch', 'Assigned Branch')}
              </label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {currentAdmin.branch_name || `Branch #${currentAdmin.branch_id}`}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('branchLockedNotice', 'New admin will automatically be scoped to your branch.')}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                {t('branchAssignment', 'Branch Assignment')}
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllBranches}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsAllBranches(checked);
                    if (checked) {
                      setNewUserBranchId('');
                    } else if (branchesList.length > 0 && !newUserBranchId) {
                      setNewUserBranchId(String(branchesList[0].id));
                    }
                  }}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>{t('allBranchesSuperAdmin', 'All Branches')}</span>
              </label>

              {!isAllBranches && (
                <div className="pt-1">
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    {t('selectSpecificBranch', 'Select Specific Branch')}
                  </label>
                  <select
                    value={newUserBranchId}
                    onChange={(e) => setNewUserBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
                    required={!isAllBranches}
                  >
                    <option value="" disabled>{t('selectBranch', '— Select a branch —')}</option>
                    {branchesList.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name} ({b.branch_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddUserOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 cursor-pointer"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-60"
            >
              {submitting ? t('saving', 'Creating...') : t('createAdminBtn', 'Create Admin')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Administrator Account */}
      <Modal isOpen={isEditUserOpen} onClose={() => setIsEditUserOpen(false)} title={t('editAdminAccount', 'Edit Administrator Account')}>
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              {t('phoneNumber', 'Phone Number')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={editUserPhone}
                onChange={(e) => setEditUserPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500"
                required
              />
              <Phone className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              {t('fullName', 'Full Name')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={editUserName}
              onChange={(e) => setEditUserName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('role', 'Role')}
              </label>
              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-between">
                <span>{t('admin', 'Administrator')}</span>
                <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-1.5 py-0.5 rounded uppercase font-bold">ADMIN</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('status', 'Status')}
              </label>
              <select
                value={editUserStatus}
                onChange={(e) => setEditUserStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-medium"
              >
                <option value="ACTIVE">{t('active', 'Active')}</option>
                <option value="SUSPENDED">{t('inactive', 'Suspended')}</option>
              </select>
            </div>
          </div>

          {/* Branch Assignment for Admin: Minimal All Branches Checkbox / Selector */}
          {editUserRole === 'ADMIN' && (
            currentAdmin?.branch_id ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  {t('assignedBranch', 'Assigned Branch')}
                </label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {selectedUser?.branch_name || (branchesList.find(b => String(b.id) === String(selectedUser?.branch_id))?.branch_name) || `Branch #${currentAdmin.branch_id}`}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5">
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                  {t('branchAssignment', 'Branch Assignment')}
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editIsAllBranches}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditIsAllBranches(checked);
                      if (checked) {
                        setEditUserBranchId('');
                      } else if (branchesList.length > 0 && !editUserBranchId) {
                        setEditUserBranchId(String(branchesList[0].id));
                      }
                    }}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>{t('allBranchesSuperAdmin', 'All Branches')}</span>
                </label>

                {!editIsAllBranches && (
                  <div className="pt-1">
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      {t('selectSpecificBranch', 'Select Specific Branch')}
                    </label>
                    <select
                      value={editUserBranchId}
                      onChange={(e) => setEditUserBranchId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
                      required={!editIsAllBranches}
                    >
                      <option value="" disabled>{t('selectBranch', '— Select a branch —')}</option>
                      {branchesList.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.branch_name} ({b.branch_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditUserOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 cursor-pointer"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-60"
            >
              {submitting ? t('saving', 'Saving...') : t('saveChanges', 'Save Changes')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: User Details */}
      <Modal
        isOpen={isUserDetailsOpen}
        onClose={() => setIsUserDetailsOpen(false)}
        maxWidth="max-w-xl"
        title={userDetailsData?.full_name || selectedUser?.full_name || `User Profile: ${selectedUser?.phone_number || ''}`}
      >
        <div className="space-y-3">
          {loadingUserDetails ? (
            <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
              <span>{t('loadingDetails', 'Loading profile and records...')}</span>
            </div>
          ) : (() => {
            const account = userDetailsData || selectedUser || {};
            const isAdmin = String(account.role || '').toUpperCase() === 'ADMIN';
            // The API returns `devices`; older shapes used `soundboxes`
            const stores = account.stores || [];
            const devices = account.devices || account.soundboxes || [];
            const perms = account.permissions || {};
            const tabs = Array.isArray(perms.tabs) ? perms.tabs : [];
            const crud = Array.isArray(perms.crud) ? perms.crud : [];
            const chip = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase';
            const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
            const fmtStamp = (v) => (v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('never', 'Never'));

            return (
              <>
                {/* Who this is */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {account.full_name || '—'}
                      </div>
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400">{account.phone_number}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`${chip} ${isAdmin
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                        {account.role}
                      </span>
                      <span className={`${chip} ${String(account.status).toUpperCase() === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                        {account.status}
                      </span>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-1 border-t border-slate-200/70 dark:border-slate-700/70">
                    {isAdmin && (
                      <div className="flex items-center justify-between gap-2 col-span-2">
                        <dt className="text-slate-400">{t('branch', 'Branch')}</dt>
                        <dd className="font-semibold text-slate-800 dark:text-slate-200">
                          {account.branch_name || t('allBranchesSuperAdmin', 'All Branches')}
                          {account.branch_code ? <span className="font-normal text-slate-400"> ({account.branch_code})</span> : null}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-400">{t('createdAt', 'Joined')}</dt>
                      <dd className="font-mono text-slate-600 dark:text-slate-300">{fmtDate(account.created_at)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-400">{t('lastLogin', 'Last login')}</dt>
                      <dd className="font-mono text-slate-600 dark:text-slate-300">{fmtStamp(account.last_login_at)}</dd>
                    </div>
                  </dl>
                </div>

                {/* An admin is described by what they may do, not by stores they do not own */}
                {isAdmin ? (
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{t('permissions', 'Permissions')}</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">{t('tabsAccess', 'Sections')}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {tabs.includes('all') ? (
                            <span className={`${chip} bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}>
                              {t('allSections', 'All sections')}
                            </span>
                          ) : tabs.length > 0 ? tabs.map((tab) => (
                            <span key={tab} className={`${chip} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>{tab}</span>
                          )) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">{t('crudAccess', 'Actions')}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {crud.includes('all') ? (
                            <span className={`${chip} bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}>
                              {t('allActions', 'Full access')}
                            </span>
                          ) : crud.length > 0 ? crud.map((action) => (
                            <span key={action} className={`${chip} ${action === 'view_cost'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>{action}</span>
                          )) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* A merchant is described by their stores and the devices in them */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('ownedStores', 'Owned Stores')}</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{stores.length}</div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('soundboxDevices', 'Assigned Soundboxes')}</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{devices.length}</div>
                      </div>
                    </div>

                    {stores.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('storesDirectory', 'Registered Stores')}</span>
                        </h4>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                          {stores.map((store) => (
                            <div key={store.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-white truncate">{store.name}</div>
                                <div className="text-slate-400 text-[11px] truncate">{store.location || store.place || t('noLocation', 'No location set')}</div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">#{store.merchant_id || store.id}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {devices.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('soundboxDevices', 'Assigned Soundbox Devices')}</span>
                        </h4>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                          {devices.map((device) => (
                            <div key={device.id || device.device_sn} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <div className="font-mono font-bold text-slate-900 dark:text-white truncate">{device.device_sn || device.serial_number}</div>
                                <div className="text-slate-400 text-[11px] truncate">
                                  {[device.device_type, device.store_name].filter(Boolean).join(' · ') || 'Soundbox'}
                                </div>
                              </div>
                              <span className={`${chip} shrink-0 ${String(device.status).toUpperCase() === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {device.status || '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {stores.length === 0 && devices.length === 0 && (
                      <p className="p-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        {t('noStoresOrDevices', 'No stores or soundboxes under this account yet.')}
                      </p>
                    )}
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDetailsOpen(false);
                        openEditUserModal(userDetailsData || selectedUser);
                      }}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{t('editAdminAccount', 'Edit Administrator Account')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsUserDetailsOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    {t('close', 'Close')}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>


      {/* Modal: Reset Password */}
      <Modal isOpen={isResetPassOpen} onClose={() => setIsResetPassOpen(false)} title={`Reset Password: ${selectedUser?.phone_number || ''}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-slate-500">
            Enter a new password for account <strong>{selectedUser?.full_name || selectedUser?.phone_number}</strong>.
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">New Password</label>
            <input
              type="password"
              value={resetPasswordVal}
              onChange={(e) => setResetPasswordVal(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsResetPassOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm"
            >
              {submitting ? 'Updating...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete User Confirmation */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm User Account Deletion">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to permanently delete user <strong>{selectedUser?.full_name} ({selectedUser?.phone_number})</strong>?
          </p>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            This action cannot be undone. Stores and soundboxes associated with this user will be unlinked.
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteUser}
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm"
            >
              {submitting ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Edit Soundbox Hardware (with Discount Calculator & 90-Day Warranty) */}
      <Modal 
        isOpen={isEditDeviceOpen} 
        onClose={() => setIsEditDeviceOpen(false)} 
        title={adminTab === 'stock' || !selectedDevice?.merchant_id ? `${t('editStockDeviceTitle', 'Edit Stock Device')}: ${selectedDevice?.device_sn || ''}` : `${t('editSoundboxTitle', 'Edit Soundbox')}: ${selectedDevice?.device_sn || ''}`}
      >
        <form onSubmit={handleUpdateDevice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              {t('serialNumber', 'Serial Number (SN)')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={editDeviceSn}
              onChange={(e) => setEditDeviceSn(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('stockProduct', 'Product')}
              </label>
              <select
                value={editProductId}
                onChange={(e) => {
                  setEditProductId(e.target.value);
                  const picked = productsList.find(p => String(p.id) === e.target.value);
                  if (picked?.base_price != null) setEditDevicePrice(Number(picked.base_price).toFixed(2));
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              >
                <option value="">{isKhmer ? '-- មិនបានកំណត់ --' : '-- Not set --'}</option>
                {productsList.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.product_name}{p.sku ? ` (${p.sku})` : ''}
                  </option>
                ))}
              </select>
              {/* The supplier and model belong to the product, so they are shown, not edited */}
              <p className="mt-1 text-[11px] text-slate-400">
                {(() => {
                  const picked = productsList.find(p => String(p.id) === editProductId);
                  if (!picked) return isKhmer ? 'ជ្រើសរើសផលិតផលដើម្បីកំណត់អ្នកផ្គត់ផ្គង់ និងម៉ូដែល' : 'Pick a product to set the supplier and model.';
                  return [picked.device_model, picked.supplier_name].filter(Boolean).join(' · ') || '—';
                })()}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">{t('basePrice', 'Base Price')}</label>
              <input
                type="number"
                step="0.01"
                value={editDevicePrice}
                onChange={(e) => setEditDevicePrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Discount Calculator Card */}
          {adminTab !== 'stock' && selectedDevice?.merchant_id && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t('discount', 'Discount Calculation')}</span>
                </span>
                <span className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {t('finalPrice', 'Final Price')}: ${(() => {
                    const bp = Number(editDevicePrice) || 29.0;
                    let da = 0;
                    if (editDiscountType === 'PERCENT') da = ((Number(editDiscountPercent) || 0) / 100.0) * bp;
                    else if (editDiscountType === 'AMOUNT') da = Number(editDiscountAmount) || 0;
                    return Math.max(0, bp - da).toFixed(2);
                  })()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditDiscountType('NONE')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    editDiscountType === 'NONE'
                      ? 'bg-white dark:bg-slate-700 border-blue-500 text-blue-600 dark:text-blue-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('noDiscount', 'No Discount')}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditDiscountType('PERCENT'); if (editDiscountPercent === 0) setEditDiscountPercent(10); }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1 ${
                    editDiscountType === 'PERCENT'
                      ? 'bg-white dark:bg-slate-700 border-emerald-500 text-emerald-600 dark:text-emerald-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  <span>{t('percentageDiscount', '% Off')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setEditDiscountType('AMOUNT'); if (editDiscountAmount === 0) setEditDiscountAmount(5); }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1 ${
                    editDiscountType === 'AMOUNT'
                      ? 'bg-white dark:bg-slate-700 border-indigo-500 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  <span>{t('fixedDiscount', '$ Off')}</span>
                </button>
              </div>

              {editDiscountType === 'PERCENT' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">{t('discountPercent', 'Discount %')}:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editDiscountPercent}
                    onChange={(e) => setEditDiscountPercent(Number(e.target.value))}
                    className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-400 font-mono">
                    (-${(((Number(editDiscountPercent) || 0) / 100.0) * (Number(editDevicePrice) || 29)).toFixed(2)})
                  </span>
                </div>
              )}

              {editDiscountType === 'AMOUNT' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {t('discountAmount', 'Discount Amount ($)')}{sellTotals.count > 1 ? ` ${isKhmer ? 'ក្នុងមួយឯកតា' : 'per unit'}` : ''}:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editDiscountAmount}
                    onChange={(e) => setEditDiscountAmount(Number(e.target.value))}
                    className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* Warranty Period & Live Countdown Configuration */}
          {adminTab !== 'stock' && selectedDevice?.merchant_id && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t('warrantyPeriod', 'Warranty Period & Countdown')}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {editWarrantyDays} {t('daysRemaining', 'Days')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('warrantyPeriod', 'Duration')}</label>
                  <select
                    value={editWarrantyDays}
                    onChange={(e) => setEditWarrantyDays(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value={90}>{t('duration90Days', '90 Days (3 Months)')}</option>
                    <option value={180}>{t('duration180Days', '180 Days (6 Months)')}</option>
                    <option value={365}>{t('duration365Days', '365 Days (1 Year)')}</option>
                    <option value={30}>{t('duration30Days', '30 Days (1 Month)')}</option>
                    <option value={60}>{t('duration60Days', '60 Days (2 Months)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('warrantyStart', 'Start Date')}</label>
                  <input
                    type="date"
                    value={editWarrantyStartDate}
                    onChange={(e) => setEditWarrantyStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              {t('warehouseNotes', 'Warehouse Notes')}
            </label>
            <input
              type="text"
              value={editDeviceNotes}
              onChange={(e) => setEditDeviceNotes(e.target.value)}
              placeholder="e.g. Shelf A-01, tested OK"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
            />
          </div>

          {adminTab !== 'stock' && selectedDevice?.merchant_id && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Telegram Group / Chat ID
                </label>
                <input
                  type="text"
                  value={editDeviceTelegram}
                  onChange={(e) => setEditDeviceTelegram(e.target.value)}
                  placeholder="e.g. -1001234567890"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  {t('assignStore', 'Assign to Store')}
                </label>
                <select
                  value={editDeviceMerchantId}
                  onChange={(e) => setEditDeviceMerchantId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                >
                  <option value="">{t('unassignedNoStore', '-- Unassigned (No Store) --')}</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.owner_phone})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditDeviceOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm"
            >
              {submitting ? 'Saving...' : t('saveChanges', 'Save Changes')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete/Unlink Soundbox Confirmation */}
      <Modal isOpen={isDeleteDeviceOpen} onClose={() => setIsDeleteDeviceOpen(false)} title="Confirm Soundbox Unlink / Delete">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to unlink and delete soundbox hardware <strong>{selectedDevice?.device_sn}</strong>?
          </p>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            This will disconnect the device from store <strong>{selectedDevice?.store_name || 'Unassigned'}</strong> and remove its hardware record.
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsDeleteDeviceOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteDevice}
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm"
            >
              {submitting ? 'Deleting...' : 'Delete Device'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Store & Location Details (Full Hierarchy Breakdown) */}
      <Modal 
        isOpen={isStoreDetailsOpen} 
        onClose={() => setIsStoreDetailsOpen(false)} 
        title={t('storeDetails', 'Store Details & Location')}
      >

        {selectedStoreForDetails && (
          <div className="space-y-5">
            
            {/* Store & Owner Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-lg">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedStoreForDetails.merchant_name || selectedStoreForDetails.name}
                  </h4>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>ID: #{selectedStoreForDetails.merchant_id || selectedStoreForDetails.id}</span>
                    <span>•</span>
                    <span className="font-mono">{selectedStoreForDetails.owner_phone}</span>
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase">
                {t('active', 'Active')}
              </span>
            </div>

            {/* Merchant / Owner Info */}
            <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
              <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                {t('merchantInformation', 'Merchant Information')}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block">{t('fullName', 'Full Name')}:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedStoreForDetails.owner_name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t('phoneNumber', 'Phone Number')}:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {selectedStoreForDetails.owner_phone}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-indigo-100/60 dark:border-indigo-900/40">
                  <span className="text-slate-400 block">{t('telegramChatId', 'Telegram ID')}:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono inline-flex items-center gap-1 mt-0.5">
                    <Send className="w-3 h-3 text-blue-500" />
                    <span>{selectedStoreForDetails.telegram_chat_id ? (selectedStoreForDetails.telegram_chat_id.startsWith('@') ? selectedStoreForDetails.telegram_chat_id : `@${selectedStoreForDetails.telegram_chat_id}`) : 'Not Linked'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Cambodian Administrative Hierarchy Breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>{t('fullAddressHierarchy', 'Full Administrative Location')}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
                
                {/* Province / City */}
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                    <Building className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t('province', 'Province / City (ខេត្ត-ក្រុង)')}</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedStoreForDetails.province || selectedStoreForDetails.location || '—'}
                  </div>
                </div>

                {/* District / Khan */}
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                    <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('district', 'District / Khan (ខណ្ឌ-ស្រុក)')}</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedStoreForDetails.district || '—'}
                  </div>
                </div>

                {/* Commune / Sangkat */}
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                    <Compass className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('commune', 'Commune / Sangkat (ឃុំ-សង្កាត់)')}</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedStoreForDetails.commune || '—'}
                  </div>
                </div>

                {/* Village / Phum */}
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                    <Home className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{t('village', 'Village / Phum (ភូមិ)')}</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedStoreForDetails.village || '—'}
                  </div>
                </div>

                {/* Street / Landmark */}
                <div className="sm:col-span-2 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>{t('streetOrLandmark', 'Street / Landmark (ផ្លូវ-ទីតាំង)')}</span>
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {selectedStoreForDetails.street || selectedStoreForDetails.place || '—'}
                  </div>
                </div>

              </div>
            </div>

            {/* Connected Soundbox Hardware */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  <span>{t('connectedSoundboxes', 'Connected Soundboxes')}</span>
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {selectedStoreForDetails.device_count} {t('soundbox', 'Devices')}
                </span>
              </div>

              {devices.filter(d => d.store_name === selectedStoreForDetails.name || d.merchant_id === selectedStoreForDetails.id).length > 0 ? (
                <div className="space-y-2">
                  {devices
                    .filter(d => d.store_name === selectedStoreForDetails.name || d.merchant_id === selectedStoreForDetails.id)
                    .map(d => (
                      <div key={d.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-mono">
                          <Volume2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-slate-900 dark:text-white">{d.device_sn}</span>
                          <span className="text-slate-400">({d.device_model})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold uppercase">
                          {d.status}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-center text-xs text-slate-400">
                  {t('noSoundboxesLinked', 'No Soundboxes currently linked')}
                </div>
              )}
            </div>

            {/* Modal Close Button */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsStoreDetailsOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {t('close', 'Close')}
              </button>
            </div>

          </div>
        )}
      </Modal>


      {/* Modal: Log Details & Raw Payload */}
      <Modal isOpen={isLogDetailOpen} onClose={() => setIsLogDetailOpen(false)} title="Audit Log & Raw Payload Details">
        {selectedLog && (
          <div className="space-y-4">
            
            {/* Header info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Log Category</span>
                <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 mt-0.5">
                  {selectedLog.log_category === 'TRANSACTION' ? (
                    <>
                      <Receipt className="w-4 h-4 text-emerald-500" />
                      <span>Bank Payment Transaction</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      <span>Security & Fraud Prevention Alert</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Timestamp</span>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-0.5">
                  {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : '—'}
                </div>
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Amount</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono mt-0.5">
                  {selectedLog.currency === 'KHR'
                    ? `${Number(selectedLog.amount || 0).toLocaleString()} ៛`
                    : `$${Number(selectedLog.amount || 0).toFixed(2)}`}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Bank / Channel</div>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {selectedLog.bank_name || 'Bank'}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Transaction ID</div>
                <div className="font-mono text-slate-600 dark:text-slate-300 font-bold truncate mt-0.5">
                  {selectedLog.txid || '—'}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Store / Merchant</div>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {selectedLog.store_name || '—'}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Soundbox Hardware</div>
                <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  {selectedLog.device_sn || '—'}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Status</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedLog.status || 'PROCESSED'}
                </div>
              </div>
            </div>

            {/* Fraud Reason (if security alert) */}
            {selectedLog.reason && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/50 text-xs">
                <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Security Alert Reason
                </div>
                <div className="text-rose-700 dark:text-rose-400 font-mono">
                  {selectedLog.reason}
                </div>
              </div>
            )}

            {/* Raw Telegram Message */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                  {t('rawPayload', 'Raw Telegram Message / Webhook Payload')}
                </span>
                {selectedLog.raw_message && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedLog.raw_message);
                      showToast('Raw message copied!', 'success');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Payload
                  </button>
                )}
              </div>
              <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-56 border border-slate-800 whitespace-pre-wrap leading-relaxed select-all">
                {selectedLog.raw_message || 'No raw telegram payload content available for this record.'}
              </pre>
            </div>

            {/* Modal Close Button */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsLogDetailOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {t('close', 'Close')}
              </button>
            </div>

          </div>
        )}
      </Modal>

      {/* Modal: Cloud Speaker - Send Device Command */}
      <Modal
        isOpen={isDeviceCommandOpen}
        onClose={() => setIsDeviceCommandOpen(false)}
        title={t('deviceCommand', 'Send Soundbox Hardware Command')}
      >
        {commandTargetDevice && (
          <form onSubmit={handleSendDeviceCommand} className="space-y-4">
            
            {/* Target device info pill */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-mono">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900 dark:text-white">
                  {commandTargetDevice.device_id || commandTargetDevice.device_sn}
                </span>
                <span className="text-slate-400">({commandTargetDevice.device_model || 'Y6B'})</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {commandTargetDevice.status || 'ACTIVE'}
              </span>
            </div>

            {/* Command Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Command Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCommandType('VOICE_BROADCAST')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    commandType === 'VOICE_BROADCAST'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Voice Payment Test</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCommandType('SET_VOLUME')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    commandType === 'SET_VOLUME'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
                  <span>Adjust Volume</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCommandType('PLAY_TEST')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    commandType === 'PLAY_TEST'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Volume1 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Play Chime / Ping</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCommandType('REBOOT')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    commandType === 'REBOOT'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Power className="w-3.5 h-3.5 text-rose-500" />
                  <span>Restart Device</span>
                </button>
              </div>
            </div>

            {/* Voice Broadcast Parameters */}
            {commandType === 'VOICE_BROADCAST' && (
              <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Currency
                    </label>
                    <select
                      value={commandCurrency}
                      onChange={(e) => setCommandCurrency(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="KHR">KHR (៛)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Amount
                    </label>
                    <input
                      type="text"
                      value={commandAmount}
                      onChange={(e) => setCommandAmount(e.target.value)}
                      placeholder={commandCurrency === 'KHR' ? '40000' : '10.00'}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Announcement Preview
                  </label>
                  <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    🔊 "ABA Bank received {commandCurrency === 'KHR' ? `${Number(commandAmount || 0).toLocaleString()} Riels` : `${commandAmount} Dollars`}"
                  </div>
                </div>
              </div>
            )}

            {/* Volume Control Parameters */}
            {commandType === 'SET_VOLUME' && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Volume Level</span>
                  <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{commandVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={commandVolume}
                  onChange={(e) => setCommandVolume(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Mute (0%)</span>
                  <span>50%</span>
                  <span>Max (100%)</span>
                </div>
              </div>
            )}

            {/* Submit / Cancel buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeviceCommandOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={commandSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{commandSubmitting ? 'Dispatching...' : 'Dispatch Command'}</span>
              </button>
            </div>

          </form>
        )}
      </Modal>

      {/* Modal: Cloud Speaker - Device Detail */}
      <Modal
        isOpen={isDeviceDetailOpen}
        onClose={() => setIsDeviceDetailOpen(false)}
        title={t('deviceDetails', 'Soundbox Hardware Details')}
      >
        {selectedDeviceDetail && (() => {
          const linkedStore = stores.find(s => s.id === selectedDeviceDetail.merchant_id || s.name === selectedDeviceDetail.store_name);
          const linkedUser = users.find(u => (linkedStore && (u.id === linkedStore.user_id || u.phone_number === linkedStore.owner_phone)) || u.id === selectedDeviceDetail.merchant_id || u.phone_number === selectedDeviceDetail.owner_phone || u.phone_number === selectedDeviceDetail.user_phone);

          const displayMerchantName = selectedDeviceDetail.merchant_name || selectedDeviceDetail.owner_name || linkedStore?.owner_name || linkedUser?.full_name || '—';
          const displayPhone = selectedDeviceDetail.owner_phone || selectedDeviceDetail.phone_number || selectedDeviceDetail.user_phone || linkedStore?.owner_phone || linkedUser?.phone_number || '—';
          const displayStoreName = selectedDeviceDetail.store_name || linkedStore?.name || (String(selectedDeviceDetail.status).toUpperCase() === 'PENDING' ? (isKhmer ? 'មិនទាន់ភ្ជាប់ហាង (រង់ចាំចុះឈ្មោះ)' : 'Awaiting Store Link') : 'Unassigned');
          
          const displayProvince = selectedDeviceDetail.province || linkedStore?.province || '';
          const displayDistrict = selectedDeviceDetail.district || linkedStore?.district || '';
          const displayCommune = selectedDeviceDetail.commune || linkedStore?.commune || '';
          const displayVillage = selectedDeviceDetail.village || linkedStore?.village || '';
          const displayStreet = selectedDeviceDetail.street || linkedStore?.street || '';
          const locationParts = [displayStreet, displayVillage, displayCommune, displayDistrict, displayProvince].filter(Boolean);
          const fullAddress = locationParts.length > 0 ? locationParts.join(', ') : '—';

          const wInfo = calculateWarrantyCountdown(selectedDeviceDetail);

          return (
            <div className="space-y-3">

              {/* What this device is */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Volume2 className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white text-sm font-mono truncate">
                      {selectedDeviceDetail.device_id || selectedDeviceDetail.device_sn}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {selectedDeviceDetail.device_type || '-'}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap items-center gap-x-1.5">
                      <span className="font-mono">{selectedDeviceDetail.device_model || '—'}</span>
                      <span>·</span>
                      <span>{hasScreen(selectedDeviceDetail.device_type, selectedDeviceDetail.device_model) ? 'Screen QR' : 'Printed QR'}</span>
                      {selectedDeviceDetail.supplier && (
                        <>
                          <span>·</span>
                          <span>{selectedDeviceDetail.supplier}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 ${
                  String(selectedDeviceDetail.status).toUpperCase() === 'PENDING'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    : String(selectedDeviceDetail.status || '').toUpperCase() === 'IN_STOCK'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : String(selectedDeviceDetail.status || '').toUpperCase() === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {String(selectedDeviceDetail.status).toUpperCase() === 'PENDING'
                    ? (isKhmer ? 'រង់ចាំការចុះឈ្មោះ' : 'Waiting for Registration')
                    : String(selectedDeviceDetail.status || '').toUpperCase() === 'IN_STOCK'
                    ? t('inStock', 'In Stock')
                    : selectedDeviceDetail.status || 'Offline'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                {/* Who holds it */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('merchantAndStoreInfo', 'Merchant & Store')}</span>
                  </div>

                  {displayMerchantName === '—' && !selectedDeviceDetail.store_name ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-1">
                      {String(selectedDeviceDetail.status).toUpperCase() === 'PENDING'
                        ? t('awaitingStoreLink', 'Awaiting Store Link')
                        : t('warehouseStock', 'Warehouse Stock')}
                    </p>
                  ) : (
                    <dl className="space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <dt className="text-slate-400">{t('assignedStoreBranch', 'Store')}</dt>
                        <dd className="font-semibold text-slate-900 dark:text-white text-right truncate max-w-[60%]">{displayStoreName}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="text-slate-400">{t('merchantName', 'Merchant')}</dt>
                        <dd className="text-slate-700 dark:text-slate-200 text-right truncate max-w-[60%]">{displayMerchantName}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="text-slate-400">{t('merchantPhone', 'Phone')}</dt>
                        <dd className="flex items-center gap-1.5 justify-end">
                          <span className="font-mono text-slate-700 dark:text-slate-200">{displayPhone}</span>
                          {displayPhone !== '—' && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(displayPhone);
                                showToast({ type: 'success', title: 'Copied', message: t('copySuccess', 'Phone number copied to clipboard!') });
                              }}
                              title="Copy phone"
                              className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="text-slate-400">{t('telegramBinding', 'Telegram')}</dt>
                        <dd className="font-mono text-slate-700 dark:text-slate-200 text-right truncate max-w-[60%]">
                          {selectedDeviceDetail.telegram_chat_id || (isKhmer ? 'មិនទាន់ភ្ជាប់' : 'Not linked')}
                        </dd>
                      </div>
                      {fullAddress !== '—' && (
                        <div className="flex items-start justify-between gap-2">
                          <dt className="text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-500" />{t('storeAddressHierarchy', 'Address')}</dt>
                          <dd className="text-slate-700 dark:text-slate-200 text-right max-w-[60%]">{fullAddress}</dd>
                        </div>
                      )}
                      {selectedDeviceDetail.qr_code && (
                        <div className="flex items-start justify-between gap-2">
                          <dt className="text-slate-400 flex items-center gap-1"><QrCode className="w-3 h-3 text-emerald-500" />{t('paymentQrCode', 'Payment QR')}</dt>
                          <dd className="font-mono text-emerald-700 dark:text-emerald-300 text-right truncate max-w-[60%]">{selectedDeviceDetail.qr_code}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>

                {/* What it sold for, and how long it is covered */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('salesAndWarranty', 'Sales & Warranty')}</span>
                  </div>

                  {(() => {
                    // base = selling price, charged = what the customer paid, cost = supplier price
                    const base = Number(selectedDeviceDetail.price) || 0;
                    const charged = selectedDeviceDetail.final_price != null ? Number(selectedDeviceDetail.final_price) : base;
                    const saved = base > charged ? base - charged : 0;
                    return (
                      <div className="space-y-2.5">
                        {/* The money, read left to right: asking price, discount, what was paid */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                            <span className="block text-[10px] uppercase tracking-wider text-slate-400">{t('priceBase', 'Base')}</span>
                            <span className="block font-mono text-xs text-slate-700 dark:text-slate-200 mt-0.5">${base.toFixed(2)}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                            <span className="block text-[10px] uppercase tracking-wider text-slate-400">{t('priceDiscount', 'Discount')}</span>
                            <span className={`block font-mono text-xs mt-0.5 ${saved > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {saved > 0 ? `-$${saved.toFixed(2)}` : '—'}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                            <span className="block text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t('priceCharged', 'Charged')}</span>
                            <span className="block font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">${charged.toFixed(2)}</span>
                          </div>
                        </div>

                        <dl className="space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-slate-400 whitespace-nowrap">{t('warrantyPeriod', 'Warranty')}</dt>
                            <dd className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right min-w-0">
                              {wInfo.status === 'NO_WARRANTY' ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                <>
                                  {wInfo.endDate && (
                                    <span className="font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                      {wInfo.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                    wInfo.status === 'EXPIRED'
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                      : wInfo.status === 'EXPIRING_SOON'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}>
                                    {wInfo.text}
                                  </span>
                                </>
                              )}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* How the hardware is doing */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('hardwareTelemetryTitle', 'Hardware & Telemetry')}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">{t('battery', 'Battery')}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5 text-emerald-500" />{selectedDeviceDetail.battery || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">{t('signal', 'Signal')}</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Signal className="w-3.5 h-3.5" />{selectedDeviceDetail.signal || '—'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 shrink-0">{t('version4G', '4G')}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-right break-all">
                      {selectedDeviceDetail.version_4g || '—'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 shrink-0">{t('versionWifi', 'WiFi')}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-right break-all">
                      {selectedDeviceDetail.version_wifi || '—'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 whitespace-nowrap">{t('lastTime', 'Last heartbeat')}</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {selectedDeviceDetail.last_heartbeat || selectedDeviceDetail.last_time
                        ? new Date(selectedDeviceDetail.last_heartbeat || selectedDeviceDetail.last_time).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 whitespace-nowrap">{t('createdAt', 'Registered')}</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {selectedDeviceDetail.created_at
                        ? new Date(selectedDeviceDetail.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsDeviceDetailOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  {t('close', 'Close')}
                </button>
              </div>

            </div>
          );
        })()}
      </Modal>

      {/* Modal: Cloud Speaker - Edit Merchant Assignment */}
      <Modal
        isOpen={isEditMerchantOpen}
        onClose={() => setIsEditMerchantOpen(false)}
        title={t('editMerchant', 'Assign / Link Merchant Store')}
      >
        {selectedDeviceForMerchant && (
          <form onSubmit={handleReassignMerchant} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="text-slate-400">Device Serial:</div>
              <div className="font-bold font-mono text-slate-900 dark:text-white">
                {selectedDeviceForMerchant.device_id || selectedDeviceForMerchant.device_sn}
              </div>
              <div className="text-slate-400 pt-1">Current Assignment: <span className="text-slate-700 dark:text-slate-200 font-semibold">{selectedDeviceForMerchant.store_name || 'Unassigned'}</span></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Store / Merchant
              </label>
              <select
                value={targetMerchantStoreId}
                onChange={(e) => setTargetMerchantStoreId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">— Unlinked (No Store) —</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.owner_phone}) - ID #{s.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditMerchantOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={commandSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{commandSubmitting ? 'Saving...' : 'Save Assignment'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Cloud Speaker - Batch Send Commands */}
      <Modal
        isOpen={isBatchCommandOpen}
        onClose={() => setIsBatchCommandOpen(false)}
        title={t('batchSendCommands', 'Batch Send Commands')}
      >
        <form onSubmit={handleBatchSendCommand} className="space-y-4">
          
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300">
            Selected <span className="font-bold">{devSelectedIds.length} soundboxes</span> for batch execution.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Batch Operation
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <input
                  type="radio"
                  name="batchType"
                  value="TEST_SOUND"
                  checked={batchCommandType === 'TEST_SOUND'}
                  onChange={() => setBatchCommandType('TEST_SOUND')}
                  className="accent-blue-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Play Online Chime & Test Ping</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <input
                  type="radio"
                  name="batchType"
                  value="SYNC_VOLUME"
                  checked={batchCommandType === 'SYNC_VOLUME'}
                  onChange={() => setBatchCommandType('SYNC_VOLUME')}
                  className="accent-blue-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Synchronize Volume (Set to 80%)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <input
                  type="radio"
                  name="batchType"
                  value="REBOOT_ALL"
                  checked={batchCommandType === 'REBOOT_ALL'}
                  onChange={() => setBatchCommandType('REBOOT_ALL')}
                  className="accent-blue-600"
                />
                <span className="font-semibold text-rose-600 dark:text-rose-400">Restart Selected Soundboxes</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsBatchCommandOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={commandSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{commandSubmitting ? 'Sending...' : 'Dispatch to All'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Cloud Speaker - Columns Customizer */}
      <Modal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        title={t('columns', 'Customize Table Columns')}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select the columns you wish to display in the Device Manager table:
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries({
              deviceId: t('deviceId', 'Device SN'),
              deviceType: t('stockProduct', 'Product'),
              supplier: t('supplier', 'Supplier'),
              merchantId: t('merchantStore', 'Assigned Store'),
              status: t('status', 'Status'),
              price: t('price', 'Price ($)'),
              warranty: t('warranty', 'Warranty'),
              battery: t('battery', 'Battery'),
              signal: t('signal', 'Signal'),
              version4g: t('version4G', '4G Version'),
              versionWifi: t('versionWifi', 'WiFi Version'),
              lastTime: t('lastTime', 'Last Time'),
              operation: t('operation', 'Operation')
            }).map(([key, label]) => (
              <label 
                key={key} 
                className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns[key]}
                  onChange={(e) => setVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="accent-blue-600 rounded"
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setVisibleColumns({
                deviceId: true,
                deviceType: true,
                supplier: true,
                merchantId: true,
                status: true,
                price: true,
                warranty: true,
                battery: false,
                signal: false,
                version4g: false,
                versionWifi: false,
                lastTime: false,
                operation: true
              })}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Reset to Default
            </button>
            <button
              type="button"
              onClick={() => setIsColumnsModalOpen(false)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Warehouse Stock Intake */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => {
          if (!stockSubmitting) {
            setIsStockModalOpen(false);
            setIsStockSnScanning(false);
          }
        }}
        title={isKhmer ? "បន្ថែមឧបករណ៍ទៅក្នុងស្តុកឃ្លាំង" : "Add Soundbox Device to Stock"}
      >
        <div className="space-y-4">
          {/* Mode Switcher: Single Unit vs Bulk Batch */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStockModalTab('SINGLE')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                stockModalTab === 'SINGLE'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {isKhmer ? 'ស្កេនម្តងមួយ (Single)' : 'Single Unit (Scan / Input)'}
            </button>
            <button
              type="button"
              onClick={() => setStockModalTab('BULK')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                stockModalTab === 'BULK'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {isKhmer ? 'បញ្ចូលជាបាច់ (Bulk)' : 'Bulk Batch Import'}
            </button>
          </div>

          {/* Step 1-3: supplier, then its products, then the destination branch */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-slate-400 font-mono mr-1">1.</span>
                  {t('supplier', 'Supplier')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={intakeSupplierId}
                  onChange={(e) => setIntakeSupplierId(e.target.value)}
                  disabled={intakeSupplierOptions.length === 0}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                >
                  <option value="">{isKhmer ? '-- ជ្រើសរើសអ្នកផ្គត់ផ្គង់ --' : '-- Select Supplier --'}</option>
                  {intakeSupplierOptions.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-slate-400 font-mono mr-1">2.</span>
                  {t('productName', 'Product Name')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={intakeProductId}
                  onChange={(e) => setIntakeProductId(e.target.value)}
                  disabled={!intakeSupplierId || intakeProductOptions.length === 0}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                >
                  {!intakeSupplierId ? (
                    <option value="">{isKhmer ? 'ជ្រើសរើសអ្នកផ្គត់ផ្គង់ជាមុនសិន' : 'Select a supplier first'}</option>
                  ) : intakeProductOptions.length === 0 ? (
                    <option value="">{isKhmer ? 'គ្មានផលិតផល' : 'No products for this supplier'}</option>
                  ) : (
                    intakeProductOptions.map(p => (
                      <option key={p.id} value={String(p.id)}>
                        {p.product_name}{p.sku ? ` (${p.sku})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span className="text-slate-400 font-mono mr-1">3.</span>
                {t('branchName', 'Branch Name')} <span className="text-rose-500">*</span>
              </label>
              {currentAdmin?.branch_id ? (
                <div className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-between">
                  <span>{currentAdmin.branch_name || `Branch #${currentAdmin.branch_id}`}</span>
                  <span className="text-[10px] font-normal text-slate-400">(Your Branch)</span>
                </div>
              ) : (
                <select
                  value={intakeBranchId}
                  onChange={(e) => setIntakeBranchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">{isKhmer ? '-- ជ្រើសរើសសាខា --' : '-- Select Branch --'}</option>
                  {branchesList.map(b => (
                    <option key={b.id} value={String(b.id)}>
                      {b.branch_name} ({b.branch_code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span className="text-slate-400 font-mono mr-1">4.</span>
                {t('basePrice', 'Base Price')}
                <span className="font-normal text-slate-400"> ({isKhmer ? 'តម្លៃលក់ក្នុងមួយឯកតា' : 'selling price per unit'})</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-xs text-slate-400 pointer-events-none">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={intakeBasePrice}
                  onChange={(e) => setIntakeBasePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              {intakeProduct && (
                <p className="mt-1 text-[11px] text-slate-400">
                  {isKhmer ? 'តម្លៃដើមពីអ្នកផ្គត់ផ្គង់' : 'Purchase price from supplier'}:{' '}
                  <span className="font-mono">
                    {intakeProduct.purchase_price != null ? `$${Number(intakeProduct.purchase_price).toFixed(2)}` : '—'}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Live Camera Scanner Banner for SN (Single Mode Only) */}
          {stockModalTab === 'SINGLE' && isStockSnScanning && (
            <FieldQRScanner
              targetName={isKhmer ? 'លេខស៊េរីឧបករណ៍ (SN)' : 'Device Serial Number (SN)'}
              onScanSuccess={(decodedText) => {
                const text = decodedText.trim();
                setSingleSnInput(text);
                setIsStockSnScanning(false);
                showToast({
                  type: 'success',
                  title: isKhmer ? 'ស្កេន SN បានជោគជ័យ' : 'SN Scanned Successfully',
                  message: `Scanned SN: ${text}`,
                  duration: 4000
                });
              }}
              onClose={() => setIsStockSnScanning(false)}
            />
          )}

          <form onSubmit={handleIntakeStock} className="space-y-4">
            {stockModalTab === 'SINGLE' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span className="text-slate-400 font-mono mr-1">5.</span>
                  {isKhmer ? 'លេខស៊េរីឧបករណ៍ (SN)' : 'Soundbox Serial Number (SN)'} <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={singleSnInput}
                    onChange={(e) => setSingleSnInput(e.target.value)}
                    placeholder={isKhmer ? 'ឧទាហរណ៍៖ 6152608110099' : 'e.g. 6152608110099'}
                    required
                    className="w-full pl-3 pr-10 py-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsStockSnScanning(!isStockSnScanning)}
                    className={`absolute inset-y-0 right-0 pr-3 flex items-center transition cursor-pointer ${
                      isStockSnScanning ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                    title={isKhmer ? 'ស្កេន QR / Barcode ដោយកាមេរ៉ា' : 'Scan QR / Barcode with Camera'}
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {isKhmer ? 'ស្កេនស្ទីកឃ័រ QR/Barcode ឬវាយបញ្ចូលដោយដៃ' : 'Scan QR/Barcode sticker or enter manually'}
                  </span>
                  <button
                    type="button"
                    onClick={() => stockFileInputRef.current?.click()}
                    className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'ផ្ទុកឡើងរូបភាព QR' : 'Upload QR Image'}</span>
                  </button>
                  <input
                    type="file"
                    ref={stockFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadStockSnImage}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 font-mono mr-1">5.</span>
                    {isKhmer ? 'បញ្ជីលេខស៊េរី (SN) មួយជួរម្តង' : 'Serial Numbers (One per line or comma-separated)'} <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                    {intakeSerials.length} Serials
                  </span>
                </div>
                {intakeDuplicateCount > 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-1">
                    {isKhmer
                      ? `បានដកលេខស៊េរីស្ទួនចំនួន ${intakeDuplicateCount} ចេញ`
                      : `${intakeDuplicateCount} duplicate serial(s) will be ignored.`}
                  </p>
                )}
                <textarea
                  rows={4}
                  value={bulkSnInput}
                  onChange={(e) => setBulkSnInput(e.target.value)}
                  placeholder={'6152608110001\n6152608110002\n6152608110003'}
                  required
                  className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            {/* Intake Summary */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/60 text-xs">
              <div className="col-span-2 font-semibold text-slate-800 dark:text-slate-100 truncate">
                {intakeProduct?.product_name || '-'}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  {' · '}{currentAdmin?.branch_id ? (currentAdmin.branch_name || `Branch #${currentAdmin.branch_id}`) : (intakeTargetBranch?.branch_name || (isKhmer ? 'មិនទាន់ជ្រើសសាខា' : 'No branch selected'))}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{isKhmer ? 'កំពុងបន្ថែម' : 'Adding'}</span>
                <span className="font-mono font-bold text-sm text-amber-700 dark:text-amber-300">+{intakeSerials.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('availableQuantity', 'Available Quantity')}</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {intakeCurrentQty === null ? '-' : `${intakeCurrentQty} → ${intakeCurrentQty + intakeSerials.length}`}
                </span>
              </div>
            </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsStockModalOpen(false)}
              disabled={stockSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={stockSubmitting || !intakeProduct || !intakeTargetBranchId || intakeSerials.length === 0}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {stockSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Add to Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </Modal>

      {/* Modal 1: Sell Device from Stock (one unit, or every unit ticked in the stock window) */}
      <Modal
        isOpen={isSellStockOpen}
        onClose={() => setIsSellStockOpen(false)}
        maxWidth="max-w-xl"
        title={sellTotals.count > 1
          ? `${t('sellDeviceTitle', 'Sell Device to Customer')} · ${sellTotals.count} ${isKhmer ? 'ឧបករណ៍' : 'units'}`
          : t('sellDeviceTitle', 'Sell Device to Customer')}
      >
        {sellTargetDevice && (
          <form onSubmit={handleConfirmSellAndProceedToPairing} className="space-y-3">

            {/* What is being sold */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate font-mono">
                      {sellTotals.count > 1
                        ? `${sellTotals.count} ${t('unitsSelected', 'units selected')}`
                        : (sellTargetDevice.device_sn || sellTargetDevice.device_id)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {sellTargetDevice.device_type || t('sellDevice', 'Sell')}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                  ${sellTotals.subtotal.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800">
                <div className="px-3.5 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{t('basePrice', 'Base Price')} ($) · {t('perUnit', 'per unit')}</div>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {sellTargets.map((unit) => {
                    const enteredPrice = sellBasePrices[sellPriceKey(unit)];
                    const purchasePrice = Object.hasOwn(unit, 'product_purchase_price')
                      ? unit.product_purchase_price
                      : productsList.find(product => String(product.id) === String(unit.product_id))?.purchase_price;
                    const belowCost = enteredPrice !== '' && enteredPrice != null && purchasePrice != null
                      && Number.isFinite(Number(enteredPrice)) && Number.isFinite(Number(purchasePrice))
                      && Number(enteredPrice) >= 0 && Number(enteredPrice) < Number(purchasePrice);
                    const warningId = `sale-price-warning-${sellPriceKey(unit)}`;
                    return (
                    <div key={sellPriceKey(unit)}>

                    <label className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs">
                      <span className="font-mono text-slate-700 dark:text-slate-300 truncate">{unit.device_sn || unit.device_id || unit.serial_number}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        required
                        disabled={sellSubmitting}
                        aria-label={`${t('basePrice', 'Base Price')} ($) — ${unit.device_sn || unit.device_id || unit.serial_number}`}
                        aria-describedby={belowCost ? warningId : undefined}
                        value={sellBasePrices[sellPriceKey(unit)] ?? ''}
                        onChange={(event) => setSellBasePrices(previous => ({ ...previous, [sellPriceKey(unit)]: event.target.value }))}
                        className="w-28 shrink-0 px-3 py-2 text-right font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                      />
                    </label>
                    {belowCost && (
                      <p id={warningId} role="alert" className="mx-3.5 mb-2 flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {isKhmer ? 'ការលក់ក្នុងតម្លៃនេះនឹងខាត' : 'Selling at this price will lose'}
                      </p>
                    )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Discount */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t('discount', 'Discount')}</span>
                </span>
                {sellTotals.discount > 0 && (
                  <span className="text-[11px] font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                    {t('youSave', 'You save')} ${sellTotals.discount.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { type: 'PERCENT', label: t('percentageDiscount', 'Percentage Discount (%)') },
                  { type: 'AMOUNT', label: t('fixedDiscount', 'Fixed Amount Discount ($)') },
                ].map(option => (
                  <label key={option.type} className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer ${sellDiscountType === option.type ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    <input
                      type="checkbox"
                      checked={sellDiscountType === option.type}
                      disabled={sellSubmitting}
                      onChange={event => setSellDiscountType(event.target.checked ? option.type : 'NONE')}
                      className="w-4 h-4 shrink-0 accent-emerald-600"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {sellDiscountType === 'NONE' && <p className="text-xs text-slate-500">{t('noDiscount', 'No Discount')}</p>}
              {sellDiscountType !== 'NONE' && (
                <div className="space-y-1.5">
                  <label htmlFor="sale-discount-value" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    {sellDiscountType === 'PERCENT' ? t('discountPercent', 'Discount (%)') : t('discountAmount', 'Discount Amount ($)')}
                  </label>
                  <input
                    id="sale-discount-value"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={sellDiscountType === 'PERCENT' ? 100 : undefined}
                    step="0.01"
                    required
                    disabled={sellSubmitting}
                    value={sellDiscountType === 'PERCENT' ? sellDiscountPercent : sellDiscountAmount}
                    onChange={(event) => (sellDiscountType === 'PERCENT' ? setSellDiscountPercent : setSellDiscountAmount)(event.target.value)}
                    placeholder={sellDiscountType === 'PERCENT' ? '10' : '5.00'}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  {sellTotals.count > 1 && <p className="text-xs text-slate-500">{t('perUnit', 'per unit')}</p>}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('paymentMethod', 'Payment Method')}
              </span>

              <select
                aria-label={t('paymentMethod', 'Payment Method')}
                value={sellPaymentMethod}
                onChange={(event) => setSellPaymentMethod(event.target.value)}
                disabled={sellSubmitting}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <option value="QR_SCAN">{t('paymentQrScan', 'QR Code')}</option>
                <option value="CASH">{t('paymentCash', 'Cash')}</option>
              </select>
            </div>

            {/* Total and actions stay in view while the form scrolls */}
            <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 px-4 sm:px-6 pt-3 pb-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400">{t('totalPrice', 'Total')}</span>
                <span className="block text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-tight">
                  ${sellTotals.total.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSellStockOpen(false)}
                  className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={sellSubmitting}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sellSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {sellProgress && sellProgress.total > 1
                          ? `${isKhmer ? 'កំពុងលក់' : 'Selling'} ${sellProgress.done + 1} / ${sellProgress.total}...`
                          : `${isKhmer ? 'កំពុងដំណើរការ' : 'Processing'}...`}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {sellTotals.count > 1
                          ? `${t('confirmSaleAndDeploy', 'Confirm Sale')} · ${sellTotals.count}`
                          : t('confirmSaleAndDeploy', 'Confirm Sale')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>


    </div>
  );
}

