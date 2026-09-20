import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';
import { CARD, INPUT, LABEL, PLAIN_BUTTON, PRIMARY_BUTTON, errorMessage } from './catalogUi';

const emptyForm = { name: '', contact_person: '', phone: '', email: '', address: '', notes: '', is_active: true };

const toForm = (supplier) => ({
  name: supplier.name || '',
  contact_person: supplier.contact_person || '',
  phone: supplier.phone || '',
  email: supplier.email || '',
  address: supplier.address || '',
  notes: supplier.notes || '',
  is_active: supplier.is_active !== false,
});

/** Create or edit a supplier. Device types point at a supplier, and products inherit it through their type. */
export default function SupplierFormModal({ supplier, onClose, onSaved }) {
  const { showToast } = useToast();
  const isEdit = !!supplier;
  const [form, setForm] = useState(() => (supplier ? toForm(supplier) : emptyForm));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(supplier ? toForm(supplier) : emptyForm); }, [supplier]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) {
      showToast({ type: 'error', title: 'Missing Fields', message: 'Supplier name is required.' });
      return;
    }
    const payload = {
      name,
      contact_person: form.contact_person.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/suppliers/${supplier.id}`, payload);
        showToast({ type: 'update', title: 'Supplier Updated', message: `${name} was updated.` });
      } else {
        await api.post('/api/suppliers', payload);
        showToast({ type: 'add', title: 'Supplier Created', message: `${name} was added.` });
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast({ type: 'error', title: 'Save Failed', message: errorMessage(err, 'Could not save the supplier.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <form onSubmit={submit} className={`${CARD} w-full sm:max-w-xl rounded-b-none sm:rounded-2xl max-h-[92vh] overflow-y-auto`}>
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{isEdit ? `Edit Supplier - ${supplier.name}` : 'New Supplier'}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg font-bold cursor-pointer" aria-label="Close">x</button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="supplier-name">Supplier name</label>
            <input id="supplier-name" className={INPUT} value={form.name} onChange={set('name')} placeholder="Feishu" />
          </div>
          <div>
            <label className={LABEL} htmlFor="supplier-contact">Contact person</label>
            <input id="supplier-contact" className={INPUT} value={form.contact_person} onChange={set('contact_person')} />
          </div>
          <div>
            <label className={LABEL} htmlFor="supplier-phone">Phone</label>
            <input id="supplier-phone" className={INPUT} value={form.phone} onChange={set('phone')} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="supplier-email">Email</label>
            <input id="supplier-email" className={INPUT} value={form.email} onChange={set('email')} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="supplier-address">Address</label>
            <input id="supplier-address" className={INPUT} value={form.address} onChange={set('address')} />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="supplier-notes">Notes</label>
            <textarea id="supplier-notes" rows={3} className={INPUT} value={form.notes} onChange={set('notes')} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
              Active supplier
            </label>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-900">
          <button type="button" onClick={onClose} className={PLAIN_BUTTON}>Cancel</button>
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>{saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Create supplier')}</button>
        </div>
      </form>
    </div>
  );
}
