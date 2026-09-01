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
  BellRing,
  RotateCcw,
  Calendar,
  ChevronRight,
  Clock,
  Info,
  Square,
  CheckSquare
} from 'lucide-react';

export default function UserDashboard() {
  const { user, refreshUser } = useAuth();
  const { t, isKhmer } = useLanguage();
  const { showToast } = useToast();

  // Active Merchant Navigation Tab ('stores' | 'devices' | 'transactions')
  const [merchantTab, setMerchantTab] = useState(() => localStorage.getItem('soundbox_merchant_tab') || 'stores');

  useEffect(() => {
    const handleTabSync = (e) => {
      if (e.detail) {
        setMerchantTab(e.detail);
      }
    };
    window.addEventListener('soundbox_merchant_tab_change', handleTabSync);
    return () => window.removeEventListener('soundbox_merchant_tab_change', handleTabSync);
  }, []);

  const changeTab = (tab) => {
    setMerchantTab(tab);
    localStorage.setItem('soundbox_merchant_tab', tab);
    window.dispatchEvent(new CustomEvent('soundbox_merchant_tab_change', { detail: tab }));
  };

  // Multi-Store State
  const [stores, setStores] = useState([]);
  const [selectedStoreIndex, setSelectedStoreIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Table Selection States
  const [selectedStoreIds, setSelectedStoreIds] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [selectedTxIds, setSelectedTxIds] = useState([]);

  const toggleSelectAllStores = () => {
    if (selectedStoreIds.length === stores.length && stores.length > 0) {
      setSelectedStoreIds([]);
    } else {
      setSelectedStoreIds(stores.map(s => s.id));
    }
  };
  const toggleStoreSelection = (id) => {
    setSelectedStoreIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAllDevices = () => {
    if (selectedDeviceIds.length === filteredDevices.length && filteredDevices.length > 0) {
      setSelectedDeviceIds([]);
    } else {
      setSelectedDeviceIds(filteredDevices.map(d => d.id));
    }
  };
  const toggleDeviceSelection = (id) => {
    setSelectedDeviceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAllTxs = () => {
    if (selectedTxIds.length === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(filteredTransactions.map(tx => tx.id));
    }
  };
  const toggleTxSelection = (id) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

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
  const [rebootingDeviceId, setRebootingDeviceId] = useState(null);
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
  const [txStoreFilter, setTxStoreFilter] = useState('ALL');
  const [txDateRangeFilter, setTxDateRangeFilter] = useState('ALL');

  // Device Filter & Search State
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
  const [deviceStoreFilter, setDeviceStoreFilter] = useState('ALL');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('ALL');

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
  const [targetStoreIdForNewDevice, setTargetStoreIdForNewDevice] = useState('');
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

  // Flatten all devices across all user stores
  const allUserDevices = useMemo(() => {
    const list = [];
    stores.forEach(s => {
      (s.devices || []).forEach(d => {
        list.push({ ...d, storeName: s.name, storeId: s.id, storeLocation: s.location || s.place });
      });
    });
    return list;
  }, [stores]);

  // Filtered devices based on search, store, and status
  const filteredDevices = useMemo(() => {
    return allUserDevices.filter(d => {
      if (deviceStoreFilter !== 'ALL' && String(d.storeId) !== String(deviceStoreFilter)) {
        return false;
      }
      if (deviceStatusFilter !== 'ALL') {
        const s = String(d.status || 'ACTIVE').toUpperCase();
        if (deviceStatusFilter === 'ACTIVE' && s !== 'ACTIVE' && s !== 'ONLINE') return false;
        if (deviceStatusFilter === 'OFFLINE' && s !== 'OFFLINE') return false;
        if (deviceStatusFilter === 'IN_STOCK' && s !== 'IN_STOCK') return false;
      }
      if (deviceSearchTerm.trim()) {
        const q = deviceSearchTerm.toLowerCase().trim();
        const sn = String(d.device_sn || '').toLowerCase();
        const model = String(d.device_model || '').toLowerCase();
        const store = String(d.storeName || '').toLowerCase();
        const tg = String(d.telegram_chat_id || '').toLowerCase();
        return sn.includes(q) || model.includes(q) || store.includes(q) || tg.includes(q);
      }
      return true;
    });
  }, [allUserDevices, deviceStoreFilter, deviceStatusFilter, deviceSearchTerm]);

  // Flatten all transactions across all user stores
  const allUserTransactions = useMemo(() => {
    const list = [];
    stores.forEach(s => {
      (s.recent_transactions || []).forEach(tx => {
        list.push({ ...tx, storeName: s.name, storeId: s.id });
      });
    });
    // Sort descending by created_at
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return list;
  }, [stores]);

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

    // Enforce business rule: must unlink all devices before updating store
    if (activeStore.devices && activeStore.devices.length > 0) {
      const msg = `Cannot update store while ${activeStore.devices.length} Soundbox device(s) are linked. Please unlink all devices first.`;
      setError(msg);
      showToast({
        type: 'error',
        title: 'Unlink Devices Required',
        message: msg,
        duration: 6000
      });
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
    const targetStore = targetStoreIdForNewDevice ? stores.find(s => String(s.id) === String(targetStoreIdForNewDevice)) : activeStore;
    if (!targetStore) return;
    if (!deviceSn.trim()) {
      setError('Please enter device Serial Number (SN).');
      return;
    }

    setSavingDevice(true);
    setError('');

    try {
      await api.post('/api/devices/register', {
        merchant_id: targetStore.id,
        device_sn: deviceSn.trim(),
        telegram_chat_id: telegramChatId.trim() || null,
        device_model: 'Y6B'
      });
      const dvcMsg = `Soundbox '${deviceSn.trim()}' linked to '${targetStore.name}'!`;
      showToast({
        type: 'success',
        title: 'Soundbox Linked',
        message: dvcMsg,
        duration: 5000
      });
      setDeviceSn('');
      setTelegramChatId('');
      setTargetStoreIdForNewDevice('');
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
    setEditDeviceMerchantId(String(device.storeId || activeStore?.id || ''));
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

  // Trigger Soundbox Reboot Command
  const handleTriggerReboot = async (device) => {
    if (!device) return;
    setRebootingDeviceId(device.id);
    try {
      const res = await api.post(`/api/devices/${device.id}/command`, {
        command_type: 'REBOOT'
      });
      showToast({
        type: 'success',
        title: 'Reboot Dispatched',
        message: `Restart command sent to Soundbox ${device.device_sn}.`,
        duration: 5000
      });
      fetchStoresData(true);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to reboot soundbox.';
      showToast({ type: 'error', title: 'Reboot Failed', message: msg });
    } finally {
      setRebootingDeviceId(null);
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
    const listToExport = merchantTab === 'transactions' ? filteredTransactions : (activeStore?.recent_transactions || []);
    if (!listToExport || listToExport.length === 0) {
      showToast({ type: 'info', title: 'No Data', message: 'No transactions to export.' });
      return;
    }
    const headers = ['Transaction ID', 'Bank Name', 'Amount', 'Currency', 'Customer / Payer', 'Soundbox SN', 'Store / Branch', 'Status', 'Date Time'];
    const rows = listToExport.map(tx => [
      tx.bank_tx_id || tx.id,
      tx.bank_name || 'Bank',
      tx.amount,
      tx.currency || 'USD',
      `"${(tx.payer_name || 'Customer').replace(/"/g, '""')}"`,
      tx.device_sn || '',
      `"${(tx.storeName || activeStore?.name || '').replace(/"/g, '""')}"`,
      tx.status || 'PROCESSED',
      tx.created_at ? new Date(tx.created_at).toLocaleString() : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OST_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
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

  // Calculate Real-Time Store Financial Metrics for Overview
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

  // Filtered Transactions for History Tab & Store Feed
  const filteredTransactions = useMemo(() => {
    const sourceList = merchantTab === 'transactions' ? allUserTransactions : (activeStore?.recent_transactions || []);
    return sourceList.filter(tx => {
      // Store filter (for transactions tab)
      if (merchantTab === 'transactions' && txStoreFilter !== 'ALL' && String(tx.storeId) !== String(txStoreFilter)) {
        return false;
      }
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
        const store = String(tx.storeName || '').toLowerCase();
        return payer.includes(q) || txId.includes(q) || bank.includes(q) || sn.includes(q) || amt.includes(q) || store.includes(q);
      }
      return true;
    });
  }, [merchantTab, allUserTransactions, activeStore, txStoreFilter, txCurrencyFilter, txBankFilter, txSearchTerm]);

  // Overall Financial Aggregation for Transaction History Tab
  const totalHistoryMetrics = useMemo(() => {
    let usd = 0;
    let khr = 0;
    filteredTransactions.forEach(tx => {
      if (String(tx.currency).toUpperCase() === 'KHR') {
        khr += Number(tx.amount || 0);
      } else {
        usd += Number(tx.amount || 0);
      }
    });
    return {
      usd,
      khr,
      count: filteredTransactions.length,
      avgUSD: filteredTransactions.length ? usd / filteredTransactions.length : 0
    };
  }, [filteredTransactions]);

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
        /* Case 2: MERCHANT IS AUTHENTICATED WITH STORES */
        <div className="space-y-5 sm:space-y-6">

          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* TAB 1: STORES & BRANCHES DIRECTORY TABLE                 */}
          {/* ======================================================== */}
          {merchantTab === 'stores' && (
            <div className="space-y-5 sm:space-y-6">

              {/* All Store Branches Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Store className="w-5 h-5 text-emerald-600" />
                      <span>{isKhmer ? 'បញ្ជីសាខាហាងទាំងអស់' : 'Store Branches & Locations Directory'}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Manage all your merchant store branches, operational addresses, and contact phone numbers.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetRegisterForm();
                        setIsRegisterStoreOpen(true);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isKhmer ? 'បន្ថែមសាខា' : 'Add Branch'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fetchStoresData(true)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
                      title="Refresh Store List"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-800/40">
                        <th className="py-3 px-3.5 w-10 text-center rounded-l-xl">
                          <button
                            type="button"
                            onClick={toggleSelectAllStores}
                            className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                          >
                            {selectedStoreIds.length === stores.length && stores.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4">Branch Name</th>
                        <th className="py-3 px-4">Location / Address</th>
                        <th className="py-3 px-4">Owner Phone</th>
                        <th className="py-3 px-4">Connected Devices</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {stores.map((s, idx) => {
                        const isSelected = selectedStoreIndex === idx || selectedStoreIds.includes(s.id);
                        const devCount = s.devices?.length || 0;
                        return (
                          <tr 
                            key={s.id}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                              isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20 font-medium' : ''
                            }`}
                          >
                            <td className="py-3.5 px-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => toggleStoreSelection(s.id)}
                                className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                              >
                                {selectedStoreIds.includes(s.id) ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                )}
                              </button>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isSelected 
                                    ? 'bg-emerald-600 text-white shadow-xs' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}>
                                  <Store className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{s.name}</span>
                                    {isSelected && (
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">ID: #{s.id}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{s.location || s.place || 'Phnom Penh, Cambodia'}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                              {s.owner_phone || user?.phone_number || '-'}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{devCount} {devCount === 1 ? 'Speaker' : 'Speakers'}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                ACTIVE
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isSelected && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStoreIndex(idx);
                                      setEditName(s.name);
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                                  >
                                    Select
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStoreIndex(idx);
                                    setEditName(s.name || '');
                                    const resolved = resolveStoreLocationCodes(s);
                                    setEditProvinceId(resolved.provinceId);
                                    setEditDistrictId(resolved.districtId);
                                    setEditCommuneId(resolved.communeId);
                                    setEditVillageId(resolved.villageId);
                                    setEditStreetOrLandmark(resolved.streetOrLandmark);
                                    setIsEditStoreOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: DEDICATED DEVICE INFO & SOUNDBOX MANAGEMENT       */}
          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* TAB 2: DEDICATED DEVICE INFO & SOUNDBOX MANAGEMENT TABLE */}
          {/* ======================================================== */}
          {merchantTab === 'devices' && (
            <div className="space-y-5 sm:space-y-6">

              {/* Device Table & Filter Toolbar Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                
                {/* Top Actions Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-indigo-600" />
                      <span>{isKhmer ? 'បញ្ជីឧបករណ៍ Soundbox' : 'Soundbox Hardware & Device Telemetry'}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Monitor live battery health, 4G cellular signal strength, store assignment, and audio test broadcasts.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCameraField(null);
                        setScanFeedback({ field: '', message: '', isError: false });
                        setIsDeviceModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isKhmer ? 'ភ្ជាប់ Soundbox' : 'Link Soundbox'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fetchStoresData(true)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
                      title="Refresh fleet telemetry"
                    >
                      <RefreshCw className="w-4 h-4" />
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
                      value={deviceSearchTerm}
                      onChange={(e) => setDeviceSearchTerm(e.target.value)}
                      placeholder="Search SN, store, Telegram ID..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Store Filter */}
                  <select
                    value={deviceStoreFilter}
                    onChange={(e) => setDeviceStoreFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">{isKhmer ? 'សាខាហាងទាំងអស់' : 'All Store Branches'}</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={deviceStatusFilter}
                    onChange={(e) => setDeviceStatusFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">{isKhmer ? 'ស្ថានភាពឧបករណ៍ទាំងអស់' : 'All Device Statuses'}</option>
                    <option value="ACTIVE">{isKhmer ? '🟢 សកម្ម / អនឡាញ' : '🟢 Active / Online'}</option>
                    <option value="IN_STOCK">{isKhmer ? '📦 ក្នុងស្តុក' : '📦 In Stock'}</option>
                    <option value="OFFLINE">{isKhmer ? '⚪ ក្រៅបណ្តាញ' : '⚪ Offline'}</option>
                  </select>
                </div>

                {/* Device Info Table */}
                {filteredDevices.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <table className="w-full text-left text-sm min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-3.5 w-10 text-center">
                            <button
                              type="button"
                              onClick={toggleSelectAllDevices}
                              className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            >
                              {selectedDeviceIds.length === filteredDevices.length && filteredDevices.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              )}
                            </button>
                          </th>
                          <th className="py-3 px-4">{isKhmer ? 'ឧបករណ៍ Soundbox (SN)' : 'Soundbox Device (SN)'}</th>
                          <th className="py-3 px-4">{isKhmer ? 'សាខាហាង' : 'Assigned Store'}</th>
                          <th className="py-3 px-4 text-center">{isKhmer ? 'តម្លៃឧបករណ៍' : 'Unit Price'}</th>
                          <th className="py-3 px-4 text-center">{isKhmer ? 'ការធានា (Warranty)' : 'Warranty (90d)'}</th>
                          <th className="py-3 px-4">{isKhmer ? 'ស្ថានភាព' : 'Status'}</th>
                          <th className="py-3 px-4">{isKhmer ? 'សកម្មភាពចុងក្រោយ' : 'Last Active'}</th>
                          <th className="py-3 px-4">{isKhmer ? 'ថាមពលថ្ម' : 'Battery Level'}</th>
                          <th className="py-3 px-4">{isKhmer ? 'សេវា 4G' : '4G Signal'}</th>
                          <th className="py-3 px-4">{isKhmer ? 'Telegram Bot' : 'Telegram Verification'}</th>
                          <th className="py-3 px-4 text-center">{isKhmer ? 'សកម្មភាព' : 'Operations'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {filteredDevices.map((device) => {
                          const isOnline = String(device.status).toUpperCase() === 'ACTIVE' || String(device.status).toUpperCase() === 'ONLINE';
                          const isTesting = testingDeviceId === device.id;
                          const isRebooting = rebootingDeviceId === device.id;
                          const lastActiveRaw = device.last_active || device.last_time || device.last_online || device.last_heartbeat || device.updated_at || device.created_at;

                          // Compute warranty countdown
                          const now = new Date();
                          const durationDays = Number(device.warranty_days) || 90;
                          let endDate = device.warranty_end_date ? new Date(device.warranty_end_date) : null;
                          if (!endDate && device.warranty_start_date) {
                            endDate = new Date(new Date(device.warranty_start_date).getTime() + durationDays * 86400000);
                          }
                          if (!endDate && device.created_at) {
                            endDate = new Date(new Date(device.created_at).getTime() + durationDays * 86400000);
                          }
                          const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / 86400000) : 0;

                          return (
                            <tr 
                              key={device.id}
                              className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group ${
                                selectedDeviceIds.includes(device.id) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                              }`}
                            >
                              <td className="py-3.5 px-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleDeviceSelection(device.id)}
                                  className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                >
                                  {selectedDeviceIds.includes(device.id) ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                  )}
                                </button>
                              </td>
                              {/* Column 1: SN & Model */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-0.5">
                                  <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                                    <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span>{device.device_sn}</span>
                                  </div>
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                    {device.device_type || 'Standard Soundbox'}
                                  </span>
                                </div>
                              </td>

                              {/* Column 2: Assigned Store */}
                              <td className="py-3.5 px-4">
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                    <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{device.storeName}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 truncate max-w-[160px] block">
                                    {device.storeLocation || 'Phnom Penh'}
                                  </span>
                                </div>
                              </td>

                              {/* Column 3: Unit Price & Discount */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {Number(device.discount_amount) > 0 || Number(device.discount_percent) > 0 ? (
                                  <div>
                                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                      ${Number(device.final_price || device.price).toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 line-through ml-1.5 font-mono">
                                      ${Number(device.price || 29).toFixed(2)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                    ${Number(device.price || 29).toFixed(2)}
                                  </span>
                                )}
                              </td>

                              {/* Column 4: 90-Day Warranty Live Countdown */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {daysLeft <= 0 ? (
                                  <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                    {isKhmer ? 'ផុតកំណត់' : 'Expired'}
                                  </span>
                                ) : daysLeft <= 15 ? (
                                  <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    {daysLeft} {isKhmer ? 'ថ្ងៃនៅសល់' : 'days left'}
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    {daysLeft} {isKhmer ? 'ថ្ងៃនៅសល់' : 'days left'}
                                  </span>
                                )}
                              </td>

                              {/* Column 5: Status */}
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  isOnline
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                  <span>{device.status || 'ACTIVE'}</span>
                                </span>
                              </td>

                              {/* Column 4: Last Active */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="font-mono text-xs font-semibold">
                                    {(() => {
                                      if (!lastActiveRaw) return isKhmer ? 'មិនទាន់មាន' : 'Never';
                                      const d = new Date(lastActiveRaw);
                                      if (isNaN(d.getTime())) return isKhmer ? 'មិនទាន់មាន' : 'Never';
                                      const dateStr = d.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric' });
                                      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                      return `${dateStr}, ${timeStr}`;
                                    })()}
                                  </span>
                                </div>
                              </td>

                              {/* Column 5: Battery Level */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                  <BatteryCharging className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <span className="font-mono text-xs">
                                    {device.battery ? (String(device.battery).includes('%') ? device.battery : `${device.battery}%`) : '100%'}
                                  </span>
                                </div>
                              </td>

                              {/* Column 6: 4G Cellular Signal */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                  <Signal className="w-4 h-4 text-blue-500 shrink-0" />
                                  <span className="text-xs">{device.signal || '4G LTE'}</span>
                                </div>
                              </td>

                              {/* Column 7: Telegram Code */}
                              <td className="py-3.5 px-4">
                                {device.telegram_chat_id ? (
                                  <div className="flex flex-wrap gap-1">
                                    {device.telegram_chat_id.split(',').map((id, idx) => (
                                      <code key={idx} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {id.trim()}
                                      </code>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Unbound</span>
                                )}
                              </td>

                              {/* Column 7: Operations */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center justify-center gap-1">
                                  {/* Test Voice */}
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerTestVoice(device)}
                                    disabled={isTesting}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Dispatches $1 voice announcement to speaker"
                                  >
                                    <BellRing className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                                    <span>Test</span>
                                  </button>

                                  {/* Volume */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVolumeModal(device)}
                                    className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                    title="Adjust speaker volume level"
                                  >
                                    <Volume2 className="w-3 h-3" />
                                    <span>Vol</span>
                                  </button>

                                  {/* Reboot */}
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerReboot(device)}
                                    disabled={isRebooting}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                    title="Reboot soundbox"
                                  >
                                    <RotateCcw className={`w-3.5 h-3.5 ${isRebooting ? 'animate-spin text-amber-500' : ''}`} />
                                  </button>

                                  {/* Edit Pairing */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditDevice(device)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                    title="Edit pairing & Telegram ID"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Unlink */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenUnlinkDevice(device)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                                    title="Unlink soundbox from store"
                                  >
                                    <Unlink className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : allUserDevices.length === 0 ? (
                  <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 max-w-md mx-auto my-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                      <Volume2 className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {isKhmer ? 'មិនទាន់មានឧបករណ៍ Soundbox ភ្ជាប់នៅឡើយទេ' : 'No Soundbox Devices Linked Yet'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {isKhmer 
                          ? 'សូមភ្ជាប់ឧបករណ៍ 4G Cloud Soundbox ទៅកាន់សាខាហាងរបស់អ្នក ដើម្បីចាប់ផ្តើមទទួលការផ្សាយសំឡេងទូទាត់ប្រាក់ភ្លាមៗ។'
                          : 'Link a 4G Cloud Soundbox speaker to your store branch to start receiving real-time voice payment announcements.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCameraField(null);
                        setScanFeedback({ field: '', message: '', isError: false });
                        setIsDeviceModalOpen(true);
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isKhmer ? 'ភ្ជាប់ឧបករណ៍ Soundbox' : 'Link Soundbox Device'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-14 px-4 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isKhmer ? 'រកមិនឃើញឧបករណ៍ត្រូវនឹងពាក្យស្វែងរកទេ' : 'No Soundbox devices matched your filters'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isKhmer ? 'សូមសាកល្បងផ្លាស់ប្តូរពាក្យគន្លឹះ ឬជ្រើសរើសសាខាផ្សេង' : 'Try adjusting your search keyword or clearing the status/branch filter.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDeviceSearchTerm('');
                        setDeviceStoreFilter('ALL');
                        setDeviceStatusFilter('ALL');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      {isKhmer ? 'សម្អាតការស្វែងរក' : 'Clear Filters'}
                    </button>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: DEDICATED TRANSACTION HISTORY & STATEMENT          */}
          {/* ======================================================== */}
          {merchantTab === 'transactions' && (
            <div className="space-y-5 sm:space-y-6">

              {/* Transactions Table & Advanced Filters */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                
                {/* Header & Export Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-blue-600" />
                      <span>{isKhmer ? 'ប្រវត្តិប្រតិបត្តិការលម្អិត' : 'Full Payment History & Statements'}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Audit all customer QR payments received via ABA, Bakong, Wing & ACLEDA
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      onClick={() => fetchStoresData(true)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
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
                      value={txSearchTerm}
                      onChange={(e) => setTxSearchTerm(e.target.value)}
                      placeholder="Search payer, TxID, amount, SN..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Branch / Store Filter */}
                  <select
                    value={txStoreFilter}
                    onChange={(e) => setTxStoreFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">{isKhmer ? 'សាខាហាងទាំងអស់' : 'All Store Branches'}</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  {/* Currency Filter */}
                  <select
                    value={txCurrencyFilter}
                    onChange={(e) => setTxCurrencyFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">{isKhmer ? 'រូបិយប័ណ្ណទាំងអស់' : 'All Currencies'}</option>
                    <option value="USD">{isKhmer ? 'ប្រាក់ដុល្លារ ($)' : 'USD ($) Only'}</option>
                    <option value="KHR">{isKhmer ? 'ប្រាក់រៀល (៛)' : 'KHR (៛) Only'}</option>
                  </select>

                  {/* Bank Filter */}
                  <select
                    value={txBankFilter}
                    onChange={(e) => setTxBankFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">{isKhmer ? 'ធនាគារទាំងអស់' : 'All Banks'}</option>
                    <option value="ABA">ABA Bank</option>
                    <option value="ACLEDA">ACLEDA Bank</option>
                    <option value="Canadia">Canadia Bank</option>
                    <option value="Wing">Wing Bank</option>
                    <option value="Bakong">Bakong QR</option>
                  </select>
                </div>

                {/* Transactions Table */}
                {filteredTransactions.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <table className="w-full text-left text-sm min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-3.5 w-10 text-center">
                            <button
                              type="button"
                              onClick={toggleSelectAllTxs}
                              className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            >
                              {selectedTxIds.length === filteredTransactions.length && filteredTransactions.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                              )}
                            </button>
                          </th>
                          <th className="py-3 px-4">{t('bank', 'Bank / Source')}</th>
                          <th className="py-3 px-4">{t('amount', 'Amount')}</th>
                          <th className="py-3 px-4">{t('payer', 'Customer / Payer')}</th>
                          <th className="py-3 px-4">{t('txId', 'Bank Reference ID')}</th>
                          <th className="py-3 px-4">Store Branch</th>
                          <th className="py-3 px-4">{t('device', 'Soundbox SN')}</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4 text-right">Receipt</th>
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
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group ${
                              selectedTxIds.includes(tx.id) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                            }`}
                          >
                            <td className="py-3.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => toggleTxSelection(tx.id)}
                                className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                              >
                                {selectedTxIds.includes(tx.id) ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                )}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>{tx.bank_name || 'Bakong'}</span>
                            </td>
                            <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                              +{tx.currency === 'USD' ? `$${Number(tx.amount).toFixed(2)}` : `៛${Number(tx.amount).toLocaleString()}`}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                              {tx.payer_name || t('customer', 'Customer')}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-400">
                              {tx.bank_tx_id || tx.id}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                              {tx.storeName || activeStore?.name}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">
                              {tx.device_sn}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {tx.created_at ? new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:underline flex items-center justify-end gap-1">
                                <span>Slip</span>
                                <ExternalLink className="w-3 h-3" />
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-14 text-slate-500 space-y-2">
                    <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No payment transactions match your filters</p>
                    <p className="text-xs text-slate-400">Try clearing your search term or changing the currency/bank filter.</p>
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
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Received & Broadcasted</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                +{selectedTxSlip.currency === 'USD' ? `$${Number(selectedTxSlip.amount).toFixed(2)}` : `៛${Number(selectedTxSlip.amount).toLocaleString()}`}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Verified via {selectedTxSlip.bank_name || 'Bakong Gateway'}
              </p>
            </div>

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
                <span className="text-slate-400">Store Branch:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{selectedTxSlip.storeName || activeStore?.name}</span>
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
          
          {/* Warning Banner if devices are linked */}
          {(activeStore?.devices?.length || 0) > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Unlink Soundbox Devices Required Before Updating</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed">
                This store currently has <strong>{activeStore.devices.length} linked Soundbox speaker(s)</strong>. To ensure hardware broadcasting synchronization, please unlink all devices from this store before modifying store details or address.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsEditStoreOpen(false);
                  changeTab('devices');
                }}
                className="mt-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Go to Device Info to Unlink ({activeStore.devices.length})</span>
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Store Name (ឈ្មោះហាង)
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={(activeStore?.devices?.length || 0) > 0}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{isKhmer ? 'ទីតាំងហាង' : 'Store Location'}</span>
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
              disabled={savingStore || (activeStore?.devices?.length || 0) > 0}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-xs transition flex items-center gap-1.5 ${
                (activeStore?.devices?.length || 0) > 0
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              }`}
            >
              {savingStore ? t('saving', 'Saving...') : (activeStore?.devices?.length || 0) > 0 ? 'Unlink Devices First' : t('save', 'Save Changes')}
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

      {/* Link New Device Modal with Field-Specific QR Scanner & Store Target */}
      <Modal 
        isOpen={isDeviceModalOpen} 
        onClose={() => {
          setActiveCameraField(null);
          setIsDeviceModalOpen(false);
        }} 
        title="Link Soundbox Speaker to Store"
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
            {/* Target Store Dropdown if user has multiple stores */}
            {stores.length > 1 && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Target Store Branch
                </label>
                <select
                  value={targetStoreIdForNewDevice || activeStore?.id}
                  onChange={(e) => setTargetStoreIdForNewDevice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

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
                      {s.name}
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
              {t('confirmUnlinkSoundboxDesc1', 'Device')} <strong>{selectedDevice?.device_sn}</strong> {t('confirmUnlinkSoundboxDesc2', 'will be disconnected from store')} <strong>{selectedDevice?.storeName || activeStore?.name}</strong>. {t('confirmUnlinkSoundboxDesc3', 'It will stop broadcasting payments until linked again.')}
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
