import React, { useMemo } from 'react';
import { 
  getProvinces, 
  getDistricts, 
  getCommunes, 
  getVillages,
  findLocationNames
} from '../data/cambodiaLocations';
import { MapPin, Building, Navigation, Home, Compass } from 'lucide-react';

export default function CambodiaLocationSelector({
  provinceId,
  setProvinceId,
  districtId,
  setDistrictId,
  communeId,
  setCommuneId,
  villageId,
  setVillageId,
  streetOrLandmark,
  setStreetOrLandmark,
  required = true
}) {
  const provinces = useMemo(() => getProvinces(), []);
  
  const districts = useMemo(() => {
    return provinceId ? getDistricts(provinceId) : [];
  }, [provinceId]);

  const communes = useMemo(() => {
    return (provinceId && districtId) ? getCommunes(provinceId, districtId) : [];
  }, [provinceId, districtId]);

  const villages = useMemo(() => {
    return (provinceId && districtId && communeId) ? getVillages(provinceId, districtId, communeId) : [];
  }, [provinceId, districtId, communeId]);

  // Selected names for clean formatted display
  const names = useMemo(() => {
    return findLocationNames(provinceId, districtId, communeId, villageId);
  }, [provinceId, districtId, communeId, villageId]);

  // Address Preview
  const addressParts = [
    streetOrLandmark,
    names.villageName,
    names.communeName,
    names.districtName,
    names.provinceName
  ].filter(Boolean);

  const fullAddressPreview = addressParts.join(', ');

  const handleProvinceSelect = (e) => {
    const val = e.target.value;
    setProvinceId(val);
    setDistrictId('');
    setCommuneId('');
    setVillageId('');
  };

  const handleDistrictSelect = (e) => {
    const val = e.target.value;
    setDistrictId(val);
    setCommuneId('');
    setVillageId('');
  };

  const handleCommuneSelect = (e) => {
    const val = e.target.value;
    setCommuneId(val);
    setVillageId('');
  };

  return (
    <div className="space-y-4">
      
      {/* 2x2 Grid for Cascading Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        
        {/* Step 1: Province / Capital City */}
        <div>
          <label className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mr-1.5 shrink-0">
              1
            </span>
            <span>Province / City (រាជធានី-ខេត្ត)</span>
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <select
              value={provinceId}
              onChange={handleProvinceSelect}
              required={required}
              className="w-full pl-3.5 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none font-medium cursor-pointer shadow-2xs"
            >
              <option value="">-- Select Province (២៥ ខេត្ត-ក្រុង) --</option>
              {provinces.map(p => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Step 2: District / Khan */}
        <div>
          <label className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mr-1.5 shrink-0">
              2
            </span>
            <span>District / Khan (ខណ្ឌ-ស្រុក-ក្រុង)</span>
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <select
              value={districtId}
              onChange={handleDistrictSelect}
              disabled={!provinceId || districts.length === 0}
              required={required}
              className="w-full pl-3.5 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none font-medium cursor-pointer shadow-2xs disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!provinceId ? 'Select Province first...' : `-- Select District / Khan (${districts.length}) --`}
              </option>
              {districts.map(d => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Step 3: Sub-District / Sangkat / Commune */}
        <div>
          <label className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mr-1.5 shrink-0">
              3
            </span>
            <span>Commune / Sangkat (ឃុំ-សង្កាត់)</span>
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <select
              value={communeId}
              onChange={handleCommuneSelect}
              disabled={!districtId || communes.length === 0}
              required={required}
              className="w-full pl-3.5 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none font-medium cursor-pointer shadow-2xs disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!districtId ? 'Select District first...' : `-- Select Commune / Sangkat (${communes.length}) --`}
              </option>
              {communes.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <Compass className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Step 4: Village / Phum */}
        <div>
          <label className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mr-1.5 shrink-0">
              4
            </span>
            <span>Village / Phum (ភូមិ)</span>
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <select
              value={villageId}
              onChange={(e) => setVillageId(e.target.value)}
              disabled={!communeId || villages.length === 0}
              required={required}
              className="w-full pl-3.5 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none font-medium cursor-pointer shadow-2xs disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!communeId ? 'Select Commune first...' : `-- Select Village / Phum (${villages.length}) --`}
              </option>
              {villages.map(v => (
                <option key={v.code} value={v.name}>{v.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <Home className="w-4 h-4" />
            </div>
          </div>
        </div>

      </div>

      {/* Street / Building / Market / Landmark */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
          Street / House / Market / Landmark Details <span className="text-slate-400 font-normal lowercase">(optional)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={streetOrLandmark}
            onChange={(e) => setStreetOrLandmark(e.target.value)}
            placeholder="e.g. St. 310, House #45, Near Olympic Market Wing B"
            className="w-full pl-3.5 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Full Formatted Location Preview */}
      {fullAddressPreview && (
        <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200 shadow-2xs">
          <MapPin className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">Selected Location: </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{fullAddressPreview}</span>
          </div>
        </div>
      )}

    </div>
  );
}
