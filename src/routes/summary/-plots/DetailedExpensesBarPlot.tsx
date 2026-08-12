import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { flatRollup, groupBy, rollup, sum } from "@/common/aggregate";
import { formatCurrency } from "@/common/utils";
import { BarChart, BarChartEventProps } from "@/components/charts/BarPlot";
import { BarLoader } from "@/components/ui/BarLoader";
import { useAuth } from "@/contexts/useAuthContext";
import { AccountsData, accountsOptions } from "@/db/queries/global";
import { TransactData, transactByAccountOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { DateTime } from "luxon";
import { useSummaryPageContext } from "../-summaryPageContext";

export interface Data {
  accountId: string;
  accountName: string;
  date: string;
  dateLabel: string;
  value: number;
}

function collapseMinorAccounts(data: Data[], limit: number, othersLabel: string): Data[] {
  // 1. Calculate totals per account to find the "Heavy Hitters"
  const totalByAccount = rollup(
    data,
    (v) => sum(v, (d) => d.value),
    (d) => d.accountId,
  );

  // 2. Identify Top Accounts
  const topAccounts = new Set(
    Array.from(totalByAccount.entries())
      .sort(([, sumA], [, sumB]) => sumB - sumA)
      .slice(0, limit)
      .map(([accountId]) => accountId),
  );

  // 3. Roll up data.
  // Note: We group by BOTH date and the "Calculated AccountId"
  const collapsed = flatRollup(
    data,
    (v) => ({
      // Take metadata from the first entry in the group
      dateLabel: v[0].dateLabel,
      // If it's a top account, keep the name; otherwise, bucket it under the "Others" label
      accountName: topAccounts.has(v[0].accountId) ? v[0].accountName : othersLabel,
      value: sum(v, (d) => d.value),
    }),
    (d) => d.date,
    (d) => (topAccounts.has(d.accountId) ? d.accountId : othersLabel),
  );

  // 4. Map back to your Data structure
  // collapsed is an array of [key1, key2, rollupValue]
  return collapsed.map(([date, accountId, details]) => ({
    date,
    accountId,
    ...details,
  }));
}

type PivotedRow = {
  date: string;
  dateLabel: string;
} & Record<string, number | string>;

function pivotData(data: Data[]) {
  // 1. Get all unique account names first to ensure every row has every key
  const accountNames = Array.from(new Set(data.map((d) => d.accountName)));

  // We calculate totals by accountId to sort the returned keys by value
  const idTotals = rollup(
    data,
    (v) => sum(v, (d) => d.value),
    (d) => d.accountId,
  );

  const accountIds = Array.from(idTotals.keys()).sort(
    (a, b) => (idTotals.get(b) || 0) - (idTotals.get(a) || 0),
  );

  const groupedByDate = groupBy(data, (d) => d.date);

  const pivoted = Array.from(groupedByDate, ([date, records]): PivotedRow => {
    // 2. Initialize the row with metadata
    const row: PivotedRow = {
      date: date,
      dateLabel: records[0].dateLabel,
    };

    // 3. Pre-fill account keys with 0 to prevent 'undefined' in charts
    accountNames.forEach((name) => {
      row[name] = 0;
    });

    // 4. Fill in the actual values
    records.forEach((d) => {
      row[d.accountName] = d.value;
    });

    return row;
  });

  return {
    data: pivoted,
    keys: accountIds, // Now returning accountIds as requested
  };
}

export const DetailedExpensesBarPlot = () => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const dbconfig = getConfig(user);
  const { hideAccounts, setDetailedDate, dateRange, chartPeriodicity } = useSummaryPageContext();
  const { locale } = useLocale();
  const { t } = useTranslation();
  const othersLabel = t("summary.plots.others");

  const { data: transactData } = useQuery(
    transactByAccountOptions({
      db,
      bookId,
      accountIds: [dbconfig.expenses],
      periodicity: chartPeriodicity,
      select: useCallback(
        (rawData: TransactData) => {
          if (rawData) {
            const { data, keys } = pivotData(
              collapseMinorAccounts(
                rawData
                  .filter((d) => d.date >= dateRange.from.toString())
                  .filter((d) => d.date <= dateRange.to.toString()),
                14,
                othersLabel,
              ),
            );
            return { data, keys };
          }
          return { data: undefined, keys: undefined };
        },
        [dateRange, othersLabel],
      ),
    }),
  );

  const { data, keys } = transactData ?? { data: undefined, keys: undefined };

  const { data: keyNames } = useQuery(
    accountsOptions({
      db,
      bookId,
      accountIds: [dbconfig.expenses],
      select: useCallback(
        (accounts: AccountsData) => {
          if (keys) {
            const keyNames = keys
              .filter((k) => !hideAccounts.includes(k))
              .map((k) => accounts.find((a) => a.id == k)?.name ?? othersLabel);
            return keyNames;
          }
        },
        [keys, hideAccounts, othersLabel],
      ),
    }),
  );

  const valueFormatter = useMemo(
    () => (number: number) => formatCurrency(number, locale, { digits: 0, compact: true }),
    [locale],
  );

  const onValueChange = useCallback(
    (v: BarChartEventProps) =>
      setDetailedDate(DateTime.fromFormat(v?.date as string, "yyyy-LL-dd")),
    [setDetailedDate],
  );

  if (!data || !dateRange || !keyNames) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <BarLoader />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col dark">
      <BarChart
        type="stacked"
        data={data}
        index="dateLabel"
        categories={keyNames}
        showLegend={false}
        valueFormatter={valueFormatter}
        onValueChange={onValueChange}
      />
    </div>
  );
};
