import { InvestmentsPageContextProvider } from "@/routes/investments/-investmentsPageContext";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { marketGrowth } from "@/common/analytics";
import { formatCurrency } from "@/common/utils";
import { SimpleTooltip } from "@/components/charts/SimpleTooltip";
import { useLocale } from "@/hooks/useLocale";

import { useHoldings } from "@/routes/investments/-useHoldings";
import { useSummaryAnalytics } from "../-useSummaryAnalytics";

const axisTick = { fontSize: 10, fill: "currentColor" };

/** Net worth for the selected dates, then a 12-month projection with an uncertainty band. */
const ForecastPlotInner = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { months, forecast } = useSummaryAnalytics();
  const { totalMarketValue, xirrNominal } = useHoldings();
  const withMarketName = t("forecast.withMarket");
  const actualName = t("forecast.actual");
  const expectedName = t("forecast.expected");
  const bandName = t("forecast.range");

  const rows = useMemo(() => {
    const last = months[months.length - 1];
    const history: Record<string, string | number | number[]>[] = months.map((m) => ({
      label: m.month,
      [actualName]: m.netWorth,
    }));
    if (!last || forecast.length === 0) return history;
    // The projection starts from the last actual point so the lines join up.
    history[history.length - 1] = {
      ...history[history.length - 1],
      [expectedName]: last.netWorth,
      [withMarketName]: last.netWorth,
      band: [last.netWorth, last.netWorth],
    };
    const future = forecast.map((f, i) => ({
      label: f.month,
      [expectedName]: f.expected,
      [withMarketName]: f.expected + marketGrowth(totalMarketValue, xirrNominal, i + 1),
      band: [f.low, f.high],
    }));
    return [...history, ...future];
  }, [months, forecast, actualName, expectedName, withMarketName, totalMarketValue, xirrNominal]);

  const money = (v: number) => formatCurrency(v, locale, { digits: 0 });
  const last = forecast[forecast.length - 1];
  const withMarket = last
    ? last.expected + marketGrowth(totalMarketValue, xirrNominal, forecast.length)
    : 0;

  if (months.length === 0)
    return <p className="text-sm text-muted-foreground">{t("forecast.empty")}</p>;

  return (
    <div className="flex h-full min-h-48 w-full flex-col gap-1">
      {last && (
        <p className="text-xs text-muted-foreground">
          {t("forecast.summary", {
            value: formatCurrency(last.expected, locale, { digits: 0, compact: true }),
            market: formatCurrency(withMarket, locale, { digits: 0, compact: true }),
            low: formatCurrency(last.low, locale, { digits: 0, compact: true }),
            high: formatCurrency(last.high, locale, { digits: 0, compact: true }),
          })}
        </p>
      )}
      <div className="min-h-0 flex-1" data-testid="forecast-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} minTickGap={24} />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => formatCurrency(v, locale, { compact: true, digits: 0 })}
            />
            <Tooltip content={(p) => <SimpleTooltip {...p} format={money} keepZero />} />
            <Area
              dataKey="band"
              name={bandName}
              stroke="none"
              fill="var(--color-sky-500)"
              fillOpacity={0.15}
              isAnimationActive={false}
              tooltipType="none"
            />
            <Line
              dataKey={actualName}
              stroke="var(--brand)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey={expectedName}
              stroke="var(--color-sky-500)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey={withMarketName}
              stroke="var(--color-emerald-500)"
              strokeWidth={2}
              strokeDasharray="2 4"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const ForecastPlot = () => (
  <InvestmentsPageContextProvider>
    <ForecastPlotInner />
  </InvestmentsPageContextProvider>
);
