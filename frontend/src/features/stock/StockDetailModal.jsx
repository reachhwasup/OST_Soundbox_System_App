import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../../api';
import Modal from '../../components/Modal';
import RowCheckbox from '../../components/RowCheckbox';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import LowStockBadge from './LowStockBadge';
import { lineName } from './stockModel';
import { formatDate, formatMoney } from '../../lib/format';

const ACTION_BASE = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed';

function UnitActions({ unit, onEdit, onDelete }) {
  const { t } = useLanguage();
  const hasDeviceRow = unit.id != null;
  const noRecord = 'No device record for this serial';
  return (
    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
      <button
        type="button"
        disabled={!hasDeviceRow}
        onClick={() => onEdit(unit)}
        title={hasDeviceRow ? t('edit', 'Edit') : noRecord}
        className={`${ACTION_BASE} bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`}
      >
        {t('edit', 'Edit')}
      </button>
      <button
        type="button"
        disabled={!hasDeviceRow}
        onClick={() => onDelete(unit)}
        title={hasDeviceRow ? t('delete', 'Delete') : noRecord}
        className={`${ACTION_BASE} bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800`}
      >
        {t('delete', 'Delete')}
      </button>
    </div>
  );
}

/**
 * Serial numbers of one product (scoped like the summary table), with the product's reorder level editor.
 * `onLineUpdated(productId, changes)` lets the page update its product row after a save.
 */
