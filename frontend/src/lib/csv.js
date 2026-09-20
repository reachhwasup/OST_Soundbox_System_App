// CSV export helpers.

export const csvCell = (value) => {
  if (value == null) return '';
  if (typeof value === 'number') return String(value);
  return `"${String(value).replace(/"/g, '""')}"`;
};

/** Downloads rows (arrays of raw values) as a UTF-8 CSV file. */
export function downloadCsv(filename, headers, rows) {
  const lines = [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
