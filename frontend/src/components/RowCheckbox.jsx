import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

/**
 * The square-icon checkbox used by the admin tables (Manage Devices, Stock, Product, Supplier).
 *
 * Clicks never reach the row underneath, so ticking a row in a clickable table does not open it.
 * `indeterminate` marks a header box when only some rows are ticked.
 */
export default function RowCheckbox({ checked, indeterminate = false, onChange, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="inline-flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer align-middle"
    >
      {checked ? (
        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      ) : indeterminate ? (
        <span className="w-4 h-4 rounded border-2 border-emerald-600 dark:border-emerald-400 flex items-center justify-center">
          <span className="w-2 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
        </span>
      ) : (
        <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
      )}
    </button>
  );
}
