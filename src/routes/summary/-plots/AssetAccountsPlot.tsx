import { BarLoader } from "@/components/ui/BarLoader";
import { DateTime } from "luxon";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import { getRandomColor } from "@/common/getColors";
import { parseNum, useIsNarrowViewport } from "@/common/utils.ts";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { transactByAccountOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";
import { useSummaryPageContext } from "../-summaryPageContext";

interface Data {
  date: string;
  dateLabel: string;
  accountId: string;
  accountName: string;
  value: number;
}
interface Account {
  id: string;
  name: string;
}
interface ChartRow {
  date: string;
  dateLabel: string;
  [accountId: string]: string | number;
}

const marginDesktop = { top: 20, right: 20, bottom: 0, left: 44 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 32 };

const ChartTooltipContent = ({
  active,
  payload,
  label,
  accounts,
}: TooltipContentProps<number, string> & { accounts: Account[] }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      {payload.map((entry) => {
        const account = accounts.find((a) => a.id === entry.dataKey);
        return (
          <span key={entry.dataKey} style={{ color: entry.color }}>
            {account?.name}: {parseNum(entry.value as number)}
          </span>
        );
      })}
    </div>
  );
};

const DrawMonthlyAccountsPlot = ({ data, accounts }: { data: Data[]; accounts: Account[] }) => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;

  const chartData = useMemo(() => {
    const byDate = new Map<string, ChartRow>();
    for (const d of data) {
      const row = byDate.get(d.date) ?? { date: d.date, dateLabel: d.dateLabel };
      row[d.accountId] = Math.abs(d.value);
      byDate.set(d.date, row);
    }
    return Array.from(byDate.values()).sort(
      (a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis(),
    );
  }, [data]);

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={margin}>
          <CartesianGrid strokeOpacity={0.1} vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-500"
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-500"
            tickLine={false}
            tickFormatter={(value: number) => parseNum(value)}
            width={margin.left}
          />
          <RechartsTooltip
            content={(props: TooltipContentProps<number, string>) => (
              <ChartTooltipContent {...props} accounts={accounts} />
            )}
          />
          {accounts.map((s) => (
            <Line
              key={s.id}
              type="linear"
              dataKey={s.id}
              name={s.name}
              stroke={getRandomColor(s.id)}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AssetAccountsPlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { dateRange, chartPeriodicity } = useSummaryPageContext();
  const dbconfig = getConfig(user);

  const { data: rawData } = useQuery(
    transactByAccountOptions({
      db,
      bookId,
      accountIds: [dbconfig.assets],
      periodicity: chartPeriodicity,
      accumulate: true,
    }),
  );

  const { data: accounts } = useQuery(
    accountsOptions({ db, bookId, accountIds: [dbconfig.assets] }),
  );

  const data = useMemo(() => {
    if (rawData) {
      return rawData
        .sort((a, b) => {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          return timeA - timeB;
        })
        .filter((d) => d.date >= dateRange.from.toString())
        .filter((d) => d.date <= dateRange.to.toString());
    }
  }, [rawData, dateRange]);

  if (!data || !accounts || !dateRange)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  return <DrawMonthlyAccountsPlot data={data} accounts={accounts} />;
};
