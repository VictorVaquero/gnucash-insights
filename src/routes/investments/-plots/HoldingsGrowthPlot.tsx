import { DateTime } from "luxon";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { useTranslation } from "react-i18next";

import { getRandomColor } from "@/common/getColors";
import { formatNumber, useIsNarrowViewport } from "@/common/utils.ts";
import { BarLoader } from "@/components/ui/BarLoader";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { renderTouchDot } from "@/components/charts/TouchDot";
import { useChartScrubber } from "@/hooks/useChartScrubber";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { useHoldings, type Holding } from "../-useHoldings";

interface Series {
  id: string;
  label: string;
  isTotal?: boolean;
}
interface ChartRow {
  date: string;
  dateLabel: string;
  [holdingId: string]: string | number;
}

const TOTAL_ID = "__total";
const marginDesktop = { top: 20, right: 20, bottom: 0, left: 44 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 32 };
const axisTickStyle = { fontSize: 10, fill: "currentColor" };

const entryColorStyleCache = new Map<string, { color: string }>();
const entryColorStyle = (color: string) => {
  let style = entryColorStyleCache.get(color);
  if (!style) {
    style = { color };
    entryColorStyleCache.set(color, style);
  }
  return style;
};

const seriesColor = (s: Series): string =>
  s.isTotal ? "var(--color-brand)" : getRandomColor(s.id);

const buildIndexedRows = (
  holdings: Holding[],
  totalLabel: string,
): { rows: ChartRow[]; series: Series[] } => {
  const holdingsWithPrices = holdings.filter(
    (h) => h.priceHistory.length > 0 && h.priceHistory[0].value,
  );
  const series: Series[] = holdingsWithPrices.map((h) => ({
    id: h.accountId,
    label: h.ticker ?? h.name,
  }));

  const byDate = new Map<string, ChartRow>();
  for (const h of holdingsWithPrices) {
    const base = h.priceHistory[0].value;
    for (const p of h.priceHistory) {
      const row =
        byDate.get(p.date) ??
        ({ date: p.date, dateLabel: DateTime.fromISO(p.date).toFormat("MMM d, yyyy") } as ChartRow);
      row[h.accountId] = (p.value / base) * 100;
      byDate.set(p.date, row);
    }
  }

  const rows = Array.from(byDate.values()).sort(
    (a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis(),
  );

  // Total line: a weighted blend of each holding's own price index (weighted by its current
  // share of portfolio market value), so it stays on the same indexed-to-100 scale as the
  // other series -- unlike a raw money-weighted total, it isn't skewed by *when* lots were
  // purchased, only by price performance, which is what belongs on a growth comparison chart.
  const totalMarketValue = holdingsWithPrices.reduce((sum, h) => sum + h.marketValue, 0);
  if (rows.length > 0 && totalMarketValue > 0) {
    const cursors = holdingsWithPrices.map((h) => ({
      weight: h.marketValue / totalMarketValue,
      base: h.priceHistory[0].value,
      prices: h.priceHistory,
      priceIdx: 0,
      lastIndex: null as number | null,
    }));

    for (const row of rows) {
      let weightedIndex = 0;
      let weightSeen = 0;
      for (const c of cursors) {
        while (c.priceIdx < c.prices.length && c.prices[c.priceIdx].date <= row.date) {
          c.lastIndex = (c.prices[c.priceIdx].value / c.base) * 100;
          c.priceIdx++;
        }
        if (c.lastIndex != null) {
          weightedIndex += c.weight * c.lastIndex;
          weightSeen += c.weight;
        }
      }
      if (weightSeen > 0) row[TOTAL_ID] = weightedIndex / weightSeen;
    }
    series.push({ id: TOTAL_ID, label: totalLabel, isTotal: true });
  }

  return { rows, series };
};

const IndexedTooltipContent = ({
  payload,
  label,
  series,
}: Pick<TooltipContentProps<number, string>, "payload" | "label"> & { series: Series[] }) => {
  const { locale } = useLocale();
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-stretch gap-0.5">
      <span className="text-muted-foreground text-xs text-center">{label}</span>
      {payload.map((entry) => {
        const s = series.find((s) => s.id === entry.dataKey);
        const value = entry.value as number;
        const delta = value - 100;
        const deltaColor =
          delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-muted-foreground";
        return (
          <span key={entry.dataKey} className="flex items-center gap-2 justify-between">
            <span style={entryColorStyle(entry.color)}>
              {s?.label}: {formatNumber(value, locale, { digits: 1 })}
            </span>
            <span className={cn("text-xs tabular-nums", deltaColor)}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : ""}{" "}
              {formatNumber(Math.abs(delta), locale, { digits: 1 })}%
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const HoldingsGrowthPlot = () => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;
  const { t } = useTranslation();
  const { holdings, isLoading } = useHoldings();

  const totalLabel = t("investments.chart.total");
  const { rows: chartData, series } = useMemo(
    () => buildIndexedRows(holdings, totalLabel),
    [holdings, totalLabel],
  );

  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const toggleSeries = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const visibleSeries = useMemo(() => series.filter((s) => !hidden.has(s.id)), [series, hidden]);

  const renderTooltipContent = useCallback(
    (props: TooltipContentProps<number, string>) => (
      <ChartTooltip {...props}>
        {({ payload, label }) => (
          <IndexedTooltipContent payload={payload} label={label} series={visibleSeries} />
        )}
      </ChartTooltip>
    ),
    [visibleSeries],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex } = useChartScrubber(containerRef, {
    length: chartData.length,
    margin: { left: margin.left, right: margin.right },
  });
  const scrubbedPoint = activeIndex != null ? chartData[activeIndex] : undefined;

  const activeDots = useMemo(
    () => new Map(series.map((s) => [s.id, renderTouchDot(seriesColor(s), s.isTotal ? 5 : 4)])),
    [series],
  );

  if (isLoading)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  if (series.length === 0)
    return <p className="text-sm text-muted-foreground">{t("investments.table.empty")}</p>;

  return (
    <div className="flex flex-col w-full h-full gap-2">
      <div className="flex flex-wrap gap-1.5 shrink-0">
        {series.map((s) => {
          const isHidden = hidden.has(s.id);
          const color = seriesColor(s);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSeries(s.id)}
              aria-pressed={!isHidden}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-transparent bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition-opacity",
                s.isTotal && !isHidden && "bg-brand/10 text-brand font-semibold",
                isHidden && "opacity-40",
              )}
            >
              <span
                className="size-2 rounded-sm shrink-0"
                style={{ backgroundColor: isHidden ? "var(--color-muted-foreground)" : color }}
              />
              {s.label}
            </button>
          );
        })}
      </div>
      <div ref={containerRef} className="relative w-full flex-1 min-h-0 touch-none">
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
              width={margin.left}
              domain={["auto", "auto"]}
            />
            <RechartsTooltip content={renderTooltipContent} />
            {visibleSeries.map((s) => (
              <Line
                key={s.id}
                type="linear"
                dataKey={s.id}
                name={s.label}
                stroke={seriesColor(s)}
                strokeWidth={s.isTotal ? 3 : 1.5}
                dot={false}
                activeDot={activeDots.get(s.id)}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
