import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';
import { CARD, INPUT, LABEL, PLAIN_BUTTON, PRIMARY_BUTTON, errorMessage } from './catalogUi';

const emptyForm = { branch_code: '', branch_name: '', location: '', is_active: true };

const toForm = (branch) => ({
  branch_code: branch.branch_code || '',
  branch_name: branch.branch_name || '',
  location: branch.location || '',
  is_active: branch.is_active !== false,
});

/** Create or edit a branch: the warehouse a serial sits in, and the scope a branch admin works within. */
export default function BranchFormModal({ branch, onClose, onSaved }) {
  const { showToast } = useToast();
  const isEdit = !!branch;
  const [form, setForm] = useState(() => (branch ? toForm(branch) : emptyForm));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(branch ? toForm(branch) : emptyForm); }, [branch]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const code = form.branch_code.trim().toUpperCase();
    const name = form.branch_name.trim();
    if (code.length < 2 || name.length < 2) {
      showToast({ type: 'error', title: 'Missing Fields', message: 'Branch code and branch name are required.' });
      return;
    }

    const payload = { branch_code: code, branch_name: name, location: form.location.trim() };
    if (isEdit) payload.is_active = form.is_active;

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/branches/${branch.branch_id ?? branch.id}`, payload);
        showToast({
          type: 'update',
          title: 'Branch Updated',
          message: payload.is_active === false
            ? `${name} is now closed. Tick "Show closed" to see it.`
            : `${name} was updated.`,
        });
      } else {
        await api.post('/api/branches/', payload);
        showToast({ type: 'add', title: 'Branch Created', message: `${name} was added.` });
      }
      onSaved(payload);
      onClose();
    } catch (err) {
      showToast({ type: 'error', title: 'Save Failed', message: errorMessage(err, 'Could not save the branch.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <form onSubmit={submit} className={`${CARD} w-full sm:max-w-lg rounded-b-none sm:rounded-2xl max-h-[92vh] overflow-y-auto`}>
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEdit ? `Edit Branch - ${branch.branch_code}` : 'New Branch'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg font-bold cursor-pointer" aria-label="Close">x</button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL} htmlFor="branch-code">Branch code</label>
            <input id="branch-code" className={INPUT} value={form.branch_code} onChange={set('branch_code')} placeholder="KP-01" />
          </div>
          <div>
            <label className={LABEL} htmlFor="branch-name">Branch name</label>
            <input id="branch-name" className={INPUT} value={form.branch_name} onChange={set('branch_name')} placeholder="Kampot Branch" />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="branch-location">Location</label>
            <input id="branch-location" className={INPUT} value={form.location} onChange={set('location')} placeholder="Kampot" />
          </div>
          {isEdit && (
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
                Open branch
              </label>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-900">
          <button type="button" onClick={onClose} className={PLAIN_BUTTON}>Cancel</button>
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
            {saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Create branch')}
          </button>
        </div>
      </form>
    </div>
  );
}
