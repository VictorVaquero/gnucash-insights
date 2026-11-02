import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber } from "@/common/utils";
import { SimpleTooltip } from "@/components/charts/SimpleTooltip";
import { useLocale } from "@/hooks/useLocale";

import { useSummaryAnalytics } from "../-useSummaryAnalytics";

const axisTick = { fontSize: 10, fill: "currentColor" };

/** Share of after-tax income saved each month, with a 6-month average to see the trend. */
export const SavingsRatePlot = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { savingsSeries } = useSummaryAnalytics();
  const rateName = t("savingsRate.monthly");
  const avgName = t("savingsRate.average");

  const rows = useMemo(
    () =>
      savingsSeries.map((s) => ({
        label: s.month,
        [rateName]: s.rate,
        [avgName]: s.average,
      })),
    [savingsSeries, rateName, avgName],
  );
  const pct = (v: number) => `${formatNumber(v, locale, { digits: 0 })}%`;

  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">{t("savingsRate.empty")}</p>;

  return (
    <div className="h-full min-h-48 w-full" data-testid="savings-rate-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} minTickGap={24} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={36} tickFormatter={pct} />
          <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
          <Tooltip
            cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
            content={(p) => <SimpleTooltip {...p} format={pct} />}
          />
          <Bar dataKey={rateName} fill="var(--color-emerald-500)" fillOpacity={0.35} radius={2} />
          <Line
            dataKey={avgName}
            stroke="var(--color-emerald-600)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
