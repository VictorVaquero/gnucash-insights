import { BarLoader } from "@/components/ui/BarLoader";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import { DateTime } from "luxon";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { netTransactionValue } from "@/common/aggregate";
import { useIsNarrowViewport } from "@/common/utils.ts";
import { ChartCard } from "@/components/charts/ChartCard";
import { PeriodicityTabs } from "@/components/PeriodicityTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/useAuthContext";
import { fullTransactionsOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { Periodicity } from "@/types/domain";
import { FilterBar } from "./-components/FilterBar";
import { KpiBlock } from "./-components/KpiBlock";
import { SelectionBar } from "./-components/SelectionBar";
import { TransactsCardList } from "./-components/TransactsCardList";
import { TransactsPlot } from "./-components/TransactsPlot";
import { TransactTable } from "./-components/TransactsTable";
import { AnalysisSearchParams, useAnalysisFilters } from "./-components/useAnalysisFilters";

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
  const [chartPeriodicity, setChartPeriodicity] = useState<Periodicity>("monthly");

  const { data, isSuccess } = useQuery(fullTransactionsOptions(db, bookId));
  const transactions = useMemo(() => data, [data]);

  const filteredByFilters = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return (transactions ?? []).filter((row) => {
      if (filters.type !== "all" && row.accountType !== filters.type) return false;
      if (filters.range) {
        const from = filters.range.from.startOf("day");
        const to = filters.range.to.endOf("day");
        if (row.datePosted < from || row.datePosted > to) return false;
      }
      if (search) {
        const haystack =
          `${row.description ?? ""} ${row.slNotes ?? ""} ${row.accountName}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  // Reset the checkbox selection back to "everything" whenever the filters actually change --
  // otherwise a selection made under a previous filter set would keep silently narrowing the
  // chart/KPIs after the visible table has moved on to a different filtered set. Adjusted
  // during render (rather than in an effect) per React's guidance on resetting state when a
  // prop changes.
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setRowSelection(null);
  }

  // Defaults to "all filtered rows selected" until the user makes an explicit selection.
  const effectiveRowSelection = useMemo(
    () =>
      rowSelection ??
      filteredByFilters.reduce<RowSelectionState>((d, row) => ({ ...d, [row.splitId]: true }), {}),
    [filteredByFilters, rowSelection],
  );
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
    <div className="w-full p-4 md:pr-10 flex flex-col gap-y-6">
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
      <div className="grid gap-6 md:grid-cols-[1fr_max-content]">
        <ChartCard title={t("routes.analysis.title")} className="md:h-80">
          {filteredTransactions.length !== 0 ? (
            <TransactsPlot data={filteredTransactions} periodicity={chartPeriodicity} />
          ) : (
            <div className="h-full" />
          )}
        </ChartCard>
        <div className="flex flex-col gap-3">
          <PeriodicityTabs activeMode={chartPeriodicity} onChange={setChartPeriodicity} />
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
    type: search.type === "EXPENSE" || search.type === "INCOME" ? search.type : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
  }),
});
