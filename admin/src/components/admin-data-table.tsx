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
  type VisibilityState,
} from "@tanstack/react-table";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useUiLocale} from "@/contexts/ui-locale-context";

export function SortableHeader<T>({
  column,
  children,
}: {
  column: Column<T, any>;
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

/** Métadonnée optionnelle sur une colonne : libellé dans le sélecteur « Colonnes ». */
export type AdminTableColumnMeta = {
  columnPickerLabel?: string;
};

function getColumnDefId<T>(col: ColumnDef<T, any>): string {
  if (col.id) return col.id;
  if ("accessorKey" in col && col.accessorKey != null) {
    return String(col.accessorKey);
  }
  return "";
}

/** Colonne `actions` : toujours visible, jamais dans le sélecteur. */
function applyDefaultHidingRules<T>(
  columns: ColumnDef<T, any>[],
): ColumnDef<T, any>[] {
  return columns.map((col) => {
    const id = getColumnDefId(col);
    if (id === "actions") {
      return {...col, enableHiding: false};
    }
    return col;
  });
}

function pickerLabel<T>(column: Column<T, any>): string {
  const meta = column.columnDef.meta as AdminTableColumnMeta | undefined;
  if (meta?.columnPickerLabel?.trim()) return meta.columnPickerLabel.trim();
  const id = column.id;
  if (!id) return "—";
  return id
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

const LS_PREFIX = "admin-datatable-cols-";

export type AdminDataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  getRowId: (row: T, index: number) => string;
  emptyLabel: string;
  filteredEmptyLabel?: string;
  minTableWidth?: number | string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  /**
   * Mémorise les colonnes affichées (localStorage).
   * Une clé par écran (ex. `employees`, `countries`).
   */
  persistColumnVisibilityKey?: string;
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
  persistColumnVisibilityKey,
}: AdminDataTableProps<T>) {
  const {t} = useUiLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  /** Évite d’écraser localStorage avec `{}` avant lecture initiale. */
  const [columnVisibilityReady, setColumnVisibilityReady] = useState(
    () => !persistColumnVisibilityKey,
  );

  const resolvedColumns = useMemo(
    () => applyDefaultHidingRules(columns),
    [columns],
  );

  useEffect(() => {
    if (!persistColumnVisibilityKey) {
      setColumnVisibilityReady(true);
      return;
    }
    setColumnVisibilityReady(false);
    try {
      const raw = localStorage.getItem(
        `${LS_PREFIX}${persistColumnVisibilityKey}`,
      );
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setColumnVisibility(parsed as VisibilityState);
        }
      }
    } catch {
      /* ignore */
    }
    setColumnVisibilityReady(true);
  }, [persistColumnVisibilityKey]);

  useEffect(() => {
    if (!persistColumnVisibilityKey || !columnVisibilityReady) return;
    try {
      localStorage.setItem(
        `${LS_PREFIX}${persistColumnVisibilityKey}`,
        JSON.stringify(columnVisibility),
      );
    } catch {
      /* ignore */
    }
  }, [persistColumnVisibilityKey, columnVisibility, columnVisibilityReady]);

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
    columns: resolvedColumns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
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

  const hidableColumns = table.getAllLeafColumns().filter((c) => c.getCanHide());
  const hasColumnPicker = hidableColumns.length > 0;

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

  function resetColumnVisibility() {
    setColumnVisibility({});
  }

  function showAllColumns() {
    const next: VisibilityState = {};
    for (const col of table.getAllLeafColumns()) {
      if (col.getCanHide()) {
        next[col.id] = true;
      }
    }
    setColumnVisibility(next);
  }

  return (
    <div className="space-y-3">
      {hasData ?
        <div className="flex flex-col gap-2 px-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:max-w-full sm:flex-1 sm:flex-row sm:items-center sm:gap-3">
            <input
              type="search"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={t("common.table.searchPlaceholder")}
              className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none sm:max-w-md"
              aria-label={t("common.table.searchPlaceholder")}
            />
            {hasColumnPicker ?
              <details className="group relative w-full sm:w-auto">
                <summary
                  className="cursor-pointer list-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 [&::-webkit-details-marker]:hidden"
                  aria-label={t("common.table.columns")}
                >
                  <span className="inline-flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 text-gray-500"
                      aria-hidden
                    >
                      <rect x="3" y="4" width="7" height="16" rx="1" />
                      <rect x="14" y="4" width="7" height="16" rx="1" />
                    </svg>
                    {t("common.table.columns")}
                  </span>
                </summary>
                <div
                  className="absolute left-0 z-20 mt-1 w-[min(100vw-2rem,20rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="mb-2 text-xs text-gray-500">
                    {t("common.table.columnsHint")}
                  </p>
                  <ul className="max-h-[min(50vh,320px)] space-y-2 overflow-y-auto pr-1">
                    {hidableColumns.map((column) => (
                      <li key={column.id}>
                        <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/30"
                            checked={column.getIsVisible()}
                            onChange={column.getToggleVisibilityHandler()}
                          />
                          <span>{pickerLabel(column)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-2">
                    <button
                      type="button"
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => showAllColumns()}
                    >
                      {t("common.table.showAllColumns")}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => resetColumnVisibility()}
                    >
                      {t("common.table.resetColumns")}
                    </button>
                  </div>
                </div>
              </details>
            : null}
          </div>
          {totalFiltered > 0 ?
            <p className="text-xs text-gray-500 tabular-nums sm:shrink-0">{pageLabel}</p>
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
