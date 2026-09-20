import React, { useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../lib/usePersistentState';
import { downloadCsv } from '../../lib/csv';

import { useToast } from '../../context/ToastContext';
import StockColumnsModal from './StockColumnsModal';
import StockDetailModal from './StockDetailModal';
import { StockCards, StockTable } from './StockTable';
import StockToolbar from './StockToolbar';
import {
  COST_COLUMNS, DEFAULT_STOCK_COLUMNS, DEFAULT_STOCK_SORT, STOCK_COLUMNS_STORAGE_KEY,
  buildFallbackLines, deviceTypeOptions, filterAndSortLines, formatBranchBreakdown, lineDeviceType,
} from './stockModel';

/**
 * Manage Stock tab: one row per product (quantity, value, low stock) with a serial-number details window.
 *
 * Data (`productStock` from /api/products/stock/summary) and the branch filter live in the dashboard because
 * data loading and the Add Stock form also use them. Everything else is owned here.
 */
export default function StockPage({
  productStock, setProductStock, canViewCost,
  branchFilter, setBranchFilter,
  devices, branches, currentAdmin,
  onAddStock, onSell, onEdit, onDelete,
  renderPagination,
}) {
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sort, setSort] = useState(DEFAULT_STOCK_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [goToPage, setGoToPage] = useState('');
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [detailLine, setDetailLine] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [columns, setColumns] = usePersistentState(STOCK_COLUMNS_STORAGE_KEY, DEFAULT_STOCK_COLUMNS);

  useEffect(() => { setPage(1); }, [search, typeFilter, branchFilter, sort]);

  const sourceLines = useMemo(
    () => (productStock && productStock.length > 0 ? productStock : buildFallbackLines(devices, branchFilter)),
    [productStock, devices, branchFilter]
  );
  const typeOptions = useMemo(() => deviceTypeOptions(sourceLines), [sourceLines]);
  const lines = useMemo(() => filterAndSortLines(sourceLines, { search, typeFilter, sort }), [sourceLines, search, typeFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
  const pageLines = useMemo(() => lines.slice((page - 1) * pageSize, page * pageSize), [lines, page, pageSize]);

  // A product that left the list can no longer stay selected
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => lines.some((l) => String(l.product_id ?? l.id ?? l.device_type) === id)));
  }, [lines]);

  const activeFilterCount = [search.trim(), typeFilter !== 'ALL', branchFilter !== 'ALL', sort !== DEFAULT_STOCK_SORT].filter(Boolean).length;
  const isVisible = (key) => !!columns[key] && (canViewCost || !COST_COLUMNS.has(key));

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setBranchFilter('ALL');
    setSort(DEFAULT_STOCK_SORT);
    setPage(1);
  };

  const lineKey = (line) => String(line.product_id ?? line.id ?? line.device_type);
  const toggleLine = (key) => setSelectedIds((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const toggleAllOnPage = () => {
    const keys = pageLines.map(lineKey);
    const allPicked = keys.length > 0 && keys.every((k) => selectedIds.includes(k));
    setSelectedIds(allPicked ? selectedIds.filter((k) => !keys.includes(k)) : [...new Set([...selectedIds, ...keys])]);
  };
  // Export the ticked products, or everything on screen when nothing is ticked
  const exportLines = selectedIds.length > 0 ? lines.filter((l) => selectedIds.includes(lineKey(l))) : lines;

  const exportCsv = () => {
    if (lines.length === 0) {
      showToast({ type: 'warning', title: 'No Data', message: 'No warehouse stock records to export.' });
      return;
    }
    const headers = ['ID', 'SKU', 'Product', 'Device Model',
      'Supplier', 'In Stock', ...(canViewCost ? ['Base Price ($)'] : []), 'By Branch', 'Reorder Level', 'Low Stock', 'Last Stock In'];
    const rows = exportLines.map((l) => [
      l.product_id ?? '', l.sku,
      lineDeviceType(l), l.device_model, l.supplier,
      Number(l.available_quantity || 0),
      ...(canViewCost ? [l.base_price != null ? Number(l.base_price).toFixed(2) : ''] : []),
      formatBranchBreakdown(l),
      l.min_stock_level ?? '', l.is_low ? 'YES' : 'NO',
      l.last_intake ? l.last_intake.slice(0, 10) : '',
    ]);
    downloadCsv(`warehouse_stock_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast({ type: 'success', title: 'Export Successful', message: `Exported ${lines.length} stock records.` });
  };

  // Apply a saved change (e.g. reorder level) to the product row and the open details window
  const updateLine = (productId, changes) => {
    const apply = (row) => {
      if (String(row.product_id) !== String(productId)) return row;
      const next = { ...row, ...changes };
      next.is_low = next.min_stock_level != null && Number(next.available_quantity || 0) <= next.min_stock_level;
      return next;
    };
    setProductStock((prev) => (prev || []).map(apply));
    setDetailLine((prev) => (prev ? apply(prev) : prev));
  };

  const pagination = renderPagination({
    currentPage: page,
    totalPages,
    totalItems: lines.length,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
    goToPageVal: goToPage,
    setGoToPageVal: setGoToPage,
  });

  return (
    <div className="space-y-4">
      <StockToolbar
        search={search} onSearchChange={setSearch}
        typeFilter={typeFilter} onTypeFilterChange={setTypeFilter} typeOptions={typeOptions}
        sort={sort} onSortChange={setSort}
        branchFilter={branchFilter} onBranchFilterChange={setBranchFilter}
        branches={branches} currentAdmin={currentAdmin} canViewCost={canViewCost}
        activeFilterCount={activeFilterCount}
        onAddStock={onAddStock}
        onResetFilters={resetFilters} onExport={exportCsv} onOpenColumns={() => setColumnsOpen(true)}
        selectedCount={selectedIds.length}
      />

      <StockTable
        lines={pageLines}
        isVisible={isVisible}
        onOpenLine={setDetailLine}
        pagination={pagination}
        selectedIds={selectedIds}
        onToggleLine={toggleLine}
        onToggleAll={toggleAllOnPage}
      />
      <StockCards
        lines={pageLines}
        canViewCost={canViewCost}
        onOpenLine={setDetailLine}
        pagination={pagination}
        selectedIds={selectedIds}
        onToggleLine={toggleLine}
      />

      <StockDetailModal
        line={detailLine}
        onClose={() => setDetailLine(null)}
        onLineUpdated={updateLine}
        currentAdmin={currentAdmin}
        branchFilter={branchFilter}
        branches={branches}
        devices={devices}
        onSell={onSell}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <StockColumnsModal
        isOpen={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={columns}
        onChange={setColumns}
        canViewCost={canViewCost}
      />
    </div>
  );
}
