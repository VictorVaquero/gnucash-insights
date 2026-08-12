import { BarLoader } from "@/components/ui/BarLoader";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, twStyles, useIsNarrowViewport } from "@/common/utils.ts";
import { ChartKeyValue } from "@/components/charts/ChartKeyValue";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { renderTouchDot } from "@/components/charts/TouchDot";
import { useAuth } from "@/contexts/useAuthContext";
import { transactsSumOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useChartScrubber } from "@/hooks/useChartScrubber";
import { useLocale } from "@/hooks/useLocale";
import { useQuery } from "@tanstack/react-query";
import { useSummaryPageContext } from "../-summaryPageContext";
import { useDeflator } from "../-useDeflator";

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
const activeDotGreen = renderTouchDot(getColor("g"), 4);
const activeDotRed = renderTouchDot(getColor("r"), 4);
const axisTickStyle = { fontSize: 10, fill: "currentColor" };
const greenStyle = { color: getColor("g") };
const redStyle = { color: getColor("r") };
const netStyle = (positive: boolean) => (positive ? greenStyle : redStyle);

const ChartTooltipContent = ({ payload }: Pick<TooltipContentProps<number, string>, "payload">) => {
  const d = payload[0].payload as ChartRow;
  const { locale } = useLocale();
  const { t } = useTranslation();
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{d.dateLabel}</span>
      <div className="text-muted-foreground text-sm">
        {t("summary.plots.income")}:{" "}
        <span style={greenStyle}>{formatCurrency(d.income, locale, { compact: true })}</span>
      </div>
      <div className="text-muted-foreground text-sm">
        {t("summary.plots.expenses")}:{" "}
        <span style={redStyle}>{formatCurrency(d.expenses, locale, { compact: true })}</span>
      </div>
      <div className="text-muted-foreground text-sm">
        {t("summary.plots.net")}:{" "}
        <span style={netStyle(d.net > 0)}>{formatCurrency(d.net, locale, { compact: true })}</span>
      </div>
    </div>
  );
};

const renderTooltipContent = (props: TooltipContentProps<number, string>) => (
  <ChartTooltip {...props}>
    {({ payload }) => <ChartTooltipContent payload={payload} />}
  </ChartTooltip>
);

const DrawMonthlyIncomeExpensesPlot = ({ data }: { data: PlotData[] }) => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;
  const { locale } = useLocale();
  const { t } = useTranslation();

  const chartData: ChartRow[] = useMemo(
    () => data.map((d) => ({ ...d, netAbs: Math.abs(d.net) })),
    [data],
  );

  const latest = chartData[chartData.length - 1];

  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex } = useChartScrubber(containerRef, {
    length: chartData.length,
    margin: { left: margin.left, right: margin.right },
  });
  const scrubbedPoint = activeIndex != null ? chartData[activeIndex] : undefined;

  const yTickFormatter = useMemo(
    () => (value: number) => formatCurrency(value, locale, { compact: true }),
    [locale],
  );

  return (
    <div ref={containerRef} className="relative w-full h-64 md:h-full touch-none">
      {latest && (
        <ChartKeyValue
          label={t("summary.plots.netWithDate", { date: latest.dateLabel })}
          value={
            <span style={netStyle(latest.net > 0)}>
              {formatCurrency(latest.net, locale, { compact: true })}
            </span>
          }
        />
      )}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={margin}>
          <CartesianGrid strokeOpacity={0.1} vertical={false} />
          {scrubbedPoint && (
            <ReferenceLine
              x={scrubbedPoint.dateLabel}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              ifOverflow="extendDomain"
            />
          )}
          <XAxis
            dataKey="dateLabel"
            tick={axisTickStyle}
            className="text-gray-500"
            tickLine={false}
          />
          <YAxis
            tick={axisTickStyle}
            className="text-gray-500"
            tickLine={false}
            tickFormatter={yTickFormatter}
            width={margin.left}
          />
          <RechartsTooltip content={renderTooltipContent} />
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
            activeDot={activeDotRed}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="income"
            stroke={getColor("g")}
            strokeWidth={1.5}
            dot={false}
            activeDot={activeDotGreen}
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
  const { deflate } = useDeflator();
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
      net.forEach((d) => (getEntry(d.date, d.dateLabel).net = -deflate(d.value, d.date)));
      income.forEach(
        (d) => (getEntry(d.date, d.dateLabel).income = Math.abs(deflate(d.value, d.date))),
      );
      expenses.forEach(
        (d) => (getEntry(d.date, d.dateLabel).expenses = Math.abs(deflate(d.value, d.date))),
      );

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
  }, [net, income, expenses, dateRange, deflate]);

  if (!data || !dateRange)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  return <DrawMonthlyIncomeExpensesPlot data={data} />;
};
