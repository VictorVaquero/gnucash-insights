import { BarLoader } from "@/components/ui/BarLoader";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import { DateTime } from "luxon";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { PeriodicityTabs } from "@/components/PeriodicityTabs";
import { fullTransactionsOptions } from "@/db/queries/global";
import { useBook, useDB } from "@/hooks/useDB";
import { Periodicity } from "@/types/domain";
import { SearchList, SearchQuery } from "./-components/FilterList";
import { KpiBlock } from "./-components/KpiBlock";
import { TransactsPlot } from "./-components/TransactsPlot";
import { TransactTable } from "./-components/TransactsTable";

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

const queryData: SearchQuery[] = [
  { nameKey: "analysis.filters.expenses", query: { accountType: "EXPENSE" } },
  {
    nameKey: "analysis.filters.tobacco",
    query: {
      accountType: "EXPENSE",
      description: "Tabaco",
    },
  },
  {
    nameKey: "analysis.filters.trips",
    query: { accountType: "EXPENSE", slNotes: "Viaje" },
  },
  {
    nameKey: "analysis.filters.sport",
    query: { accountType: "EXPENSE", accountName: "Escalada" },
  },
];

const Analysis = () => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { t } = useTranslation();

  const [rowSelection, setRowSelection] = useState<RowSelectionState | null>(null);
  const [chartPeriodicity, setChartPeriodicity] = useState<Periodicity>("monthly");

  const { data, isSuccess } = useQuery(fullTransactionsOptions(db, bookId));
  const transactions = useMemo(() => data, [data]);
  // Defaults to "all rows selected" until the user makes an explicit selection.
  const effectiveRowSelection = useMemo(
    () =>
      rowSelection ??
      (transactions ?? []).reduce<RowSelectionState>(
        (d, row) => ({ ...d, [row.splitId]: true }),
        {},
      ),
    [transactions, rowSelection],
  );
  const filteredTransactions = useMemo(
    () => (transactions ?? []).filter((row) => effectiveRowSelection[row.splitId]),
    [transactions, effectiveRowSelection],
  );
  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = useCallback(
    (updater) =>
      setRowSelection((prev) =>
        typeof updater === "function" ? updater(prev ?? effectiveRowSelection) : updater,
      ),
    [effectiveRowSelection],
  );

  if (!isSuccess || !transactions)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  return (
    <div
      className="
        w-full md:h-full p-4 md:pr-10
        flex flex-col
        md:grid md:grid-cols-[1fr_max-content] md:grid-rows-2
        gap-x-6 gap-y-6
        "
    >
      <h1 className="sr-only">{t("routes.analysis.title")}</h1>
      <div className="md:row-start-1 md:row-end-1">
        {filteredTransactions.length !== 0 ? (
          <TransactsPlot data={filteredTransactions} periodicity={chartPeriodicity} />
        ) : (
          <div className="h-1/2"></div>
        )}
      </div>
      <div className="md:row-start-1 md:col-start-2">
        <KpiBlock data={filteredTransactions} />
      </div>
      <div className="md:row-start-2 md:col-start-1">
        <TransactTable
          data={transactions}
          rowSelection={effectiveRowSelection}
          onRowSelectionChange={handleRowSelectionChange}
        />
      </div>
      <div className="md:row-start-2 md:col-start-2">
        <PeriodicityTabs activeMode={chartPeriodicity} onChange={setChartPeriodicity} />
        <h2 className="text-foreground">{t("analysis.filters.title")}</h2>
        <SearchList data={queryData} />
      </div>
    </div>
  );
};

interface AnalysisSearch {
  query: Record<string, unknown>;
}

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
  validateSearch: (search: Record<string, unknown>): AnalysisSearch => {
    return {
      query: (search?.query as Record<string, unknown>) ?? {},
    };
  },
});
