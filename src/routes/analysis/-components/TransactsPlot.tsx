import { DateTime } from "luxon";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import { groupBy, netTransactionValue, sum } from "@/common/aggregate";
import { formatCurrency, twStyles, useIsNarrowViewport } from "@/common/utils.ts";
import { ChartKeyValue } from "@/components/charts/ChartKeyValue";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useChartScrubber } from "@/hooks/useChartScrubber";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";
import { FinePeriodicity } from "@/types/domain";
import { FullTransaction } from "..";

interface ChartRow {
  dateLabel: string;
  // Both series are always non-negative -- income and expense bars both rise from the zero
  // baseline (color alone tells them apart), rather than expense dipping below it.
  income: number;
  expense: number;
  net: number;
}

const green = twStyles.getPropertyValue("--color-green-500");
const red = twStyles.getPropertyValue("--color-red-500");

const PERIOD_FORMATS: Record<FinePeriodicity, string> = {
  daily: "yyyy-LL-dd",
  weekly: "kkkk-'W'WW",
  monthly: "yyyy-LL",
  quarterly: "yyyy-qq",
  yearly: "yyyy",
};

const UNIT = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
} as const;

/** The first and last day covered by a chart label such as `2024-03`, `2024-02` (quarter) or `2024-W09`. */
export const periodRange = (
  label: string,
  periodicity: FinePeriodicity,
): { from: DateTime; to: DateTime } | null => {
  const start =
    periodicity === "quarterly"
      ? DateTime.fromObject({
          year: Number(label.slice(0, 4)),
          month: (Number(label.slice(5)) - 1) * 3 + 1,
        })
      : DateTime.fromFormat(label, PERIOD_FORMATS[periodicity]);
  if (!start.isValid) return null;
  return {
    from: start.startOf(UNIT[periodicity]),
    to: start.endOf(UNIT[periodicity]).startOf("day"),
  };
};

const marginDesktop = { top: 28, right: 20, bottom: 0, left: 50 };
const marginMobile = { top: 24, right: 10, bottom: 0, left: 36 };
const axisTickStyle = { fontSize: 10, fill: "currentColor" };
const greenStyle = { color: green };
const redStyle = { color: red };
const greenDotStyle = { background: green };
const redDotStyle = { background: red };
const netStyle = (positive: boolean) => (positive ? greenStyle : redStyle);
const barRadius: [number, number, number, number] = [4, 4, 0, 0];

const ChartTooltipContent = ({ payload }: Pick<TooltipContentProps<number, string>, "payload">) => {
  const d = payload[0].payload as ChartRow;
  const { locale } = useLocale();
  const { t } = useTranslation();
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{d.dateLabel}</span>
      <div className="text-muted-foreground text-sm">
        {t("analysis.chart.income")}:{" "}
        <span style={greenStyle}>{formatCurrency(d.income, locale, { compact: true })}</span>
      </div>
      <div className="text-muted-foreground text-sm">
        {t("analysis.chart.expense")}:{" "}
        <span style={redStyle}>{formatCurrency(d.expense, locale, { compact: true })}</span>
      </div>
      <div className="text-muted-foreground text-sm">
        {t("analysis.kpi.total")}:{" "}
        <span style={netStyle(d.net >= 0)}>{formatCurrency(d.net, locale, { compact: true })}</span>
      </div>
    </div>
  );
};

const renderTooltipContent = (props: TooltipContentProps<number, string>) => (
  <ChartTooltip {...props}>
    {({ payload }) => <ChartTooltipContent payload={payload} />}
  </ChartTooltip>
);

// Two series always carry a legend (dataviz mark spec) -- direct labels alone aren't enough
// once bars can converge near the zero baseline.
const PlotLegend = () => {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none absolute top-1 left-2 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={greenDotStyle} />
        {t("analysis.chart.income")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={redDotStyle} />
        {t("analysis.chart.expense")}
      </span>
    </div>
  );
};

export const TransactsPlot = ({
  data,
  periodicity,
  onPeriodSelect,
}: {
  data: FullTransaction[];
  periodicity: FinePeriodicity;
  /** Called with the period's date range when a bar is clicked. */
  onPeriodSelect?: (range: { from: DateTime; to: DateTime }) => void;
}) => {
  const isNarrowViewport = useIsNarrowViewport();
  const { locale } = useLocale();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;
  const format = PERIOD_FORMATS[periodicity];

  const chartData: ChartRow[] = useMemo(() => {
    const grouped = groupBy(data, (d) => d.datePosted.toFormat(format));
    return Array.from(grouped, ([date, items]) => {
      const income = sum(
        items.filter((d) => d.accountType === "INCOME"),
        netTransactionValue,
      );
      const expense = -sum(
        items.filter((d) => d.accountType === "EXPENSE"),
        netTransactionValue,
      );
      return { dateLabel: date, income, expense, net: income - expense };
    }).sort((a, b) => (a.dateLabel > b.dateLabel ? 1 : -1));
  }, [data, format]);

  const latest = chartData[chartData.length - 1];

  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex } = useChartScrubber(containerRef, {
    length: chartData.length,
    margin: { left: margin.left, right: margin.right },
  });
  const scrubbedPoint = activeIndex != null ? chartData[activeIndex] : undefined;

  // A mouse click selects the period under the pointer; a drag (scrubbing) or a touch tap
  // (which pins the tooltip instead) must not. The scrubber captures the pointer, so the click
  // lands on the container rather than on the chart and the bar is found from the x position,
  // the same way the scrubber does it. Native listeners keep this out of React's render path.
  const selection = useRef({ chartData, margin, periodicity, onPeriodSelect });
  useEffect(() => {
    selection.current = { chartData, margin, periodicity, onPeriodSelect };
  });
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let pressedAt: number | null = null;
    const onDown = (e: PointerEvent) => {
      pressedAt = e.pointerType === "mouse" ? e.clientX : null;
    };
    const onClick = (e: globalThis.MouseEvent) => {
      const {
        chartData: rows,
        margin: m,
        periodicity: p,
        onPeriodSelect: select,
      } = selection.current;
      if (!select || rows.length === 0 || pressedAt === null || Math.abs(e.clientX - pressedAt) > 5)
        return;
      const rect = node.getBoundingClientRect();
      const fraction =
        (e.clientX - rect.left - m.left) / Math.max(rect.width - m.left - m.right, 1);
      const index =
        rows.length <= 1 ? 0 : Math.round(Math.min(Math.max(fraction, 0), 1) * (rows.length - 1));
      const range = periodRange(rows[index].dateLabel, p);
      if (range) select(range);
    };
    node.addEventListener("pointerdown", onDown);
    node.addEventListener("click", onClick);
    return () => {
      node.removeEventListener("pointerdown", onDown);
      node.removeEventListener("click", onClick);
    };
  }, []);

  const yTickFormatter = useMemo(
    () => (value: number) => formatCurrency(value, locale, { compact: true }),
    [locale],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-64 md:h-full touch-none",
        onPeriodSelect && "cursor-pointer",
      )}
    >
      <PlotLegend />
      {latest && (
        <ChartKeyValue
          label={latest.dateLabel}
          value={
            <span style={netStyle(latest.net >= 0)}>
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
              position="middle"
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              ifOverflow="extendDomain"
            />
          )}
          <ReferenceLine y={0} stroke="var(--color-border)" />
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
          <Bar
            dataKey="income"
            fill={green}
            radius={barRadius}
            maxBarSize={24}
            isAnimationActive={false}
          />
          <Bar
            dataKey="expense"
            fill={red}
            radius={barRadius}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
