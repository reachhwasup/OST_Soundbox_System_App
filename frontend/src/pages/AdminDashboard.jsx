import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import FieldQRScanner from '../components/FieldQRScanner';
import jsQR from 'jsqr';
import { 
  Users, 
  Store, 
  Volume2, 
  ShieldCheck, 
  Search, 
  Filter, 
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
  RotateCcw,
  Layers,
  Copy,
  Eye,
  Info,
  ChevronRight,
  ChevronLeft,
  Activity,
  ShieldAlert,
  FileText,
  AlertTriangle,
  AlertOctagon,
  Terminal,
  Receipt,
  CheckCircle,
  Clock,
  CheckCheck,
  XCircle,
  ArrowUpRight,
  Wifi,
  Battery,
  BatteryCharging,
  Signal,
  Radio,
  Download,
  Columns,
  Send,
  Square,
  CheckSquare,
  Sliders,
  SlidersHorizontal,
  Cpu,
  Power,
  Volume1,
  VolumeX,
  Sparkles,
  Zap,
  Package,
  PackagePlus,
  Wrench,
  Undo2,
  ArrowLeftRight,
  Warehouse,
  Boxes,
  DollarSign,
  Unlink,
  Smartphone,
  Shield,
  Tag,
  Percent,
  Calendar,
  ShoppingBag,
  QrCode,
  Camera,
  Upload
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
  const [stats, setStats] = useState(null);
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

  // Dedicated User Logs Filters
  const [userLogSearch, setUserLogSearch] = useState('');
  const [userLogBankFilter, setUserLogBankFilter] = useState('ALL');
  const [userLogCurrencyFilter, setUserLogCurrencyFilter] = useState('ALL');
  const [userLogStoreFilter, setUserLogStoreFilter] = useState('ALL');

  // Dedicated Admin Logs Filters
  const [adminLogSearch, setAdminLogSearch] = useState('');
  const [adminLogTypeFilter, setAdminLogTypeFilter] = useState('ALL');
  const [adminLogSeverityFilter, setAdminLogSeverityFilter] = useState('ALL');

  // Store & Location Filter States
  const [storeSearch, setStoreSearch] = useState('');
  const [storeProvinceFilter, setStoreProvinceFilter] = useState('');
  const [storeSoundboxFilter, setStoreSoundboxFilter] = useState(''); // '' | 'WITH_DEVICE' | 'NO_DEVICE'

  // Cloud Speaker Device Manager Filter States
  const [devFilterId, setDevFilterId] = useState('');
  const [devFilterType, setDevFilterType] = useState('');
  const [devFilterStatus, setDevFilterStatus] = useState(''); // '' | 'Online' | 'Offline'
  const [devFilterMerchant, setDevFilterMerchant] = useState('');
  const [devFilter4G, setDevFilter4G] = useState('');
  const [devFilterWifi, setDevFilterWifi] = useState('');
  const [devFilterDate, setDevFilterDate] = useState('');

  // Cloud Speaker Device Table Pagination & Selection States
  const [devSelectedIds, setDevSelectedIds] = useState([]);
  const [devPage, setDevPage] = useState(1);
  const [devPageSize, setDevPageSize] = useState(10);
  const [devGoToPage, setDevGoToPage] = useState('');

  // Dedicated Stock & Inventory Filter & Pagination States
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockModelFilter, setStockModelFilter] = useState('ALL');
  const [stockBatchFilter, setStockBatchFilter] = useState('ALL');
  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(10);

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
  const [bulkModel, setBulkModel] = useState('Y6B');
  const [singleSnInput, setSingleSnInput] = useState('');
  const [singleType, setSingleType] = useState('Display Soundbox');
  const [singleStoreId, setSingleStoreId] = useState('');
  const [singleNotes, setSingleNotes] = useState('');
  const [singlePrice, setSinglePrice] = useState('39.00');
  const [stockTypeFilter, setStockTypeFilter] = useState('ALL');
  const [stockSubmitting, setStockSubmitting] = useState(false);

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

  // Column Visibility Customizer for Manage Stock
  const [isStockColumnsModalOpen, setIsStockColumnsModalOpen] = useState(false);
  const [visibleStockColumns, setVisibleStockColumns] = useState({
    deviceId: true,
    deviceType: true,
    price: true,
    intakeDate: true,
    notes: true,
    operation: true
  });

  // User Management Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

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
  const [editDeviceType, setEditDeviceType] = useState('Display Soundbox');
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
  const [sellStoreId, setSellStoreId] = useState('');
  const [sellDiscountType, setSellDiscountType] = useState('NONE');
  const [sellDiscountPercent, setSellDiscountPercent] = useState(0);
  const [sellDiscountAmount, setSellDiscountAmount] = useState(0);
  const [sellWarrantyDays, setSellWarrantyDays] = useState(90);
  const [sellWarrantyStartDate, setSellWarrantyStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellSubmitting, setSellSubmitting] = useState(false);

  // Form states for Create User
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('USER');
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [submitting, setSubmitting] = useState(false);

  // Form states for Edit User
  const [editPhone, setEditPhone] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('USER');
  const [editStatus, setEditStatus] = useState('ACTIVE');

  // Form states for Reset Password
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const searchParam = encodeURIComponent(searchTerm.trim());
      const roleParam = encodeURIComponent(roleFilter.trim());
      const statusParam = encodeURIComponent(statusFilter.trim());

      const [statsRes, usersRes, storesRes, devicesRes, logsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get(`/api/admin/users?search=${searchParam}&role=${roleParam}&status=${statusParam}`),
        api.get(`/api/admin/stores?search=${searchParam}`),
        api.get('/api/devices/'),
        api.get(`/api/admin/logs?search=${searchParam}&log_type=${logTypeFilter}&limit=100`)
      ]);

      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users || []);
      setStores(storesRes.data.stores || []);
      setDevices(devicesRes.data.devices || []);
      setLogs(logsRes.data?.logs || []);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Failed to fetch administrative data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAllData();
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter, statusFilter, logTypeFilter]);

  const hasActiveFilters = Boolean(searchTerm || roleFilter || statusFilter);

  const handleClearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
  };

  // Handle Add User
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newPhone.trim() || !newName.trim() || !newPassword) {
      setError('Please fill in phone number, name, and password.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/admin/users', {
        phone_number: newPhone.trim(),
        full_name: newName.trim(),
        password: newPassword,
        role: newRole,
        status: newStatus
      });
      setIsAddUserOpen(false);
      setNewPhone('');
      setNewName('');
      setNewPassword('');
      const usrMsg = 'User account created successfully.';
      showToast({
        type: 'success',
        title: 'User Created',
        message: usrMsg,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create user.';
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

  const handleCreateUser = handleAddUser;

  // Open Edit User Modal
  const openEditModal = (u) => {
    setSelectedUser(u);
    setEditPhone(u.phone_number);
    setEditName(u.full_name || '');
    setEditRole(u.role);
    setEditStatus(u.status);
    setIsEditUserOpen(true);
  };

  const openEditUserModal = openEditModal;

  // Handle Update User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/api/admin/users/${selectedUser.id}`, {
        phone_number: editPhone.trim(),
        full_name: editName.trim(),
        role: editRole,
        status: editStatus
      });
      setIsEditUserOpen(false);
      const updUsrMsg = 'User updated successfully.';
      showToast({
        type: 'update',
        title: 'User Updated',
        message: updUsrMsg,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update user.';
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
      setError('Password must be at least 6 characters.');
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
    try {
      await api.delete(`/api/admin/users/${selectedUser.id}`);
      setIsDeleteOpen(false);
      const delUsrMsg = 'User deleted successfully.';
      showToast({
        type: 'unlink',
        title: 'User Deleted',
        message: delUsrMsg,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete user.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Deletion Failed',
        message: msg,
        duration: 5000
      });
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
    setEditDeviceType(d.device_type || 'Display Soundbox');
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

  // Open Sell from Stock Modal
  const openSellStockModal = (device) => {
    setSellTargetDevice(device);
    setSellDiscountType('NONE');
    setSellDiscountPercent(0);
    setSellDiscountAmount(0);
    setSellWarrantyDays(90);
    setSellWarrantyStartDate(new Date().toISOString().split('T')[0]);
    setIsSellStockOpen(true);
  };

  // Confirm Sale & Deploy
  const handleConfirmSellAndProceedToPairing = async (e) => {
    e.preventDefault();
    if (!sellTargetDevice) return;
    setSellSubmitting(true);

    const basePrice = Number(sellTargetDevice.price) || (sellTargetDevice.device_type === 'Display Soundbox' ? 39.00 : 29.00);
    let discAmt = 0;
    let discPct = 0;
    if (sellDiscountType === 'PERCENT') {
      discPct = Number(sellDiscountPercent) || 0;
      discAmt = (discPct / 100.0) * basePrice;
    } else if (sellDiscountType === 'AMOUNT') {
      discAmt = Number(sellDiscountAmount) || 0;
      discPct = 0;
    }
    const finalPrice = Math.max(0, basePrice - discAmt);

    try {
      await api.put(`/api/devices/${sellTargetDevice.id}`, {
        device_sn: sellTargetDevice.device_sn,
        device_type: sellTargetDevice.device_type || 'Display Soundbox',
        device_model: sellTargetDevice.device_model || sellTargetDevice.device_type || 'Display Soundbox',
        merchant_id: null,
        price: basePrice,
        discount_amount: discAmt,
        discount_percent: discPct,
        final_price: finalPrice,
        warranty_days: Number(sellWarrantyDays) || 90,
        warranty_start_date: sellWarrantyStartDate ? new Date(sellWarrantyStartDate).toISOString() : new Date().toISOString(),
        status: 'PENDING'
      });

      setIsSellStockOpen(false);
      await fetchAllData();

      // Switch to Manage Devices tab
      setAdminTab('devices');

      showToast({
        type: 'success',
        title: isKhmer ? 'បានលក់ឧបករណ៍ដោយជោគជ័យ' : 'Device Sold & Deployed',
        message: isKhmer 
          ? `ឧបករណ៍ស្ថិតក្នុងស្ថានភាព៖ រង់ចាំការចុះឈ្មោះ (អតិថិជននឹងស្កេនភ្ជាប់តាមហាងរបស់ពួកគាត់)` 
          : `Device marked as sold. Status: Waiting for Registration (Ready for user to scan & link).`,
        duration: 5000
      });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to process device sale.';
      showToast({ type: 'error', title: 'Sale Failed', message: msg });
    } finally {
      setSellSubmitting(false);
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
        device_type: editDeviceType.trim() || 'Display Soundbox',
        device_model: editDeviceType.trim() || 'Display Soundbox',
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

  // Filtered Users Logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const phoneMatch = String(u.phone_number || '').toLowerCase().includes(q);
        const nameMatch = String(u.full_name || '').toLowerCase().includes(q);
        const storeMatch = String(u.store?.name || '').toLowerCase().includes(q);
        if (!phoneMatch && !nameMatch && !storeMatch) return false;
      }
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

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

  // Filtered Stores & Locations Logic
  const filteredStores = useMemo(() => {
    return stores.filter(s => {
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

      if (storeSoundboxFilter === 'WITH_DEVICE') {
        if (!s.device_count || s.device_count <= 0) return false;
      } else if (storeSoundboxFilter === 'NO_DEVICE') {
        if (s.device_count && s.device_count > 0) return false;
      }

      return true;
    });
  }, [stores, storeSearch, storeProvinceFilter, storeSoundboxFilter]);

  // Reset Store Filters
  const handleResetStoreFilters = () => {
    setStoreSearch('');
    setStoreProvinceFilter('');
    setStoreSoundboxFilter('');
  };

  // Export Stores CSV
  const handleExportStoresCSV = () => {
    if (!filteredStores.length) {
      showToast({ type: 'error', title: 'Export Failed', message: 'No stores matching current filters to export.' });
      return;
    }
    const headers = ['Store ID', 'Store Name', 'Owner Name', 'Owner Phone', 'Province', 'District', 'Commune', 'Village', 'Street', 'Soundboxes'];
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
      s.device_count || 0
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
      if (devFilterType.trim()) {
        const typeMatch = String(d.device_model || '').toLowerCase().includes(devFilterType.trim().toLowerCase());
        if (!typeMatch) return false;
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
      if (devFilter4G.trim()) {
        const gMatch = String(d.version_4g || '').toLowerCase().includes(devFilter4G.trim().toLowerCase());
        if (!gMatch) return false;
      }
      if (devFilterWifi.trim()) {
        const wMatch = String(d.version_wifi || '').toLowerCase().includes(devFilterWifi.trim().toLowerCase());
        if (!wMatch) return false;
      }
      if (devFilterDate.trim()) {
        const dateStr = String(d.last_time || d.created_at || '');
        if (!dateStr.includes(devFilterDate.trim())) return false;
      }
      return true;
    });
  }, [devices, devFilterId, devFilterType, devFilterStatus, devFilterMerchant, devFilter4G, devFilterWifi, devFilterDate]);

  // Warehouse Stock Devices Filtering Logic
  const filteredStockDevices = useMemo(() => {
    return devices.filter(d => {
      // Must be IN_STOCK and unassigned (not PENDING and not assigned)
      if (d.merchant_id || String(d.status).toUpperCase() !== 'IN_STOCK') return false;

      if (stockSearchTerm.trim()) {
        const q = stockSearchTerm.toLowerCase().trim();
        const sn = String(d.device_sn || d.device_id || '').toLowerCase();
        const dtype = String(d.device_type || '').toLowerCase();
        const notes = String(d.notes || '').toLowerCase();
        if (!sn.includes(q) && !dtype.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      if (stockTypeFilter !== 'ALL' && String(d.device_type || 'Display Soundbox').toLowerCase() !== stockTypeFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [devices, stockSearchTerm, stockTypeFilter]);

  // Stock Export CSV
  const handleExportStockCSV = () => {
    if (filteredStockDevices.length === 0) {
      showToast({ type: 'warning', title: 'No Data', message: 'No warehouse stock records to export.' });
      return;
    }
    const headers = ['Device SN', 'Device Type', 'Unit Price ($)', 'Notes', '4G Version', 'WiFi Version', 'Registration Date'];
    const rows = filteredStockDevices.map(d => [
      `"${d.device_sn || ''}"`,
      `"${d.device_type || 'Display Soundbox'}"`,
      Number(d.price || 29).toFixed(2),
      `"${(d.notes || '').replace(/"/g, '""')}"`,
      `"${d.version_4g || ''}"`,
      `"${d.version_wifi || ''}"`,
      `"${d.created_at || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `warehouse_stock_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({ type: 'success', title: 'Export Successful', message: `Exported ${filteredStockDevices.length} stock records.` });
  };

  // Paginated Device Items (Deployed)
  const totalDevPages = Math.max(1, Math.ceil(filteredDevices.length / devPageSize));
  const paginatedDevices = useMemo(() => {
    const start = (devPage - 1) * devPageSize;
    return filteredDevices.slice(start, start + devPageSize);
  }, [filteredDevices, devPage, devPageSize]);

  // Paginated Stock Items (Warehouse)
  const totalStockPages = Math.max(1, Math.ceil(filteredStockDevices.length / stockPageSize));
  const paginatedStockDevices = useMemo(() => {
    const start = (stockPage - 1) * stockPageSize;
    return filteredStockDevices.slice(start, start + stockPageSize);
  }, [filteredStockDevices, stockPage, stockPageSize]);

  // Handle Bulk Import Stock
  const handleBulkImportStock = async (e) => {
    e.preventDefault();
    const rawLines = bulkSnInput
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      showToast({ type: 'error', title: 'Serial Numbers Required', message: 'Please enter or scan at least one serial number.' });
      return;
    }

    setStockSubmitting(true);
    try {
      const res = await api.post('/api/devices/bulk-import', {
        serial_numbers: rawLines,
        device_model: bulkModel,
        batch_no: bulkBatchNo,
        notes: bulkNotes,
        price: Number(bulkPrice) || 29.00
      });
      showToast({
        type: 'success',
        title: 'Stock Imported',
        message: res.data.message || `Imported ${res.data.imported_count} devices into warehouse stock.`,
        duration: 5000
      });
      setIsStockModalOpen(false);
      setBulkSnInput('');
      setBulkNotes('');
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to import stock.';
      showToast({ type: 'error', title: 'Import Failed', message: msg, duration: 5000 });
    } finally {
      setStockSubmitting(false);
    }
  };

  // Handle Single Device Intake
  const handleSingleIntakeStock = async (e) => {
    e.preventDefault();
    if (!singleSnInput.trim()) {
      showToast({ type: 'error', title: 'SN Required', message: 'Please enter the device serial number.' });
      return;
    }

    setStockSubmitting(true);
    try {
      const res = await api.post('/api/devices/intake', {
        device_sn: singleSnInput.trim(),
        device_type: singleType || "Display Soundbox",
        notes: singleNotes,
        price: Number(singlePrice) || (singleType === 'Display Soundbox' ? 39.00 : 29.00),
        merchant_id: singleStoreId ? Number(singleStoreId) : null
      });
      showToast({
        type: 'success',
        title: 'Device Intake Completed',
        message: res.data.message || `Soundbox ${singleSnInput} added to stock.`,
        duration: 5000
      });
      setIsStockModalOpen(false);
      setSingleSnInput('');
      setSingleStoreId('');
      setSingleNotes('');
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to intake device.';
      showToast({ type: 'error', title: 'Intake Failed', message: msg, duration: 5000 });
    } finally {
      setStockSubmitting(false);
    }
  };

  // Handle Return Device to Warehouse Stock
  const handleReturnDeviceToStock = async (device) => {
    if (!window.confirm(`Are you sure you want to unlink device '${device.device_sn}' from its store and return it to warehouse stock?`)) {
      return;
    }
    try {
      const res = await api.post(`/api/devices/${device.id}/return-to-stock`);
      showToast({
        type: 'success',
        title: 'Returned to Stock',
        message: res.data.message || `Device '${device.device_sn}' is now unassigned in warehouse stock.`,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to return device to stock.';
      showToast({ type: 'error', title: 'Action Failed', message: msg, duration: 5000 });
    }
  };

  // Handle Mark Device for Maintenance / Repair
  const handleSendDeviceToMaintenance = async (device) => {
    if (!window.confirm(`Mark device '${device.device_sn}' as under maintenance / repair?`)) {
      return;
    }
    try {
      const res = await api.post(`/api/devices/${device.id}/maintenance`);
      showToast({
        type: 'success',
        title: 'Sent to Maintenance',
        message: res.data.message || `Device '${device.device_sn}' is now in maintenance.`,
        duration: 5000
      });
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to mark device maintenance.';
      showToast({ type: 'error', title: 'Action Failed', message: msg, duration: 5000 });
    }
  };

  // Reset Cloud Speaker Filters
  const handleResetDeviceFilters = () => {
    setDevFilterId('');
    setDevFilterType('');
    setDevFilterStatus('');
    setDevFilterMerchant('');
    setDevFilter4G('');
    setDevFilterWifi('');
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
        volume: batchVolume
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

  // Export User Payment Logs as CSV
  const handleExportCSV = () => {
    const listToExport = logs.filter(l => l.log_category === 'TRANSACTION');
    if (!listToExport || listToExport.length === 0) {
      showToast({ type: 'error', title: 'No Data', message: 'No user payment logs to export.' });
      return;
    }
    const headers = ['Bank / Gateway', 'Amount', 'Currency', 'Customer / Payer', 'Bank Reference TxID', 'Store Name', 'Soundbox SN', 'Status', 'Date Time'];
    const rows = listToExport.map(tx => [
      tx.bank_name || 'Bakong',
      tx.amount || 0,
      tx.currency || 'USD',
      `"${(tx.payer_name || 'Customer').replace(/"/g, '""')}"`,
      tx.txid || tx.id || '',
      `"${(tx.store_name || '').replace(/"/g, '""')}"`,
      tx.device_sn || '',
      tx.status || 'PROCESSED',
      tx.created_at ? new Date(tx.created_at).toLocaleString() : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OST_User_Payment_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({ type: 'success', title: 'Export Complete', message: `Exported ${listToExport.length} user payment log records.` });
  };

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t('loading', 'Loading administrative portal...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {t('admin', 'Admin Portal')}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">
              {adminTab === 'users' ? t('userAccountsRoles', 'User Accounts & Roles') :
               adminTab === 'stores' ? t('storeMerchantBranches', 'Store & Merchant Branches') :
               adminTab === 'devices' ? t('deployedSoundboxFleet', 'Deployed Soundbox Fleet & Telemetry') :
               adminTab === 'inventory' ? t('warehouseStockBreadcrumb', 'Warehouse Stock & Inventory') :
               adminTab === 'user_logs' || adminTab === 'logs' ? t('customerQrPayments', 'Customer QR Payments & Broadcasts') :
               t('systemSecurityAudit', 'System Security & Command Audit Trail')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {adminTab === 'users' ? t('userMerchantAccounts', 'User & Merchant Accounts') :
             adminTab === 'stores' ? t('storesMerchantLocations', 'Stores & Merchant Locations') :
             adminTab === 'devices' ? t('manageDevicesTitle', 'Manage Devices (Deployed Soundboxes)') :
             adminTab === 'inventory' ? t('stockInventory', 'Stock & Inventory (Warehouse)') :
             adminTab === 'user_logs' || adminTab === 'logs' ? t('userPaymentLogsTitle', 'User & Payment Logs') :
             t('adminSecurityLogsTitle', 'Admin & Security Audit Logs')}
          </h1>
        </div>

        <button
          onClick={fetchAllData}
          disabled={loading}
          className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/80 transition flex items-center justify-center gap-2 self-stretch sm:self-auto shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh', 'Refresh Data')}
        </button>
      </div>

      {/* KPI Stats Cards - Dedicated to Users tab only */}
      {stats && adminTab === 'users' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('totalUsers', 'Total Users')}</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total_users}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-[10px] sm:text-xs font-semibold text-emerald-600 uppercase tracking-wider">{t('active', 'Active Users')}</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{stats.active_users}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-[10px] sm:text-xs font-semibold text-rose-600 uppercase tracking-wider">{t('inactive', 'Suspended')}</div>
            <div className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">{stats.suspended_users}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-[10px] sm:text-xs font-semibold text-purple-600 uppercase tracking-wider">{t('admin', 'Admins')}</div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600 mt-1">{stats.admin_count}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-[10px] sm:text-xs font-semibold text-blue-600 uppercase tracking-wider">{t('totalStores', 'Stores Total')}</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{stats.total_stores}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-[10px] sm:text-xs font-semibold text-amber-600 uppercase tracking-wider">{t('totalSoundboxes', 'Soundboxes')}</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">{stats.total_devices}</div>
          </div>
        </div>
      )}

      {/* Universal Search & Filter Controls (For Users and Logs) */}
      {adminTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-80 md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
              <input
                type="text"
                placeholder={t('searchPlaceholder', 'Search by phone, name, store, or SN...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filters and Actions */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              
              {adminTab === 'users' && (
                <>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="">{t('allRoles', 'All Roles')}</option>
                    <option value="ADMIN">{t('admin', 'Admin')}</option>
                    <option value="USER">{t('merchant', 'User')}</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="">{t('allStatuses', 'All Statuses')}</option>
                    <option value="ACTIVE">{t('active', 'Active')}</option>
                    <option value="SUSPENDED">{t('inactive', 'Suspended')}</option>
                  </select>
                </>
              )}

              {(roleFilter || statusFilter || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter('');
                    setStatusFilter('');
                    setSearchTerm('');
                  }}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  title="Clear Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('close', 'Clear')}
                </button>
              )}

              {adminTab === 'users' && (
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {t('addNewUser', 'Add User')}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB 1: USER MANAGEMENT */}
      {adminTab === 'users' && (
        <div className="space-y-3">
          
          {/* Mobile User Cards (< md) */}
          <div className="md:hidden space-y-3">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <div key={u.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  
                  {/* Phone and Name */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
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

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
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
                  </div>

                  {/* Store & Activity */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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

                  {/* Mobile Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditUserModal(u)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{t('edit', 'Edit')}</span>
                    </button>
                    
                    {u.id !== currentAdmin?.id && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                          u.status === 'ACTIVE' 
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        <span>{u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openResetPassModal(u)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-amber-600 text-xs"
                      title="Reset Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>

                    {u.id !== currentAdmin?.id && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(u)}
                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 text-xs"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center text-slate-400 text-sm border border-slate-200 dark:border-slate-800">
                No users found matching your search.
              </div>
            )}
          </div>

          {/* Desktop User Table (>= md) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[680px]">
                <thead>

                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 font-medium">{t('phoneNumber', 'Phone Number')}</th>
                    <th className="pb-3 font-medium">{t('fullName', 'Full Name')}</th>
                    <th className="pb-3 font-medium">{t('role', 'Role')}</th>
                    <th className="pb-3 font-medium">{t('status', 'Status')}</th>
                    <th className="pb-3 font-medium">{t('storeBranches', 'Owned Stores')}</th>
                    <th className="pb-3 font-medium">{t('time', 'Last Login')}</th>
                    <th className="pb-3 font-medium text-right">{t('actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        
                        {/* Emphasized User Phone Number */}
                        <td className="py-3.5">
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                              {u.phone_number}
                            </span>
                            {u.id === currentAdmin?.id && (
                              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-semibold ml-1">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 text-slate-700 dark:text-slate-300 font-semibold">
                          {u.full_name || '—'}
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3.5">
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

                      {/* Stores Column */}
                      <td className="py-3.5">
                        {u.store_count > 0 ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <Store className="w-3.5 h-3.5 text-emerald-600" />
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

                      <td className="py-3.5 text-xs text-slate-400">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                      </td>

                      <td className="py-3.5 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditUserModal(u)}
                          title="Edit User"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        {u.id !== currentAdmin?.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            title={u.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                            className={`p-1.5 rounded-lg transition ${
                              u.status === 'ACTIVE' 
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openResetPassModal(u)}
                          title="Reset Password"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {u.id !== currentAdmin?.id && (
                          <button
                            type="button"
                            onClick={() => openDeleteModal(u)}
                            title="Delete User"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                      No users found matching your search and filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* TAB 2: STORES & PLACES DIRECTORY (RESPONSIVE CARDS & TABLE) */}
      {adminTab === 'stores' && (
        <div className="space-y-3">

          {/* Stores Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('searchStorePlaceholder', 'Search store name, owner, phone, street, location...')}
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {/* Province Filter */}
                <select
                  value={storeProvinceFilter}
                  onChange={(e) => setStoreProvinceFilter(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="">{t('allProvinces', 'All Provinces / Cities')}</option>
                  {availableProvinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                {/* Soundbox Filter */}
                <select
                  value={storeSoundboxFilter}
                  onChange={(e) => setStoreSoundboxFilter(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="">{t('allSoundboxStatus', 'All Soundboxes')}</option>
                  <option value="WITH_DEVICE">{t('withSoundbox', 'With Soundbox (Assigned)')}</option>
                  <option value="NO_DEVICE">{t('noSoundbox', 'No Soundbox (Unlinked)')}</option>
                </select>

                {/* Reset Button */}
                {(storeSearch || storeProvinceFilter || storeSoundboxFilter) && (
                  <button
                    type="button"
                    onClick={handleResetStoreFilters}
                    className="px-3 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition flex items-center gap-1 cursor-pointer"
                    title="Clear Filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('reset', 'Reset')}</span>
                  </button>
                )}

                {/* Export CSV Button */}
                <button
                  type="button"
                  onClick={handleExportStoresCSV}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Export Filtered Stores to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('exportCsv', 'Export')}</span>
                </button>
              </div>

            </div>
          </div>
          
          {/* Mobile Store Cards (< md) */}
          <div className="md:hidden space-y-3">
            {filteredStores.length > 0 ? (
              filteredStores.map((s) => (
                <div 
                  key={s.id}
                  onClick={() => {
                    setSelectedStoreForDetails(s);
                    setIsStoreDetailsOpen(true);
                  }}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 p-4 space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-base">
                          {s.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          ID: #{s.id}
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
                    <Info className="w-3.5 h-3.5" />
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

          {/* Desktop Store Table (>= md) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('storeManagement', 'Stores & Locations')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isKhmer 
                    ? 'ចុចលើជួរដេក ឬប៊ូតុង ដើម្បីមើលព័ត៌មានលម្អិតទីតាំងរដ្ឋបាល (ខេត្ត, ស្រុក, ឃុំ, ភូមិ)' 
                    : 'Click on any store to view full administrative location hierarchy'}
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                {filteredStores.length} of {stores.length} {t('totalStores', 'Stores Total')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[620px]">
                <thead>

                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 font-medium">{t('storeName', 'Store Name')}</th>
                    <th className="pb-3 font-medium">{t('owner', 'Merchant / Owner')}</th>
                    <th className="pb-3 font-medium">{t('location', 'Location (Province / District)')}</th>
                    <th className="pb-3 font-medium">{t('connectedSoundboxes', 'Soundboxes')}</th>
                    <th className="pb-3 font-medium text-right">{t('actions', 'Details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStores.length > 0 ? (
                    filteredStores.map((s) => (
                      <tr 
                        key={s.id} 
                        onClick={() => {
                          setSelectedStoreForDetails(s);
                          setIsStoreDetailsOpen(true);
                        }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                      >
                        
                        {/* Store Name */}
                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
                              <Store className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                {s.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                ID: #{s.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Owner Info */}
                        <td className="py-3.5">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                              {s.owner_name || '—'}
                            </div>
                            <div className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              <Phone className="w-3 h-3 text-indigo-500" />
                              <span>{s.owner_phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* Main Location Summary */}
                        <td className="py-3.5">
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                              <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>{s.province || s.location || '—'}</span>
                            </div>
                            {s.district && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Navigation className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>{s.district}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Soundbox Count */}
                        <td className="py-3.5">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            s.device_count > 0 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' 
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {s.device_count} {t('soundbox', 'Devices')}
                          </span>
                        </td>

                        {/* View Details Action Button */}
                        <td className="py-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStoreForDetails(s);
                              setIsStoreDetailsOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold transition border border-slate-200/80 dark:border-slate-700"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span>{t('viewDetails', 'View Details')}</span>
                          </button>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                        No stores found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SOUNDBOX HARDWARE - CLOUD SPEAKER DEVICE MANAGER */}
      {adminTab === 'devices' && (
        <div className="space-y-4">

          {/* 0. Deployed Devices KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{t('deployedSoundboxes', 'Deployed Soundboxes')}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {devices.filter(d => d.merchant_id || String(d.status).toUpperCase() === 'PENDING').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('activeInMerchantStores', 'Active in Merchant Stores')}</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                <span>{t('onlineConnected', 'Online & Connected')}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {devices.filter(d => d.merchant_id && (String(d.status).toUpperCase() === 'ONLINE' || String(d.status).toUpperCase() === 'ACTIVE')).length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('liveTelemetryAvailable', 'Live Telemetry Available')}</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                <span>{t('offlineUnits', 'Offline Units')}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
                {devices.filter(d => d.merchant_id && String(d.status).toUpperCase() === 'OFFLINE').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('disconnectedStandby', 'Disconnected / Standby')}</div>
            </div>
          </div>
          
          {/* 1. Cloud Speaker Search & Filter Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              
              {/* Device ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('deviceId', 'Device ID')}
                </label>
                <input
                  type="text"
                  value={devFilterId}
                  onChange={(e) => { setDevFilterId(e.target.value); setDevPage(1); }}
                  placeholder={t('pleaseEnterDeviceId', 'Please enter Device ID')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Device Type / Model */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('deviceType', 'Device Type')}
                </label>
                <input
                  type="text"
                  value={devFilterType}
                  onChange={(e) => { setDevFilterType(e.target.value); setDevPage(1); }}
                  placeholder={t('pleaseEnterModel', 'Please enter model (e.g. Y6B)')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('status', 'Status')}
                </label>
                <select
                  value={devFilterStatus}
                  onChange={(e) => { setDevFilterStatus(e.target.value); setDevPage(1); }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                >
                  <option value="">{t('allStatuses', 'All Statuses')}</option>
                  <option value="Online">🟢 {t('online', 'Online')}</option>
                  <option value="PENDING">🟣 {t('waitingForRegistration', 'Waiting for Registration')}</option>
                  <option value="Offline">⚪ {t('offline', 'Offline')}</option>
                </select>
              </div>

              {/* Merchant ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('merchantId', 'Merchant ID')}
                </label>
                <input
                  type="text"
                  value={devFilterMerchant}
                  onChange={(e) => { setDevFilterMerchant(e.target.value); setDevPage(1); }}
                  placeholder={t('pleaseEnterMerchantIdName', 'Please enter Merchant ID / Name')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>

              {/* 4G Version */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('version4G', '4G Version')}
                </label>
                <input
                  type="text"
                  value={devFilter4G}
                  onChange={(e) => { setDevFilter4G(e.target.value); setDevPage(1); }}
                  placeholder={t('pleaseEnter4gVersion', 'Please enter 4G Version')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>

              {/* WiFi Version */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('versionWifi', 'WiFi Version')}
                </label>
                <input
                  type="text"
                  value={devFilterWifi}
                  onChange={(e) => { setDevFilterWifi(e.target.value); setDevPage(1); }}
                  placeholder={t('pleaseEnterWifiVersion', 'Please enter WiFi Version')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Activation Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('activationTime', 'Activation Time')}
                </label>
                <input
                  type="date"
                  value={devFilterDate}
                  onChange={(e) => { setDevFilterDate(e.target.value); setDevPage(1); }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Action Buttons on right */}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setDevPage(1)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{t('search', 'Search')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDeviceFilters}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('reset', 'Reset')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDevicesCSV}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('export', 'Export')}</span>
                </button>
              </div>

            </div>
          </div>

          {/* 2. Action Toolbar & Batch Operations */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Batch Remote Command */}
              <button
                type="button"
                onClick={() => {
                  if (devSelectedIds.length === 0) {
                    showToast({ type: 'error', title: 'Selection Needed', message: 'Please select at least one device from the table.' });
                    return;
                  }
                  setIsBatchCommandOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Radio className="w-4 h-4" />
                <span>{t('batchSendCommands', 'Batch Send Commands')}</span>
                {devSelectedIds.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-800 text-[10px] font-bold rounded-full">
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
                <Columns className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('columns', 'Columns')}</span>
              </button>
            </div>
          </div>

          {/* 3. Cloud Speaker Data Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold select-none whitespace-nowrap">
                    <th className="py-3 px-4 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAllDevices}
                        className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                      >
                        {devSelectedIds.length === paginatedDevices.length && paginatedDevices.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    {visibleColumns.deviceId && <th className="py-3 px-3 font-semibold min-w-[160px]">{t('deviceId', 'Device ID')}</th>}
                    {visibleColumns.deviceType && <th className="py-3 px-3 font-semibold min-w-[190px]">{t('deviceType', 'Device Type')}</th>}
                    {visibleColumns.merchantId && <th className="py-3 px-3 font-semibold min-w-[180px]">{t('merchantStore', 'Assigned Store')}</th>}
                    {visibleColumns.status && <th className="py-3 px-3 font-semibold text-center min-w-[110px]">{t('status', 'Status')}</th>}
                    {visibleColumns.price && <th className="py-3 px-3 font-semibold text-center min-w-[110px]">{t('price', 'Price')}</th>}
                    {visibleColumns.warranty && <th className="py-3 px-3 font-semibold text-center min-w-[140px]">{t('warranty', 'Warranty (90d)')}</th>}
                    {visibleColumns.battery && <th className="py-3 px-3 font-semibold text-center min-w-[95px]">{t('battery', 'Battery')}</th>}
                    {visibleColumns.signal && <th className="py-3 px-3 font-semibold text-center min-w-[95px]">{t('signal', 'Signal')}</th>}
                    {visibleColumns.version4g && <th className="py-3 px-3 font-semibold min-w-[150px]">{t('version4G', '4G Version')}</th>}
                    {visibleColumns.versionWifi && <th className="py-3 px-3 font-semibold min-w-[150px]">{t('versionWifi', 'WiFi Version')}</th>}
                    {visibleColumns.lastTime && <th className="py-3 px-3 font-semibold min-w-[140px]">{t('lastTime', 'Last Time')}</th>}
                    {visibleColumns.operation && <th className="py-3 px-4 font-semibold text-center min-w-[160px]">{t('operation', 'Operation')}</th>}
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
                            isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleDeviceSelection(d.id || d.device_id || d.device_sn)}
                              className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Device ID */}
                          {visibleColumns.deviceId && (
                            <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              {d.device_id || d.device_sn || d.id}
                            </td>
                          )}

                          {/* Device Type */}
                          {visibleColumns.deviceType && (
                            <td className="py-3.5 px-3">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap ${
                                (d.device_type === 'Display Soundbox' || String(d.device_type || '').toLowerCase().includes('display') || String(d.device_type || '').toLowerCase().includes('screen'))
                                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}>
                                {(d.device_type === 'Display Soundbox' || String(d.device_type || '').toLowerCase().includes('display') || String(d.device_type || '').toLowerCase().includes('screen'))
                                  ? '🖥️ Display (Screen QR)'
                                  : '🏷️ Standard (Printed QR)'}
                              </span>
                            </td>
                          )}

                          {/* Merchant ID / Store */}
                          {visibleColumns.merchantId && (
                            <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                              {d.store_name ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-900 dark:text-white">{d.store_name}</span>
                                  {d.merchant_id && <span className="text-[10px] text-slate-400 font-mono">Store ID: #{d.merchant_id}</span>}
                                </div>
                              ) : String(d.status).toUpperCase() === 'PENDING' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-md border border-purple-200/60 dark:border-purple-800/40 whitespace-nowrap">
                                  <Clock className="w-3 h-3 text-purple-500 animate-pulse" />
                                  <span>{t('awaitingStoreLink', 'Awaiting Store Link')}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/40">
                                  <Package className="w-3 h-3" />
                                  Warehouse Stock
                                </span>
                              )}
                            </td>
                          )}

                          {/* Status */}
                          {visibleColumns.status && (
                            <td className="py-3.5 px-3 text-center">
                              {String(d.status || '').toUpperCase() === 'PENDING' ? (
                                <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 whitespace-nowrap">
                                  <Clock className="w-3 h-3 text-purple-500 animate-pulse" />
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

                          {/* Unit Price */}
                          {visibleColumns.price && (
                            <td className="py-3.5 px-3 text-center font-mono whitespace-nowrap">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                ${Number(d.final_price || d.price || 29).toFixed(2)}
                              </span>
                            </td>
                          )}

                          {/* Warranty 90-Day Live Countdown */}
                          {visibleColumns.warranty && (
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              {(() => {
                                const wInfo = calculateWarrantyCountdown(d);
                                if (!d.merchant_id || wInfo.status === 'NO_WARRANTY') {
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
                                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    {wInfo.text}
                                  </span>
                                );
                              })()}
                            </td>
                          )}

                          {/* Battery */}
                          {visibleColumns.battery && (
                            <td className="py-3.5 px-3 text-center">
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                <Battery className="w-3.5 h-3.5 text-emerald-500" />
                                {d.battery || '100%'}
                              </span>
                            </td>
                          )}

                          {/* Signal */}
                          {visibleColumns.signal && (
                            <td className="py-3.5 px-3 text-center">
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
                            <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-[140px] truncate" title={d.version_4g}>
                              {d.version_4g || 'Y6_LCD_1605...'}
                            </td>
                          )}

                          {/* WiFi Version */}
                          {visibleColumns.versionWifi && (
                            <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-[140px] truncate" title={d.version_wifi}>
                              {d.version_wifi || 'esp32c2x_2M...'}
                            </td>
                          )}

                          {/* Last Time */}
                          {visibleColumns.lastTime && (
                            <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {d.last_time || (d.created_at ? new Date(d.created_at).toLocaleString() : '2026-08-31 21:17:25')}
                            </td>
                          )}

                          {/* Operations */}
                          {visibleColumns.operation && (
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDeviceDetail(d);
                                    setIsDeviceDetailOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-500" />
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
                      <td colSpan={12} className="py-12 text-center text-slate-400 text-sm">
                        {t('noDevicesFound', 'No soundbox devices match the specified filters.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Bottom Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/75 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <div>
                Total <span className="font-bold text-slate-900 dark:text-white">{filteredDevices.length}</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Page Size */}
                <select
                  value={devPageSize}
                  onChange={(e) => { setDevPageSize(Number(e.target.value)); setDevPage(1); }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>

                {/* Page Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={devPage <= 1}
                    onClick={() => setDevPage(p => Math.max(1, p - 1))}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-bold text-xs">
                    {devPage}
                  </span>

                  <button
                    type="button"
                    disabled={devPage >= totalDevPages}
                    onClick={() => setDevPage(p => Math.min(totalDevPages, p + 1))}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Go To Page */}
                <div className="flex items-center gap-1.5">
                  <span>Go to</span>
                  <input
                    type="number"
                    min={1}
                    max={totalDevPages}
                    value={devGoToPage}
                    onChange={(e) => setDevGoToPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && devGoToPage) {
                        const target = Math.max(1, Math.min(totalDevPages, Number(devGoToPage)));
                        setDevPage(target);
                        setDevGoToPage('');
                      }
                    }}
                    placeholder="1"
                    className="w-12 px-1.5 py-1 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3B: SOUNDBOX STOCK & WAREHOUSE INVENTORY             */}
      {/* ======================================================== */}
      {adminTab === 'inventory' && (
        <div className="space-y-4">

          {/* 0. Warehouse Stock KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5" />
                <span>{t('warehouseStock', 'Warehouse Stock')}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {devices.filter(d => !d.merchant_id || String(d.status).toUpperCase() === 'IN_STOCK').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('unassignedAndReady', 'Unassigned & Ready')}</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{t('stockAssetValue', 'Stock Asset Value')}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                ${devices.filter(d => !d.merchant_id || String(d.status).toUpperCase() === 'IN_STOCK').reduce((sum, d) => sum + (Number(d.price) || 29), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('stockValuationSub', 'Valuation ($29–$39/unit)')}</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" />
                <span>{t('availableUnits', 'Available Units')}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {devices.filter(d => !d.merchant_id || String(d.status).toUpperCase() === 'IN_STOCK').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('readyForDeployment', 'Ready for Deployment')}</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                <span>{t('totalFleetUnits', 'Total Fleet Units')}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {devices.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('allSoundboxes', 'All Soundboxes')}</div>
            </div>
          </div>

          {/* 1. Warehouse Stock Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Search by SN / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('searchStock', 'Search Stock')}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={stockSearchTerm}
                    onChange={(e) => { setStockSearchTerm(e.target.value); setStockPage(1); }}
                    placeholder={t('searchStockPlaceholder', 'Search Serial Number, Location, or Notes...')}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Device Type Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('deviceType', 'Device Type')}
                </label>
                <select
                  value={stockTypeFilter}
                  onChange={(e) => { setStockTypeFilter(e.target.value); setStockPage(1); }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none transition cursor-pointer"
                >
                  <option value="ALL">{t('allDeviceTypes', 'All Device Types')}</option>
                  <option value="Display Soundbox">{t('displaySoundboxOpt', '🖥️ Display Soundbox (Screen QR)')}</option>
                  <option value="Standard Soundbox">{t('standardSoundboxOpt', '🏷️ Standard Soundbox (Printed QR)')}</option>
                </select>
              </div>

            </div>

            {/* Toolbar Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>{t('addStockDevice', '+ Add Stock Device')}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStockSearchTerm('');
                    setStockTypeFilter('ALL');
                    setStockPage(1);
                  }}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('reset', 'Reset')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportStockCSV}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('exportCsv', 'Export CSV')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsStockColumnsModalOpen(true)}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Columns className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('columns', 'Columns')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Warehouse Stock Table Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold select-none whitespace-nowrap">
                    {visibleStockColumns.deviceId && <th className="py-3 px-4 font-semibold min-w-[160px]">{t('deviceId', 'Device ID')}</th>}
                    {visibleStockColumns.deviceType && <th className="py-3 px-3 font-semibold min-w-[190px]">{t('deviceType', 'Device Type')}</th>}
                    {visibleStockColumns.price && <th className="py-3 px-3 font-semibold text-center min-w-[95px]">{t('price', 'Price')}</th>}
                    {visibleStockColumns.intakeDate && <th className="py-3 px-3 font-semibold min-w-[130px]">{t('registrationDate', 'Registration Date')}</th>}
                    {visibleStockColumns.notes && <th className="py-3 px-3 font-semibold min-w-[200px]">{t('warehouseNotes', 'Warehouse Notes')}</th>}
                    {visibleStockColumns.operation && <th className="py-3 px-4 font-semibold text-center min-w-[100px]">{t('operation', 'Operation')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {paginatedStockDevices.length > 0 ? (
                    paginatedStockDevices.map((d) => (
                      <tr 
                        key={d.id} 
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group whitespace-nowrap"
                      >
                        {/* Device ID (SN) */}
                        {visibleStockColumns.deviceId && (
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                                <Smartphone className="w-3.5 h-3.5" />
                              </div>
                              <span>{d.device_sn || d.device_id}</span>
                            </div>
                          </td>
                        )}

                        {/* Device Type */}
                        {visibleStockColumns.deviceType && (
                          <td className="py-3.5 px-3">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap ${
                              (d.device_type === 'Display Soundbox' || String(d.device_type || '').toLowerCase().includes('display') || String(d.device_type || '').toLowerCase().includes('screen'))
                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}>
                              {(d.device_type === 'Display Soundbox' || String(d.device_type || '').toLowerCase().includes('display') || String(d.device_type || '').toLowerCase().includes('screen'))
                                ? t('displayScreenQr', '🖥️ Display (Screen QR)')
                                : t('standardPrintedQr', '🏷️ Standard (Printed QR)')}
                            </span>
                          </td>
                        )}

                        {/* Unit Price */}
                        {visibleStockColumns.price && (
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            ${Number(d.price || 29).toFixed(2)}
                          </td>
                        )}

                        {/* Registration Date */}
                        {visibleStockColumns.intakeDate && (
                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {d.created_at ? new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Aug 30, 2026'}
                          </td>
                        )}

                        {/* Warehouse Notes */}
                        {visibleStockColumns.notes && (
                          <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 max-w-[220px] truncate" title={d.notes}>
                            {d.notes || t('warehouseReadyTested', 'Warehouse Ready (Tested)')}
                          </td>
                        )}

                        {/* Operations */}
                        {visibleStockColumns.operation && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openSellStockModal(d)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>{t('sellDevice', 'Sell / Deploy')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditDeviceModal(d)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Edit className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                <span>{t('edit', 'Edit')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeviceDetail(d);
                                  setIsDeviceDetailOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Eye className="w-3 h-3 text-slate-400" />
                                <span>{t('detail', 'Detail')}</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400 text-sm">
                        No warehouse stock items match the specified filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/75 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <div>
                Total In Stock: <span className="font-bold text-slate-900 dark:text-white">{filteredStockDevices.length}</span>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={stockPageSize}
                  onChange={(e) => { setStockPageSize(Number(e.target.value)); setStockPage(1); }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={stockPage <= 1}
                    onClick={() => setStockPage(p => Math.max(1, p - 1))}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-600 text-white font-bold text-xs">
                    {stockPage}
                  </span>

                  <button
                    type="button"
                    disabled={stockPage >= totalStockPages}
                    onClick={() => setStockPage(p => Math.min(totalStockPages, p + 1))}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}


      {/* ======================================================== */}
      {/* TAB 4: DEDICATED USER & PAYMENT TRANSACTION LOGS         */}
      {/* ======================================================== */}
      {(adminTab === 'logs' || adminTab === 'user_logs') && (
        <div className="space-y-4">
          
          {/* Top User Payments KPI Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total USD Collected</span>
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                ${logs.filter(l => l.log_category === 'TRANSACTION' && String(l.currency).toUpperCase() !== 'KHR').reduce((sum, l) => sum + (Number(l.amount) || 0), 0).toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">Across all merchant stores</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total KHR Collected</span>
                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-lg">
                  <span className="font-bold text-xs">៛</span>
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                ៛{logs.filter(l => l.log_category === 'TRANSACTION' && String(l.currency).toUpperCase() === 'KHR').reduce((sum, l) => sum + (Number(l.amount) || 0), 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400">Bakong Khmer Riel QR</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Payment Txns</span>
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-lg">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {logs.filter(l => l.log_category === 'TRANSACTION').length} <span className="text-xs font-normal text-slate-400">txns</span>
              </div>
              <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>100% Broadcast Success</span>
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Soundbox Status</span>
                <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-lg">
                  <Volume2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {devices.filter(d => String(d.status).toUpperCase() === 'ACTIVE' || String(d.status).toUpperCase() === 'ONLINE').length} / {devices.length}
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Active Speakers Online</span>
            </div>
          </div>

          {/* User Logs Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <span>{isKhmer ? 'កំណត់ត្រាប្រតិបត្តិការអតិថិជន' : 'User & Customer Payment Transaction Logs'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Live audit trail of customer payments processed and broadcasted via ABA, ACLEDA, Canadia, Wing, and Bakong QR.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={fetchAllData}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
                  title="Refresh user payment logs"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userLogSearch}
                  onChange={(e) => setUserLogSearch(e.target.value)}
                  placeholder="Search payer, TxID, amount, SN..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Bank Filter */}
              <select
                value={userLogBankFilter}
                onChange={(e) => setUserLogBankFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Banks & Gateways</option>
                <option value="ABA">ABA Bank</option>
                <option value="ACLEDA">ACLEDA Bank</option>
                <option value="Canadia">Canadia Bank</option>
                <option value="Wing">Wing Bank</option>
                <option value="Bakong">Bakong QR</option>
              </select>

              {/* Currency Filter */}
              <select
                value={userLogCurrencyFilter}
                onChange={(e) => setUserLogCurrencyFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Currencies (USD & KHR)</option>
                <option value="USD">USD ($) Only</option>
                <option value="KHR">KHR (៛) Only</option>
              </select>

              {/* Store Filter */}
              <select
                value={userLogStoreFilter}
                onChange={(e) => setUserLogStoreFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Merchant Stores</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* User Logs Table */}
            {(() => {
              const filteredUserLogs = logs.filter(log => {
                if (log.log_category !== 'TRANSACTION') return false;
                if (userLogBankFilter !== 'ALL' && !String(log.bank_name || '').toLowerCase().includes(userLogBankFilter.toLowerCase())) return false;
                if (userLogCurrencyFilter !== 'ALL' && String(log.currency || 'USD').toUpperCase() !== userLogCurrencyFilter) return false;
                if (userLogStoreFilter !== 'ALL' && String(log.store_id || '') !== String(userLogStoreFilter)) return false;
                if (userLogSearch.trim()) {
                  const q = userLogSearch.toLowerCase().trim();
                  const payer = String(log.payer_name || '').toLowerCase();
                  const txid = String(log.txid || '').toLowerCase();
                  const bank = String(log.bank_name || '').toLowerCase();
                  const sn = String(log.device_sn || '').toLowerCase();
                  const store = String(log.store_name || '').toLowerCase();
                  const amt = String(log.amount || '');
                  return payer.includes(q) || txid.includes(q) || bank.includes(q) || sn.includes(q) || store.includes(q) || amt.includes(q);
                }
                return true;
              });

              if (filteredUserLogs.length === 0) {
                return (
                  <div className="text-center py-14 text-slate-500 space-y-2">
                    <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No user payment logs match criteria</p>
                    <p className="text-xs text-slate-400">Try clearing filters or performing a test payment.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Bank / Gateway</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Customer / Payer</th>
                        <th className="py-3 px-4">Bank Reference ID</th>
                        <th className="py-3 px-4">Store & Soundbox</th>
                        <th className="py-3 px-4">Broadcast Status</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {filteredUserLogs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{log.bank_name || 'Bakong'}</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                            +{log.currency === 'KHR'
                              ? `៛${Number(log.amount).toLocaleString()}`
                              : `$${Number(log.amount).toFixed(2)}`}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                            {log.payer_name || 'Customer'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span>{log.txid ? log.txid.substring(0, 16) : '—'}</span>
                              {log.txid && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(log.txid);
                                    showToast('Transaction ID copied!', 'success');
                                  }}
                                  className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                  title="Copy TxID"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {log.store_name || '—'}
                            </div>
                            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 mt-0.5">
                              <Volume2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{log.device_sn || '—'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 w-fit">
                                <CheckCheck className="w-3 h-3" />
                                {log.status || 'PROCESSED'}
                              </span>
                              <span className="text-[9px] text-indigo-500 font-medium flex items-center gap-0.5">
                                <Volume2 className="w-2.5 h-2.5" /> Soundbox Announced
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLog(log);
                                setIsLogDetailOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                              title="View Raw Message & Audit Payload"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

          </div>

        </div>
      )}


      {/* ======================================================== */}
      {/* TAB 5: DEDICATED ADMIN & SECURITY AUDIT LOGS             */}
      {/* ======================================================== */}
      {adminTab === 'admin_logs' && (
        <div className="space-y-4">
          
          {/* Top Admin Security KPI Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Audit Events</span>
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-lg">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
                {logs.filter(l => l.log_category === 'SECURITY').length} <span className="text-xs font-normal text-slate-400">events</span>
              </div>
              <span className="text-[11px] text-slate-400">Hardware & security actions</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Remote Commands</span>
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-lg">
                  <Send className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                {logs.filter(l => l.log_category === 'SECURITY' && (l.alert_type === 'VOICE_BROADCAST' || l.alert_type === 'SET_VOLUME' || l.alert_type === 'REBOOT')).length}
              </div>
              <span className="text-[11px] text-slate-400">Voice tests, volume & reboots</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Device Unlinks / Binds</span>
                <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-lg">
                  <Unlink className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                {logs.filter(l => l.log_category === 'SECURITY' && (l.alert_type === 'DEVICE_UNLINK' || l.alert_type === 'DEVICE_LINK')).length}
              </div>
              <span className="text-[11px] text-amber-600 font-medium">Store reassignments</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">System Integrity</span>
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                100% <span className="text-xs font-normal text-slate-400 font-sans">Secure</span>
              </div>
              <span className="text-[11px] text-emerald-500 font-medium">All audit records verified</span>
            </div>
          </div>

          {/* Admin Logs Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
            
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>{isKhmer ? 'កំណត់ត្រាប្រព័ន្ធ និងសុវត្ថិភាព' : 'Admin, Security & Remote Command Audit Logs'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Audit trail for hardware operations, remote speaker commands, volume changes, store unlink events, and administrator actions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAllData}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
                  title="Refresh security audit logs"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={adminLogSearch}
                  onChange={(e) => setAdminLogSearch(e.target.value)}
                  placeholder="Search reason, device SN, admin..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Event Type Filter */}
              <select
                value={adminLogTypeFilter}
                onChange={(e) => setAdminLogTypeFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="ALL">All Event Types</option>
                <option value="VOICE_BROADCAST">🔊 Voice Broadcast</option>
                <option value="SET_VOLUME">🔉 Volume Adjustment</option>
                <option value="REBOOT">🔄 Device Reboot</option>
                <option value="DEVICE_UNLINK">🔗 Device Unlink</option>
                <option value="SECURITY">🛡️ Security Alert</option>
              </select>

              {/* Severity Filter */}
              <select
                value={adminLogSeverityFilter}
                onChange={(e) => setAdminLogSeverityFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                <option value="ALL">All Severity Levels</option>
                <option value="INFO">ℹ️ Info</option>
                <option value="WARNING">⚠️ Warning</option>
                <option value="CRITICAL">🚨 Critical</option>
              </select>
            </div>

            {/* Admin Logs Table */}
            {(() => {
              const filteredAdminLogs = logs.filter(log => {
                if (log.log_category !== 'SECURITY') return false;
                if (adminLogTypeFilter !== 'ALL' && !String(log.alert_type || '').toUpperCase().includes(adminLogTypeFilter)) return false;
                if (adminLogSeverityFilter !== 'ALL' && String(log.status || '').toUpperCase() !== adminLogSeverityFilter) return false;
                if (adminLogSearch.trim()) {
                  const q = adminLogSearch.toLowerCase().trim();
                  const reason = String(log.reason || '').toLowerCase();
                  const type = String(log.alert_type || '').toLowerCase();
                  const sn = String(log.device_sn || '').toLowerCase();
                  const store = String(log.store_name || '').toLowerCase();
                  const sender = String(log.sender_name || log.payer_name || '').toLowerCase();
                  return reason.includes(q) || type.includes(q) || sn.includes(q) || store.includes(q) || sender.includes(q);
                }
                return true;
              });

              if (filteredAdminLogs.length === 0) {
                return (
                  <div className="text-center py-14 text-slate-500 space-y-2">
                    <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No admin security logs match criteria</p>
                    <p className="text-xs text-slate-400">All systems are running securely.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Event Type</th>
                        <th className="py-3 px-4">Target Device (SN)</th>
                        <th className="py-3 px-4">Target Store</th>
                        <th className="py-3 px-4">Action / Reason</th>
                        <th className="py-3 px-4">Operator / Sender</th>
                        <th className="py-3 px-4">Severity / Status</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {filteredAdminLogs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] uppercase border border-rose-200/60 dark:border-rose-800/60">
                              <ShieldAlert className="w-3 h-3" />
                              {log.alert_type || 'SECURITY'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{log.device_sn || '—'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-medium">
                            {log.store_name || 'Store'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                            {log.reason || 'Hardware command executed'}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                            {log.sender_name || currentAdmin?.full_name || 'Admin'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <CheckCircle2 className="w-3 h-3" />
                              {log.status || 'DISPATCHED'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLog(log);
                                setIsLogDetailOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                              title="View Raw Audit Payload"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

          </div>

        </div>
      )}



      {/* Modal: Create User */}
      <Modal isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} title={t('addNewUser', 'Create New User Account')}>
        <form onSubmit={handleCreateUser} className="space-y-4">
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
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
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
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">{t('role', 'Role')}</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              >
                <option value="USER">{t('merchant', 'User / Merchant')}</option>
                <option value="ADMIN">{t('admin', 'Administrator')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">{t('status', 'Status')}</label>
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
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddUserOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
            >
              {submitting ? t('saving', 'Creating...') : t('save', 'Create Account')}
            </button>
          </div>
        </form>
      </Modal>


      {/* Modal: Edit User */}
      <Modal isOpen={isEditUserOpen} onClose={() => setIsEditUserOpen(false)} title="Edit User Details">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Phone Number (លេខទូរស័ព្ទ)
            </label>
            <div className="relative">
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
                required
              />
              <Phone className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">{t('role', 'Role')}</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                disabled={selectedUser?.id === currentAdmin?.id}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="USER">{t('merchant', 'User / Merchant')}</option>
                <option value="ADMIN">{t('admin', 'Administrator')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">{t('status', 'Status')}</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                disabled={selectedUser?.id === currentAdmin?.id}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="ACTIVE">{t('active', 'Active')}</option>
                <option value="SUSPENDED">{t('inactive', 'Suspended')}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditUserOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-sm"
            >
              {submitting ? 'Updating...' : 'Set Password'}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">{t('deviceType', 'Device Type')}</label>
              <select
                value={editDeviceType}
                onChange={(e) => {
                  setEditDeviceType(e.target.value);
                  if (e.target.value === 'Display Soundbox') setEditDevicePrice('39.00');
                  else setEditDevicePrice('29.00');
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              >
                <option value="Display Soundbox">{t('displaySoundboxOpt', '🖥️ Display Soundbox (Screen QR)')}</option>
                <option value="Standard Soundbox">{t('standardSoundboxOpt', '🏷️ Standard Soundbox (Printed QR)')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">{t('originalPrice', 'Unit Price ($)')}</label>
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
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">{t('discountAmount', 'Discount Amount ($)')}:</label>
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
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
                    {selectedStoreForDetails.name}
                  </h4>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>ID: #{selectedStoreForDetails.id}</span>
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
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
        {selectedDeviceDetail && (
          <div className="space-y-4">
            
            {/* Header Hero */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3 font-mono">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                  <Volume2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-base">
                    {selectedDeviceDetail.device_id || selectedDeviceDetail.device_sn}
                  </div>
                  <div className="text-xs text-slate-400 font-sans mt-0.5">
                    Model: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedDeviceDetail.device_model || 'Y6B'}</span>
                  </div>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                String(selectedDeviceDetail.status || '').toLowerCase() === 'online' || String(selectedDeviceDetail.status || '').toUpperCase() === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {selectedDeviceDetail.status || 'Offline'}
              </span>
            </div>

            {/* Hardware Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('battery', 'Battery')}</span>
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                  <Battery className="w-4 h-4 text-emerald-500" />
                  {selectedDeviceDetail.battery || '100%'}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('signal', 'Signal Quality')}</span>
                <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mt-0.5">
                  <Signal className="w-4 h-4" />
                  {selectedDeviceDetail.signal || 'Excellent'}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('version4G', '4G Firmware')}</span>
                <div className="font-mono text-slate-700 dark:text-slate-300 font-bold mt-0.5 truncate" title={selectedDeviceDetail.version_4g}>
                  {selectedDeviceDetail.version_4g || 'Y6_LCD_1605_V1.0'}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('versionWifi', 'WiFi Firmware')}</span>
                <div className="font-mono text-slate-700 dark:text-slate-300 font-bold mt-0.5 truncate" title={selectedDeviceDetail.version_wifi}>
                  {selectedDeviceDetail.version_wifi || 'esp32c2x_2M_OTA'}
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('finalPrice', 'Selling Price')}</span>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <DollarSign className="w-4 h-4" />
                  <span>${Number(selectedDeviceDetail.final_price || selectedDeviceDetail.price || 29).toFixed(2)}</span>
                  {(Number(selectedDeviceDetail.discount_amount) > 0 || Number(selectedDeviceDetail.discount_percent) > 0) && (
                    <span className="text-[10px] text-slate-400 line-through font-normal">
                      ${Number(selectedDeviceDetail.price || 29).toFixed(2)}
                    </span>
                  )}
                </div>
                {(Number(selectedDeviceDetail.discount_amount) > 0 || Number(selectedDeviceDetail.discount_percent) > 0) && (
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    {Number(selectedDeviceDetail.discount_percent) > 0 
                      ? `${selectedDeviceDetail.discount_percent}% OFF (-$${Number(selectedDeviceDetail.discount_amount).toFixed(2)})`
                      : `-$${Number(selectedDeviceDetail.discount_amount).toFixed(2)} OFF`}
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('merchantStore', 'Linked Store')}</span>
                <div className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
                  {selectedDeviceDetail.store_name || (selectedDeviceDetail.status === 'PENDING' ? (isKhmer ? 'មិនទាន់ភ្ជាប់ហាង' : 'Awaiting Store Link') : 'Unassigned')}
                </div>
              </div>
            </div>

            {/* Warranty 90-Day Live Countdown Hero Card */}
            {(selectedDeviceDetail.merchant_id || selectedDeviceDetail.status === 'PENDING' || selectedDeviceDetail.warranty_days) && (() => {
              const wInfo = calculateWarrantyCountdown(selectedDeviceDetail);
              if (wInfo.status === 'NO_WARRANTY') return null;
              return (
                <div className="p-4 bg-gradient-to-br from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/40 dark:to-slate-900/60 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {t('warrantyPeriod', '90-Day Warranty Protection')}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {selectedDeviceDetail.warranty_days || 90} {t('daysRemaining', 'Days Standard Coverage')}
                        </div>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      wInfo.status === 'EXPIRED'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : wInfo.status === 'EXPIRING_SOON'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {wInfo.text}
                    </span>
                  </div>

                  {/* Visual Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          wInfo.status === 'EXPIRED'
                            ? 'bg-rose-500'
                            : wInfo.status === 'EXPIRING_SOON'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${wInfo.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>{t('warrantyStart', 'Start')}: {wInfo.startDate ? wInfo.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                      <span>{t('warrantyEnd', 'Expires')}: {wInfo.endDate ? wInfo.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Timestamps */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Last Telemetry Heartbeat:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedDeviceDetail.last_time || (selectedDeviceDetail.last_heartbeat ? new Date(selectedDeviceDetail.last_heartbeat).toLocaleString() : '2026-08-31 21:17:25')}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5">
                <span className="text-slate-400">Created / Registered At:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedDeviceDetail.created_at ? new Date(selectedDeviceDetail.created_at).toLocaleString() : '—'}
                </span>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeviceDetailOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        )}
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
              deviceId: t('deviceId', 'Device ID'),
              deviceType: t('deviceType', 'Device Type'),
              merchantId: t('merchantStore', 'Assigned Store'),
              status: t('status', 'Status'),
              price: t('price', 'Price ($)'),
              warranty: t('warranty', 'Warranty (90d Countdown)'),
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
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Reset to Default
            </button>
            <button
              type="button"
              onClick={() => setIsColumnsModalOpen(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Warehouse Stock - Columns Customizer */}
      <Modal
        isOpen={isStockColumnsModalOpen}
        onClose={() => setIsStockColumnsModalOpen(false)}
        title="Customize Stock Table Columns"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select the columns you wish to display in the Warehouse Stock table:
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries({
              deviceId: 'Device ID (SN)',
              deviceType: 'Device Type',
              price: 'Unit Price ($)',
              intakeDate: 'Registration Date',
              notes: 'Warehouse Notes',
              operation: 'Operations'
            }).map(([key, label]) => (
              <label 
                key={key} 
                className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleStockColumns[key]}
                  onChange={(e) => setVisibleStockColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="accent-amber-600 rounded"
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setVisibleStockColumns({
                deviceId: true,
                deviceType: true,
                price: true,
                intakeDate: true,
                notes: true,
                operation: true
              })}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Reset to Default
            </button>
            <button
              type="button"
              onClick={() => setIsStockColumnsModalOpen(false)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Warehouse Stock Intake */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => !stockSubmitting && setIsStockModalOpen(false)}
        title="Add Soundbox Device to Stock"
      >
        <form onSubmit={handleSingleIntakeStock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Soundbox Serial Number (SN) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={singleSnInput}
              onChange={(e) => setSingleSnInput(e.target.value)}
              placeholder="e.g. 6152608110099"
              required
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Device Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={singleType}
                onChange={(e) => {
                  setSingleType(e.target.value);
                  if (e.target.value === 'Display Soundbox') setSinglePrice('39.00');
                  else setSinglePrice('29.00');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="Display Soundbox">🖥️ Display Soundbox (Screen QR)</option>
                <option value="Standard Soundbox">🏷️ Standard Soundbox (Printed QR)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit Price ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={singlePrice}
                onChange={(e) => setSinglePrice(e.target.value)}
                placeholder="39.00"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Warehouse Notes (Optional)
            </label>
            <input
              type="text"
              value={singleNotes}
              onChange={(e) => setSingleNotes(e.target.value)}
              placeholder="e.g. Warehouse Shelf A-01, sample unit"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
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
              disabled={stockSubmitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
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
      </Modal>

      {/* Modal 1: Sell / Deploy Device from Stock */}
      <Modal
        isOpen={isSellStockOpen}
        onClose={() => setIsSellStockOpen(false)}
        title={t('sellDeviceTitle', 'Sell & Deploy Device to Customer')}
      >
        {sellTargetDevice && (
          <form onSubmit={handleConfirmSellAndProceedToPairing} className="space-y-4">
            
            {/* Device Info Banner */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3 font-mono">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {sellTargetDevice.device_sn || sellTargetDevice.device_id}
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                    {sellTargetDevice.device_type === 'Display Soundbox' ? t('displaySoundboxOpt', '🖥️ Display Soundbox (Screen QR)') : t('standardSoundboxOpt', '🏷️ Standard Soundbox (Printed QR)')}
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                ${Number(sellTargetDevice.price || (sellTargetDevice.device_type === 'Display Soundbox' ? 39 : 29)).toFixed(2)}
              </span>
            </div>

            {/* Discount Calculation Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t('discount', 'Discount Calculation')}</span>
                </span>
                <span className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {t('finalPrice', 'Final Price')}: ${(() => {
                    const bp = Number(sellTargetDevice.price) || (sellTargetDevice.device_type === 'Display Soundbox' ? 39.0 : 29.0);
                    let da = 0;
                    if (sellDiscountType === 'PERCENT') da = ((Number(sellDiscountPercent) || 0) / 100.0) * bp;
                    else if (sellDiscountType === 'AMOUNT') da = Number(sellDiscountAmount) || 0;
                    return Math.max(0, bp - da).toFixed(2);
                  })()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSellDiscountType('NONE')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    sellDiscountType === 'NONE'
                      ? 'bg-white dark:bg-slate-700 border-blue-500 text-blue-600 dark:text-blue-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('noDiscount', 'No Discount')}
                </button>
                <button
                  type="button"
                  onClick={() => { setSellDiscountType('PERCENT'); if (sellDiscountPercent === 0) setSellDiscountPercent(10); }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1 ${
                    sellDiscountType === 'PERCENT'
                      ? 'bg-white dark:bg-slate-700 border-emerald-500 text-emerald-600 dark:text-emerald-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  <span>{t('percentageDiscount', '% Off')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSellDiscountType('AMOUNT'); if (sellDiscountAmount === 0) setSellDiscountAmount(5); }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1 ${
                    sellDiscountType === 'AMOUNT'
                      ? 'bg-white dark:bg-slate-700 border-indigo-500 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  <span>{t('fixedDiscount', '$ Off')}</span>
                </button>
              </div>

              {sellDiscountType === 'PERCENT' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">{t('discountPercent', 'Discount %')}:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={sellDiscountPercent}
                    onChange={(e) => setSellDiscountPercent(Number(e.target.value))}
                    className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-400 font-mono">
                    (-${(((Number(sellDiscountPercent) || 0) / 100.0) * (Number(sellTargetDevice.price) || 29)).toFixed(2)})
                  </span>
                </div>
              )}

              {sellDiscountType === 'AMOUNT' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">{t('discountAmount', 'Discount Amount ($)')}:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={sellDiscountAmount}
                    onChange={(e) => setSellDiscountAmount(Number(e.target.value))}
                    className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Warranty Period Configuration */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t('warrantyPeriod', 'Warranty Period & Countdown')}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {sellWarrantyDays} {t('daysRemaining', 'Days')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('warrantyPeriod', 'Duration')}</label>
                  <select
                    value={sellWarrantyDays}
                    onChange={(e) => setSellWarrantyDays(Number(e.target.value))}
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
                    value={sellWarrantyStartDate}
                    onChange={(e) => setSellWarrantyStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSellStockOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={sellSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {sellSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('confirmSaleAndDeploy', 'Confirm Sale & Deploy')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}