export default function StockDetailModal({
  line, onClose, onLineUpdated, currentAdmin, branchFilter, branches, devices, onSell, onEdit, onDelete,
}) {
  const { t, isKhmer } = useLanguage();
  const { showToast } = useToast();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [unitBranch, setUnitBranch] = useState('ALL');
  const [selected, setSelected] = useState([]);
  const [reorderInput, setReorderInput] = useState('');
  const [saving, setSaving] = useState(false);

  const productId = line?.product_id ?? null;
  const savedLevel = line?.min_stock_level != null ? String(line.min_stock_level) : '';

  useEffect(() => {
    if (!line) return undefined;
    setSearch('');
    setUnitBranch('ALL');
    setSelected([]);
    setReorderInput(line.min_stock_level != null ? String(line.min_stock_level) : '');

    // Fallback lines (API unavailable) have no product: list matching un-assigned devices directly
    if (productId == null) {
      setUnits((devices || []).filter((d) =>
        !d.merchant_id &&
        !['PENDING', 'ACTIVE'].includes(String(d.status || '').toUpperCase()) &&
        (d.device_type || 'Soundbox') === line.device_type &&
        (branchFilter === 'ALL' || !d.branch_id || String(d.branch_id) === String(branchFilter))
      ).map((d) => ({ ...d, serial_number: d.device_sn, base_price: null })));
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setUnits([]);
      try {
        const params = new URLSearchParams({ product_id: String(productId) });
        // Branch admins are scoped by the API; super admins follow the page's branch filter
        if (!currentAdmin?.branch_id && branchFilter !== 'ALL') params.set('branch_id', String(branchFilter));
        const res = await api.get(`/api/products/stock?${params.toString()}`);
        if (cancelled) return;
        // devices.id is what sell / edit / delete expect; keep the stock transaction id separately
        setUnits((res.data?.data || []).map((r) => ({ ...r, id: r.device_row_id ?? null, transaction_id: r.transaction_id ?? r.id })));
      } catch (err) {
        if (!cancelled) {
          setUnits([]);
          showToast({ type: 'error', title: 'Load Failed', message: err.response?.data?.detail || 'Failed to load stock units.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // Reload only when a different product is opened or the scope changes (not after a reorder-level save)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, line?.device_type, branchFilter, currentAdmin?.branch_id]);

  // Every branch this admin covers, so the window can be narrowed to one of them
  const branchOptions = useMemo(
    () => (branches || [])
      .map((b) => {
        const id = String(b.branch_id ?? b.id);
        return { id, name: b.branch_name || `Branch #${id}` };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    [branches]
  );

  // Only an admin who covers every branch needs it: a branch admin, or a page already filtered
  // to one branch, is scoped to that branch anyway.
  const showBranchFilter = !currentAdmin?.branch_id && branchFilter === 'ALL' && branchOptions.length > 1;

  // Branch narrows the scope (it changes the unit count); search only looks inside that scope
  const branchUnits = useMemo(
    () => (unitBranch === 'ALL' ? units : units.filter((u) => String(u.branch_id ?? u.branch_name) === unitBranch)),
    [units, unitBranch]
  );

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branchUnits;
    return branchUnits.filter((u) =>
      [u.serial_number, u.device_sn, u.branch_name].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [branchUnits, search]);

  // Selection is keyed by serial number and never keeps a serial that left the list
  const unitKey = (unit) => String(unit.serial_number || unit.device_sn || unit.device_id || '');
  const visibleKeys = useMemo(() => filteredUnits.map(unitKey), [filteredUnits]);
  const selectedKeys = useMemo(() => selected.filter((k) => visibleKeys.includes(k)), [selected, visibleKeys]);
  const allSelected = visibleKeys.length > 0 && selectedKeys.length === visibleKeys.length;
  const isSelected = (unit) => selectedKeys.includes(unitKey(unit));

  const toggleUnit = (unit) => {
    const key = unitKey(unit);
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const toggleAll = () => setSelected(allSelected ? [] : visibleKeys);

  const saveReorderLevel = async () => {
    if (productId == null) return;
    const raw = String(reorderInput).trim();
    const level = raw === '' ? null : Number(raw);
    if (level !== null && (!Number.isInteger(level) || level < 0)) {
      showToast({ type: 'error', title: 'Invalid Reorder Level', message: 'Enter a whole number of 0 or more, or leave it empty.' });
      return;
    }
    setSaving(true);
    try {
      await api.put(`/api/products/${productId}`, level === null ? { clear_min_stock_level: true } : { min_stock_level: level });
      onLineUpdated(productId, { min_stock_level: level });
      showToast({ type: 'success', title: 'Reorder Level Saved', message: `${lineName(line)}: ${level === null ? 'no reorder level' : level}` });
    } catch (err) {
      showToast({ type: 'error', title: 'Save Failed', message: err.response?.data?.detail || 'Failed to save reorder level.' });
    } finally {
      setSaving(false);
    }
  };

  // Close the window before running a unit action (those open their own modals)
  const act = (action) => (unit) => { onClose(); action(unit); };

  // Sell everything checked in one go (the sell window handles one unit or many)
  const sellSelected = () => {
    const units = filteredUnits.filter(isSelected);
    if (units.length === 0) return;
    onClose();
    onSell(units);
  };

  const pageScopeLabel = currentAdmin?.branch_id
    ? (currentAdmin.branch_name || `Branch #${currentAdmin.branch_id}`)
    : (branchFilter === 'ALL'
        ? t('allBranches', 'All Branches')
        : (branches.find((b) => String(b.id ?? b.branch_id) === String(branchFilter))?.branch_name || `Branch #${branchFilter}`));
  // The branch chosen inside this window wins over the page's scope
  const scopeLabel = unitBranch === 'ALL'
    ? pageScopeLabel
    : (branchOptions.find((b) => b.id === unitBranch)?.name || pageScopeLabel);
  const modelSupplier = line ? [line.device_model, line.supplier].filter(Boolean).join(' · ') : '';
  // Price of this serial (its stock movement's unit price), else the product's price
  const unitPrice = (unit) => {
    const value = unit.price ?? unit.final_price ?? line?.price;
    return value == null ? '-' : formatMoney(value);
  };
  const warrantyLabel = (unit) => {
    const months = unit.warranty_months ?? line?.default_warranty_months;
    return months == null ? '-' : `${months} ${t('monthsShort', 'mo')}`;
  };

  return (
    <Modal
      isOpen={!!line}
      onClose={onClose}
      title={line ? `${lineName(line)}${line.sku ? ` · ${line.sku}` : ''}` : ''}
      maxWidth="max-w-4xl"
    >
      {line && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
              <span className={`font-mono font-bold text-sm ${line.is_low ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {loading ? '…' : branchUnits.length}
              </span>
              <span>{isKhmer ? 'ឧបករណ៍ក្នុងស្តុក' : 'units in stock'}</span>
              {line.is_low && <LowStockBadge />}
              <span className="text-slate-400">· {scopeLabel}</span>
              {modelSupplier && <span className="text-slate-400">· {modelSupplier}</span>}
            </div>

            {productId != null && (
              <form onSubmit={(e) => { e.preventDefault(); saveReorderLevel(); }} className="flex items-center gap-1.5 lg:ml-auto shrink-0">
                <label htmlFor="stock-reorder-level" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {t('reorderLevel', 'Reorder level')}
                </label>
                <input
                  id="stock-reorder-level"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={reorderInput}
                  onChange={(e) => setReorderInput(e.target.value)}
                  placeholder={isKhmer ? 'គ្មាន' : 'None'}
                  className="w-20 px-2 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={saving || String(reorderInput) === savedLevel}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? '…' : t('save', 'Save')}
                </button>
              </form>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកលេខស៊េរី ឬសាខា...' : 'Search serial or branch...'}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {showBranchFilter && (
              <select
                value={unitBranch}
                onChange={(e) => setUnitBranch(e.target.value)}
                aria-label={t('branch', 'Branch')}
                className="sm:w-60 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL">{t('allBranches', 'All Branches')}</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          {selectedKeys.length === 0 && filteredUnits.length > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {isKhmer ? 'ធីកលេខស៊េរីដើម្បីលក់' : 'Tick serials to sell them.'}
            </p>
          )}

          {selectedKeys.length > 0 && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                {selectedKeys.length} {isKhmer ? 'បានជ្រើសរើស' : 'selected'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  {isKhmer ? 'សម្អាត' : 'Clear'}
                </button>
                <button
                  type="button"
                  onClick={sellSelected}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {t('sellDevice', 'Sell')} {selectedKeys.length}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{isKhmer ? 'កំពុងផ្ទុក...' : 'Loading units...'}</span>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">{isKhmer ? 'មិនមានឧបករណ៍ក្នុងស្តុក' : 'No units found.'}</div>
          ) : (
            <>
              {/* Desktop / tablet */}
              <div className="hidden sm:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[680px]">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <th className="py-2.5 pl-3 pr-0 w-9">
                        <RowCheckbox
                          checked={allSelected}
                          indeterminate={selectedKeys.length > 0 && !allSelected}
                          onChange={toggleAll}
                          label={isKhmer ? 'ជ្រើសរើសទាំងអស់' : 'Select all serials'}
                        />
                      </th>
                      <th className="py-2.5 px-3 text-left">{t('serialNumber', 'Serial Number')}</th>
                      <th className="py-2.5 px-3 text-left">{t('branchName', 'Branch Name')}</th>
                      <th className="py-2.5 px-3 text-right">{t('unitPrice', 'Unit Price')}</th>
                      <th className="py-2.5 px-3 text-right">{t('warrantyMonthsColumn', 'Warranty')}</th>
                      <th className="py-2.5 px-3 text-right">{t('inStockDate', 'In Stock Date')}</th>
                      <th className="py-2.5 px-3 text-right">{t('operation', 'Operation')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUnits.map((u) => {
                      const sn = u.serial_number || u.device_sn || u.device_id;
                      return (
                        <tr key={u.transaction_id || sn} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 whitespace-nowrap ${isSelected(u) ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}>
                          <td className="py-2.5 pl-3 pr-0">
                            <RowCheckbox
                              checked={isSelected(u)}
                              onChange={() => toggleUnit(u)}
                              label={`${isKhmer ? 'ជ្រើសរើស' : 'Select'} ${sn}`}
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">{sn}</td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{u.branch_name || '-'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200">{unitPrice(u)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">{warrantyLabel(u)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">{formatDate(u.created_at)}</td>
                          <td className="py-2.5 px-3"><UnitActions unit={u} onEdit={act(onEdit)} onDelete={act(onDelete)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phone */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {filteredUnits.map((u) => {
                  const sn = u.serial_number || u.device_sn || u.device_id;
                  return (
                    <div key={u.transaction_id || sn} className={`p-3 space-y-2 ${isSelected(u) ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-white dark:bg-slate-900'}`}>
                      <div className="flex items-start gap-2">
                        <span className="pt-0.5 shrink-0">
                          <RowCheckbox
                            checked={isSelected(u)}
                            onChange={() => toggleUnit(u)}
                            label={`${isKhmer ? 'ជ្រើសរើស' : 'Select'} ${sn}`}
                          />
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white break-all">{sn}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {u.branch_name || '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('unitPrice', 'Unit Price')}: <span className="font-mono text-slate-700 dark:text-slate-300">{unitPrice(u)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('warrantyMonthsColumn', 'Warranty')}: {warrantyLabel(u)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('inStockDate', 'In Stock Date')}: {formatDate(u.created_at)}
                      </div>
                      <UnitActions unit={u} onEdit={act(onEdit)} onDelete={act(onDelete)} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
