"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type FilterFn,
  type SortingState,
} from "@tanstack/react-table";
import {useCallback, useMemo, useState} from "react";
import {useUiLocale} from "@/contexts/ui-locale-context";

export function SortableHeader<T>({
  column,
  children,
}: {
  column: Column<T, unknown>;
  children: React.ReactNode;
}) {
  if (!column.getCanSort()) {
    return <span className="font-medium">{children}</span>;
  }
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-900"
      onClick={column.getToggleSortingHandler()}
    >
      {children}
      <span className="text-[10px] tabular-nums text-gray-400" aria-hidden>
        {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
      </span>
    </button>
  );
}

export type AdminDataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  getRowId: (row: T, index: number) => string;
  emptyLabel: string;
  filteredEmptyLabel?: string;
  minTableWidth?: number | string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

export function AdminDataTable<T>({
  data,
  columns,
  getRowId,
  emptyLabel,
  filteredEmptyLabel,
  minTableWidth,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
}: AdminDataTableProps<T>) {
  const {t} = useUiLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const globalFilterFn = useCallback<FilterFn<T>>(
    (row, _columnId, filterValue) => {
      const q = String(filterValue ?? "").trim().toLowerCase();
      if (!q) return true;
      return row.getVisibleCells().some((cell) => {
        const def = cell.column.columnDef;
        if (def.enableGlobalFilter === false) return false;
        const v = cell.getValue();
        if (v == null) return false;
        if (typeof v === "object") return false;
        return String(v).toLowerCase().includes(q);
      });
    },
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: {sorting, globalFilter},
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
    getRowId,
    initialState: {pagination: {pageSize: initialPageSize}},
  });

  const pageRows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const hasData = data.length > 0;
  const filterActive = Boolean(String(globalFilter ?? "").trim());

  const pageLabel = useMemo(() => {
    if (totalFiltered === 0) return "";
    const start = table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1;
    const end = start + pageRows.length - 1;
    return t("common.table.pageInfo", {
      start: String(start),
      end: String(end),
      total: String(totalFiltered),
    });
  }, [t, table, pageRows.length, totalFiltered]);

  return (
    <div className="space-y-3">
      {hasData ?
        <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={t("common.table.searchPlaceholder")}
            className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none sm:max-w-md"
            aria-label={t("common.table.searchPlaceholder")}
          />
          {totalFiltered > 0 ?
            <p className="text-xs text-gray-500 tabular-nums">{pageLabel}</p>
          : null}
        </div>
      : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table
          className="w-full text-left text-sm"
          style={minTableWidth !== undefined ? {minWidth: minTableWidth} : undefined}
        >
          <thead className="border-b border-gray-100 bg-gray-50/90 text-gray-500">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2">
                    {header.isPlaceholder ? null : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((row) => (
              <tr key={row.id} className="text-gray-800">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!hasData ?
          <p className="px-3 py-6 text-center text-sm text-gray-500">{emptyLabel}</p>
        : hasData && totalFiltered === 0 && filterActive ?
          <p className="px-3 py-6 text-center text-sm text-gray-500">
            {filteredEmptyLabel ?? t("common.table.noResults")}
          </p>
        : null}
      </div>

      {hasData && totalFiltered > 0 ?
        <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <span>{t("common.table.rowsPerPage")}</span>
            <select
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800"
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
            >
              {t("common.table.first")}
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              {t("common.table.prev")}
            </button>
            <span className="px-1 text-xs text-gray-500 tabular-nums">
              {t("common.table.pageOfPages", {
                page: String(table.getState().pagination.pageIndex + 1),
                pages: String(Math.max(1, table.getPageCount())),
              })}
            </span>
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              {t("common.table.next")}
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            >
              {t("common.table.last")}
            </button>
          </div>
        </div>
      : null}
    </div>
  );
}
