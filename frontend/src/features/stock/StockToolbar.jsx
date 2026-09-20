import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const SELECT = 'w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer';
const FIELD_LABEL = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';
const PLAIN_BUTTON = 'hidden sm:flex px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer items-center justify-center shadow-2xs shrink-0';

export default function StockToolbar({
  search, onSearchChange,
  typeFilter, onTypeFilterChange, typeOptions,
  sort, onSortChange,
  branchFilter, onBranchFilterChange,
  branches, currentAdmin, canViewCost,
  activeFilterCount,
  onAddStock, onResetFilters, onExport, onOpenColumns, selectedCount = 0,
}) {
  const { t } = useLanguage();
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
      {/* Search + actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchStockPlaceholder', 'Search product, SKU, model or supplier...')}
            className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold text-sm"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <button
            type="button"
            onClick={onAddStock}
            className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation whitespace-nowrap"
          >
            <span>{t('addStockDevice', '+ Add Stock')}</span>
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Reset Filters"
              className="px-2.5 py-2 sm:py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 shrink-0 touch-manipulation"
            >
              <span>{t('reset', 'Reset')}</span>
            </button>
          )}

          <button type="button" onClick={onExport} title="Export CSV" className={`${PLAIN_BUTTON} touch-manipulation gap-1.5`}>
            <span>{t('exportCsv', 'Export')}</span>
            {selectedCount > 0 && (
              <span className="px-1.5 py-px bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                {selectedCount}
              </span>
            )}
          </button>
          <button type="button" onClick={onOpenColumns} title="Columns" className={PLAIN_BUTTON}>
            <span>{t('columns', 'Columns')}</span>
          </button>
        </div>
      </div>

      {/* Stock filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div>
          <label className={FIELD_LABEL}>{t('branch', 'Branch')}</label>
          {currentAdmin?.branch_id ? (
            <div className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate">{currentAdmin.branch_name || `Branch #${currentAdmin.branch_id}`}</span>
            </div>
          ) : (
            <select value={branchFilter} onChange={(e) => onBranchFilterChange(e.target.value)} className={`${SELECT} font-medium`}>
              <option value="ALL">{t('allBranches', 'All Branches')}</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={String(b.branch_id)}>{b.branch_name} ({b.branch_code})</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className={FIELD_LABEL}>{t('stockProduct', 'Product')}</label>
          <select value={typeFilter} onChange={(e) => onTypeFilterChange(e.target.value)} className={SELECT}>
            <option value="ALL">{t('allProducts', 'All Products')}</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={FIELD_LABEL}>{t('sortBy', 'Sort By')}</label>
          <select value={sort} onChange={(e) => onSortChange(e.target.value)} className={`${SELECT} font-medium`}>
            <option value="LOW_FIRST">{t('sortLowStockFirst', 'Low Stock First')}</option>
            <option value="QTY_ASC">{t('sortQtyAsc', 'Quantity (Lowest First)')}</option>
            <option value="QTY_DESC">{t('sortQtyDesc', 'Quantity (Highest First)')}</option>
            <option value="NAME_ASC">{t('sortProductAsc', 'Product (A → Z)')}</option>
            <option value="NAME_DESC">{t('sortProductDesc', 'Product (Z → A)')}</option>
            {canViewCost && <option value="VALUE_DESC">{t('sortValueDesc', 'Stock Value (Highest First)')}</option>}
            <option value="LAST_INTAKE_DESC">{t('sortLastIntakeDesc', 'Last Stock In (Newest)')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
