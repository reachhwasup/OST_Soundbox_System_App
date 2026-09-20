import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api';
import RowCheckbox from '../../components/RowCheckbox';
import { useToast } from '../../context/ToastContext';
import { downloadCsv } from '../../lib/csv';
import BranchFormModal from './BranchFormModal';
import { CARD, INPUT, PLAIN_BUTTON, PRIMARY_BUTTON, ROW, TD, TH, errorMessage, statusPill } from './catalogUi';

/**
 * Manage Branch: the warehouses stock sits in.
 *
 * A branch scopes everything else: serials are stocked and transferred between branches, and a branch
 * admin only sees their own. A branch with history is closed rather than deleted.
 */
export default function BranchesPage({ onChanged }) {
  const { showToast } = useToast();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({ open: false, branch: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/branches/', { params: { include_inactive: true } });
      setBranches(res.data?.data || []);
    } catch (err) {
      showToast({ type: 'error', title: 'Load Failed', message: errorMessage(err, 'Could not load branches.') });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return branches
      .filter((b) => showClosed || b.is_active !== false)
      .filter((b) => !needle || [b.branch_code, b.branch_name, b.location]
        .some((v) => (v || '').toLowerCase().includes(needle)));
  }, [branches, search, showClosed]);

  const rowKey = (branch) => String(branch.branch_id ?? branch.id);
  const allPicked = rows.length > 0 && rows.every((b) => selectedIds.includes(rowKey(b)));
  const toggleRow = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  const toggleAll = () => setSelectedIds(allPicked ? [] : rows.map(rowKey));

  // A branch that was just closed would otherwise vanish from the page
  const afterChange = async (saved) => {
    if (saved && saved.is_active === false) setShowClosed(true);
    await load();
    if (onChanged) onChanged();
  };

  const closedCount = branches.filter((b) => b.is_active === false).length;

  const remove = async (branch) => {
    if (!window.confirm(`Delete or close branch '${branch.branch_name}'?`)) return;
    try {
      const res = await api.delete(`/api/branches/${rowKey(branch)}`);
      showToast({ type: 'unlink', title: 'Branch Removed', message: res.data?.message || `${branch.branch_name} removed.` });
      await afterChange(res.data?.data?.deactivated ? { is_active: false } : null);
    } catch (err) {
      showToast({ type: 'error', title: 'Remove Failed', message: errorMessage(err, 'Could not remove the branch.') });
    }
  };

  const exportCsv = () => {
    // Export the ticked branches, or everything listed when nothing is ticked
    const list = selectedIds.length > 0 ? rows.filter((b) => selectedIds.includes(rowKey(b))) : rows;
    if (list.length === 0) {
      showToast({ type: 'warning', title: 'No Data', message: 'No branches to export.' });
      return;
    }
    downloadCsv('branches.csv', ['ID', 'Code', 'Branch', 'Location', 'In Stock', 'Users', 'Status'],
      list.map((b) => [
        rowKey(b), b.branch_code, b.branch_name, b.location || '',
        b.stock_count ?? 0, b.user_count ?? 0, b.is_active === false ? 'CLOSED' : 'OPEN',
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
            placeholder="Search branch, code or location..."
          />
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="w-4 h-4 accent-emerald-600 cursor-pointer" />
            Show closed
          </label>
          <button type="button" onClick={exportCsv} className={`${PLAIN_BUTTON} inline-flex items-center gap-1.5`}>
            <span>Export CSV</span>
            {selectedIds.length > 0 && (
              <span className="px-1.5 py-px bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                {selectedIds.length}
              </span>
            )}
          </button>
          <button type="button" onClick={() => setForm({ open: true, branch: null })} className={PRIMARY_BUTTON}>+ New Branch</button>
        </div>

        {!showClosed && closedCount > 0 && (
          <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
            {closedCount} closed {closedCount === 1 ? 'branch is' : 'branches are'} hidden.{' '}
            <button type="button" onClick={() => setShowClosed(true)} className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
              Show them
            </button>
          </p>
        )}
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className={`${TH} w-12 text-center`}>
                  <RowCheckbox
                    checked={allPicked}
                    indeterminate={!allPicked && rows.some((b) => selectedIds.includes(rowKey(b)))}
                    onChange={toggleAll}
                    label="Select all branches"
                  />
                </th>
                <th className={TH}>Code</th>
                <th className={TH}>Branch</th>
                <th className={TH}>Location</th>
                <th className={`${TH} text-right`}>In Stock</th>
                <th className={`${TH} text-right`}>Users</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-slate-500">Loading branches...</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-slate-500">No branches found.</td></tr>
              )}
              {!loading && rows.map((b) => (
                <tr key={rowKey(b)} className={`${ROW} ${selectedIds.includes(rowKey(b)) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}>
                  <td className={`${TD} w-12 text-center`}>
                    <RowCheckbox
                      checked={selectedIds.includes(rowKey(b))}
                      onChange={() => toggleRow(rowKey(b))}
                      label={`Select ${b.branch_name}`}
                    />
                  </td>
                  <td className={`${TD} font-mono font-bold text-slate-900 dark:text-white`}>{b.branch_code}</td>
                  <td className={TD}>{b.branch_name}</td>
                  <td className={TD}>{b.location || '-'}</td>
                  <td className={`${TD} text-right font-mono`}>{b.stock_count ?? 0}</td>
                  <td className={`${TD} text-right font-mono`}>{b.user_count ?? 0}</td>
                  <td className={TD}>
                    <span className={statusPill(b.is_active !== false)}>{b.is_active === false ? 'CLOSED' : 'OPEN'}</span>
                  </td>
                  <td className={`${TD} text-right space-x-2`}>
                    <button type="button" onClick={() => setForm({ open: true, branch: b })} className="text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer hover:underline">Edit</button>
                    <button type="button" onClick={() => remove(b)} className="text-rose-600 dark:text-rose-400 font-bold cursor-pointer hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {form.open && (
        <BranchFormModal
          branch={form.branch}
          onClose={() => setForm({ open: false, branch: null })}
          onSaved={afterChange}
        />
      )}
    </div>
  );
}
