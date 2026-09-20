import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';
import { CARD, INPUT, LABEL, PLAIN_BUTTON, PRIMARY_BUTTON, SELECT, errorMessage } from './catalogUi';

const emptyForm = { sku: '', name: '', purchase_price: '', is_order: '', device_model: '', supplier_id: '', is_active: true };

const toForm = (product) => ({
  sku: product.sku || '',
  name: product.name || product.product_name || '',
  purchase_price: product.purchase_price != null ? String(product.purchase_price) : '',
  is_order: product.is_order != null ? String(product.is_order) : '',
  device_model: product.device_model || '',
  supplier_id: product.supplier_id != null ? String(product.supplier_id) : '',
  is_active: product.is_active !== false,
});

const numberOrNull = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Create or edit a catalog product.
 *
 * A product is the device type: its name is what Manage Stock shows as the type, `device_model` is the
 * hardware model code (the SKU when left blank) and the supplier is who it comes from.
 *
 * `purchase_price` is what the supplier charges you. The selling price (base price) is set per batch
 * in Add Stock. Warranty months and the reorder level keep their values on an edit, and a new product
 * starts at 3 months and a reorder level of 5.
 */
export default function ProductFormModal({ product, suppliers, canViewCost = true, onClose, onSaved }) {
  const { showToast } = useToast();
  const isEdit = !!product;
  const [form, setForm] = useState(() => (product ? toForm(product) : emptyForm));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(product ? toForm(product) : emptyForm); }, [product]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const sku = form.sku.trim();
    const name = form.name.trim();
    if (sku.length < 2 || name.length < 2) {
      showToast({ type: 'error', title: 'Missing Fields', message: 'SKU and product name are required.' });
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const payload = {
          sku, name,
          is_order: numberOrNull(form.is_order),
          is_active: form.is_active,
          device_model: form.device_model.trim() || null,
        };
        if (canViewCost) payload.purchase_price = numberOrNull(form.purchase_price);
        if (form.supplier_id) payload.supplier_id = Number(form.supplier_id);
        else payload.clear_supplier = true;
        await api.put(`/api/products/${product.id}`, payload);
        showToast({ type: 'update', title: 'Product Updated', message: `${name} was updated.` });
      } else {
        const payload = {
          sku, name,
          is_order: numberOrNull(form.is_order),
          device_model: form.device_model.trim() || null,
          supplier_id: numberOrNull(form.supplier_id),
        };
        if (canViewCost) payload.purchase_price = numberOrNull(form.purchase_price);
        await api.post('/api/products', payload);
        showToast({ type: 'add', title: 'Product Created', message: `${name} was added to the catalog.` });
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast({ type: 'error', title: 'Save Failed', message: errorMessage(err, 'Could not save the product.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <form
        onSubmit={submit}
        className={`${CARD} w-full sm:max-w-2xl rounded-b-none sm:rounded-2xl max-h-[92vh] overflow-y-auto`}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEdit ? `Edit Product - ${product.sku}` : 'New Product'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg font-bold cursor-pointer" aria-label="Close">x</button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL} htmlFor="product-sku">SKU</label>
            <input id="product-sku" className={INPUT} value={form.sku} onChange={set('sku')} placeholder="SCR-LED-W4G" />
          </div>
          <div>
            <label className={LABEL} htmlFor="product-name">Product name</label>
            <input id="product-name" className={INPUT} value={form.name} onChange={set('name')} placeholder="Soundbox LED Screen (Wifi + 4G only)" />
          </div>

          {canViewCost && (
            <div className="sm:col-span-2">
              <label className={LABEL} htmlFor="product-purchase">Purchase price (cost from the supplier, $)</label>
              <input id="product-purchase" className={INPUT} value={form.purchase_price} onChange={set('purchase_price')} inputMode="decimal" placeholder="7.00" />
            </div>
          )}

          <div>
            <label className={LABEL} htmlFor="product-model">Device model</label>
            <input id="product-model" className={INPUT} value={form.device_model} onChange={set('device_model')} placeholder="Blank = same as the SKU" />
          </div>
          <div>
            <label className={LABEL} htmlFor="product-supplier">Supplier</label>
            <select id="product-supplier" className={SELECT} value={form.supplier_id} onChange={set('supplier_id')}>
              <option value="">No supplier</option>
              {suppliers.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="product-order">Display order</label>
            <input id="product-order" className={INPUT} value={form.is_order} onChange={set('is_order')} inputMode="numeric" placeholder="1" />
          </div>
          {isEdit && (
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                Active in catalog
              </label>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-900">
          <button type="button" onClick={onClose} className={PLAIN_BUTTON}>Cancel</button>
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
            {saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Create product')}
          </button>
        </div>
      </form>
    </div>
  );
}
