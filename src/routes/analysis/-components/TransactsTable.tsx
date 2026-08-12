import {
  Column,
  OnChangeFn,
  RowSelectionState,
  Table,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { DateTime } from "luxon";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@/components/Checkbox";
import { FullTransaction as Data } from "..";
import { useColumnFilters } from "./useColumnFilters";

const columnHelper = createColumnHelper<Data>();
const buildColumns = (t: (key: string, opts?: Record<string, unknown>) => string) => [
  columnHelper.accessor("splitId", {
    header: t("analysis.table.headers.splitId"),
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("description", {
    header: t("analysis.table.headers.description"),
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("slNotes", {
    header: t("analysis.table.headers.notes"),
    cell: (info) => (info.getValue() !== "None" ? info.getValue() : ""),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("datePosted", {
    header: t("analysis.table.headers.date"),
    cell: (info) => info.getValue().toISODate(),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("accountType", {
    header: t("analysis.table.headers.accountType"),
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("accountName", {
    header: t("analysis.table.headers.accountName"),
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("accountId", {
    id: "idAccount",
    header: t("analysis.table.headers.accountId"),
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("value", {
    header: t("analysis.table.headers.value"),
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
    enableColumnFilter: false,
  }),
  columnHelper.display({
    id: "select-col",
    header: ({ table }) => (
      <div className="flex flex-col gap-y-4">
        <span>{t("analysis.table.toggle")}</span>
        <Checkbox
          aria-label={t("analysis.table.selectAllRows")}
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()} //or getToggleAllPageRowsSelectedHandler
        />
      </div>
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={t("analysis.table.selectRow", { description: row.original.description })}
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  }),
];

export const TransactTable = (props: {
  data: Data[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
}) => {
  const { t } = useTranslation();
  const { columnFilters, setColumnFilters } = useColumnFilters();
  const columns = useMemo(() => buildColumns(t), [t]);
  const { data, rowSelection, onRowSelectionChange } = props;

  const table = useReactTable<Data>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: onRowSelectionChange,
    getRowId: (row) => row.splitId,
    state: {
      columnFilters,
      rowSelection,
    },
    initialState: {
      columnVisibility: {
        id: false,
        idAccount: false,
      },
      pagination: {
        pageIndex: 0,
        pageSize: 8,
      },
    },
  });

  const handleFirstPage = useCallback(() => table.firstPage(), [table]);
  const handlePreviousPage = useCallback(() => table.previousPage(), [table]);
  const handleNextPage = useCallback(() => table.nextPage(), [table]);
  const handleLastPage = useCallback(() => table.lastPage(), [table]);
  const handleGoToPage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const page = e.target.value ? Number(e.target.value) - 1 : 0;
      table.setPageIndex(page);
    },
    [table],
  );
  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      table.setPageSize(Number(e.target.value));
    },
    [table],
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-collapse border-spacing-y-4 border-shark-600 text-foreground">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} colSpan={h.colSpan}>
                    <div className="mb-2 p-1 ps-2">
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                      {{
                        asc: " 🔼",
                        desc: " 🔽",
                      }[h.column.getIsSorted() as string] ?? null}
                      {h.column.getCanFilter() ? (
                        <div className="mt-2">
                          <Filter column={h.column} table={table} />
                        </div>
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="mt-2 bg-shark-800 text-white">
            {table.getRowModel().rows.map((row) => (
              <tr
                className="hover:bg-shark-600"
                key={row.id}
                onClick={row.getToggleSelectedHandler()}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="border border-shark-600 p-2 ps-4 text-xs">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-foreground">
        <span className="flex items-center gap-1 text-white">
          <button
            className="rounded p-1 bg-shark-800"
            onClick={handleFirstPage}
            disabled={!table.getCanPreviousPage()}
          >
            {"<<"}
          </button>
          <button
            className="rounded p-1 bg-shark-800"
            onClick={handlePreviousPage}
            disabled={!table.getCanPreviousPage()}
          >
            {"<"}
          </button>
          <button
            className="rounded p-1 bg-shark-800"
            onClick={handleNextPage}
            disabled={!table.getCanNextPage()}
          >
            {">"}
          </button>
          <button
            className="rounded p-1 bg-shark-800"
            onClick={handleLastPage}
            disabled={!table.getCanNextPage()}
          >
            {">>"}
          </button>
        </span>
        <span className="flex items-center gap-1">
          <div className="text-foreground">{t("analysis.table.page")}</div>
          <span>{table.getState().pagination.pageIndex + 1}</span>
          <div className="text-foreground">{t("analysis.table.of")}</div>
          <span>{table.getPageCount().toLocaleString()}</span>
        </span>
        <span className="flex items-center gap-1">
          <label htmlFor="go-to-page" className="text-foreground">
            {t("analysis.table.goToPage")}
          </label>
          <input
            id="go-to-page"
            type="number"
            min="1"
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={handleGoToPage}
            className="p-1 rounded w-16 bg-shark-800 text-white"
          />
        </span>
        <select
          aria-label={t("analysis.table.rowsPerPage")}
          className="p-2 rounded bg-shark-800 text-white"
          value={table.getState().pagination.pageSize}
          onChange={handlePageSizeChange}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {t("analysis.table.showPageSize", { pageSize })}
            </option>
          ))}
        </select>
        <p>
          <span className="text-foreground">{t("analysis.table.showing")} </span>
          {table.getRowModel().rows.length.toLocaleString()}
          <span className="text-foreground"> {t("analysis.table.of")} </span>
          {table.getRowCount().toLocaleString()}
          <span className="text-foreground"> {t("analysis.table.rows")}</span>
        </p>
      </div>
    </div>
  );
};

function Filter<D>({ column, table }: { column: Column<D, unknown>; table: Table<D> }) {
  const { t } = useTranslation();
  const firstValue = table.getPreFilteredRowModel().flatRows[0]?.getValue(column.id);

  const columnFilterValue = column.getFilterValue();

  const handleMinNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      column.setFilterValue((old: string) => String([e.target.value, old.split(",")[1]])),
    [column],
  );
  const handleMaxNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      column.setFilterValue((old: string) => String([old.split(",")[0], e.target.value])),
    [column],
  );
  const handleMinDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      column.setFilterValue((old: [DateTime, DateTime]) => [
        DateTime.fromFormat(e.target.value, "yyyy-LL-dd"),
        old?.[1],
      ]),
    [column],
  );
  const handleMaxDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      column.setFilterValue((old: [DateTime, DateTime]) => [
        old?.[0],
        DateTime.fromFormat(e.target.value, "yyyy-LL-dd"),
      ]),
    [column],
  );
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => column.setFilterValue(e.target.value),
    [column],
  );

  if (typeof firstValue === "number") {
    return (
      <div className="flex space-x-2 text-black dark:text-white">
        <input
          type="number"
          value={(columnFilterValue as string).split(",").map((v) => Number(v))?.[0] ?? ""}
          onChange={handleMinNumberChange}
          placeholder={t("analysis.table.min")}
          className="w-16 ps-2 border shadow rounded"
        />
        <input
          type="number"
          value={(columnFilterValue as string).split(",").map((v) => Number(v))?.[1] ?? ""}
          onChange={handleMaxNumberChange}
          placeholder={t("analysis.table.max")}
          className="w-16 ps-2 border shadow rounded"
        />
      </div>
    );
  }

  if (firstValue instanceof DateTime) {
    return (
      <div className="flex space-x-2 text-black dark:text-white">
        <input
          type="date"
          value={(columnFilterValue as [DateTime, DateTime])?.[0].toISODate() ?? undefined}
          onChange={handleMinDateChange}
          placeholder={t("analysis.table.min")}
          className="w-16 ps-2 border shadow rounded"
        />
        <input
          type="date"
          value={(columnFilterValue as [DateTime, DateTime])?.[1].toISODate() ?? undefined}
          onChange={handleMaxDateChange}
          placeholder={t("analysis.table.max")}
          className="w-16 ps-2 border shadow rounded"
        />
      </div>
    );
  }

  return (
    <input
      type="text"
      value={(columnFilterValue ?? "") as string}
      onChange={handleTextChange}
      placeholder={t("analysis.table.search")}
      className="w-24 ps-2 border shadow rounded text-black dark:text-white"
    />
  );
}
