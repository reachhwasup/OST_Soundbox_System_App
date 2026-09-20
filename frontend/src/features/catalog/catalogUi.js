// Shared Tailwind class strings for the Manage Product / Manage Supplier pages.

export const CARD = 'bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800';
export const INPUT = 'w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition';
export const SELECT = `${INPUT} cursor-pointer`;
export const LABEL = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';
export const PRIMARY_BUTTON = 'px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
export const PLAIN_BUTTON = 'px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer';
export const TH = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap';
export const TD = 'px-4 py-3 text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap';
export const ROW = 'border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition';

export const statusPill = (active) =>
  `px-2 py-0.5 rounded-full text-[10px] font-bold ${active
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`;

export const errorMessage = (err, fallback) => err?.response?.data?.detail || err?.message || fallback;
