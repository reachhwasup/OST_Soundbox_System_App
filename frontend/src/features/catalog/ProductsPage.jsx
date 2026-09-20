import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api';
import RowCheckbox from '../../components/RowCheckbox';
import { useToast } from '../../context/ToastContext';
import { downloadCsv } from '../../lib/csv';
import ProductFormModal from './ProductFormModal';
import { CARD, INPUT, PLAIN_BUTTON, PRIMARY_BUTTON, ROW, TD, TH, errorMessage, statusPill } from './catalogUi';

/**
 * Manage Product: the catalog behind Manage Stock.
 *
 * A product carries the SKU, name (shown as the device type), prices, warranty months, reorder level,
 * hardware model and supplier. Products with stock history are deactivated, not deleted.
 */
export default function ProductsPage({ onChanged }) {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [canViewCost, setCanViewCost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productRes, supplierRes] = await Promise.all([
        api.get('/api/products/', { params: { include_inactive: true } }),
        api.get('/api/suppliers'),
      ]);
      setProducts(productRes.data?.data || []);
      setCanViewCost(!!productRes.data?.can_view_cost);
      setSuppliers(supplierRes.data?.data || []);
    } catch (err) {
      showToast({ type: 'error', title: 'Load Failed', message: errorMessage(err, 'Could not load the product catalog.') });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products
      .filter((p) => showInactive || p.is_active !== false)
      .filter((p) => !needle || [p.sku, p.name, p.device_model, p.supplier_name]
        .some((v) => (v || '').toLowerCase().includes(needle)));
  }, [products, search, showInactive]);

  // Ticked rows, and the select-all box in the header
  const allPicked = rows.length > 0 && rows.every((p) => selectedIds.includes(String(p.id)));
  const toggleRow = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  const toggleAll = () => setSelectedIds(allPicked ? [] : rows.map((p) => String(p.id)));
  // Export the ticked products, or everything listed when nothing is ticked
  const exportRows = selectedIds.length > 0 ? rows.filter((p) => selectedIds.includes(String(p.id))) : rows;

  const afterChange = async () => {
    await load();
    if (onChanged) onChanged();
  };

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (product) => { setEditing(product); setFormOpen(true); };

  const remove = async (product) => {
    const label = product.name || product.sku;
    if (!window.confirm(`Delete or deactivate product '${label}'?`)) return;
    try {
      const res = await api.delete(`/api/products/${product.id}`);
      showToast({ type: 'unlink', title: 'Product Removed', message: res.data?.message || `${label} removed.` });
      await afterChange();
    } catch (err) {
      showToast({ type: 'error', title: 'Remove Failed', message: errorMessage(err, 'Could not remove the product.') });
    }
  };

  const exportCsv = () => {
    if (rows.length === 0) {
      showToast({ type: 'warning', title: 'No Data', message: 'No products to export.' });
      return;
    }
    const headers = ['ID', 'SKU', 'Product', ...(canViewCost ? ['Purchase Price ($)'] : []),
      'Warranty (months)', 'Model', 'Supplier', 'Reorder Level', 'Order', 'Status'];
    downloadCsv('products.csv', headers, exportRows.map((p) => [
      p.id, p.sku, p.name || '',
      ...(canViewCost ? [p.purchase_price != null ? Number(p.purchase_price).toFixed(2) : ''] : []),
      p.default_warranty_months ?? '', p.device_model || '', p.supplier_name || '',
      p.min_stock_level ?? '', p.is_order ?? '', p.is_active === false ? 'INACTIVE' : 'ACTIVE',
    ]));
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className={`${CARD} p-4 sm:p-5`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            className={`${INPUT} flex-1`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, product, model or supplier..."
          />
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            Show inactive
          </label>
          <button type="button" onClick={exportCsv} className={`${PLAIN_BUTTON} inline-flex items-center gap-1.5`}>
            <span>Export CSV</span>
            {selectedIds.length > 0 && (
              <span className="px-1.5 py-px bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                {selectedIds.length}
              </span>
            )}
          </button>
          <button type="button" onClick={openNew} className={PRIMARY_BUTTON}>+ New Product</button>
        </div>
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className={`${TH} w-12 text-center`}>
                  <RowCheckbox
                    checked={allPicked}
                    indeterminate={!allPicked && rows.some((p) => selectedIds.includes(String(p.id)))}
                    onChange={toggleAll}
                    label="Select all products"
                  />
                </th>
                <th className={TH}>SKU</th>
                <th className={TH}>Product</th>
                {canViewCost && <th className={`${TH} text-right`}>Purchase price</th>}
                <th className={TH}>Model</th>
                <th className={TH}>Supplier</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={canViewCost ? 8 : 7} className="px-4 py-10 text-center text-xs text-slate-500">Loading catalog...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={canViewCost ? 8 : 7} className="px-4 py-10 text-center text-xs text-slate-500">No products found.</td></tr>
              )}
              {!loading && rows.map((p) => (
                <tr key={p.id} className={`${ROW} ${selectedIds.includes(String(p.id)) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}>
                  <td className={`${TD} w-12 text-center`}>
                    <RowCheckbox
                      checked={selectedIds.includes(String(p.id))}
                      onChange={() => toggleRow(String(p.id))}
                      label={`Select ${p.sku}`}
                    />
                  </td>
                  <td className={`${TD} font-bold text-slate-900 dark:text-white`}>{p.sku}</td>
                  <td className={TD}>{p.name || '-'}</td>
                  {canViewCost && (
                    <td className={`${TD} text-right font-mono`}>
                      {p.purchase_price != null ? `$${Number(p.purchase_price).toFixed(2)}` : '-'}
                    </td>
                  )}
                  <td className={TD}>{p.device_model || '-'}</td>
                  <td className={TD}>{p.supplier_name || '-'}</td>
                  <td className={TD}><span className={statusPill(p.is_active !== false)}>{p.is_active === false ? 'INACTIVE' : 'ACTIVE'}</span></td>
                  <td className={`${TD} text-right space-x-2`}>
                    <button type="button" onClick={() => openEdit(p)} className="text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer hover:underline">Edit</button>
                    <button type="button" onClick={() => remove(p)} className="text-rose-600 dark:text-rose-400 font-bold cursor-pointer hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <ProductFormModal
          product={editing}
          suppliers={suppliers}
          canViewCost={canViewCost}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={afterChange}
        />
      )}
    </div>
  );
}
