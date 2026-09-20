import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function LowStockBadge() {
  const { t } = useLanguage();
  return (
    <span className="px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
      {t('lowStock', 'Low Stock')}
    </span>
  );
}
