import { DateTime } from "luxon";
import { useCallback, useMemo, useRef } from "react";
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

import { formatCurrency, useIsNarrowViewport } from "@/common/utils.ts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { renderTouchDot } from "@/components/charts/TouchDot";
import { useChartScrubber } from "@/hooks/useChartScrubber";
import { useLocale } from "@/hooks/useLocale";
import type { PricePoint } from "../-useHoldings";

const marginDesktop = { top: 20, right: 20, bottom: 0, left: 44 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 32 };
const axisTickStyle = { fontSize: 10, fill: "currentColor" };
const brandStroke = "var(--color-brand)";

interface ChartRow {
  date: string;
  dateLabel: string;
  price: number;
}

const HoldingPriceTooltipContent = ({
  payload,
  label,
}: Pick<TooltipContentProps<number, string>, "payload" | "label">) => {
  const { locale } = useLocale();
  const value = payload[0]?.value;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span>{value != null ? formatCurrency(value as number, locale, { digits: 2 }) : "—"}</span>
    </div>
  );
};

export const HoldingPricePlot = ({ priceHistory }: { priceHistory: PricePoint[] }) => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;
  const { locale } = useLocale();

  const yTickFormatter = useMemo(
    () => (value: number) => formatCurrency(value, locale, { compact: true }),
    [locale],
  );

  const renderTooltipContent = useCallback(
    (props: TooltipContentProps<number, string>) => (
      <ChartTooltip {...props}>
        {({ payload, label }) => <HoldingPriceTooltipContent payload={payload} label={label} />}
      </ChartTooltip>
    ),
    [],
  );

  const chartData = useMemo<ChartRow[]>(
    () =>
      priceHistory.map((p) => ({
        date: p.date,
        dateLabel: DateTime.fromISO(p.date).toFormat("MMM d, yyyy"),
        price: p.value,
      })),
    [priceHistory],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex } = useChartScrubber(containerRef, {
    length: chartData.length,
    margin: { left: margin.left, right: margin.right },
  });
  const scrubbedPoint = activeIndex != null ? chartData[activeIndex] : undefined;

  const activeDot = useMemo(() => renderTouchDot(brandStroke, 4), []);

  if (chartData.length === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full h-56 touch-none">
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
            domain={["auto", "auto"]}
          />
          <RechartsTooltip content={renderTooltipContent} />
          <Line
            type="linear"
            dataKey="price"
            stroke={brandStroke}
            strokeWidth={1.5}
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
