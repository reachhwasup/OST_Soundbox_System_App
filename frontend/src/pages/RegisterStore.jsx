import { useState } from 'react';
import { Store, MapPin } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import CambodiaLocationSelector from '../components/CambodiaLocationSelector';
import { findLocationNames } from '../data/cambodiaLocations';

export default function RegisterStore() {
  const { logout, refreshUser } = useAuth();
  const { isKhmer } = useLanguage();
  const [storeName, setStoreName] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [villageId, setVillageId] = useState('');
  const [streetOrLandmark, setStreetOrLandmark] = useState('');
  const [savingStore, setSavingStore] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(null);
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

  const handleRegisterStore = async (event) => {
    event.preventDefault();
    if (savingStore) return;
    if (!registered && (!storeName.trim() || !provinceId || !districtId || !communeId)) {
      setError('Enter your store name and select Province, District, and Commune/Sangkat.');
      return;
    }
    setSavingStore(true);
    setError('');
    try {
      let result = registered;
      if (!result) {
        const { data } = await api.post('/api/stores/register', {
          name: storeName.trim(),
          ...compileLocation(provinceId, districtId, communeId, villageId, streetOrLandmark),
        });
        result = data;
        setRegistered(data);
      }
      await refreshUser();
      window.history.replaceState(null, '', '/');
    } catch (err) {
      setError(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : (err.message || 'Unable to register your store. Please try again.'));
    } finally {
      setSavingStore(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 text-sm">
          <span className="font-bold text-slate-900 dark:text-white">OST Soundbox</span>
          <button type="button" onClick={logout} className="text-slate-500 hover:text-emerald-600 cursor-pointer">{isKhmer ? 'ចាកចេញ' : 'Sign out'}</button>
        </div>
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <header className="space-y-2">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{isKhmer ? 'ជំហានទី ២ នៃ ២' : 'Step 2 of 2 · Store setup'}</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isKhmer ? 'ចុះឈ្មោះហាងរបស់អ្នក' : 'Register your store'}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{isKhmer ? 'បំពេញព័ត៌មានហាង មុនពេលចូលប្រើប្រព័ន្ធ។' : 'Your account is ready. Register your store to access the dashboard.'}</p>
          </header>
          {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
          {registered ? (
            <button type="button" disabled={savingStore} onClick={handleRegisterStore} className="w-full rounded-xl bg-emerald-600 text-white p-3 disabled:opacity-50 cursor-pointer">{savingStore ? 'Opening your store…' : 'Open your store'}</button>
          ) : (
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
          )}
        </section>
      </div>
    </main>
  );
}
