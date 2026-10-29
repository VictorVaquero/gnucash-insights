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
import { formatCurrency, formatNumber, useIsNarrowViewport } from "@/common/utils.ts";
import { BarLoader } from "@/components/ui/BarLoader";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { renderTouchDot } from "@/components/charts/TouchDot";
import { useChartScrubber } from "@/hooks/useChartScrubber";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { INVESTED_ID, TOTAL_ID, VALUE_ID, buildPortfolioSeries } from "../-portfolioSeries";
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
  s.id === INVESTED_ID
    ? "var(--color-muted-foreground)"
    : s.isTotal
      ? "var(--color-brand)"
      : getRandomColor(s.id);

type Mode = "return" | "value";

const buildRows = (
  holdings: Holding[],
  mode: Mode,
  labels: { total: string; value: string; invested: string },
): { rows: ChartRow[]; series: Series[] } => {
  const points = buildPortfolioSeries(holdings.map((h) => ({ id: h.accountId, ...h })));
  const dateLabel = (date: string) => DateTime.fromISO(date).toFormat("MMM d, yyyy");

  if (mode === "value") {
    return {
      rows: points.map((p) => ({
        date: p.date,
        dateLabel: dateLabel(p.date),
        [VALUE_ID]: p.value,
        [INVESTED_ID]: p.invested,
      })),
      series: [
        { id: VALUE_ID, label: labels.value, isTotal: true },
        { id: INVESTED_ID, label: labels.invested },
      ],
    };
  }

  const shown = holdings.filter((h) => points.some((p) => h.accountId in p.index));
  const series: Series[] = shown.map((h) => ({ id: h.accountId, label: h.label }));
  series.push({ id: TOTAL_ID, label: labels.total, isTotal: true });
  const rows = points.map((p) => {
    const row: ChartRow = { date: p.date, dateLabel: dateLabel(p.date), ...p.index };
    if (p.totalIndex != null) row[TOTAL_ID] = p.totalIndex;
    return row;
  });
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
        if (entry.dataKey === VALUE_ID || entry.dataKey === INVESTED_ID) {
          return (
            <span key={entry.dataKey} style={entryColorStyle(entry.color)}>
              {s?.label}: {formatCurrency(value, locale, { compact: true })}
            </span>
          );
        }
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

const ModeButton = ({
  mode,
  active,
  onSelect,
}: {
  mode: Mode;
  active: boolean;
  onSelect: (mode: Mode) => void;
}) => {
  const { t } = useTranslation();
  const handleClick = useCallback(() => onSelect(mode), [onSelect, mode]);
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn(
        "text-xs px-3 py-1 rounded-full border font-medium transition-colors",
        active
          ? "bg-brand/10 text-brand border-brand"
          : "bg-background text-muted-foreground border-border hover:text-foreground",
      )}
    >
      {t(`investments.chart.mode.${mode}`)}
    </button>
  );
};

export const HoldingsGrowthPlot = () => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;
  const { t } = useTranslation();
  const { holdings, isLoading } = useHoldings();

  const [mode, setMode] = useState<Mode>("return");
  const totalLabel = t("investments.chart.total");
  const valueLabel = t("investments.chart.value");
  const investedLabel = t("investments.chart.invested");
  const { rows: chartData, series } = useMemo(
    () =>
      buildRows(holdings, mode, { total: totalLabel, value: valueLabel, invested: investedLabel }),
    [holdings, mode, totalLabel, valueLabel, investedLabel],
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

  const { locale } = useLocale();
  const yTickFormatter = useCallback(
    (v: number) => formatCurrency(v, locale, { compact: true }),
    [locale],
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
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {(["return", "value"] as const).map((m) => (
          <ModeButton key={m} mode={m} active={mode === m} onSelect={setMode} />
        ))}
        <span className="w-px h-4 bg-border mx-1" />
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
              tickFormatter={mode === "value" ? yTickFormatter : undefined}
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
