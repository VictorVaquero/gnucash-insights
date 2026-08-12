import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency } from "@/common/utils.ts";
import { Checkbox } from "@/components/Checkbox";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { FullTransaction as Data } from "..";

const PAGE_SIZE = 10;

const TransactCard = ({
  row,
  selected,
  onToggleSelect,
  expanded,
  onToggleExpand,
  locale,
}: {
  row: Data;
  selected: boolean;
  onToggleSelect: (splitId: string) => void;
  expanded: boolean;
  onToggleExpand: (splitId: string) => void;
  locale: string;
}) => {
  const { t } = useTranslation();
  const handleSelectChange = useCallback(
    () => onToggleSelect(row.splitId),
    [onToggleSelect, row.splitId],
  );
  const handleExpandClick = useCallback(
    () => onToggleExpand(row.splitId),
    [onToggleExpand, row.splitId],
  );

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start gap-3">
        <Checkbox
          aria-label={t("analysis.table.selectRow", { description: row.description })}
          checked={selected}
          onChange={handleSelectChange}
          className="mt-1"
        />
        <button
          type="button"
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? t("analysis.table.collapseRow", { description: row.description })
              : t("analysis.table.expandRow", { description: row.description })
          }
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{row.description}</p>
              <p className="text-xs text-muted-foreground">
                {row.datePosted.toISODate()} · {row.accountName}
              </p>
            </div>
            <span
              className={cn(
                "text-sm font-medium tabular-nums whitespace-nowrap",
                row.accountType === "EXPENSE" || (row.accountType !== "INCOME" && row.value < 0)
                  ? "text-red-600"
                  : "text-green-600",
              )}
            >
              {formatCurrency(row.value, locale)}
            </span>
          </div>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
            {row.accountType}
          </span>
        </button>
      </div>
      {expanded && (
        <dl className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="text-muted-foreground">{t("analysis.table.headers.notes")}</dt>
            <dd className="text-foreground">{row.slNotes ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("analysis.table.headers.splitId")}</dt>
            <dd className="text-foreground font-mono break-all">{row.splitId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("analysis.table.headers.transactionId")}</dt>
            <dd className="text-foreground font-mono break-all">{row.transactionId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("analysis.table.headers.accountId")}</dt>
            <dd className="text-foreground font-mono break-all">{row.accountId}</dd>
          </div>
        </dl>
      )}
    </div>
  );
};

// Narrow-viewport companion to TransactsTable -- same controlled selection contract, but cards
// instead of a horizontally-scrolling table, and a lightweight page-local pagination instead of
// a full tanstack-table instance (there are no columns to manage here).
export const TransactsCardList = (props: {
  data: Data[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
}) => {
  const { data, rowSelection, onRowSelectionChange } = props;
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [pageIndex, setPageIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const clampedPage = Math.min(pageIndex, pageCount - 1);
  const pageRows = useMemo(
    () => data.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [data, clampedPage],
  );

  const handleToggleExpand = useCallback(
    (splitId: string) => setExpandedId((prev) => (prev === splitId ? null : splitId)),
    [],
  );
  const handleToggleRow = useCallback(
    (splitId: string) => onRowSelectionChange((prev) => ({ ...prev, [splitId]: !prev[splitId] })),
    [onRowSelectionChange],
  );
  const handlePrev = useCallback(() => setPageIndex((p) => Math.max(0, p - 1)), []);
  const handleNext = useCallback(
    () => setPageIndex((p) => Math.min(pageCount - 1, p + 1)),
    [pageCount],
  );

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-6 text-center">{t("analysis.table.empty")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {pageRows.map((row) => (
        <TransactCard
          key={row.splitId}
          row={row}
          selected={!!rowSelection[row.splitId]}
          onToggleSelect={handleToggleRow}
          expanded={expandedId === row.splitId}
          onToggleExpand={handleToggleExpand}
          locale={locale}
        />
      ))}
      <div className="flex items-center justify-between pt-2 text-sm">
        <button
          type="button"
          onClick={handlePrev}
          disabled={clampedPage === 0}
          className="rounded p-1.5 bg-muted disabled:opacity-40"
        >
          {"<"}
        </button>
        <span className="text-muted-foreground">
          {t("analysis.table.page")} {clampedPage + 1} {t("analysis.table.of")} {pageCount}
        </span>
        <button
          type="button"
          onClick={handleNext}
          disabled={clampedPage >= pageCount - 1}
          className="rounded p-1.5 bg-muted disabled:opacity-40"
        >
          {">"}
        </button>
      </div>
    </div>
  );
};
