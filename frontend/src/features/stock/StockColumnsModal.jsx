import React from 'react';
import Modal from '../../components/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { COST_COLUMNS, DEFAULT_STOCK_COLUMNS } from './stockModel';

export default function StockColumnsModal({ isOpen, onClose, columns, onChange, canViewCost }) {
  const { t } = useLanguage();
  const labels = {
    sku: t('sku', 'SKU'),
    basePrice: t('basePrice', 'Base Price'),
    purchasePrice: t('purchasePrice', 'Purchase Price'),
    deviceType: t('stockProduct', 'Product'),
    supplier: t('supplier', 'Supplier'),
    inStock: t('inStock', 'In Stock'),
    deviceModel: t('deviceModel', 'Device Model'),
    lastIntake: t('lastStockIn', 'Last Stock In'),
  };
  const keys = Object.keys(DEFAULT_STOCK_COLUMNS).filter((key) => canViewCost || !COST_COLUMNS.has(key));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Stock Table Columns">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Select the columns you wish to display in the Warehouse Stock table:</p>
        <div className="grid grid-cols-2 gap-2.5">
          {keys.map((key) => (
            <label key={key} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={!!columns[key]}
                onChange={(e) => onChange({ ...columns, [key]: e.target.checked })}
                className="accent-amber-600 rounded"
              />
              <span className="font-medium text-slate-800 dark:text-slate-200">{labels[key]}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={() => onChange(DEFAULT_STOCK_COLUMNS)} className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer">
            Reset to Default
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
