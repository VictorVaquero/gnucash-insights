import { BarLoader } from "@/components/ui/BarLoader";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";

import { PeriodicityTabs } from "@/components/PeriodicityTabs";
import { fullTransactionsOptions } from "@/db/queries/global";
import { useBook, useDB } from "@/hooks/useDB";
import { SearchList, SearchQuery } from "./-components/FilterList";
import { KpiBlock } from "./-components/KpiBlock";
import { TransactsPlot } from "./-components/TransactsPlot";
import { TransactTable } from "./-components/TransactsTable";

export type ChartPeriodicity = "monthly" | "quarterly" | "yearly";

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
  { name: "Expenses", query: { accountType: "EXPENSE" } },
  {
    name: "Tobaco",
    query: {
      accountType: "EXPENSE",
      description: "Tabaco",
    },
  },
  {
    name: "Trips",
    query: { accountType: "EXPENSE", slNotes: "Viaje" },
  },
  {
    name: "Sport",
    query: { accountType: "EXPENSE", accountName: "Escalada" },
  },
];

const Analysis = () => {
  const { db } = useDB();
  const { bookId } = useBook();

  const [filteredTransactions, setFilteredTransactions] = useState<
    FullTransaction[]
  >([]);
  const [chartPeriodicity, setChartPeriodicity] =
    useState<ChartPeriodicity>("monthly");

  const { data, isSuccess } = useQuery(fullTransactionsOptions(db, bookId));
  const transactions = useMemo(() => data, [data]);

  if (!isSuccess || !transactions)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );

  return (
    <div
      className="
        w-full h-full pr-10
        grid grid-cols-[1fr_max-content] grid-rows-2
        gap-x-6 gap-y-6
        "
    >
      <div className="row-start-1 row-end-1">
        {filteredTransactions.length !== 0 ? (
          <TransactsPlot
            data={filteredTransactions}
            periodicity={chartPeriodicity}
          />
        ) : (
          <div className="h-1/2"></div>
        )}
      </div>
      <div className="row-start-1 col-start-2">
        <KpiBlock data={filteredTransactions} />
      </div>
      <div className="row-start-2 col-start-1">
        <TransactTable
          data={transactions}
          setFilteredData={setFilteredTransactions}
        />
      </div>
      <div className="row-start-2 col-start-2">
        <PeriodicityTabs
          activeMode={chartPeriodicity}
          onChange={setChartPeriodicity}
        />
        <h2 className="text-white">Lista de filtros</h2>
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
    return { title: "Analysis" };
  },
  validateSearch: (search: Record<string, unknown>): AnalysisSearch => {
    return {
      query: (search?.query as Record<string, unknown>) ?? {},
    };
  },
});
