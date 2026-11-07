import { BarLoader } from "@/components/ui/BarLoader";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import { DateTime } from "luxon";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { netTransactionValue } from "@/common/aggregate";
import { useIsNarrowViewport } from "@/common/utils.ts";
import { ChartCard } from "@/components/charts/ChartCard";
import { PeriodicityTabs } from "@/components/PeriodicityTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/useAuthContext";
import { fullTransactionsOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { FinePeriodicity } from "@/types/domain";
import { compileSearch } from "@/common/search";
import { FilterBar } from "./-components/FilterBar";
import { KpiBlock } from "./-components/KpiBlock";
import { SelectionBar } from "./-components/SelectionBar";
import { TransactsCardList } from "./-components/TransactsCardList";
import { TransactsPlot } from "./-components/TransactsPlot";
import { TransactTable } from "./-components/TransactsTable";
import {
  AnalysisSearchParams,
  parseSearchField,
  useAnalysisFilters,
} from "./-components/useAnalysisFilters";

export interface FullTransaction {
  accountId: string;
  accountType: string;
  accountName: string;
  transactionId: string;
  datePosted: DateTime<boolean>;
  ymdPosted: string;
  splitId: string;
  description: string | null;
  slNotes: string | null;
  value: number;
}

const exportCsv = (rows: FullTransaction[]) => {
  const header = ["date", "description", "notes", "accountType", "accountName", "value"];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = rows.map((row) =>
    [
      row.datePosted.toISODate() ?? "",
      row.description ?? "",
      row.slNotes ?? "",
      row.accountType,
      row.accountName,
      String(row.value),
    ]
      .map(escape)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cashpy-transactions-${DateTime.now().toISODate()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const FINE_PERIODS: FinePeriodicity[] = ["daily", "weekly", "monthly", "quarterly", "yearly"];

const Analysis = () => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { t } = useTranslation();
  const { user } = useAuth();
  const dbconf = getConfig(user);
  const { from: domainFrom, to: domainTo } = useDomain();
  const { filters, setFilters } = useAnalysisFilters();
  const isNarrowViewport = useIsNarrowViewport();

  const [rowSelection, setRowSelection] = useState<RowSelectionState | null>(null);
  const [chartPeriodicity, setChartPeriodicity] = useState<FinePeriodicity>("monthly");
  const [compare, setCompare] = useState(false);

  const { data, isSuccess } = useQuery(fullTransactionsOptions(db, bookId));
  const transactions = data;
  // The filter inputs stay instant; the heavy derived data (filtering, chart, KPIs, table)
  // follows at lower priority so typing never waits on it.
  const appliedFilters = useDeferredValue(filters);
  const stale = appliedFilters !== filters;

  const filteredByFilters = useMemo(() => {
    const matches = compileSearch(appliedFilters.search, appliedFilters.field);
    const from = appliedFilters.range
      ? appliedFilters.range.from.startOf("day").toMillis()
      : -Infinity;
    const to = appliedFilters.range ? appliedFilters.range.to.endOf("day").toMillis() : Infinity;
    return (transactions ?? []).filter((row) => {
      if (appliedFilters.type !== "all" && row.accountType !== appliedFilters.type) return false;
      if (appliedFilters.range) {
        const at = row.datePosted.toMillis();
        if (at < from || at > to) return false;
      }
      if (
        !matches({
          description: row.description,
          notes: row.slNotes,
          account: row.accountName,
          accountId: row.accountId,
          transactionId: row.transactionId,
          splitId: row.splitId,
          type: row.accountType,
          date: row.ymdPosted.slice(0, 10),
          amount: row.value,
        })
      )
        return false;
      return true;
    });
  }, [transactions, appliedFilters]);

  // Reset the checkbox selection back to "everything" whenever the filters actually change --
  // otherwise a selection made under a previous filter set would keep silently narrowing the
  // chart/KPIs after the visible table has moved on to a different filtered set. Adjusted
  // during render (rather than in an effect) per React's guidance on resetting state when a
  // prop changes.
  const [prevFilters, setPrevFilters] = useState(appliedFilters);
  if (appliedFilters !== prevFilters) {
    setPrevFilters(appliedFilters);
    setRowSelection(null);
  }

  // Defaults to "all filtered rows selected" until the user makes an explicit selection.
  const effectiveRowSelection = useMemo(() => {
    if (rowSelection) return rowSelection;
    const all: RowSelectionState = {};
    for (const row of filteredByFilters) all[row.splitId] = true;
    return all;
  }, [filteredByFilters, rowSelection]);
  const filteredTransactions = useMemo(
    () => filteredByFilters.filter((row) => effectiveRowSelection[row.splitId]),
    [filteredByFilters, effectiveRowSelection],
  );
  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = useCallback(
    (updater) =>
      setRowSelection((prev) =>
        typeof updater === "function" ? updater(prev ?? effectiveRowSelection) : updater,
      ),
    [effectiveRowSelection],
  );
  const handleClearSelection = useCallback(() => setRowSelection(null), []);
  const handleExport = useCallback(() => exportCsv(filteredByFilters), [filteredByFilters]);
  const selectedSum = useMemo(
    () => filteredTransactions.reduce((v, d) => v + netTransactionValue(d), 0),
    [filteredTransactions],
  );

  if (!isSuccess || !transactions || !domainFrom || !domainTo)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  return (
    <div
      className={cn(
        "w-full p-4 md:pr-10 flex flex-col gap-y-6",
        stale && "[&>*:not(:first-child):not(:nth-child(2))]:opacity-70 transition-opacity",
      )}
      aria-busy={stale}
    >
      <h1 className="sr-only">{t("routes.analysis.title")}</h1>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        domainFrom={domainFrom}
        domainTo={domainTo}
        onExport={handleExport}
        tripDesc={dbconf.tripDesc}
      />
      <SelectionBar
        selectedCount={filteredTransactions.length}
        totalCount={filteredByFilters.length}
        sum={selectedSum}
        showClear={rowSelection !== null}
        onClear={handleClearSelection}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[1fr_max-content]">
        <ChartCard title={t("routes.analysis.title")} className="md:h-80">
          {filteredTransactions.length !== 0 ? (
            <TransactsPlot
              data={filteredTransactions}
              periodicity={chartPeriodicity}
              compare={compare}
              onPeriodSelect={(range) => setFilters((f) => ({ ...f, range }))}
            />
          ) : (
            <div className="h-full" />
          )}
        </ChartCard>
        <div className="flex flex-col gap-3">
          <PeriodicityTabs
            activeMode={chartPeriodicity}
            onChange={setChartPeriodicity}
            options={FINE_PERIODS}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />
            {t("analysis.chart.compare")}
          </label>
          <KpiBlock data={filteredTransactions} />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("analysis.table.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isNarrowViewport ? (
            <TransactsCardList
              data={filteredByFilters}
              rowSelection={effectiveRowSelection}
              onRowSelectionChange={handleRowSelectionChange}
            />
          ) : (
            <TransactTable
              data={filteredByFilters}
              rowSelection={effectiveRowSelection}
              onRowSelectionChange={handleRowSelectionChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/analysis/")({
  component: Analysis,
  beforeLoad: async ({ location, context: { auth } }) => {
    if (auth && !auth.isAuthenticated()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    return { title: "routes.analysis.title" };
  },
  validateSearch: (search: Record<string, unknown>): AnalysisSearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
    field: parseSearchField(search.field),
    type: search.type === "EXPENSE" || search.type === "INCOME" ? search.type : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
  }),
});
