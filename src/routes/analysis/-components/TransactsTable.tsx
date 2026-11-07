import {
  OnChangeFn,
  RowSelectionState,
  SortingState,
  Table,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency } from "@/common/utils.ts";
import { Checkbox } from "@/components/Checkbox";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { FullTransaction as Data } from "..";

const columnHelper = createColumnHelper<Data>();

// The row-selection checkbox is rendered outside TanStack's column/cell model (see TableRow):
// row.getIsSelected() reads live table state through a closure rather than a tracked prop, which
// the React Compiler can't see -- it would cache TableRow's JSX against the (unrelated) row
// object identity, so a selection change would silently fail to re-render. Passing `selected`
// straight down as a prop keeps this compiler-safe, mirroring TransactsCardList.
const TYPE_CHIP: Record<string, string> = {
  INCOME: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  EXPENSE: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  BANK: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  CASH: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  ASSET: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  STOCK: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
  MUTUAL: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
  LIABILITY: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  CREDIT: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
};

const DateCell = ({ date }: { date: Data["datePosted"] }) => {
  const { locale } = useLocale();
  return (
    <span className="whitespace-nowrap font-medium tabular-nums">
      {date.setLocale(locale).toFormat("dd LLL yyyy")}
    </span>
  );
};

const buildColumns = (t: (key: string, opts?: Record<string, unknown>) => string) => [
  columnHelper.accessor("datePosted", {
    header: t("analysis.table.headers.date"),
    cell: (info) => <DateCell date={info.getValue()} />,
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("description", {
    header: t("analysis.table.headers.description"),
    cell: (info) => <span className="font-semibold text-foreground">{info.getValue()}</span>,
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("accountType", {
    header: t("analysis.table.headers.accountType"),
    cell: (info) => (
      <span
        className={cn(
          "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
          TYPE_CHIP[info.getValue()] ?? "bg-muted text-foreground/80",
        )}
      >
        {info.getValue()}
      </span>
    ),
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("accountName", {
    header: t("analysis.table.headers.accountName"),
    cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
    footer: (info) => info.column.id,
  }),
  columnHelper.accessor("value", {
    header: t("analysis.table.headers.value"),
    cell: (info) => (
      <ValueCell value={info.getValue()} accountType={info.row.original.accountType} />
    ),
    footer: (info) => info.column.id,
  }),
];

// GnuCash splits carry debit/credit sign, not income/expense sign -- an EXPENSE split's raw
// value is positive (a debit). Color by accountType rather than raw sign so expenses always
// read red and income always reads green, regardless of which way the underlying value points.
const ValueCell = ({ value, accountType }: { value: number; accountType: string }) => {
  const { locale } = useLocale();
  const isExpenseColor = accountType === "EXPENSE" || (accountType !== "INCOME" && value < 0);
  return (
    <span
      className={cn(
        "whitespace-nowrap text-base font-semibold tabular-nums",
        isExpenseColor
          ? "text-red-700 dark:text-red-400"
          : "text-emerald-700 dark:text-emerald-400",
      )}
    >
      {formatCurrency(value, locale)}
    </span>
  );
};

const SortIcon = ({ direction }: { direction: false | "asc" | "desc" }) => {
  if (!direction) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={cn("inline-block size-3 ml-1", direction === "desc" && "rotate-180")}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 15l6-6 6 6" />
    </svg>
  );
};

const ExpanderButton = ({
  expanded,
  onClick,
  label,
}: {
  expanded: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={expanded}
    aria-label={label}
    className="text-muted-foreground hover:text-foreground p-1 -m-1"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={cn("size-3.5 transition-transform", expanded && "rotate-90")}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  </button>
);

const DetailRow = ({ row, colSpan }: { row: Data; colSpan: number }) => {
  const { t } = useTranslation();
  return (
    <tr className="bg-accent/40">
      <td colSpan={colSpan} className="border-l-4 border-primary/50 p-3">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">{t("analysis.table.headers.notes")}</dt>
            <dd className="text-foreground">{row.slNotes ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("analysis.table.headers.splitId")}</dt>
            <dd className="text-foreground font-mono">{row.splitId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("analysis.table.headers.transactionId")}</dt>
            <dd className="text-foreground font-mono">{row.transactionId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("analysis.table.headers.accountId")}</dt>
            <dd className="text-foreground font-mono">{row.accountId}</dd>
          </div>
        </dl>
      </td>
    </tr>
  );
};

const TableRow = ({
  row,
  selected,
  onToggleSelect,
  expanded,
  onToggleExpand,
  colSpan,
}: {
  row: ReturnType<Table<Data>["getRowModel"]>["rows"][number];
  selected: boolean;
  onToggleSelect: (splitId: string) => void;
  expanded: boolean;
  onToggleExpand: (splitId: string) => void;
  colSpan: number;
}) => {
  const { t } = useTranslation();
  const handleToggle = useCallback(
    () => onToggleExpand(row.original.splitId),
    [onToggleExpand, row.original.splitId],
  );
  const handleToggleSelect = useCallback(
    () => onToggleSelect(row.original.splitId),
    [onToggleSelect, row.original.splitId],
  );
  return (
    <Fragment>
      <tr className="border-b border-border/70 odd:bg-muted/40 hover:bg-accent/60">
        <td className="p-3">
          <Checkbox
            aria-label={t("analysis.table.selectRow", { description: row.original.description })}
            checked={selected}
            onChange={handleToggleSelect}
          />
        </td>
        <td className="p-2">
          <ExpanderButton
            expanded={expanded}
            onClick={handleToggle}
            label={
              expanded
                ? t("analysis.table.collapseRow", { description: row.original.description })
                : t("analysis.table.expandRow", { description: row.original.description })
            }
          />
        </td>
        {row.getVisibleCells().map((cell) => (
          <td key={cell.id} className="px-3 py-3">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
      {expanded && <DetailRow row={row.original} colSpan={colSpan} />}
    </Fragment>
  );
};

// headerGroups/rows/sorting are computed by the (compiler-unmemoized) TransactTable parent and
// threaded down as plain tracked props, rather than read here via table.getHeaderGroups() /
// table.getRowModel() / column.getIsSorted() -- those are getters on the stable `table`/`column`
// object references, invisible to the React Compiler's dependency tracking, which would cache
// this component's JSX and leave sort/pagination clicks silently not reflected until some
// unrelated prop (e.g. rowSelection) forced a real re-render. getToggleSortingHandler() stays a
// direct call since it only builds an event handler, which reads fresh state at click-time.
const TableBody = ({
  headerGroups,
  rows,
  sorting,
  columnCount,
  rowSelection,
  onToggleSelect,
  allSelected,
  someSelected,
  onToggleAll,
  expandedId,
  onToggleExpand,
}: {
  headerGroups: ReturnType<Table<Data>["getHeaderGroups"]>;
  rows: ReturnType<Table<Data>["getRowModel"]>["rows"];
  sorting: SortingState;
  columnCount: number;
  rowSelection: RowSelectionState;
  onToggleSelect: (splitId: string) => void;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  expandedId: string | null;
  onToggleExpand: (splitId: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[15px] text-foreground">
        <thead>
          {headerGroups.map((hg) => (
            <tr
              key={hg.id}
              className="border-b-2 border-border bg-muted text-xs uppercase tracking-wide"
            >
              <th className="w-8">
                <Checkbox
                  aria-label={t("analysis.table.selectAllRows")}
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={onToggleAll}
                />
              </th>
              <th className="w-8">
                <span className="sr-only">{t("analysis.table.detailsColumn")}</span>
              </th>
              {hg.headers.map((h) => {
                const sortEntry = sorting.find((s) => s.id === h.column.id);
                const direction: false | "asc" | "desc" = sortEntry
                  ? sortEntry.desc
                    ? "desc"
                    : "asc"
                  : false;
                return (
                  <th key={h.id} className="p-3 text-left font-semibold text-foreground/70">
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="inline-flex items-center uppercase hover:text-foreground"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <SortIcon direction={direction} />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              row={row}
              selected={!!rowSelection[row.original.splitId]}
              onToggleSelect={onToggleSelect}
              expanded={expandedId === row.original.splitId}
              onToggleExpand={onToggleExpand}
              colSpan={columnCount}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

// Render values (canPreviousPage, pageIndex, pageCount, ...) are computed by the parent and
// passed as plain props -- see the TableBody comment above for why calling table.getXxx()
// directly in here would silently go stale. The nav/page-size handlers stay as callbacks built
// from `table` since they only need to read fresh state at click-time.
const TablePagination = ({
  canPreviousPage,
  canNextPage,
  pageIndex,
  pageCount,
  pageSize,
  rowsShown,
  rowCount,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  onGoToPage,
  onPageSizeChange,
}: {
  canPreviousPage: boolean;
  canNextPage: boolean;
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  rowsShown: number;
  rowCount: number;
  onFirstPage: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onLastPage: () => void;
  onGoToPage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-foreground">
      <span className="flex items-center gap-1">
        <button
          className="rounded px-2 py-1 bg-muted font-medium hover:bg-accent disabled:opacity-40"
          onClick={onFirstPage}
          disabled={!canPreviousPage}
        >
          {"<<"}
        </button>
        <button
          className="rounded px-2 py-1 bg-muted font-medium hover:bg-accent disabled:opacity-40"
          onClick={onPreviousPage}
          disabled={!canPreviousPage}
        >
          {"<"}
        </button>
        <button
          className="rounded px-2 py-1 bg-muted font-medium hover:bg-accent disabled:opacity-40"
          onClick={onNextPage}
          disabled={!canNextPage}
        >
          {">"}
        </button>
        <button
          className="rounded px-2 py-1 bg-muted font-medium hover:bg-accent disabled:opacity-40"
          onClick={onLastPage}
          disabled={!canNextPage}
        >
          {">>"}
        </button>
      </span>
      <span className="flex items-center gap-1">
        <div className="text-foreground">{t("analysis.table.page")}</div>
        <span>{pageIndex + 1}</span>
        <div className="text-foreground">{t("analysis.table.of")}</div>
        <span>{pageCount.toLocaleString()}</span>
      </span>
      <span className="flex items-center gap-1">
        <label htmlFor="go-to-page" className="text-foreground">
          {t("analysis.table.goToPage")}
        </label>
        <input
          key={pageIndex}
          id="go-to-page"
          type="number"
          min="1"
          defaultValue={pageIndex + 1}
          onChange={onGoToPage}
          className="p-1 rounded w-16 bg-background border border-input"
        />
      </span>
      <select
        aria-label={t("analysis.table.rowsPerPage")}
        className="p-2 rounded bg-background border border-input"
        value={pageSize}
        onChange={onPageSizeChange}
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {t("analysis.table.showPageSize", { pageSize: size })}
          </option>
        ))}
      </select>
      <p>
        <span className="text-foreground">{t("analysis.table.showing")} </span>
        {rowsShown.toLocaleString()}
        <span className="text-foreground"> {t("analysis.table.of")} </span>
        {rowCount.toLocaleString()}
        <span className="text-foreground"> {t("analysis.table.rows")}</span>
      </p>
    </div>
  );
};

export const TransactTable = (props: {
  data: Data[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
}) => {
  const { t } = useTranslation();
  const { data, rowSelection, onRowSelectionChange } = props;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allSelected = data.length > 0 && data.every((row) => rowSelection[row.splitId]);
  const someSelected = !allSelected && data.some((row) => rowSelection[row.splitId]);
  const handleToggleAll = useCallback(() => {
    onRowSelectionChange(
      allSelected
        ? {}
        : data.reduce<RowSelectionState>((acc, row) => ({ ...acc, [row.splitId]: true }), {}),
    );
  }, [allSelected, data, onRowSelectionChange]);
  const handleToggleSelect = useCallback(
    (splitId: string) => onRowSelectionChange((prev) => ({ ...prev, [splitId]: !prev[splitId] })),
    [onRowSelectionChange],
  );
  const columns = useMemo(() => buildColumns(t), [t]);

  const table = useReactTable<Data>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.splitId,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 8,
      },
    },
  });

  const handleToggleExpand = useCallback(
    (splitId: string) => setExpandedId((prev) => (prev === splitId ? null : splitId)),
    [],
  );

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

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-6 text-center">{t("analysis.table.empty")}</p>
    );
  }

  // TransactTable itself is never memoized by the React Compiler (it calls useReactTable
  // directly, an API the compiler treats as an escape hatch), so it's safe to read these
  // TanStack getters here on every render -- they're then threaded down as plain props instead
  // of being re-read inside TableBody/TablePagination, which ARE memoized and would otherwise
  // miss the update. See the comments on those two components.
  const rows = table.getRowModel().rows;
  const pagination = table.getState().pagination;

  return (
    <div>
      <TableBody
        headerGroups={table.getHeaderGroups()}
        rows={rows}
        sorting={table.getState().sorting}
        columnCount={columns.length + 2}
        rowSelection={rowSelection}
        onToggleSelect={handleToggleSelect}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleAll={handleToggleAll}
        expandedId={expandedId}
        onToggleExpand={handleToggleExpand}
      />
      <TablePagination
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        pageIndex={pagination.pageIndex}
        pageCount={table.getPageCount()}
        pageSize={pagination.pageSize}
        rowsShown={rows.length}
        rowCount={table.getRowCount()}
        onFirstPage={handleFirstPage}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onLastPage={handleLastPage}
        onGoToPage={handleGoToPage}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};
