import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { groupBy, rollup, sum } from "@/common/aggregate";
import { formatCurrency } from "@/common/utils";
import { BarChart } from "@/components/charts/BarPlot";
import { BarLoader } from "@/components/ui/BarLoader";
import { useAuth } from "@/contexts/useAuthContext";
import { AccountsData, accountsOptions } from "@/db/queries/global";
import { TransactData, transactByAccountOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { useSummaryPageContext } from "../-summaryPageContext";

export interface Data {
  accountId: string;
  accountName: string;
  date: string;
  dateLabel: string;
  value: number;
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

export const DetailedIncomeBarPlot = () => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const dbconfig = getConfig(user);
  const { dateRange, chartPeriodicity } = useSummaryPageContext();
  const { locale } = useLocale();
  const { t } = useTranslation();
  const otherAccountLabel = t("summary.plots.otherAccount");

  const { data: transactData } = useQuery(
    transactByAccountOptions({
      db,
      bookId,
      accountIds: [dbconfig.income],
      periodicity: chartPeriodicity,
      select: useCallback(
        (rawData: TransactData) => {
          if (rawData) {
            const { data, keys } = pivotData(
              rawData
                .map((d) => ({ ...d, value: -d.value }))
                .filter((d) => d.date >= dateRange.from.toString())
                .filter((d) => d.date <= dateRange.to.toString()),
            );
            return { data, keys };
          }
          return { data: undefined, keys: undefined };
        },
        [dateRange],
      ),
    }),
  );

  const { data, keys } = transactData ?? { data: undefined, keys: undefined };

  const { data: keyNames } = useQuery(
    accountsOptions({
      db,
      bookId,
      accountIds: [dbconfig.income],
      select: useCallback(
        (accounts: AccountsData) => {
          if (keys) {
            const keyNames = keys.map(
              (k) => accounts.find((a) => a.id == k)?.name ?? otherAccountLabel,
            );
            return keyNames;
          }
        },
        [keys, otherAccountLabel],
      ),
    }),
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
        showXAxis={false}
        valueFormatter={(number: number) =>
          formatCurrency(number, locale, { digits: 0, compact: true })
        }
      />
    </div>
  );
};
