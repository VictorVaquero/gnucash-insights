import { BarLoader } from "@/components/ui/BarLoader";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import { parseNum, twStyles, useIsNarrowViewport } from "@/common/utils.ts";
import { useAuth } from "@/contexts/useAuthContext";
import { transactsSumOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";
import { useSummaryPageContext } from "../-summaryPageContext";

type colorType = "g" | "r";
export interface PlotData {
  date: string;
  dateLabel: string;
  expenses: number;
  income: number;
  net: number;
}
interface ChartRow extends PlotData {
  netAbs: number;
}

const colorCodes: Record<colorType, string> = {
  g: twStyles.getPropertyValue("--color-emerald-500"),
  r: twStyles.getPropertyValue("--color-red-500"),
};

const marginDesktop = { top: 20, right: 20, bottom: 0, left: 44 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 32 };
const getColor = (d: colorType) => colorCodes[d];

const ChartTooltipContent = ({ active, payload }: TooltipContentProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload as ChartRow;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{d.dateLabel}</span>
      <div className="text-muted-foreground text-sm">
        Income: <span style={{ color: getColor("g") }}>{parseNum(d.income)}</span>
      </div>
      <div className="text-muted-foreground text-sm">
        Expenses: <span style={{ color: getColor("r") }}>{parseNum(d.expenses)}</span>
      </div>
      <div className="text-muted-foreground text-sm">
        Net: <span style={{ color: getColor(d.net > 0 ? "g" : "r") }}>{parseNum(d.net)}</span>
      </div>
    </div>
  );
};

const DrawMonthlyIncomeExpensesPlot = ({ data }: { data: PlotData[] }) => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;

  const chartData: ChartRow[] = useMemo(
    () => data.map((d) => ({ ...d, netAbs: Math.abs(d.net) })),
    [data],
  );

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={margin}>
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
              <ChartTooltipContent {...props} />
            )}
          />
          <Bar dataKey="netAbs" fillOpacity={0.4} isAnimationActive={false}>
            {chartData.map((d) => (
              <Cell key={"net" + d.date} fill={getColor(d.net > 0 ? "g" : "r")} />
            ))}
          </Bar>
          <Line
            type="linear"
            dataKey="expenses"
            stroke={getColor("r")}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="income"
            stroke={getColor("g")}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const IncomeExpensesPlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { dateRange, hideAccounts, chartPeriodicity: charMode } = useSummaryPageContext();
  const dbconf = getConfig(user);

  const { data: expenses } = useQuery(
    transactsSumOptions({
      db,
      bookId,
      accountIds: [dbconf.expenses],
      periodicity: charMode,
      hideAccounts,
    }),
  );
  const { data: income } = useQuery(
    transactsSumOptions({
      db,
      bookId,
      accountIds: [dbconf.income, dbconf.taxes],
      periodicity: charMode,
      hideAccounts,
    }),
  );
  const { data: net } = useQuery(
    transactsSumOptions({
      db,
      bookId,
      accountIds: [dbconf.expenses, dbconf.income, dbconf.taxes],
      periodicity: charMode,
      hideAccounts,
    }),
  );

  const data = useMemo(() => {
    if (net && income && expenses) {
      const registry = new Map<string, PlotData>();

      /**
       * Internal helper to ensure we always work with a
       * fully initialized PlotData object.
       */
      const getEntry = (date: string, dateLabel: string): PlotData => {
        let entry = registry.get(date);
        if (!entry) {
          entry = { date, dateLabel, net: 0, income: 0, expenses: 0 };
          registry.set(date, entry);
        }
        return entry;
      };

      // Populate the Map
      net.forEach((d) => (getEntry(d.date, d.dateLabel).net = -d.value));
      income.forEach((d) => (getEntry(d.date, d.dateLabel).income = Math.abs(d.value)));
      expenses.forEach((d) => (getEntry(d.date, d.dateLabel).expenses = Math.abs(d.value)));

      // Convert to array and sort by date chronologically
      return Array.from(registry.values())
        .filter((d) => d.date >= dateRange.from.toString())
        .filter((d) => d.date <= dateRange.to.toString())
        .sort((a, b) => {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          return timeA - timeB;
        });
    }
  }, [net, income, expenses, dateRange]);

  if (!data || !dateRange)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  return <DrawMonthlyIncomeExpensesPlot data={data} />;
};
