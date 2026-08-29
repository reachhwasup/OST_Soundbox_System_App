import { cambodia_gazetterr } from 'cambodia-gazetteer';

// Clean and enrich Cambodia gazetteer data
const rawData = JSON.parse(JSON.stringify(cambodia_gazetterr));

// Find Phnom Penh (code 12) and add Boeng Keng Kang and Kamboul if missing
const pp = rawData.find(p => p.code === '12');
if (pp && pp.districts) {
  const hasBKK = pp.districts.some(d => d.latin.toLowerCase().includes('keng kang'));
  if (!hasBKK) {
    const chamkarMon = pp.districts.find(d => d.code === '1201');
    if (chamkarMon && chamkarMon.communes) {
      const bkkCommuneCodes = ['120102', '120103', '120104', '120105', '120106', '120107', '120108'];
      const bkkCommunes = chamkarMon.communes.filter(c => bkkCommuneCodes.includes(c.code));
      
      pp.districts.push({
        code: '1213',
        khmer: 'ខណ្ឌបឹងកេងកង',
        latin: 'Boeng Keng Kang Khan',
        communes: bkkCommunes.length > 0 ? bkkCommunes : [
          { code: '121301', khmer: 'សង្កាត់បឹងកេងកងទី ១', latin: 'Boeng Keng Kang 1 (BKK1)', villages: [] },
          { code: '121302', khmer: 'សង្កាត់បឹងកេងកងទី ២', latin: 'Boeng Keng Kang 2 (BKK2)', villages: [] },
          { code: '121303', khmer: 'សង្កាត់បឹងកេងកងទី ៣', latin: 'Boeng Keng Kang 3 (BKK3)', villages: [] },
          { code: '121304', khmer: 'សង្កាត់អូឡាំពិក', latin: 'Olympic Sangkat', villages: [] },
          { code: '121305', khmer: 'សង្កាត់ទំនប់ទឹក', latin: 'Tumnob Tuek Sangkat', villages: [] },
          { code: '121306', khmer: 'សង្កាត់ទួលស្វាយព្រៃទី ១', latin: 'Tuol Svay Prey 1', villages: [] },
          { code: '121307', khmer: 'សង្កាត់ទួលស្វាយព្រៃទី ២', latin: 'Tuol Svay Prey 2', villages: [] }
        ]
      });
    }
  }

  const hasKamboul = pp.districts.some(d => d.latin.toLowerCase().includes('kamboul'));
  if (!hasKamboul) {
    const pouSenchey = pp.districts.find(d => d.code === '1209');
    if (pouSenchey && pouSenchey.communes) {
      const kamboulCommuneCodes = ['120904', '120905', '120906', '120907', '120908', '120909', '120910'];
      const kamboulCommunes = pouSenchey.communes.filter(c => kamboulCommuneCodes.includes(c.code));
      
      pp.districts.push({
        code: '1214',
        khmer: 'ខណ្ឌកំបូល',
        latin: 'Kamboul Khan',
        communes: kamboulCommunes.length > 0 ? kamboulCommunes : [
          { code: '121401', khmer: 'សង្កាត់កំបូល', latin: 'Kamboul Sangkat', villages: [] },
          { code: '121402', khmer: 'សង្កាត់កន្ទោក', latin: 'Kantaok Sangkat', villages: [] },
          { code: '121403', khmer: 'សង្កាត់ឪឡោក', latin: 'Ovlaok Sangkat', villages: [] },
          { code: '121404', khmer: 'សង្កាត់ស្នោរ', latin: 'Snaor Sangkat', villages: [] },
          { code: '121405', khmer: 'សង្កាត់ភ្លើងឆេះរទេះ', latin: 'Phleung Chheh Roteh', villages: [] },
          { code: '121406', khmer: 'សង្កាត់បឹងធំ', latin: 'Boeng Thum Sangkat', villages: [] },
          { code: '121407', khmer: 'សង្កាត់ប្រទះឡាង', latin: 'Prateah Lang', villages: [] }
        ]
      });
    }
  }
}

export const CAMBODIA_ALL_LOCATIONS = rawData;

// Get all 25 Provinces
export function getProvinces() {
  return CAMBODIA_ALL_LOCATIONS.map(p => ({
    code: p.code,
    name: p.latin.replace(' Capital', ''),
    nameKh: p.khmer,
    label: `${p.latin.replace(' Capital', '')} (${p.khmer})`
  }));
}

// Get Districts by Province code or name
export function getDistricts(provinceCode) {
  if (!provinceCode) return [];
  const province = CAMBODIA_ALL_LOCATIONS.find(
    p => p.code === provinceCode || p.latin.toLowerCase() === (provinceCode || '').toLowerCase()
  );
  if (!province || !province.districts) return [];

  return province.districts.map(d => ({
    code: d.code,
    name: d.latin.replace(' Khan', '').replace(' Municipality', '').replace(' District', ''),
    nameKh: d.khmer,
    label: `${d.latin.replace(' Khan', '').replace(' Municipality', '').replace(' District', '')} (${d.khmer})`
  }));
}

// Get Communes by District code
export function getCommunes(provinceCode, districtCode) {
  if (!provinceCode || !districtCode) return [];
  const province = CAMBODIA_ALL_LOCATIONS.find(
    p => p.code === provinceCode || p.latin.toLowerCase() === (provinceCode || '').toLowerCase()
  );
  if (!province || !province.districts) return [];

  const district = province.districts.find(
    d => d.code === districtCode || d.latin.toLowerCase() === (districtCode || '').toLowerCase()
  );
  if (!district || !district.communes) return [];

  return district.communes.map(c => ({
    code: c.code,
    name: c.latin.replace(' Sangkat', '').replace(' Commune', ''),
    nameKh: c.khmer,
    label: `${c.latin.replace(' Sangkat', '').replace(' Commune', '')} (${c.khmer})`
  }));
}

