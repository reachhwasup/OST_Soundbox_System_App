// Manage Stock: column settings and pure list logic (no React).

export const STOCK_COLUMNS_STORAGE_KEY = 'ost.manageStock.columns.v6';

// Product catalog fields (as in the products query) plus the stock quantity.
// The device type IS the product name, so there is no separate product column.
// Extras stay available in the Columns picker but are off by default.
export const DEFAULT_STOCK_COLUMNS = {
  sku: true,
  deviceType: true,
  deviceModel: true,
  supplier: true,
  inStock: true,
  basePrice: true,
  purchasePrice: true,
  lastIntake: false,
};

// Columns that expose supplier cost; hidden without cost permission.
// basePrice is the selling price, so it is not one of them.
export const COST_COLUMNS = new Set(['purchasePrice']);

export const DEFAULT_STOCK_SORT = 'LOW_FIRST';

export const lineName = (line) => line.product_name || line.device_type || '-';

/** The device type: the product's name (products.name), which is what the catalog calls the type. */
export const lineDeviceType = (line) => line.type_name || line.device_type || line.product_name || '-';

export const formatBranchBreakdown = (line) =>
  (line.branches || []).map((b) => `${b.branch_code || b.branch_name} ${b.quantity}`).join(' · ');

export const stockAgeClass = (days) => {
  if (days == null) return 'text-slate-500 dark:text-slate-400';
  if (days >= 90) return 'text-rose-600 dark:text-rose-400 font-semibold';
  if (days >= 60) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-slate-500 dark:text-slate-400';
};

/** Fallback when the stock summary API is unavailable: group un-assigned devices by device type. */
export function buildFallbackLines(devices, branchFilter) {
  const grouped = new Map();
  (devices || []).forEach((d) => {
    if (d.merchant_id) return;
    const status = String(d.status || '').toUpperCase();
    if (status === 'PENDING' || status === 'ACTIVE') return;
    if (branchFilter !== 'ALL' && d.branch_id && String(d.branch_id) !== String(branchFilter)) return;
    const typeName = d.device_type || 'Soundbox';
    if (!grouped.has(typeName)) {
      grouped.set(typeName, {
        id: typeName, product_id: null, product_name: typeName, device_type: typeName, type_name: typeName,
        sku: null, device_model: d.device_model || null, supplier: d.supplier || null,
        available_quantity: 0, branches: [], base_price: null, stock_value: null,
        last_intake: null, min_stock_level: null, is_low: false,
      });
    }
    grouped.get(typeName).available_quantity += 1;
  });
  return Array.from(grouped.values());
}

/** Applies search, product-type filter and sort to stock lines. */
export function filterAndSortLines(lines, { search, typeFilter, sort }) {
  const query = (search || '').toLowerCase().trim();
  const list = lines.filter((line) => {
    const haystack = [line.product_name, line.device_type, line.sku, line.device_model, line.type_name, line.supplier]
      .filter(Boolean).join(' ').toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (typeFilter && typeFilter !== 'ALL') {
      const lineType = String(line.type_name || line.device_type || '').toLowerCase();
      if (lineType !== typeFilter.toLowerCase()) return false;
    }
    return true;
  });

  const qty = (x) => Number(x.available_quantity || 0);
  const byName = (a, b) => lineName(a).localeCompare(lineName(b));
  return list.sort((a, b) => {
    switch (sort) {
      case 'QTY_ASC': return (qty(a) - qty(b)) || byName(a, b);
      case 'QTY_DESC': return (qty(b) - qty(a)) || byName(a, b);
      case 'NAME_ASC': return byName(a, b);
      case 'NAME_DESC': return byName(b, a);
      case 'VALUE_DESC': return (Number(b.stock_value || 0) - Number(a.stock_value || 0)) || byName(a, b);
      case 'LAST_INTAKE_DESC': return String(b.last_intake || '').localeCompare(String(a.last_intake || '')) || byName(a, b);
      default: // LOW_FIRST: low-stock products first, then lowest quantity
        return (Number(!!b.is_low) - Number(!!a.is_low)) || (qty(a) - qty(b)) || byName(a, b);
    }
  });
}

/** Device types present in the data, for the type filter. */
export const deviceTypeOptions = (lines) =>
  Array.from(new Set((lines || []).map((l) => l.type_name || l.device_type).filter(Boolean))).sort((a, b) => a.localeCompare(b));
