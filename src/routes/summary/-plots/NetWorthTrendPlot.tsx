import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import { formatCurrency, twStyles, useIsNarrowViewport } from "@/common/utils.ts";
import { ChartKeyValue } from "@/components/charts/ChartKeyValue";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { renderTouchDot } from "@/components/charts/TouchDot";
import { BarLoader } from "@/components/ui/BarLoader";
import { useAuth } from "@/contexts/useAuthContext";
import { transactByAccountOptions } from "@/db/queries/summary";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useChartScrubber } from "@/hooks/useChartScrubber";
import { useLocale } from "@/hooks/useLocale";
import { useSummaryPageContext } from "../-summaryPageContext";

interface Data {
  accountId: string;
  date: string;
  dateLabel: string;
  value: number;
}
interface ChartRow {
  date: string;
  dateLabel: string;
  total: number;
}

const marginDesktop = { top: 20, right: 20, bottom: 0, left: 44 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 32 };
const lineColor = twStyles.getPropertyValue("--color-blue-500");
const activeDot = renderTouchDot(lineColor, 4);

const ChartTooltipContent = ({
  payload,
  label,
}: Pick<TooltipContentProps<number, string>, "payload" | "label">) => {
  const { locale } = useLocale();
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span style={{ color: lineColor }}>
        {formatCurrency((payload[0]?.value as number) ?? 0, locale, { compact: true })}
      </span>
    </div>
  );
};

const DrawNetWorthTrendPlot = ({ data }: { data: Data[] }) => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;
  const { locale } = useLocale();
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    const byDate = new Map<string, ChartRow>();
    for (const d of data) {
      const row = byDate.get(d.date) ?? { date: d.date, dateLabel: d.dateLabel, total: 0 };
      row.total += Math.abs(d.value);
      byDate.set(d.date, row);
    }
    return Array.from(byDate.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [data]);

  const latestTotal = chartData[chartData.length - 1]?.total ?? 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex } = useChartScrubber(containerRef, {
    length: chartData.length,
    margin: { left: margin.left, right: margin.right },
  });
  const scrubbedPoint = activeIndex != null ? chartData[activeIndex] : undefined;

  return (
    <div ref={containerRef} className="relative w-full h-64 md:h-full touch-none">
      <ChartKeyValue
        label={t("summary.plots.latestTotal")}
        value={formatCurrency(latestTotal, locale, { compact: true })}
      />
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={margin}>
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
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-500"
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-500"
            tickLine={false}
            tickFormatter={(value: number) => formatCurrency(value, locale, { compact: true })}
            width={margin.left}
          />
          <RechartsTooltip
            content={(props: TooltipContentProps<number, string>) => (
              <ChartTooltip {...props}>
                {({ payload, label }) => <ChartTooltipContent payload={payload} label={label} />}
              </ChartTooltip>
            )}
          />
          <Line
            type="linear"
            dataKey="total"
            name={t("summary.plots.netWorth")}
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={activeDot}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const NetWorthTrendPlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { dateRange, chartPeriodicity } = useSummaryPageContext();
  const dbconfig = getConfig(user);

  const { data: rawData } = useQuery(
    transactByAccountOptions({
      db,
      bookId,
      accountIds: [dbconfig.assets, dbconfig.checking, dbconfig.savings, dbconfig.investments],
      periodicity: chartPeriodicity,
      accumulate: true,
    }),
  );

  const data = useMemo(() => {
    if (rawData) {
      return rawData
        .filter((d) => d.date >= dateRange.from.toString())
        .filter((d) => d.date <= dateRange.to.toString());
    }
  }, [rawData, dateRange]);

  if (!data || !dateRange)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  return <DrawNetWorthTrendPlot data={data} />;
};