// Get Villages by Commune code
export function getVillages(provinceCode, districtCode, communeCode) {
  if (!provinceCode || !districtCode || !communeCode) return [];
  const province = CAMBODIA_ALL_LOCATIONS.find(
    p => p.code === provinceCode || p.latin.toLowerCase() === (provinceCode || '').toLowerCase()
  );
  if (!province || !province.districts) return [];

  const district = province.districts.find(
    d => d.code === districtCode || d.latin.toLowerCase() === (districtCode || '').toLowerCase()
  );
  if (!district || !district.communes) return [];

  const commune = district.communes.find(
    c => c.code === communeCode || c.latin.toLowerCase() === (communeCode || '').toLowerCase()
  );
  if (!commune || !commune.villages || commune.villages.length === 0) {
    // Generate standard Phum 1 to Phum 5 if none specified
    return [
      { code: `${communeCode}01`, name: 'Phum 1', nameKh: 'ភូមិ ១', label: 'Phum 1 (ភូមិ ១)' },
      { code: `${communeCode}02`, name: 'Phum 2', nameKh: 'ភូមិ ២', label: 'Phum 2 (ភូមិ ២)' },
      { code: `${communeCode}03`, name: 'Phum 3', nameKh: 'ភូមិ ៣', label: 'Phum 3 (ភូមិ ៣)' },
      { code: `${communeCode}04`, name: 'Phum 4', nameKh: 'ភូមិ ៤', label: 'Phum 4 (ភូមិ ៤)' },
      { code: `${communeCode}05`, name: 'Phum 5', nameKh: 'ភូមិ ៥', label: 'Phum 5 (ភូមិ ៥)' },
    ];
  }

  return commune.villages.map(v => ({
    code: v.code,
    name: v.latin,
    nameKh: v.khmer,
    label: v.khmer ? `${v.latin} (${v.khmer})` : v.latin
  }));
}

// Helper to look up full text labels
export function findLocationNames(provinceCode, districtCode, communeCode, villageCodeOrName) {
  const province = CAMBODIA_ALL_LOCATIONS.find(p => p.code === provinceCode);
  const district = province?.districts?.find(d => d.code === districtCode);
  const commune = district?.communes?.find(c => c.code === communeCode);
  const village = commune?.villages?.find(v => v.code === villageCodeOrName || v.latin === villageCodeOrName);

  return {
    provinceName: province ? province.latin.replace(' Capital', '') : provinceCode,
    provinceNameKh: province?.khmer || '',
    districtName: district ? district.latin.replace(' Khan', '').replace(' Municipality', '').replace(' District', '') : districtCode,
    districtNameKh: district?.khmer || '',
    communeName: commune ? commune.latin.replace(' Sangkat', '').replace(' Commune', '') : communeCode,
    communeNameKh: commune?.khmer || '',
    villageName: village ? village.latin : villageCodeOrName,
    villageNameKh: village?.khmer || ''
  };
}

// Resolve existing store address strings into selector codes
export function resolveStoreLocationCodes(store) {
  if (!store) return { provinceId: '', districtId: '', communeId: '', villageId: '', streetOrLandmark: '' };

  const clean = (str) => String(str || '').toLowerCase().replace(/(province|capital|city|khan|district|municipality|sangkat|commune|phum|village|ខេត្ត|រាជធានី|ក្រុង|ខណ្ឌ|ស្រុក|សង្កាត់|ឃុំ|ភូមិ)/gi, '').trim();

  const provQuery = clean(store.province || store.location || '');
  let province = CAMBODIA_ALL_LOCATIONS.find(p => 
    p.code === store.province ||
    clean(p.latin).includes(provQuery) || 
    provQuery.includes(clean(p.latin)) ||
    (store.province && p.khmer.includes(store.province))
  );

  // Default to Phnom Penh (12) if query mentions Phnom Penh or PP
  if (!province && (provQuery.includes('phnom penh') || provQuery.includes('ភ្នំពេញ'))) {
    province = CAMBODIA_ALL_LOCATIONS.find(p => p.code === '12');
  }

  const provinceId = province ? province.code : '';
  let districtId = '';
  let communeId = '';
  let villageId = '';

  if (province && province.districts && store.district) {
    const distQuery = clean(store.district);
    const district = province.districts.find(d => 
      d.code === store.district ||
      clean(d.latin).includes(distQuery) || 
      distQuery.includes(clean(d.latin)) ||
      (store.district && d.khmer.includes(store.district))
    );
    if (district) {
      districtId = district.code;

      if (district.communes && store.commune) {
        const commQuery = clean(store.commune);
        const commune = district.communes.find(c => 
          c.code === store.commune ||
          clean(c.latin).includes(commQuery) || 
          commQuery.includes(clean(c.latin)) ||
          (store.commune && c.khmer.includes(store.commune))
        );
        if (commune) {
          communeId = commune.code;

          if (commune.villages && store.village) {
            const villQuery = clean(store.village);
            const village = commune.villages.find(v => 
              v.code === store.village ||
              clean(v.latin).includes(villQuery) || 
              villQuery.includes(clean(v.latin)) ||
              (store.village && v.khmer && v.khmer.includes(store.village))
            );
            if (village) {
              villageId = village.code;
            }
          }
        }
      }
    }
  }

  return {
    provinceId,
    districtId,
    communeId,
    villageId: villageId || store.village || '',
    streetOrLandmark: store.street || store.place || ''
  };
}

