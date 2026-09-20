import React from 'react';
import RowCheckbox from '../../components/RowCheckbox';
import { useLanguage } from '../../context/LanguageContext';
import { formatDate, formatMoney } from '../../lib/format';
import LowStockBadge from './LowStockBadge';
import { lineDeviceType, lineName } from './stockModel';

const onActivate = (handler) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handler();
  }
};

const quantityClass = (line) =>
  line.is_low || Number(line.available_quantity || 0) === 0
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-emerald-600 dark:text-emerald-400';

/** Desktop table (lg and up). `isVisible(key)` already accounts for cost permission. */
export function StockTable({ lines, isVisible, onOpenLine, pagination, selectedIds = [], onToggleLine, onToggleAll }) {
  const { t, isKhmer } = useLanguage();
  const th = 'px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400';
  const columnCount = 2 + ['sku', 'deviceType', 'deviceModel',
    'supplier', 'inStock', 'basePrice', 'purchasePrice', 'lastIntake'].filter(isVisible).length;
  const lineKey = (line) => String(line.product_id ?? line.id ?? line.device_type);
  const isPicked = (line) => selectedIds.includes(lineKey(line));
  const allPicked = lines.length > 0 && lines.every(isPicked);

  return (
    <div className="hidden lg:block mt-6 mb-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 select-none whitespace-nowrap">
              <th className="px-4 py-3 w-12 text-center">
                <RowCheckbox
                  checked={allPicked}
                  indeterminate={!allPicked && lines.some(isPicked)}
                  onChange={onToggleAll}
                  label={isKhmer ? 'ជ្រើសរើសទាំងអស់' : 'Select all products'}
                />
              </th>
              {isVisible('sku') && <th className={`${th} text-left`}>{t('sku', 'SKU')}</th>}
              {isVisible('deviceType') && <th className={`${th} text-left`}>{t('stockProduct', 'Product')}</th>}
              {isVisible('deviceModel') && <th className={`${th} text-left`}>{t('deviceModel', 'Device Model')}</th>}
              {isVisible('supplier') && <th className={`${th} text-left`}>{t('supplier', 'Supplier')}</th>}
              {isVisible('inStock') && <th className={`${th} text-right`}>{t('inStock', 'In Stock')}</th>}
              {isVisible('basePrice') && <th className={`${th} text-right`} title={t('basePriceHint', 'Selling price per unit')}>{t('basePrice', 'Base Price')}</th>}
              {isVisible('purchasePrice') && <th className={`${th} text-right`} title={t('purchasePriceHint', 'Cost from the supplier')}>{t('purchasePrice', 'Purchase Price')}</th>}
              {isVisible('lastIntake') && <th className={`${th} text-right`}>{t('lastStockIn', 'Last Stock In')}</th>}
              <th className="px-4 py-3 w-8" aria-hidden="true"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {lines.length > 0 ? lines.map((line) => (
              <tr
                key={line.id || line.product_id || line.device_type}
                onClick={() => onOpenLine(line)}
                onKeyDown={onActivate(() => onOpenLine(line))}
                tabIndex={0}
                title={isKhmer ? 'ចុចដើម្បីមើលលេខស៊េរី' : 'Click to view serial numbers'}
                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 focus:outline-none focus-visible:bg-emerald-50/60 dark:focus-visible:bg-emerald-950/30 transition group whitespace-nowrap cursor-pointer ${isPicked(line) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}
              >
                <td className="py-3 px-4 w-12 text-center align-middle">
                  <RowCheckbox
                    checked={isPicked(line)}
                    onChange={() => onToggleLine(lineKey(line))}
                    label={`${isKhmer ? 'ជ្រើសរើស' : 'Select'} ${line.sku || lineDeviceType(line)}`}
                  />
                </td>
                {isVisible('sku') && (
                  <td className="py-3 px-4 text-left align-middle font-mono font-bold text-slate-900 dark:text-white">{line.sku || '-'}</td>
                )}
                {isVisible('deviceType') && (
                  <td className="py-3 px-4 text-left align-middle text-slate-700 dark:text-slate-200 max-w-[22rem] truncate" title={lineDeviceType(line)}>
                    {lineDeviceType(line)}
                  </td>
                )}
                {isVisible('deviceModel') && (
                  <td className="py-3 px-4 text-left align-middle font-mono text-[11px] text-slate-500 dark:text-slate-400">{line.device_model || '-'}</td>
                )}
                {isVisible('supplier') && (
                  <td className="py-3 px-4 text-left align-middle text-slate-600 dark:text-slate-300">{line.supplier || '-'}</td>
                )}
                {isVisible('inStock') && (
                  <td className="py-3 px-4 text-right align-middle">
                    <span className="inline-flex items-center justify-end gap-2">
                      {line.is_low && <LowStockBadge />}
                      <span className={`font-mono font-bold text-sm ${quantityClass(line)}`}>
                        {Number(line.available_quantity || 0)}
                      </span>
                    </span>
                  </td>
                )}
                {isVisible('basePrice') && (
                  <td className="py-3 px-4 text-right align-middle font-mono font-semibold text-slate-800 dark:text-slate-200">{formatMoney(line.base_price)}</td>
                )}
                {isVisible('purchasePrice') && (
                  <td className="py-3 px-4 text-right align-middle font-mono text-slate-500 dark:text-slate-400">{formatMoney(line.purchase_price)}</td>
                )}
                {isVisible('lastIntake') && (
                  <td className="py-3 px-4 text-right align-middle font-mono text-[11px] text-slate-500 dark:text-slate-400">{formatDate(line.last_intake)}</td>
                )}
                <td className="py-3 pr-4 pl-0 text-right align-middle text-slate-300 group-hover:text-emerald-600 dark:text-slate-700 dark:group-hover:text-emerald-400 transition" aria-hidden="true">›</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={columnCount} className="py-14 text-center text-xs text-slate-400">No warehouse stock items match the specified filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination}
    </div>
  );
}

/** Mobile & tablet cards (below lg). */
export function StockCards({ lines, canViewCost, onOpenLine, pagination, selectedIds = [], onToggleLine }) {
  return (
    <>
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {lines.length > 0 ? lines.map((line) => (
          <div
            key={line.id || line.product_id || line.device_type}
            role="button"
            tabIndex={0}
            onClick={() => onOpenLine(line)}
            onKeyDown={onActivate(() => onOpenLine(line))}
            className={`rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-800 active:scale-[0.99] transition cursor-pointer touch-manipulation space-y-2 bg-white dark:bg-slate-900 ${
              selectedIds.includes(String(line.product_id ?? line.id ?? line.device_type)) ? 'ring-1 ring-emerald-400 dark:ring-emerald-700' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="pt-0.5 shrink-0">
                  <RowCheckbox
                    checked={selectedIds.includes(String(line.product_id ?? line.id ?? line.device_type))}
                    onChange={() => onToggleLine(String(line.product_id ?? line.id ?? line.device_type))}
                    label={`Select ${line.sku || lineName(line)}`}
                  />
                </span>
                <span className="min-w-0">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white block truncate">{line.sku || lineName(line)}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{lineDeviceType(line)}</span>
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className={`font-mono font-bold text-2xl leading-none ${quantityClass(line)}`}>{Number(line.available_quantity || 0)}</span>
                {line.is_low && <div className="mt-1"><LowStockBadge /></div>}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate">
                {line.supplier || '-'}
              </span>
              {canViewCost && <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 shrink-0">{formatMoney(line.base_price)}</span>}
            </div>
          </div>
        )) : (
          <div className="col-span-full text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No warehouse stock devices match the specified filters.
          </div>
        )}
      </div>
      <div className="lg:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {pagination}
      </div>
    </>
  );
}
