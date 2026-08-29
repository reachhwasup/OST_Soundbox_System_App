import React, { useState, useEffect, useRef } from 'react';
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
  Radio
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
  const fetchStoresData = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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
      setError('Store name cannot be empty.');
      return;
    }

    setSavingStore(true);
    setError('');

    let payload = {
      name: editName.trim(),
      place: activeStore.place,
      location: activeStore.location,
      province: activeStore.province,
      district: activeStore.district,
      commune: activeStore.commune,
      village: activeStore.village,
      street: activeStore.street
    };

    if (editProvinceId && editDistrictId && editCommuneId) {
      const compiled = compileLocation(
        editProvinceId, 
        editDistrictId, 
        editCommuneId, 
        editVillageId, 
        editStreetOrLandmark
      );
      payload = {
        name: editName.trim(),
        place: compiled.place,
        location: compiled.location,
        province: compiled.province,
        district: compiled.district,
        commune: compiled.commune,
        village: compiled.village,
        street: compiled.street
      };
    }

    try {
      await api.put(`/api/stores/${activeStore.id}`, payload);
      setIsEditStoreOpen(false);
      const updMsg = `Store '${editName.trim()}' updated successfully.`;
      showToast({
        type: 'update',
        title: 'Store Updated',
        message: updMsg,
        duration: 5000
      });
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
        type: 'unlink',
        title: 'Store Deleted',
        message: delMsg,
        duration: 5000
      });
      await fetchStoresData();
      setSelectedStoreIndex(0);
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

  // Handle Register/Link New Device
  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!activeStore) {
      setError('Please select or register a store first.');
      return;
    }
    if (!deviceSn.trim()) {
      setError('Please enter device serial number.');
      return;
    }

    setSavingDevice(true);
    setError('');
    try {
      await api.post('/api/devices/register', {
        merchant_id: activeStore.id,
        device_sn: deviceSn.trim(),
        telegram_chat_id: telegramChatId.trim() || null,
        device_model: 'Y6B',
      });
      setIsDeviceModalOpen(false);
      setDeviceSn('');
      setTelegramChatId('');
      setActiveCameraField(null);
      setScanFeedback({ field: '', message: '', isError: false });
      const linkMsg = `Soundbox device '${deviceSn.trim()}' linked to '${activeStore.name}' successfully!`;
      showToast({
        type: 'link',
        title: 'Device Linked Successfully',
        message: linkMsg,
        duration: 5000
      });
      await fetchStoresData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to register device.';
      setError(msg);
      showToast({
        type: 'error',
        title: 'Device Link Failed',
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
    setEditDeviceMerchantId(activeStore ? activeStore.id : '');
    setEditActiveCameraField(null);
    setEditScanFeedback({ field: '', message: '', isError: false });
    setIsEditDeviceOpen(true);
  };

  // Handle Update Device
  const handleUpdateDevice = async (e) => {
    e.preventDefault();
    if (!selectedDevice) return;
    if (!editDeviceSn.trim()) {
      setError('Device Serial Number cannot be empty.');
      return;
    }

    setSavingDevice(true);
    setError('');
    try {
      await api.put(`/api/devices/${selectedDevice.id}`, {
        device_sn: editDeviceSn.trim(),
        telegram_chat_id: editTelegramChatId.trim() || null,
        device_model: editDeviceModel.trim() || 'Y6B',
        merchant_id: editDeviceMerchantId ? parseInt(editDeviceMerchantId) : activeStore?.id
      });
      setIsEditDeviceOpen(false);
      const devUpdMsg = `Soundbox '${editDeviceSn.trim()}' updated successfully!`;
      showToast({
        type: 'update',
        title: 'Soundbox Updated',
        message: devUpdMsg,
        duration: 5000
      });
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading your stores & soundbox status...</p>
        </div>
      </div>
    );
  }

  const hasAnyStore = stores.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      
      {/* Case 1: USER HAS NOT REGISTERED ANY STORE YET */}

      {!hasAnyStore ? (
        <div className="max-w-3xl mx-auto py-2 sm:py-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 sm:p-8 space-y-5">
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-3">
                <Store className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Register Your Store
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Select your store's Province, District, Commune, and Village to link with your Soundbox speaker.
              </p>
            </div>

            <form onSubmit={handleRegisterStore} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
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
                    placeholder="e.g. Sokha Artisan Coffee"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    required
                  />
                </div>
              </div>

              {/* Cascading Dropdown Selector */}
              <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <MapPin className="w-4 h-4" />
                  <span>Store Location Hierarchy (ជ្រើសរើសទីតាំងរដ្ឋបាល)</span>
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
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
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
        <div className="space-y-4 sm:space-y-6">
          
          {/* Multi-Store Navigation / Switcher Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Store Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1 sm:pb-0">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0 pr-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('storeBranches', 'Stores')}:</span>
                </div>

                {stores.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStoreIndex(idx);
                      setEditName(s.name);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 shrink-0 border ${
                      selectedStoreIndex === idx
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>{s.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      selectedStoreIndex === idx ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {s.devices?.length || 0}
                    </span>
                  </button>
                ))}
              </div>

              {/* Add Another Store Button */}
              <button
                onClick={() => {
                  resetRegisterForm();
                  setIsRegisterStoreOpen(true);
                }}
                className="w-full sm:w-auto px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-800 shrink-0"
              >
                <Plus className="w-4 h-4" />
                {t('addStore', 'Add Another Store')}
              </button>
            </div>
          </div>

          {/* Active Store Overview Card */}
          {activeStore && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 p-4 sm:p-6 md:p-7">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6">
                
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                        {activeStore.name}
                      </h1>
                      <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        {t('activeStore', 'Active Store')}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-x-4 gap-y-1 mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                        <span>{activeStore.location || activeStore.place || 'Not specified'}</span>
                      </div>
                      {activeStore.place && activeStore.place !== activeStore.location && (
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                          <span>{activeStore.place}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                        <span>{activeStore.owner_phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Touch Action Buttons */}
                <div className="flex items-center gap-2 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-800 w-full xl:w-auto">
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
                    className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer whitespace-nowrap"
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('editStore', 'Edit Store')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveCameraField(null);
                      setScanFeedback({ field: '', message: '', isError: false });
                      setIsDeviceModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('linkSoundbox', 'Link Soundbox')}</span>
                  </button>

                  {stores.length > 1 && (
                    <button
                      onClick={() => setIsDeleteStoreOpen(true)}
                      title={t('deleteStore', 'Delete this store')}
                      className="p-1.5 sm:p-2 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-xl transition shrink-0 border border-rose-200 dark:border-rose-800 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>


              </div>
            </div>

          )}

          {/* Grid: Connected Soundboxes & Live Payment Feed for Active Store */}
          {activeStore && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Connected Soundbox Devices (1 Col) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    <span>{t('connectedSoundboxes', 'Soundboxes')} ({activeStore.name})</span>
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {activeStore.devices?.length || 0} {t('devices', 'Devices')}
                  </span>
                </div>


                {activeStore.devices && activeStore.devices.length > 0 ? (
                  <div className="space-y-3">
                    {activeStore.devices.map((device) => (
                      <div 
                        key={device.id} 
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-600" />
                            <span>{device.device_sn}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {device.status}
                          </span>
                        </div>
                        
                        <div className="text-xs text-slate-500 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Model:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{device.device_model}</span>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="shrink-0">Telegram:</span>
                            <div className="flex flex-wrap justify-end gap-1">
                              {device.telegram_chat_id ? (
                                device.telegram_chat_id.split(',').map((id, idx) => (
                                  <code key={idx} className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-800 dark:text-slate-200">
                                    {id.trim()}
                                  </code>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Not paired</span>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Device Action Buttons (Edit & Unlink) */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDevice(device)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>{t('edit', 'Edit')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenUnlinkDevice(device)}
                            className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 rounded-lg transition border border-rose-200 dark:border-rose-800 flex items-center gap-1"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                            <span>{t('unlink', 'Unlink')}</span>
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <Volume2 className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">{t('noSoundboxAtStore', 'No Soundbox at this Store')}</p>
                    <p className="text-xs text-slate-500 mt-0.5 mb-3">{t('noSoundboxSub', 'Link a Y6B speaker to broadcast payments for this store')}</p>
                    <button
                      onClick={() => {
                        setActiveCameraField(null);
                        setScanFeedback({ field: '', message: '', isError: false });
                        setIsDeviceModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('linkSoundboxDevice', 'Link Soundbox Device')}</span>
                    </button>

                  </div>
                )}
              </div>


              {/* Live Payment Transactions for Active Store (2 Cols) */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    <span>{t('livePayments', 'Live Payments')} ({activeStore.name})</span>
                  </h3>
                  <button
                    onClick={fetchStoresData}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title={t('refresh', 'Refresh')}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {activeStore.recent_transactions && activeStore.recent_transactions.length > 0 ? (
                  <>
                    {/* Mobile Feed Cards */}
                    <div className="sm:hidden space-y-2.5">
                      {activeStore.recent_transactions.map((tx) => (
                        <div 
                          key={tx.id}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[10px]">
                                {tx.bank_name}
                              </span>
                              <span>{tx.payer_name || t('customer', 'Customer')}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <span>SN: {tx.device_sn}</span>
                              <span>•</span>
                              <span>{tx.created_at ? new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              +{tx.currency === 'USD' ? `$${Number(tx.amount).toFixed(2)}` : `៛${Number(tx.amount).toLocaleString()}`}
                            </div>
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.2 rounded font-semibold uppercase">
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-sm min-w-[540px]">
                        <thead>

                          <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="pb-3 font-medium">{t('bank', 'Bank')}</th>
                            <th className="pb-3 font-medium">{t('amount', 'Amount')}</th>
                            <th className="pb-3 font-medium">{t('payer', 'Payer')}</th>
                            <th className="pb-3 font-medium">{t('txId', 'Tx ID')}</th>
                            <th className="pb-3 font-medium">{t('device', 'Device')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {activeStore.recent_transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                              <td className="py-3 font-semibold text-slate-900 dark:text-white">
                                {tx.bank_name}
                              </td>
                              <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                +{tx.currency === 'USD' ? `$${Number(tx.amount).toFixed(2)}` : `៛${Number(tx.amount).toLocaleString()}`}
                              </td>
                              <td className="py-3 text-slate-600 dark:text-slate-300">
                                {tx.payer_name || t('customer', 'Customer')}
                              </td>
                              <td className="py-3 text-xs font-mono text-slate-400">
                                {tx.bank_tx_id}
                              </td>
                              <td className="py-3 text-xs font-mono text-slate-500">
                                {tx.device_sn}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 sm:py-12 text-slate-500">
                    <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">{t('noTransactions', 'No Transactions for')} {activeStore.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t('noTransactionsSub', 'Payments made through soundboxes at this store will stream here in real time.')}</p>
                  </div>
                )}
              </div>


            </div>
          )}



        </div>
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
              className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingStore}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs"
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
              className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium"
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

          {/* Active Field Live Camera Scanner */}
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
            
            {/* Field 1: Device Serial Number (SN) */}
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

              {/* Upload QR of Soundbox button under input */}
              <div className="mt-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => snFileInputRef.current?.click()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 py-1 transition"
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

              {/* Feedback */}
              {scanFeedback.field === 'sn' && (
                <div className={`mt-1.5 text-xs flex items-center gap-1 ${
                  scanFeedback.isError ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400 font-medium'
                }`}>
                  {scanFeedback.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{scanFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Field 2: Telegram Chat ID (Verification Code) */}
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


              {/* Upload QR of Telegram button under input */}
              <div className="mt-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => telegramFileInputRef.current?.click()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 py-1 transition"
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

              {/* Feedback */}
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
                className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={savingDevice}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs"
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

          {/* Active Field Live Camera Scanner for Edit */}
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
            
            {/* Field 1: Device Serial Number */}
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

              {/* Upload QR of Soundbox button */}
              <div className="mt-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => editSnFileInputRef.current?.click()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 py-1 transition"
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

              {/* Feedback */}
              {editScanFeedback.field === 'sn' && (
                <div className={`mt-1.5 text-xs flex items-center gap-1 ${
                  editScanFeedback.isError ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400 font-medium'
                }`}>
                  {editScanFeedback.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{editScanFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Field 2: Telegram Chat ID */}
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                💡 {t('multiGroupHint', 'Tip: You can add multiple Telegram codes separated by commas (e.g. for ABA + Wing groups).')}
              </p>


              {/* Upload QR of Telegram button */}
              <div className="mt-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => editTelegramFileInputRef.current?.click()}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 py-1 transition"
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

              {/* Feedback */}
              {editScanFeedback.field === 'telegram' && (
                <div className={`mt-1.5 text-xs flex items-center gap-1 ${
                  editScanFeedback.isError ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400 font-medium'
                }`}>
                  {editScanFeedback.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{editScanFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Field 3: Assign to Store (if multi-store) */}
            {stores.length > 1 && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  {t('targetStore', 'Target Store / Branch')}
                </label>
                <select
                  value={editDeviceMerchantId}
                  onChange={(e) => setEditDeviceMerchantId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location || s.place || 'Main'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Field 4: Device Model */}
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
                className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-300 font-medium"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={savingDevice}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs"
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
