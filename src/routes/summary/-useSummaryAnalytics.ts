import { useMemo } from "react";

import { buildInsights } from "@/common/insights";
import { forecastNetWorth, rollingAverage } from "@/common/analytics";
import { useCashflow } from "@/hooks/useCashflow";
import { useDomain } from "@/hooks/useDB";
import { useExpenseAnalytics } from "@/routes/expenses/-useExpenseAnalytics";

/** Cashflow history, savings-rate trend, net-worth forecast and plain-language insights. */
export const useSummaryAnalytics = () => {
  const { data: cashflow } = useCashflow();
  const { analytics } = useExpenseAnalytics();
  const { to } = useDomain();
  const end = to?.toFormat("yyyy-MM");

  return useMemo(() => {
    const months = end ? cashflow.filter((m) => m.month <= end) : cashflow;
    const last = months[months.length - 1];
    const rates = months.map((m) => m.savingsRate ?? 0);
    const smooth = rollingAverage(rates, 6);
    const savingsSeries = months.slice(-36).map((m, i, arr) => ({
      month: m.month,
      rate: m.savingsRate,
      average: smooth[months.length - arr.length + i],
    }));
    const forecast = last
      ? forecastNetWorth(
          last.netWorth,
          months.map((m) => m.saved),
          last.month,
          12,
          12,
        )
      : [];
    const insights = analytics
      ? buildInsights({
          anomalies: analytics.anomalies,
          trends: analytics.trends,
          recurring: analytics.recurring,
          cashflow: months,
        })
      : [];
    return { months, savingsSeries, forecast, insights, recurring: analytics?.recurring ?? [] };
  }, [cashflow, analytics, end]);
};
