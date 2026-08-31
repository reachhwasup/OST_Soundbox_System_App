import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

import FieldQRScanner from '../components/FieldQRScanner';
import CambodiaLocationSelector from '../components/CambodiaLocationSelector';
import { findLocationNames, resolveStoreLocationCodes } from '../data/cambodiaLocations';
import jsQR from 'jsqr';

import { 
  Store, 
  MapPin, 
  Building, 
  Phone, 
  Plus, 
  Edit3, 
  Trash2,
  Volume2, 
  Volume1,
  VolumeX,
  Smartphone, 
  RefreshCw, 
  CheckCircle2, 
  DollarSign, 
  CreditCard,
  QrCode,
  Upload,
  AlertCircle,
  Layers,
  Settings,
  Unlink,
  Radio,
  Download,
  Search,
  Filter,
  TrendingUp,
  ShieldCheck,
  Zap,
  Check,
  Receipt,
  ExternalLink,
  Signal,
  BatteryCharging,
  Sliders,
  BellRing
} from 'lucide-react';

export default function UserDashboard() {
  const { user, refreshUser } = useAuth();
  const { t, isKhmer } = useLanguage();
  const { showToast } = useToast();

  // Multi-Store State
  const [stores, setStores] = useState([]);
  const [selectedStoreIndex, setSelectedStoreIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Store Modals
  const [isRegisterStoreOpen, setIsRegisterStoreOpen] = useState(false);
  const [isEditStoreOpen, setIsEditStoreOpen] = useState(false);
  const [isDeleteStoreOpen, setIsDeleteStoreOpen] = useState(false);

  // Device Modals
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isEditDeviceOpen, setIsEditDeviceOpen] = useState(false);
  const [isUnlinkDeviceOpen, setIsUnlinkDeviceOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Soundbox Test Voice & Volume Command State
  const [testingDeviceId, setTestingDeviceId] = useState(null);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [targetVolumeDevice, setTargetVolumeDevice] = useState(null);
  const [deviceVolume, setDeviceVolume] = useState(80);

  // Transaction Receipt / Slip Modal State
  const [selectedTxSlip, setSelectedTxSlip] = useState(null);
  const [isTxSlipOpen, setIsTxSlipOpen] = useState(false);

  // Transaction Filter & Search State
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [txCurrencyFilter, setTxCurrencyFilter] = useState('ALL');
  const [txBankFilter, setTxBankFilter] = useState('ALL');

  // Initial / New Store Form State
  const [storeName, setStoreName] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [villageId, setVillageId] = useState('');
  const [streetOrLandmark, setStreetOrLandmark] = useState('');
  const [savingStore, setSavingStore] = useState(false);

  // Edit Store Form State
  const [editName, setEditName] = useState('');
  const [editProvinceId, setEditProvinceId] = useState('');
  const [editDistrictId, setEditDistrictId] = useState('');
  const [editCommuneId, setEditCommuneId] = useState('');
  const [editVillageId, setEditVillageId] = useState('');
  const [editStreetOrLandmark, setEditStreetOrLandmark] = useState('');

  // Device Link Form State (New)
  const [deviceSn, setDeviceSn] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [savingDevice, setSavingDevice] = useState(false);
  
  // Field-specific Camera QR Scanner state for Link Modal
  const [activeCameraField, setActiveCameraField] = useState(null);
  const [scanFeedback, setScanFeedback] = useState({ field: '', message: '', isError: false });

  // Device Edit Form State
  const [editDeviceSn, setEditDeviceSn] = useState('');
  const [editTelegramChatId, setEditTelegramChatId] = useState('');
  const [editDeviceModel, setEditDeviceModel] = useState('Y6B');
  const [editDeviceMerchantId, setEditDeviceMerchantId] = useState('');
  const [editActiveCameraField, setEditActiveCameraField] = useState(null);
  const [editScanFeedback, setEditScanFeedback] = useState({ field: '', message: '', isError: false });

  // Refs for hidden file inputs
  const snFileInputRef = useRef(null);
  const telegramFileInputRef = useRef(null);
  const editSnFileInputRef = useRef(null);
  const editTelegramFileInputRef = useRef(null);

  // Fetch all user stores
  const fetchStoresData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/api/stores/my-stores');
      const storeList = res.data.stores || [];
      setStores(storeList);
      if (selectedStoreIndex >= storeList.length && storeList.length > 0) {
        setSelectedStoreIndex(0);
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Failed to load store information.';
      setError(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoresData();
  }, []);

  const activeStore = stores.length > 0 ? stores[selectedStoreIndex] || stores[0] : null;

  // Helper to compile formatted location string
  const compileLocation = (pId, dId, cId, vId, street) => {
    const names = findLocationNames(pId, dId, cId, vId);
    
    const locationStr = [names.villageName, names.communeName, names.districtName, names.provinceName]
      .filter(Boolean)
      .join(', ');
      
    const placeStr = street.trim() 
      ? street.trim() 
      : (names.villageName ? `${names.villageName}, ${names.communeName}` : (names.communeName || names.districtName));

    return { 
      location: locationStr, 
      place: placeStr,
      province: names.provinceName,
      district: names.districtName,
      commune: names.communeName,
      village: names.villageName,
      street: street.trim()
    };
  };

  const resetRegisterForm = () => {
    setStoreName('');
    setProvinceId('');
    setDistrictId('');
    setCommuneId('');
    setVillageId('');
    setStreetOrLandmark('');
  };

  // Handle Register Store
  const handleRegisterStore = async (e) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setError('Please enter a store name.');
      return;
    }
    if (!provinceId || !districtId || !communeId) {
      setError('Please select Province, District, and Commune/Sangkat from the dropdown list.');
      return;
    }

    setSavingStore(true);
    setError('');

    const locData = compileLocation(provinceId, districtId, communeId, villageId, streetOrLandmark);

    try {
      await api.post('/api/stores/register', {
        name: storeName.trim(),
        place: locData.place,
        location: locData.location,
        province: locData.province,
        district: locData.district,
        commune: locData.commune,
        village: locData.village,
        street: locData.street
      });
      const regMsg = `Store '${storeName.trim()}' registered successfully!`;
      showToast({
        type: 'success',
        title: 'Store Registered',
        message: regMsg,
        duration: 5000
      });
      resetRegisterForm();
      setIsRegisterStoreOpen(false);
      await fetchStoresData();
      await refreshUser();
      setSelectedStoreIndex(stores.length);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to register store.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Registration Failed',
        message: msg,
        duration: 5000
      });
    } finally {
      setSavingStore(false);
    }
  };

  // Handle Update Store
  const handleUpdateStore = async (e) => {
    e.preventDefault();
    if (!activeStore) return;
    if (!editName.trim()) {
      setError('Please enter a store name.');
      return;
    }

    setSavingStore(true);
    setError('');

    let locData = {};
    if (editProvinceId && editDistrictId && editCommuneId) {
      locData = compileLocation(editProvinceId, editDistrictId, editCommuneId, editVillageId, editStreetOrLandmark);
    }

    try {
      await api.put(`/api/stores/${activeStore.id}`, {
        name: editName.trim(),
        place: locData.place || activeStore.place,
        location: locData.location || activeStore.location,
        province: locData.province || activeStore.province,
        district: locData.district || activeStore.district,
        commune: locData.commune || activeStore.commune,
        village: locData.village || activeStore.village,
        street: locData.street !== undefined ? locData.street : activeStore.street
      });
      const updMsg = `Store '${editName.trim()}' updated successfully!`;
      showToast({
        type: 'update',
        title: 'Store Updated',
        message: updMsg,
        duration: 5000
      });
      setIsEditStoreOpen(false);
      await fetchStoresData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update store.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: msg,
        duration: 5000
      });
    } finally {
      setSavingStore(false);
    }
  };

  // Handle Delete Store
  const handleDeleteStore = async () => {
    if (!activeStore) return;
    setSavingStore(true);
    setError('');
    try {
      await api.delete(`/api/stores/${activeStore.id}`);
      setIsDeleteStoreOpen(false);
      const delMsg = `Store '${activeStore.name}' deleted.`;
      showToast({
        type: 'delete',
        title: 'Store Deleted',
        message: delMsg,
        duration: 5000
      });
      setSelectedStoreIndex(0);
      await fetchStoresData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete store.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
        duration: 5000
      });
    } finally {
      setSavingStore(false);
    }
  };

  // Handle Register Device
  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!activeStore) return;
    if (!deviceSn.trim()) {
      setError('Please enter device Serial Number (SN).');
      return;
    }

    setSavingDevice(true);
    setError('');

    try {
      await api.post('/api/devices/register', {
        merchant_id: activeStore.id,
        device_sn: deviceSn.trim(),
        telegram_chat_id: telegramChatId.trim() || null,
        device_model: 'Y6B'
      });
      const dvcMsg = `Soundbox '${deviceSn.trim()}' linked to '${activeStore.name}'!`;
      showToast({
        type: 'success',
        title: 'Soundbox Linked',
        message: dvcMsg,
        duration: 5000
      });
      setDeviceSn('');
      setTelegramChatId('');
      setActiveCameraField(null);
      setScanFeedback({ field: '', message: '', isError: false });
      setIsDeviceModalOpen(false);
      await fetchStoresData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to link device.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Link Failed',
        message: msg,
        duration: 5000
      });
    } finally {
      setSavingDevice(false);
    }
  };

  // Open Edit Device Modal
  const handleOpenEditDevice = (device) => {
    setSelectedDevice(device);
    setEditDeviceSn(device.device_sn || '');
    setEditTelegramChatId(device.telegram_chat_id || '');
    setEditDeviceModel(device.device_model || 'Y6B');
    setEditDeviceMerchantId(String(activeStore?.id || ''));
    setEditActiveCameraField(null);
    setEditScanFeedback({ field: '', message: '', isError: false });
    setIsEditDeviceOpen(true);
  };

  // Handle Update Device
  const handleUpdateDevice = async (e) => {
    e.preventDefault();
    if (!selectedDevice) return;
    if (!editDeviceSn.trim()) {
      setError('Please enter device Serial Number (SN).');
      return;
    }

    setSavingDevice(true);
    setError('');

    try {
      await api.put(`/api/devices/${selectedDevice.id}`, {
        device_sn: editDeviceSn.trim(),
        telegram_chat_id: editTelegramChatId.trim() || null,
        device_model: editDeviceModel.trim() || 'Y6B',
        merchant_id: editDeviceMerchantId ? parseInt(editDeviceMerchantId) : activeStore.id
      });
      const updDvcMsg = `Soundbox '${editDeviceSn.trim()}' updated successfully!`;
      showToast({
        type: 'update',
        title: 'Soundbox Updated',
        message: updDvcMsg,
        duration: 5000
      });
      setIsEditDeviceOpen(false);
      await fetchStoresData();
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
      setSavingDevice(false);
    }
  };

  // Open Unlink Confirmation Modal
  const handleOpenUnlinkDevice = (device) => {
    setSelectedDevice(device);
    setIsUnlinkDeviceOpen(true);
  };

  // Handle Unlink Device
  const handleUnlinkDevice = async () => {
    if (!selectedDevice) return;
    setSavingDevice(true);
    setError('');
    try {
      await api.post(`/api/devices/${selectedDevice.id}/unlink`);
      setIsUnlinkDeviceOpen(false);
      const unlkMsg = `Soundbox '${selectedDevice.device_sn}' unlinked from store.`;
      showToast({
        type: 'unlink',
        title: 'Device Unlinked',
        message: unlkMsg,
        duration: 5000
      });
      await fetchStoresData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to unlink device.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Unlink Failed',
        message: msg,
        duration: 5000
      });
    } finally {
      setSavingDevice(false);
    }
  };

  // Trigger Soundbox Test Voice Broadcast
  const handleTriggerTestVoice = async (device) => {
    if (!device) return;
    setTestingDeviceId(device.id);
    try {
      const res = await api.post(`/api/devices/${device.id}/command`, {
        command_type: 'VOICE_BROADCAST',
        amount: '1.00',
        currency: 'USD',
        volume: 80,
        custom_text: 'ABA Bank received $1.00'
      });
      showToast({
        type: 'success',
        title: 'Test Broadcast Sent',
        message: res.data.message || `Test announcement dispatched to ${device.device_sn}.`,
        duration: 5000
      });
      fetchStoresData(true);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to trigger test voice broadcast.';
      showToast({ type: 'error', title: 'Broadcast Failed', message: msg });
    } finally {
      setTestingDeviceId(null);
    }
  };

  // Open Volume Modal
  const handleOpenVolumeModal = (device) => {
    setTargetVolumeDevice(device);
    setDeviceVolume(80);
    setIsVolumeModalOpen(true);
  };

  // Submit Volume Adjustment
  const handleSaveVolume = async (e) => {
    e.preventDefault();
    if (!targetVolumeDevice) return;
    try {
      await api.post(`/api/devices/${targetVolumeDevice.id}/command`, {
        command_type: 'SET_VOLUME',
        volume: deviceVolume
      });
      setIsVolumeModalOpen(false);
      showToast({
        type: 'success',
        title: 'Volume Updated',
        message: `Volume for Soundbox ${targetVolumeDevice.device_sn} set to ${deviceVolume}%.`,
        duration: 5000
      });
      fetchStoresData(true);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update volume.';
      showToast({ type: 'error', title: 'Volume Failed', message: msg });
    }
  };

  // Export Transactions as CSV
  const handleExportCSV = () => {
    if (!activeStore || !activeStore.recent_transactions || activeStore.recent_transactions.length === 0) {
      showToast({ type: 'info', title: 'No Data', message: 'No transactions to export for this store.' });
      return;
    }
    const headers = ['Transaction ID', 'Bank Name', 'Amount', 'Currency', 'Customer / Payer', 'Soundbox SN', 'Status', 'Date Time'];
    const rows = activeStore.recent_transactions.map(tx => [
      tx.bank_tx_id || tx.id,
      tx.bank_name || 'Bank',
      tx.amount,
      tx.currency || 'USD',
      `"${(tx.payer_name || 'Customer').replace(/"/g, '""')}"`,
      tx.device_sn || '',
      tx.status || 'PROCESSED',
      tx.created_at ? new Date(tx.created_at).toLocaleString() : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeStore.name.replace(/\s+/g, '_')}_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({ type: 'success', title: 'Export Complete', message: 'Transactions CSV downloaded successfully.' });
  };

  // Image File QR Decoder handler for Link Modal
  const handleScanFile = (e, field) => {
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
          if (field === 'sn') {
            setDeviceSn(clean);
            setScanFeedback({ field: 'sn', message: `Scanned SN: ${clean}`, isError: false });
          } else {
            setTelegramChatId(clean);
            setScanFeedback({ field: 'telegram', message: `Scanned Code: ${clean}`, isError: false });
          }
        } else {
          setScanFeedback({ field, message: 'Could not detect QR code in selected image.', isError: true });
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Image File QR Decoder handler for Edit Modal
  const handleEditScanFile = (e, field) => {
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
          if (field === 'sn') {
            setEditDeviceSn(clean);
            setEditScanFeedback({ field: 'sn', message: `Scanned SN: ${clean}`, isError: false });
          } else {
            setEditTelegramChatId(clean);
            setEditScanFeedback({ field: 'telegram', message: `Scanned Code: ${clean}`, isError: false });
          }
        } else {
          setEditScanFeedback({ field, message: 'Could not detect QR code in selected image.', isError: true });
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Calculate Real-Time Store Financial Metrics
  const storeMetrics = useMemo(() => {
    if (!activeStore || !activeStore.recent_transactions) {
      return { totalUSD: 0, totalKHR: 0, txCount: 0, activeDevices: 0 };
    }
    let usd = 0;
    let khr = 0;
    activeStore.recent_transactions.forEach(tx => {
      if (String(tx.currency).toUpperCase() === 'KHR') {
        khr += Number(tx.amount || 0);
      } else {
        usd += Number(tx.amount || 0);
      }
    });
    return {
      totalUSD: usd,
      totalKHR: khr,
      txCount: activeStore.recent_transactions.length,
      activeDevices: activeStore.devices?.filter(d => String(d.status).toUpperCase() === 'ACTIVE' || String(d.status).toUpperCase() === 'ONLINE').length || 0
    };
  }, [activeStore]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    if (!activeStore || !activeStore.recent_transactions) return [];
    return activeStore.recent_transactions.filter(tx => {
      // Currency match
      if (txCurrencyFilter !== 'ALL' && String(tx.currency).toUpperCase() !== txCurrencyFilter) {
        return false;
      }
      // Bank match
      if (txBankFilter !== 'ALL' && !String(tx.bank_name || '').toLowerCase().includes(txBankFilter.toLowerCase())) {
        return false;
      }
      // Search match
      if (txSearchTerm.trim()) {
        const q = txSearchTerm.toLowerCase().trim();
        const payer = String(tx.payer_name || '').toLowerCase();
        const txId = String(tx.bank_tx_id || tx.id || '').toLowerCase();
        const bank = String(tx.bank_name || '').toLowerCase();
        const sn = String(tx.device_sn || '').toLowerCase();
        const amt = String(tx.amount || '');
        return payer.includes(q) || txId.includes(q) || bank.includes(q) || sn.includes(q) || amt.includes(q);
      }
      return true;
    });
  }, [activeStore, txCurrencyFilter, txBankFilter, txSearchTerm]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center mx-auto shadow-sm">
            <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t('loading', 'Loading your stores & soundbox status...')}
          </p>
          <p className="text-xs text-slate-400">Connecting to OST Soundbox Cloud</p>
        </div>
      </div>
    );
  }

  const hasAnyStore = stores.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6">
      
      {/* Case 1: USER HAS NOT REGISTERED ANY STORE YET */}
      {!hasAnyStore ? (
        <div className="max-w-3xl mx-auto py-4 sm:py-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2 border border-emerald-500/20 shadow-xs">
                <Store className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('registerYourStore', 'Register Your Store')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {t('registerStoreDesc', "Setup your store location and link your Y6B 4G Soundbox speaker to announce instant QR payments.")}
              </p>
            </div>

            <form onSubmit={handleRegisterStore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Store Name (ឈ្មោះហាង) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Store className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Brown Coffee BKK1"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-2xs"
                    required
                  />
                </div>
              </div>

              {/* Cascading Dropdown Selector */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <MapPin className="w-4 h-4" />
                  <span>Store Administrative Location (ជ្រើសរើសទីតាំងរដ្ឋបាល)</span>
                </div>
                <CambodiaLocationSelector
                  provinceId={provinceId}
                  setProvinceId={setProvinceId}
                  districtId={districtId}
                  setDistrictId={setDistrictId}
                  communeId={communeId}
                  setCommuneId={setCommuneId}
                  villageId={villageId}
                  setVillageId={setVillageId}
                  streetOrLandmark={streetOrLandmark}
                  setStreetOrLandmark={setStreetOrLandmark}
                  required={true}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingStore}
                  className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {savingStore ? (
                    <span>Registering store...</span>
                  ) : (
                    <>
                      <Store className="w-4 h-4" />
                      Register & Activate Store
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Case 2: USER HAS REGISTERED 1 OR MORE STORES */
        <div className="space-y-5 sm:space-y-6">
          
          {/* Multi-Store Navigation / Switcher Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Store Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1 sm:pb-0">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 shrink-0 pr-1">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>{t('storeBranches', 'Stores')}:</span>
                </div>

                {stores.map((s, idx) => {
                  const isSelected = selectedStoreIndex === idx;
                  const devCount = s.devices?.length || 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStoreIndex(idx);
                        setEditName(s.name);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 shrink-0 border cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>{s.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {devCount} {devCount === 1 ? 'Speaker' : 'Speakers'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Add Another Store Button */}
              <button
                onClick={() => {
                  resetRegisterForm();
                  setIsRegisterStoreOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800 shrink-0 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addStore', '+ Add New Store / Branch')}</span>
              </button>
            </div>
          </div>

          {/* Store Overview Banner & Touch Actions */}
          {activeStore && (
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/90 rounded-3xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <Store className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {activeStore.name}
                      </h1>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {t('activeStore', 'Active Store')}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{activeStore.location || activeStore.place || 'Phnom Penh, Cambodia'}</span>
                      </div>
                      {activeStore.place && activeStore.place !== activeStore.location && (
                        <div className="flex items-center gap-1.5">
                          <Building className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{activeStore.place}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{activeStore.owner_phone || user?.phone_number}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Touch Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-200/80 dark:border-slate-800">
                  <button
                    onClick={() => {
                      if (!activeStore) return;
                      setEditName(activeStore.name || '');
                      const resolved = resolveStoreLocationCodes(activeStore);
                      setEditProvinceId(resolved.provinceId);
                      setEditDistrictId(resolved.districtId);
                      setEditCommuneId(resolved.communeId);
                      setEditVillageId(resolved.villageId);
                      setEditStreetOrLandmark(resolved.streetOrLandmark);
                      setIsEditStoreOpen(true);
                    }}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    <span>{t('editStore', 'Edit Store')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveCameraField(null);
                      setScanFeedback({ field: '', message: '', isError: false });
                      setIsDeviceModalOpen(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('linkSoundbox', '+ Link Soundbox')}</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    title="Export Store Statement CSV"
                    className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer shadow-2xs"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {stores.length > 1 && (
                    <button
                      onClick={() => setIsDeleteStoreOpen(true)}
                      title={t('deleteStore', 'Delete this store')}
                      className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-xl transition shrink-0 border border-rose-200 dark:border-rose-800 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* 4 Financial & Operational KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {/* Card 1: Today's Revenue USD */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sales (USD)
                </span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                ${storeMetrics.totalUSD.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span>Live store revenue</span>
              </p>
            </div>

            {/* Card 2: Today's Revenue KHR */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sales (KHR)
                </span>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <span className="font-bold text-xs">៛</span>
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                ៛{storeMetrics.totalKHR.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                <span>Bakong QR payments</span>
              </p>
            </div>

            {/* Card 3: Total Completed Transactions */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Transactions
                </span>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {storeMetrics.txCount} <span className="text-xs font-normal text-slate-400">payments</span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                <span>100% voice broadcasted</span>
              </p>
            </div>

            {/* Card 4: Connected Soundbox Fleet */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Soundbox Fleet
                </span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Volume2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {activeStore?.devices?.length || 0} <span className="text-xs font-normal text-slate-400">linked</span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{storeMetrics.activeDevices} Online & ready</span>
              </p>
            </div>
          </div>

          {/* Grid: Connected Soundbox Speakers & Live Payment Feed */}
          {activeStore && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Left Column: Connected Soundbox Devices (1 Col) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-emerald-600" />
                    <span>{t('connectedSoundboxes', 'Soundbox Speakers')}</span>
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {activeStore.devices?.length || 0} {t('devices', 'Units')}
                  </span>
                </div>

                {activeStore.devices && activeStore.devices.length > 0 ? (
                  <div className="space-y-3.5">
                    {activeStore.devices.map((device) => {
                      const isOnline = String(device.status).toUpperCase() === 'ACTIVE' || String(device.status).toUpperCase() === 'ONLINE';
                      const isTesting = testingDeviceId === device.id;

                      return (
                        <div 
                          key={device.id} 
                          className="p-4 bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-800/80 dark:to-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 shadow-2xs hover:border-emerald-400/60 transition"
                        >
                          {/* Top Row: SN & Status Badge */}
                          <div className="flex items-center justify-between">
                            <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-emerald-600" />
                              <span>{device.device_sn}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              isOnline 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
                              {device.status || 'ACTIVE'}
                            </span>
                          </div>
                          
                          {/* Hardware Telemetry Specs */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Signal className="w-3.5 h-3.5 text-blue-500" />
                              <span className="font-medium text-slate-800 dark:text-slate-200">4G LTE Cellular</span>
                            </div>
                            <div className="flex items-center gap-1.5 justify-end">
                              <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">95% (AC)</span>
                            </div>
                            <div className="col-span-2 flex items-start justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                              <span className="text-slate-400">Telegram Groups:</span>
                              <div className="flex flex-wrap justify-end gap-1">
                                {device.telegram_chat_id ? (
                                  device.telegram_chat_id.split(',').map((id, idx) => (
                                    <code key={idx} className="bg-slate-100 dark:bg-slate-700/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-800 dark:text-slate-200">
                                      {id.trim()}
                                    </code>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic">Not paired</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Interactive Merchant Controls */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {/* Test Broadcast Button */}
                            <button
                              type="button"
                              onClick={() => handleTriggerTestVoice(device)}
                              disabled={isTesting}
                              title="Send instant voice announcement test"
                              className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <BellRing className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                              <span>{isTesting ? 'Playing...' : 'Test Voice'}</span>
                            </button>

                            {/* Volume Adjustment Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenVolumeModal(device)}
                              title="Adjust speaker volume"
                              className="py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                              <span>Volume</span>
                            </button>

                            {/* Edit Pairing */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditDevice(device)}
                              title="Edit device model and telegram chat IDs"
                              className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>

                            {/* Unlink */}
                            <button
                              type="button"
                              onClick={() => handleOpenUnlinkDevice(device)}
                              title="Unlink soundbox from this store"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl transition cursor-pointer"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                      <Volume2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('noSoundboxAtStore', 'No Soundbox at this Store')}</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">{t('noSoundboxSub', 'Link a Y6B 4G speaker to announce live customer payments out loud.')}</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveCameraField(null);
                        setScanFeedback({ field: '', message: '', isError: false });
                        setIsDeviceModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('linkSoundboxDevice', 'Link Soundbox Device')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Live Payments Feed & Transaction Analytics (2 Cols) */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                      <span>{t('livePayments', 'Live Payments & Broadcasts')}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Real-time payment announcements received from ABA, Wing, ACLEDA & Bakong
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchStoresData(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                      title={t('refresh', 'Refresh live payments')}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync</span>
                    </button>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={txSearchTerm}
                      onChange={(e) => setTxSearchTerm(e.target.value)}
                      placeholder="Search customer, Tx ID, or amount..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Currency Selector */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {['ALL', 'USD', 'KHR'].map((cur) => (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => setTxCurrencyFilter(cur)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                          txCurrencyFilter === cur
                            ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {cur === 'ALL' ? 'All' : cur === 'USD' ? '$ USD' : '៛ KHR'}
                      </button>
                    ))}
                  </div>

                  {/* Bank Filter */}
                  <select
                    value={txBankFilter}
                    onChange={(e) => setTxBankFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">All Banks</option>
                    <option value="ABA">ABA Bank</option>
                    <option value="ACLEDA">ACLEDA Bank</option>
                    <option value="Canadia">Canadia Bank</option>
                    <option value="Wing">Wing Bank</option>
                    <option value="Bakong">Bakong QR</option>
                  </select>
                </div>

                {/* Live Transactions List */}
                {filteredTransactions.length > 0 ? (
                  <>
                    {/* Mobile Feed Cards */}
                    <div className="sm:hidden space-y-2.5">
                      {filteredTransactions.map((tx) => (
                        <div 
                          key={tx.id}
                          onClick={() => {
                            setSelectedTxSlip(tx);
                            setIsTxSlipOpen(true);
                          }}
                          className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/60 rounded-2xl flex items-center justify-between cursor-pointer hover:border-emerald-400/60 active:scale-[0.99] transition shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-md text-[10px] font-bold">
                                {tx.bank_name || 'Bakong'}
                              </span>
                              <span>{tx.payer_name || t('customer', 'Customer')}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                              <span>SN: {tx.device_sn}</span>
                              <span>•</span>
                              <span>{tx.created_at ? new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </div>
                          </div>

                          <div className="text-right space-y-0.5">
                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                              +{tx.currency === 'USD' ? `$${Number(tx.amount).toFixed(2)}` : `៛${Number(tx.amount).toLocaleString()}`}
                            </div>
                            <span className="text-[10px] text-emerald-700 bg-emerald-100/60 dark:bg-emerald-950 px-1.5 py-0.5 rounded font-bold uppercase">
                              {tx.status || 'VERIFIED'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                      <table className="w-full text-left text-sm min-w-[540px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-4">{t('bank', 'Bank / Source')}</th>
                            <th className="py-3 px-4">{t('amount', 'Amount Received')}</th>
                            <th className="py-3 px-4">{t('payer', 'Customer / Payer')}</th>
                            <th className="py-3 px-4">{t('txId', 'Bank Reference ID')}</th>
                            <th className="py-3 px-4">{t('device', 'Soundbox SN')}</th>
                            <th className="py-3 px-4 text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {filteredTransactions.map((tx) => (
                            <tr 
                              key={tx.id} 
                              onClick={() => {
                                setSelectedTxSlip(tx);
                                setIsTxSlipOpen(true);
                              }}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                            >
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>{tx.bank_name || 'Bank'}</span>
                              </td>
                              <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                                +{tx.currency === 'USD' ? `$${Number(tx.amount).toFixed(2)}` : `៛${Number(tx.amount).toLocaleString()}`}
                              </td>
                              <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                                {tx.payer_name || t('customer', 'Customer')}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-400">
                                {tx.bank_tx_id || tx.id}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-500">
                                {tx.device_sn}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline flex items-center justify-end gap-1">
                                  <span>View Slip</span>
                                  <ExternalLink className="w-3 h-3" />
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {txSearchTerm ? 'No transactions matched your search' : `No Transactions Yet for ${activeStore.name}`}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {txSearchTerm ? 'Try searching a different bank, amount, or name.' : 'When customers scan and pay via Bakong/ABA, payments will stream here and announce automatically.'}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* Transaction Receipt / Payment Slip Modal */}
      {selectedTxSlip && (
        <Modal
          isOpen={isTxSlipOpen}
          onClose={() => setIsTxSlipOpen(false)}
          title="Payment Verification Slip"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-center">
            {/* Header Bank Badge */}
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Received</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                +{selectedTxSlip.currency === 'USD' ? `$${Number(selectedTxSlip.amount).toFixed(2)}` : `៛${Number(selectedTxSlip.amount).toLocaleString()}`}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Verified via {selectedTxSlip.bank_name || 'Bank System'}
              </p>
            </div>

            {/* Slip Details Table */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payer / Customer:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTxSlip.payer_name || 'Customer'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Bank Reference ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTxSlip.bank_tx_id || selectedTxSlip.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Soundbox Speaker:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedTxSlip.device_sn}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Store / Branch:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{activeStore?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedTxSlip.created_at ? new Date(selectedTxSlip.created_at).toLocaleString() : 'Just now'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTxSlipOpen(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              Close Receipt
            </button>
          </div>
        </Modal>
      )}

      {/* Volume Adjustment Modal */}
      {targetVolumeDevice && (
        <Modal
          isOpen={isVolumeModalOpen}
          onClose={() => setIsVolumeModalOpen(false)}
          title={`Adjust Volume: Soundbox ${targetVolumeDevice.device_sn}`}
          maxWidth="max-w-sm"
        >
          <form onSubmit={handleSaveVolume} className="space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto mb-2">
                <Volume2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Speaker Audio Level</h4>
              <p className="text-xs text-slate-400">Control speaker volume for busy market noise</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-500">Current Level:</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-mono">{deviceVolume}%</span>
              </div>
              
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={deviceVolume}
                onChange={(e) => setDeviceVolume(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />

              {/* Quick Presets */}
              <div className="grid grid-cols-3 gap-2">
                {[40, 75, 100].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDeviceVolume(lvl)}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      deviceVolume === lvl
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {lvl === 40 ? 'Quiet' : lvl === 75 ? 'Standard' : 'Max (100%)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsVolumeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Apply Volume
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add New Store Modal with Cascading Dropdowns */}
      <Modal 
        isOpen={isRegisterStoreOpen} 
        onClose={() => setIsRegisterStoreOpen(false)} 
        title="Register a New Store / Branch"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleRegisterStore} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Store Name (ឈ្មោះហាង) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Sokha Coffee Riverside"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>Select Location (ជ្រើសរើសទីតាំងរដ្ឋបាល)</span>
            </div>
            <CambodiaLocationSelector
              provinceId={provinceId}
              setProvinceId={setProvinceId}
              districtId={districtId}
              setDistrictId={setDistrictId}
              communeId={communeId}
              setCommuneId={setCommuneId}
              villageId={villageId}
              setVillageId={setVillageId}
              streetOrLandmark={streetOrLandmark}
              setStreetOrLandmark={setStreetOrLandmark}
              required={true}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsRegisterStoreOpen(false)}
              className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingStore}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs cursor-pointer"
            >
              {savingStore ? 'Registering...' : 'Register Store'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Store Modal */}
      <Modal 
        isOpen={isEditStoreOpen} 
        onClose={() => setIsEditStoreOpen(false)} 
        title={`Edit Store: ${activeStore?.name || ''}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleUpdateStore} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Store Name (ឈ្មោះហាង)
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{isKhmer ? 'ទីតាំងហាង (ជ្រើសរើសដើម្បីកែប្រែ)' : 'Store Location'}</span>
              </div>
              <span className="text-[11px] text-slate-400 truncate max-w-xs">{activeStore?.location}</span>
            </div>
            
            <CambodiaLocationSelector
              provinceId={editProvinceId}
              setProvinceId={setEditProvinceId}
              districtId={editDistrictId}
              setDistrictId={setEditDistrictId}
              communeId={editCommuneId}
              setCommuneId={setEditCommuneId}
              villageId={editVillageId}
              setVillageId={setEditVillageId}
              streetOrLandmark={editStreetOrLandmark}
              setStreetOrLandmark={setEditStreetOrLandmark}
              required={false}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditStoreOpen(false)}
              className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium cursor-pointer"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={savingStore}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs cursor-pointer"
            >
              {savingStore ? t('saving', 'Saving...') : t('save', 'Save Changes')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Store Confirmation Modal */}
      <Modal isOpen={isDeleteStoreOpen} onClose={() => setIsDeleteStoreOpen(false)} title={t('confirmDeleteStoreTitle', 'Confirm Delete Store')}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('confirmDeleteStoreDesc1', 'Are you sure you want to delete store')} <strong>{activeStore?.name}</strong>? {t('confirmDeleteStoreDesc2', 'Linked devices will be unassigned.')}
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsDeleteStoreOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium cursor-pointer"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeleteStore}
              disabled={savingStore}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-xs cursor-pointer"
            >
              {savingStore ? t('deleting', 'Deleting...') : t('confirmDelete', 'Confirm Delete')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Link New Device Modal with Field-Specific QR Scanner & Upload */}
      <Modal 
        isOpen={isDeviceModalOpen} 
        onClose={() => {
          setActiveCameraField(null);
          setIsDeviceModalOpen(false);
        }} 
        title={`${t('linkSoundboxTo', 'Link Soundbox to')} '${activeStore?.name || 'Store'}'`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {activeCameraField && (
            <FieldQRScanner 
              targetName={activeCameraField === 'sn' ? 'Device Serial Number (SN)' : 'Telegram Chat ID (Code)'}
              onScanSuccess={(decodedText) => {
                const text = decodedText.trim();
                if (activeCameraField === 'sn') {
                  setDeviceSn(text);
                  setScanFeedback({ field: 'sn', message: `Scanned SN: ${text}`, isError: false });
                } else {
                  setTelegramChatId(text);
                  setScanFeedback({ field: 'telegram', message: `Scanned Code: ${text}`, isError: false });
                }
                setActiveCameraField(null);
              }}
              onClose={() => setActiveCameraField(null)}
            />
          )}

          <form onSubmit={handleRegisterDevice} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('deviceSn', 'Device Serial Number (SN)')} <span className="text-rose-500">*</span>
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  value={deviceSn}
                  onChange={(e) => setDeviceSn(e.target.value)}
                  placeholder={t('deviceSnPlaceholder', 'e.g. Y6B2026081501')}
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setActiveCameraField(activeCameraField === 'sn' ? null : 'sn')}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center transition ${
                    activeCameraField === 'sn' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                  }`}
                  title={t('scanWithCamera', 'Scan with Camera')}
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => snFileInputRef.current?.click()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 py-1 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t('uploadQrImage', 'Upload Soundbox QR Image')}
                </button>
                <input
                  ref={snFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleScanFile(e, 'sn')}
                  className="hidden"
                />
              </div>

              {scanFeedback.field === 'sn' && (
                <div className={`mt-1.5 text-xs flex items-center gap-1 ${
                  scanFeedback.isError ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400 font-medium'
                }`}>
                  {scanFeedback.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{scanFeedback.message}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('telegramChatId', 'Telegram Verification Code (Chat ID)')}
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. -5394848588 or -5394848588, -5467765507"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setActiveCameraField(activeCameraField === 'telegram' ? null : 'telegram')}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center transition ${
                    activeCameraField === 'telegram' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                  }`}
                  title={t('scanWithCamera', 'Scan with Camera')}
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                💡 {t('multiGroupHint', 'Tip: You can add multiple Telegram codes separated by commas (e.g. for ABA + Wing groups).')}
              </p>

              <div className="mt-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => telegramFileInputRef.current?.click()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 py-1 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t('uploadQrImage', 'Upload Telegram QR Image')}
                </button>
                <input
                  ref={telegramFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleScanFile(e, 'telegram')}
                  className="hidden"
                />
              </div>

              {scanFeedback.field === 'telegram' && (
                <div className={`mt-1.5 text-xs flex items-center gap-1 ${
                  scanFeedback.isError ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400 font-medium'
                }`}>
                  {scanFeedback.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{scanFeedback.message}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveCameraField(null);
                  setIsDeviceModalOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium cursor-pointer"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={savingDevice}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs cursor-pointer"
              >
                {savingDevice ? t('saving', 'Linking...') : t('linkSoundbox', 'Link Soundbox')}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Soundbox Modal */}
      <Modal 
        isOpen={isEditDeviceOpen} 
        onClose={() => {
          setEditActiveCameraField(null);
          setIsEditDeviceOpen(false);
        }} 
        title={`${t('updateSoundboxTitle', 'Update Soundbox')}: ${selectedDevice?.device_sn || ''}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {editActiveCameraField && (
            <FieldQRScanner 
              targetName={editActiveCameraField === 'sn' ? t('deviceSn', 'Device Serial Number (SN)') : t('telegramChatId', 'Telegram Chat ID (Code)')}
              onScanSuccess={(decodedText) => {
                const text = decodedText.trim();
                if (editActiveCameraField === 'sn') {
                  setEditDeviceSn(text);
                  setEditScanFeedback({ field: 'sn', message: `Scanned SN: ${text}`, isError: false });
                } else {
                  setEditTelegramChatId(text);
                  setEditScanFeedback({ field: 'telegram', message: `Scanned Code: ${text}`, isError: false });
                }
                setEditActiveCameraField(null);
              }}
              onClose={() => setEditActiveCameraField(null)}
            />
          )}

          <form onSubmit={handleUpdateDevice} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('deviceSn', 'Device Serial Number (SN)')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editDeviceSn}
                  onChange={(e) => setEditDeviceSn(e.target.value)}
                  placeholder="e.g. Y6B2026081501"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setEditActiveCameraField(editActiveCameraField === 'sn' ? null : 'sn')}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center transition ${
                    editActiveCameraField === 'sn' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                  }`}
                  title={t('scanSoundboxQrCamera', 'Scan Soundbox QR via Camera')}
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => editSnFileInputRef.current?.click()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 py-1 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t('uploadSoundboxQr', 'Upload Soundbox QR Image')}
                </button>
                <input
                  ref={editSnFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleEditScanFile(e, 'sn')}
                  className="hidden"
                />
              </div>

              {editScanFeedback.field === 'sn' && (
                <div className={`mt-1.5 text-xs flex items-center gap-1 ${
                  editScanFeedback.isError ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400 font-medium'
                }`}>
                  {editScanFeedback.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{editScanFeedback.message}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('telegramChatId', 'Telegram Verification Code (Chat ID)')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editTelegramChatId}
                  onChange={(e) => setEditTelegramChatId(e.target.value)}
                  placeholder="e.g. -5394848588 or -5394848588, -5467765507"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setEditActiveCameraField(editActiveCameraField === 'telegram' ? null : 'telegram')}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center transition ${
                    editActiveCameraField === 'telegram' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
                  }`}
                  title={t('scanTelegramQrCamera', 'Scan Telegram QR via Camera')}
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => editTelegramFileInputRef.current?.click()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 py-1 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t('uploadTelegramQr', 'Upload Telegram QR Image')}
                </button>
                <input
                  ref={editTelegramFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleEditScanFile(e, 'telegram')}
                  className="hidden"
                />
              </div>

              {editScanFeedback.field === 'telegram' && (
                <div className={`mt-1.5 text-xs flex items-center gap-1 ${
                  editScanFeedback.isError ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400 font-medium'
                }`}>
                  {editScanFeedback.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{editScanFeedback.message}</span>
                </div>
              )}
            </div>

            {stores.length > 1 && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  {t('targetStore', 'Target Store / Branch')}
                </label>
                <select
                  value={editDeviceMerchantId}
                  onChange={(e) => setEditDeviceMerchantId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location || s.place || 'Main'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('soundboxModel', 'Soundbox Model')}
              </label>
              <input
                type="text"
                value={editDeviceModel}
                onChange={(e) => setEditDeviceModel(e.target.value)}
                placeholder="e.g. Y6B"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEditActiveCameraField(null);
                  setIsEditDeviceOpen(false);
                }}
                className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium cursor-pointer"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={savingDevice}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs cursor-pointer"
              >
                {savingDevice ? t('updating', 'Updating...') : t('saveUpdates', 'Save Updates')}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Unlink Soundbox Confirmation Modal */}
      <Modal 
        isOpen={isUnlinkDeviceOpen} 
        onClose={() => setIsUnlinkDeviceOpen(false)} 
        title={`${t('unlinkSoundbox', 'Unlink Soundbox')}: ${selectedDevice?.device_sn || ''}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs sm:text-sm text-rose-800 dark:text-rose-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{t('confirmUnlinkSoundboxTitle', 'Are you sure you want to unlink this Soundbox?')}</span>
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              {t('confirmUnlinkSoundboxDesc1', 'Device')} <strong>{selectedDevice?.device_sn}</strong> {t('confirmUnlinkSoundboxDesc2', 'will be disconnected from store')} <strong>{activeStore?.name}</strong>. {t('confirmUnlinkSoundboxDesc3', 'It will stop broadcasting payments until linked again.')}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsUnlinkDeviceOpen(false)}
              className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium cursor-pointer"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleUnlinkDevice}
              disabled={savingDevice}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Unlink className="w-4 h-4" />
              <span>{savingDevice ? t('unlinking', 'Unlinking...') : t('confirmUnlink', 'Confirm Unlink')}</span>
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
