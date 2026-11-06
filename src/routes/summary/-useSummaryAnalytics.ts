import { useMemo } from "react";

import { buildInsights } from "@/common/insights";
import { forecastNetWorth, rollingAverage } from "@/common/analytics";
import { useCashflow } from "@/hooks/useCashflow";
import { useSummaryPageContext } from "./-summaryPageContext";
import { useExpenseAnalytics } from "@/routes/expenses/-useExpenseAnalytics";

/** Cashflow history, savings-rate trend, net-worth forecast and plain-language insights. */
export const useSummaryAnalytics = () => {
  const { data: cashflow } = useCashflow();
  const { analytics } = useExpenseAnalytics();
  // The charts follow the date filter of the page.
  const { dateRange } = useSummaryPageContext();
  const end = dateRange.to.toFormat("yyyy-MM");
  const start = dateRange.from.toFormat("yyyy-MM");

  return useMemo(() => {
    const upToEnd = cashflow.filter((m) => m.month <= end);
    // The rolling average is computed on the full history so it is warmed up at the range start.
    const smooth = rollingAverage(
      upToEnd.map((m) => m.savingsRate ?? 0),
      6,
    );
    const offset = upToEnd.findIndex((m) => m.month >= start);
    const months = offset < 0 ? [] : upToEnd.slice(offset);
    const last = months[months.length - 1];
    const savingsSeries = months.map((m, i) => ({
      month: m.month,
      rate: m.savingsRate,
      average: smooth[offset + i],
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
          cashflow: upToEnd,
        })
      : [];
    return { months, savingsSeries, forecast, insights, recurring: analytics?.recurring ?? [] };
  }, [cashflow, analytics, end, start]);
};
