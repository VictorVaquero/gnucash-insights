import { twStyles } from "@/common/utils";
import { useMemo, useRef } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import { groupBy, sum } from "@/common/aggregate";
import { formatCurrency, useIsNarrowViewport } from "@/common/utils.ts";
import { ChartKeyValue } from "@/components/charts/ChartKeyValue";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { renderTouchDot } from "@/components/charts/TouchDot";
import { useChartScrubber } from "@/hooks/useChartScrubber";
import { useLocale } from "@/hooks/useLocale";
import { Periodicity } from "@/types/domain";
import { FullTransaction } from "..";

interface ChartRow {
  dateLabel: string;
  value: number;
}

const green = twStyles.getPropertyValue("--color-green-500");
const red = twStyles.getPropertyValue("--color-red-500");

const marginDesktop = { top: 20, right: 20, bottom: 0, left: 50 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 36 };
const getColor = (d: string) => (d === "Ingresos" ? green : red);
const axisTickStyle = { fontSize: 10, fill: "currentColor" };
const mixinColor = getColor("Mixin");
const mixinColorStyle = { color: mixinColor };

const ChartTooltipContent = ({ payload }: Pick<TooltipContentProps<number, string>, "payload">) => {
  const d = payload[0].payload as ChartRow;
  const { locale } = useLocale();
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{d.dateLabel}</span>
      <span style={mixinColorStyle}>{formatCurrency(d.value, locale, { compact: true })}</span>
    </div>
  );
};

const renderTooltipContent = (props: TooltipContentProps<number, string>) => (
  <ChartTooltip {...props}>
    {({ payload }) => <ChartTooltipContent payload={payload} />}
  </ChartTooltip>
);

export const TransactsPlot = ({
  data,
  periodicity,
}: {
  data: FullTransaction[];
  periodicity: Periodicity;
}) => {
  const isNarrowViewport = useIsNarrowViewport();
  const { locale } = useLocale();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;
  const format =
    periodicity == "yearly" ? "yyyy" : periodicity == "monthly" ? "yyyy-LL" : "yyyy-qq";

  const chartData: ChartRow[] = useMemo(() => {
    const grouped = groupBy(data, (d) => d.datePosted.toFormat(format));
    return Array.from(grouped, ([date, items]) => ({
      dateLabel: date,
      value: sum(items, (d) => d.value),
    })).sort((a, b) => (a.dateLabel > b.dateLabel ? 1 : -1));
  }, [data, format]);

  const dot = useMemo(() => renderTouchDot(mixinColor, 5), []);
  const activeDot = useMemo(() => renderTouchDot(mixinColor, 6), []);
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
          label={latest.dateLabel}
          value={
            <span style={mixinColorStyle}>
              {formatCurrency(latest.value, locale, { compact: true })}
            </span>
          }
        />
      )}
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
          <Line
            type="monotone"
            dataKey="value"
            stroke={mixinColor}
            strokeWidth={1.5}
            dot={dot}
            activeDot={activeDot}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
