import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api';
import RowCheckbox from '../../components/RowCheckbox';
import { useToast } from '../../context/ToastContext';
import SupplierFormModal from './SupplierFormModal';
import { downloadCsv } from '../../lib/csv';
import { CARD, INPUT, PLAIN_BUTTON, PRIMARY_BUTTON, ROW, TD, TH, errorMessage, statusPill } from './catalogUi';

/**
 * Manage Supplier: who the soundboxes are bought from.
 *
 * Each product names its supplier (Manage Product), so this page lists suppliers with the products
 * and devices that trace back to them. A supplier with devices is deactivated, not deleted.
 */
export default function SuppliersPage({ onChanged }) {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [supplierForm, setSupplierForm] = useState({ open: false, supplier: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [supplierRes, productRes] = await Promise.all([
        api.get('/api/suppliers'),
        api.get('/api/products/', { params: { include_inactive: true } }),
      ]);
      setSuppliers(supplierRes.data?.data || []);
      setProducts(productRes.data?.data || []);
    } catch (err) {
      showToast({ type: 'error', title: 'Load Failed', message: errorMessage(err, 'Could not load suppliers.') });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const afterChange = async () => {
    await load();
    if (onChanged) onChanged();
  };

  const filteredSuppliers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return suppliers;
    return suppliers.filter((s) => [s.name, s.contact_person, s.phone, s.email]
      .some((v) => (v || '').toLowerCase().includes(needle)));
  }, [suppliers, search]);

  const productsBySupplier = useMemo(() => {
    const grouped = {};
    products.forEach((product) => {
      const key = product.supplier_id ?? 'none';
      grouped[key] = grouped[key] || [];
      grouped[key].push(product);
    });
    return grouped;
  }, [products]);

  // Ticked rows, and the select-all box in the header
  const allPicked = filteredSuppliers.length > 0 && filteredSuppliers.every((s) => selectedIds.includes(String(s.id)));
  const toggleRow = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  const toggleAll = () => setSelectedIds(allPicked ? [] : filteredSuppliers.map((s) => String(s.id)));

  const exportCsv = () => {
    // Export the ticked suppliers, or everything listed when nothing is ticked
    const list = selectedIds.length > 0 ? filteredSuppliers.filter((s) => selectedIds.includes(String(s.id))) : filteredSuppliers;
    if (list.length === 0) {
      showToast({ type: 'warning', title: 'No Data', message: 'No suppliers to export.' });
      return;
    }
    downloadCsv('suppliers.csv', ['ID', 'Supplier', 'Contact', 'Phone', 'Email', 'Products', 'Devices', 'Status'],
      list.map((s) => [
        s.id, s.name, s.contact_person || '', s.phone || '', s.email || '',
        (productsBySupplier[s.id] || []).length, s.device_count ?? 0,
        s.is_active === false ? 'INACTIVE' : 'ACTIVE',
      ]));
  };

  const removeSupplier = async (supplier) => {
    if (!window.confirm(`Delete or deactivate supplier '${supplier.name}'?`)) return;
    try {
      const res = await api.delete(`/api/suppliers/${supplier.id}`);
      showToast({ type: 'unlink', title: 'Supplier Removed', message: res.data?.message || `${supplier.name} removed.` });
      await afterChange();
    } catch (err) {
      showToast({ type: 'error', title: 'Remove Failed', message: errorMessage(err, 'Could not remove the supplier.') });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className={`${CARD} p-4 sm:p-5`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            className={`${INPUT} flex-1`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier, contact, phone or email..."
          />
          <button type="button" onClick={exportCsv} className={`${PLAIN_BUTTON} inline-flex items-center gap-1.5`}>
            <span>Export CSV</span>
            {selectedIds.length > 0 && (
              <span className="px-1.5 py-px bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                {selectedIds.length}
              </span>
            )}
          </button>
          <button type="button" onClick={() => setSupplierForm({ open: true, supplier: null })} className={PRIMARY_BUTTON}>+ New Supplier</button>
        </div>
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Suppliers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className={`${TH} w-12 text-center`}>
                  <RowCheckbox
                    checked={allPicked}
                    indeterminate={!allPicked && filteredSuppliers.some((s) => selectedIds.includes(String(s.id)))}
                    onChange={toggleAll}
                    label="Select all suppliers"
                  />
                </th>
                <th className={TH}>Supplier</th>
                <th className={TH}>Contact</th>
                <th className={TH}>Phone</th>
                <th className={TH}>Email</th>
                <th className={`${TH} text-right`}>Products</th>
                <th className={`${TH} text-right`}>Devices</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="px-4 py-10 text-center text-xs text-slate-500">Loading suppliers...</td></tr>}
              {!loading && filteredSuppliers.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-xs text-slate-500">No suppliers found.</td></tr>
              )}
              {!loading && filteredSuppliers.map((s) => (
                <tr key={s.id} className={`${ROW} ${selectedIds.includes(String(s.id)) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}>
                  <td className={`${TD} w-12 text-center`}>
                    <RowCheckbox
                      checked={selectedIds.includes(String(s.id))}
                      onChange={() => toggleRow(String(s.id))}
                      label={`Select ${s.name}`}
                    />
                  </td>
                  <td className={`${TD} font-bold text-slate-900 dark:text-white`}>{s.name}</td>
                  <td className={TD}>{s.contact_person || '-'}</td>
                  <td className={TD}>{s.phone || '-'}</td>
                  <td className={TD}>{s.email || '-'}</td>
                  <td className={`${TD} text-right font-mono`}>{(productsBySupplier[s.id] || []).length}</td>
                  <td className={`${TD} text-right font-mono`}>{s.device_count ?? 0}</td>
                  <td className={TD}><span className={statusPill(s.is_active !== false)}>{s.is_active === false ? 'INACTIVE' : 'ACTIVE'}</span></td>
                  <td className={`${TD} text-right space-x-2`}>
                    <button type="button" onClick={() => setSupplierForm({ open: true, supplier: s })} className="text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer hover:underline">Edit</button>
                    <button type="button" onClick={() => removeSupplier(s)} className="text-rose-600 dark:text-rose-400 font-bold cursor-pointer hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {supplierForm.open && (
        <SupplierFormModal
          supplier={supplierForm.supplier}
          onClose={() => setSupplierForm({ open: false, supplier: null })}
          onSaved={afterChange}
        />
      )}
    </div>
  );
}
