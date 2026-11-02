import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { categoryStack } from "@/common/analytics";
import { formatCurrency, formatNumber } from "@/common/utils";
import { SimpleTooltip } from "@/components/charts/SimpleTooltip";
import { useExpenseTx } from "@/hooks/useExpenseTx";
import { useLocale } from "@/hooks/useLocale";

import { useSummaryPageContext } from "../-summaryPageContext";
import { useDeflator } from "../-useDeflator";

const axisTick = { fontSize: 10, fill: "currentColor" };
const TOP = 6;
/** Six distinguishable hues for the biggest categories; everything else is neutral grey. */
const COLORS = [
  "var(--color-blue-500)",
  "var(--color-amber-500)",
  "var(--color-emerald-500)",
  "var(--color-violet-500)",
  "var(--color-rose-500)",
  "var(--color-cyan-600)",
];
const OTHER_COLOR = "var(--color-slate-400)";

/**
 * Spending by category over the selected range. The chart stacks the six biggest categories
 * (one colour each) with the rest in grey so it stays legible; the ranking next to it lists
 * every category with its share, so nothing is hidden.
 */
export const CategorySpendPlot = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { dateRange, chartPeriodicity } = useSummaryPageContext();
  const { deflate } = useDeflator();
  const { data: txs } = useExpenseTx();
  const otherLabel = t("summary.plots.others");

  const stack = useMemo(
    () =>
      categoryStack(
        txs,
        dateRange.from.toFormat("yyyy-MM"),
        dateRange.to.toFormat("yyyy-MM"),
        chartPeriodicity,
        TOP,
        otherLabel,
        (v, month) => deflate(v, `${month}-01`),
      ),
    [txs, dateRange, chartPeriodicity, otherLabel, deflate],
  );
  const colorOf = (name: string) => {
    const i = stack.keys.indexOf(name);
    return i >= 0 && i < TOP && name !== otherLabel ? COLORS[i] : OTHER_COLOR;
  };
  const money = (v: number) => formatCurrency(v, locale, { digits: 0 });
  const max = stack.ranking[0]?.value ?? 1;

  if (stack.ranking.length === 0)
    return <p className="text-sm text-muted-foreground">{t("summary.plots.noExpenses")}</p>;

  return (
    <div className="flex h-full flex-col gap-4 md:flex-row" data-testid="category-spend">
      <div className="h-64 min-w-0 flex-1 md:h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stack.rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} minTickGap={24} />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => formatCurrency(v, locale, { compact: true, digits: 0 })}
            />
            <Tooltip
              cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
              content={(p) => <SimpleTooltip {...p} format={money} total />}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            {stack.keys.map((k) => (
              <Bar key={k} dataKey={k} stackId="a" fill={colorOf(k)} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul
        className="max-h-64 w-full shrink-0 overflow-y-auto md:max-h-none md:w-56"
        aria-label={t("summary.plots.ranking")}
      >
        {stack.ranking.map((r) => (
          <li key={r.name} className="py-1 text-xs">
            <div className="flex justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colorOf(r.name) }}
                />
                <span className="truncate">{r.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatCurrency(r.value, locale, { compact: true, digits: 0 })} ·{" "}
                {formatNumber(r.share * 100, locale, { digits: 0 })}%
              </span>
            </div>
            <div className="mt-0.5 h-1 rounded bg-muted">
              <div
                className="h-full rounded"
                style={{ width: `${(r.value / max) * 100}%`, backgroundColor: colorOf(r.name) }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
