import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import { useMemo } from "react";
import { BarLoader } from "react-spinners";

import { BarChart } from "@/components/charts/BarPlot";
import { useAuth } from "@/contexts/useAuthContext";
import { transactByAccountOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useSummaryPageContext } from "../-summaryPageContext";

export interface Data {
  accountId: string;
  accountName: string;
  date: string;
  dateLabel: string;
  value: number;
}

function collapseMinorAccounts(data: Data[], limit: number): Data[] {
  // 1. Calculate totals per account to find the "Heavy Hitters"
  const totalByAccount = d3.rollup(
    data,
    (v) => d3.sum(v, (d) => d.value),
    (d) => d.accountId
  );

  // 2. Identify Top Accounts
  const topAccounts = new Set(
    Array.from(totalByAccount.entries())
      .sort(([, sumA], [, sumB]) => sumB - sumA)
      .slice(0, limit)
      .map(([accountId]) => accountId)
  );

  // 3. Roll up data.
  // Note: We group by BOTH date and the "Calculated AccountId"
  const collapsed = d3.flatRollup(
    data,
    (v) => ({
      // Take metadata from the first entry in the group
      dateLabel: v[0].dateLabel,
      // If it's a top account, keep the name; otherwise, call it "Others"
      accountName: topAccounts.has(v[0].accountId)
        ? v[0].accountName
        : DEFAULT_ACCOUNT_NAME,
      value: d3.sum(v, (d) => d.value),
    }),
    (d) => d.date,
    (d) => (topAccounts.has(d.accountId) ? d.accountId : DEFAULT_ACCOUNT_NAME)
  );

  // 4. Map back to your Data structure
  // collapsed is an array of [key1, key2, rollupValue]
  return collapsed.map(([date, accountId, details]) => ({
    date,
    accountId,
    ...details,
  }));
}

const DEFAULT_ACCOUNT_NAME = "Others";

export function pivotData(data: Data[]) {
  const accountNames = new Set<string>();
  const groupedByDate = d3.group(data, (d) => d.date);

  const pivoted = Array.from(groupedByDate, ([date, records]) => {
    const row: any = {
      date: date,
      dateLabel: records[0].dateLabel,
    };

    records.forEach((d) => {
      row[d.accountName] = d.value;
      accountNames.add(d.accountName); // Track every name we encounter
    });

    return row;
  });

  return {
    data: pivoted,
    keys: Array.from(accountNames), // ["Gastos", "Ingresos", "Savings", ...]
  };
}

export const MonthlyDetailedExpensesBarPlot = () => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const dbconfig = getConfig(user);
  const { hideAccounts, setDetailedDate, dateRange, chartPeriodicity } =
    useSummaryPageContext();

  const { data: rawData } = useQuery(
    transactByAccountOptions({
      db,
      bookId,
      accountIds: [dbconfig.expenses],
      periodicity: chartPeriodicity,
      hideAccounts,
    })
  );

  const { data, keys } = useMemo(() => {
    if (rawData)
      return pivotData(
        collapseMinorAccounts(
          rawData
            .filter((d) => d.date >= dateRange.from.toString())
            .filter((d) => d.date <= dateRange.to.toString()),
          14
        )
      );
    return { data: undefined, keys: undefined };
  }, [rawData]);

  if (!data || !dateRange) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col dark">
      <BarChart
        type="stacked"
        className="h-52"
        data={data}
        index="date"
        categories={keys}
        showLegend={false}
      />
    </div>
  );
};
//<MonthlyExpensesChart
//data={data}
//domain={{ startDate: dateRange.from, endDate: dateRange.to }}
//setDate={setDetailedDate}
///>
