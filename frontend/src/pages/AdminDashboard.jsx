import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
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
  ArrowUpRight
} from 'lucide-react';

export default function AdminDashboard() {
  const { user: currentAdmin } = useAuth();
  const { t, isKhmer } = useLanguage();
  const { showToast } = useToast();
  
  // Tab state
  const [adminTab, setAdminTab] = useState('users'); // 'users' | 'stores' | 'devices' | 'logs'

  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('all'); // 'all' | 'transactions' | 'security'

  // Modals state
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


  // Soundbox Device Modals state
  const [isEditDeviceOpen, setIsEditDeviceOpen] = useState(false);
  const [isDeleteDeviceOpen, setIsDeleteDeviceOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [editDeviceSn, setEditDeviceSn] = useState('');
  const [editDeviceModel, setEditDeviceModel] = useState('Y6B');
  const [editDeviceTelegram, setEditDeviceTelegram] = useState('');
  const [editDeviceMerchantId, setEditDeviceMerchantId] = useState('');
  const [editDeviceStatus, setEditDeviceStatus] = useState('ACTIVE');

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
        api.get(`/api/devices/?search=${searchParam}`),
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

  // Open Edit Device Modal
  const openEditDeviceModal = (d) => {
    setSelectedDevice(d);
    setEditDeviceSn(d.device_sn || '');
    setEditDeviceModel(d.device_model || 'Y6B');
    setEditDeviceTelegram(d.telegram_chat_id || '');
    setEditDeviceStatus(d.status || 'ACTIVE');
    const matchedStore = stores.find(s => s.name === d.store_name);
    setEditDeviceMerchantId(matchedStore ? matchedStore.id : '');
    setIsEditDeviceOpen(true);
  };

  // Handle Update Device
  const handleUpdateDevice = async (e) => {
    e.preventDefault();
    if (!selectedDevice) return;
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/api/devices/${selectedDevice.id}`, {
        device_sn: editDeviceSn.trim(),
        device_model: editDeviceModel.trim() || 'Y6B',
        telegram_chat_id: editDeviceTelegram.trim() || null,
        status: editDeviceStatus,
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
            <span className="text-[11px] sm:text-xs text-slate-400">{t('systemManagement', 'System Management & Hardware')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {t('systemAdministration', 'System Administration')}
          </h1>
        </div>

        <button
          onClick={fetchAllData}
          disabled={loading}
          className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/80 transition flex items-center justify-center gap-2 self-stretch sm:self-auto shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh', 'Refresh Data')}
        </button>
      </div>

      {/* KPI Stats Cards */}

      {stats && (
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

      {/* Admin Section Tabs (Modern Segmented Pill on Mobile & Desktop) */}
      <div className="bg-slate-100 dark:bg-slate-800/80 p-1 sm:p-1.5 rounded-2xl flex flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar border border-slate-200/60 dark:border-slate-700/60 w-full">
        <button
          type="button"
          onClick={() => setAdminTab('users')}
          className={`shrink-0 flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
            adminTab === 'users'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>{isKhmer ? 'អ្នកប្រើប្រាស់' : 'Users & Merchants'}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            adminTab === 'users' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}>
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('stores')}
          className={`shrink-0 flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
            adminTab === 'stores'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Store className="w-4 h-4 shrink-0" />
          <span>{isKhmer ? 'ហាង និងទីតាំង' : 'Stores & Places'}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            adminTab === 'stores' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}>
            {stores.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('devices')}
          className={`shrink-0 flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
            adminTab === 'devices'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Volume2 className="w-4 h-4 shrink-0" />
          <span>{isKhmer ? 'ឧបករណ៍ Soundbox' : 'Soundboxes'}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            adminTab === 'devices' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}>
            {devices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('logs')}
          className={`shrink-0 flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
            adminTab === 'logs'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 shrink-0" />
          <span>{isKhmer ? 'កំណត់ត្រា & សុវត្ថិភាព' : 'Audit & Logs'}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            adminTab === 'logs' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}>
            {logs.length}
          </span>
        </button>
      </div>


      {/* Universal Search & Filter Controls */}
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

      {/* TAB 1: USER MANAGEMENT */}
      {adminTab === 'users' && (
        <div className="space-y-3">
          
          {/* Mobile User Cards (< md) */}
          <div className="md:hidden space-y-3">
            {users.length > 0 ? (
              users.map((u) => (
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
                  {users.length > 0 ? (
                    users.map((u) => (
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
          
          {/* Mobile Store Cards (< md) */}
          <div className="md:hidden space-y-3">
            {stores.length > 0 ? (
              stores.map((s) => (
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
                {stores.length} {t('totalStores', 'Stores Total')}
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
                  {stores.length > 0 ? (
                    stores.map((s) => (
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

      {/* TAB 3: SOUNDBOX HARDWARE (RESPONSIVE CARDS & TABLE) */}
      {adminTab === 'devices' && (
        <div className="space-y-3">
          
          {/* Mobile Device Cards (< md) */}
          <div className="md:hidden space-y-3">
            {devices.length > 0 ? (
              devices.map((d) => (
                <div key={d.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {d.device_sn}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {d.device_model || 'Y6B'}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                      {d.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('storeBranches', 'Store')}:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{d.store_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400">{t('telegramChatId', 'Telegram ID')}:</span>
                      {d.telegram_chat_id ? (
                        <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-900 dark:text-white">
                          {d.telegram_chat_id}
                        </code>
                      ) : (
                        <span className="text-slate-400">Not paired</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditDeviceModal(d)}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1 border border-indigo-100 dark:border-indigo-900/40"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{t('edit', 'Edit')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteDeviceModal(d)}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1 border border-rose-100 dark:border-rose-900/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('delete', 'Unlink')}</span>
                    </button>
                  </div>

                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center text-slate-400 text-sm border border-slate-200 dark:border-slate-800">
                No soundbox devices found matching your search.
              </div>
            )}
          </div>

          {/* Desktop Device Table (>= md) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('deviceManagement', 'Soundbox Hardware')}</h3>
              <span className="text-xs text-slate-400">{devices.length} {t('devices', 'Devices Registered')}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[620px]">
                <thead>

                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 font-medium">{t('deviceSn', 'Serial Number (SN)')}</th>
                    <th className="pb-3 font-medium">{t('deviceModel', 'Model')}</th>
                    <th className="pb-3 font-medium">{t('storeBranches', 'Linked Store')}</th>
                    <th className="pb-3 font-medium">{t('telegramChatId', 'Telegram Group ID')}</th>
                    <th className="pb-3 font-medium">{t('status', 'Status')}</th>
                    <th className="pb-3 font-medium text-right">{t('actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {devices.length > 0 ? (
                    devices.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2 font-mono">
                          <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          {d.device_sn}
                        </td>
                        <td className="py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                          {d.device_model}
                        </td>
                        <td className="py-3.5 font-medium text-slate-900 dark:text-white">
                          {d.store_name || 'Unassigned'}
                        </td>
                        <td className="py-3.5 text-xs font-mono text-slate-600 dark:text-slate-400">
                          {d.telegram_chat_id ? (
                            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">
                              {d.telegram_chat_id}
                            </code>
                          ) : (
                            <span className="text-slate-400">Not paired</span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditDeviceModal(d)}
                              title="Edit Device Details"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteDeviceModal(d)}
                              title="Unlink / Delete Device"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                        No soundbox devices found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* Tab: System & Audit Logs */}
      {adminTab === 'logs' && (
        <div className="space-y-4">
          
          {/* Logs Filter Sub-Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setLogTypeFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  logTypeFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{t('allLogs', 'All Logs')}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-bold">
                  {logs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLogTypeFilter('transactions')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  logTypeFilter === 'transactions'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{t('paymentLogs', 'Payment Transactions')}</span>
              </button>

              <button
                type="button"
                onClick={() => setLogTypeFilter('security')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  logTypeFilter === 'security'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t('securityAlerts', 'Security & Fraud Alerts')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchAllData}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{isKhmer ? 'ផ្ទុកទិន្នន័យឡើងវិញ' : 'Refresh Logs'}</span>
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Store & Soundbox</th>
                    <th className="py-3 px-4">Bank & TxID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payer / Sender</th>
                    <th className="py-3 px-4">Status / Action</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {logs.length > 0 ? (
                    logs.map((log, idx) => {
                      const isTx = log.log_category === 'TRANSACTION';

                      return (
                        <tr key={log.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          {/* Type Badge */}
                          <td className="py-3.5 px-4">
                            {isTx ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] uppercase border border-emerald-200/50 dark:border-emerald-800/50">
                                <Receipt className="w-3 h-3" />
                                Payment
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold text-[10px] uppercase border border-rose-200/50 dark:border-rose-800/50">
                                <ShieldAlert className="w-3 h-3" />
                                {log.alert_type || 'Alert'}
                              </span>
                            )}
                          </td>

                          {/* Timestamp */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                          </td>

                          {/* Store & Device */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {log.store_name || '—'}
                            </div>
                            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 mt-0.5">
                              <Volume2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{log.device_sn || '—'}</span>
                            </div>
                          </td>

                          {/* Bank & TxID */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {log.bank_name || 'Bank'}
                            </div>
                            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 mt-0.5">
                              <span>{log.txid ? log.txid.substring(0, 16) : '—'}</span>
                              {log.txid && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(log.txid);
                                    showToast('Transaction ID copied!', 'success');
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold">
                            {isTx ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {log.currency === 'KHR'
                                  ? `${Number(log.amount).toLocaleString()} ៛`
                                  : `$${Number(log.amount).toFixed(2)}`}
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400">
                                {log.amount ? `$${Number(log.amount).toFixed(2)}` : '—'}
                              </span>
                            )}
                          </td>

                          {/* Payer / Sender */}
                          <td className="py-3.5 px-4">
                            <div className="text-slate-700 dark:text-slate-300 font-medium">
                              {log.payer_name || log.sender_name || '—'}
                            </div>
                            {log.sender_user_id && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                ID: {log.sender_user_id}
                              </div>
                            )}
                          </td>

                          {/* Status / Action */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isTx ? (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 w-fit">
                                  <CheckCheck className="w-3 h-3" />
                                  {log.status || 'PROCESSED'}
                                </span>
                                {log.device_ack && (
                                  <span className="text-[9px] text-indigo-500 font-medium flex items-center gap-0.5">
                                    <Volume2 className="w-2.5 h-2.5" /> Soundbox Announced
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                <AlertTriangle className="w-3 h-3" />
                                {log.status || 'BLOCKED'}
                              </span>
                            )}
                          </td>

                          {/* View Raw Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLog(log);
                                setIsLogDetailOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition cursor-pointer"
                              title="View Raw Message & Audit Payload"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600 dark:text-slate-400">No logs found</p>
                        <p className="text-xs text-slate-400 mt-1">Transaction and security events will appear here in real time.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {logs.length > 0 ? (
              logs.map((log, idx) => {
                const isTx = log.log_category === 'TRANSACTION';

                return (
                  <div
                    key={log.id || idx}
                    onClick={() => {
                      setSelectedLog(log);
                      setIsLogDetailOpen(true);
                    }}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 cursor-pointer active:scale-[0.99] transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isTx ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase">
                            Payment
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] uppercase">
                            {log.alert_type || 'Alert'}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}
                        </span>
                      </div>
                      <span className="font-bold text-sm font-mono text-emerald-600 dark:text-emerald-400">
                        {log.currency === 'KHR'
                          ? `${Number(log.amount || 0).toLocaleString()} ៛`
                          : `$${Number(log.amount || 0).toFixed(2)}`}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <span>{log.store_name || 'Store'}</span>
                        <span className="text-slate-400 font-mono font-normal text-[11px]">{log.bank_name}</span>
                      </div>
                      <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-emerald-500" />
                        <span>{log.device_sn || '—'}</span>
                      </div>
                    </div>

                    {log.payer_name && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                        Payer: <span className="font-semibold text-slate-900 dark:text-white">{log.payer_name}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-sm">
                No logs recorded yet.
              </div>
            )}
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

      {/* Modal: Edit Soundbox Hardware */}
      <Modal isOpen={isEditDeviceOpen} onClose={() => setIsEditDeviceOpen(false)} title={`Edit Soundbox: ${selectedDevice?.device_sn || ''}`}>
        <form onSubmit={handleUpdateDevice} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Serial Number (SN) <span className="text-rose-500">*</span>
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
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Model</label>
              <input
                type="text"
                value={editDeviceModel}
                onChange={(e) => setEditDeviceModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={editDeviceStatus}
                onChange={(e) => setEditDeviceStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>

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
              Assign to Store
            </label>
            <select
              value={editDeviceMerchantId}
              onChange={(e) => setEditDeviceMerchantId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
            >
              <option value="">-- Unassigned (No Store) --</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.owner_phone})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditDeviceOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium"
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

    </div>
  );
}

