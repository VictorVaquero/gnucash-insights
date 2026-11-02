import { DateTime } from "luxon";
import { useMemo } from "react";

import {
  categoryTrends,
  detectAnomalies,
  detectRecurring,
  fixedVsVariable,
  largestTransactions,
  lastMonths,
  normalizeDescription,
  shiftMonth,
  topPayees,
  weekdayStats,
} from "@/common/analytics";
import { useExpenseTx } from "@/hooks/useExpenseTx";
import { useDomain } from "@/hooks/useDB";

const TREND_MONTHS = 24;

/** Everything the Expenses page derives from the raw expense splits, computed once. */
export const useExpenseAnalytics = () => {
  const { data: txs, isLoading } = useExpenseTx();
  const { to } = useDomain();
  const end = to?.toFormat("yyyy-MM");

  const analytics = useMemo(() => {
    if (!end || txs.length === 0) return undefined;
    const startOfWindow = shiftMonth(end, -11);
    const recent = txs.filter((t) => t.month >= startOfWindow && t.month <= end);
    const recurring = detectRecurring(txs, end, 12);
    const recurringKeys = new Set(recurring.map((r) => r.key));
    const months24 = lastMonths(end, TREND_MONTHS);
    const fixedVariable = fixedVsVariable(txs, recurringKeys, months24);

    const last12 = recent.reduce((s, t) => s + t.amount, 0);
    const fixed12 = recent
      .filter((t) => recurringKeys.has(normalizeDescription(t.description)))
      .reduce((s, t) => s + t.amount, 0);

    // Year to date vs the same months of last year (comparing with a full year is misleading).
    const year = Number(end.slice(0, 4));
    const monthNum = end.slice(5);
    const inRange = (m: string, from: string, to: string) => m >= from && m <= to;
    const ytdTxs = txs.filter((t) => inRange(t.month, `${year}-01`, end));
    const ytd = ytdTxs.reduce((a, t) => a + t.amount, 0);
    const prevYtd = txs
      .filter((t) => inRange(t.month, `${year - 1}-01`, `${year - 1}-${monthNum}`))
      .reduce((a, t) => a + t.amount, 0);
    const ytdByCategory = new Map<string, { name: string; total: number }>();
    for (const t of ytdTxs) {
      const cur = ytdByCategory.get(t.categoryId) ?? { name: t.categoryName, total: 0 };
      cur.total += t.amount;
      ytdByCategory.set(t.categoryId, cur);
    }
    const topCategoryYtd = [...ytdByCategory.values()].sort((a, b) => b.total - a.total)[0];

    const lastDay = DateTime.fromISO(`${end}-01`).endOf("month").toISODate() ?? `${end}-28`;
    return {
      end,
      months12: lastMonths(end, 12),
      trends: categoryTrends(txs, end),
      recurring,
      fixedVariable,
      anomalies: detectAnomalies(txs, end),
      payees: topPayees(recent, 12),
      largest: largestTransactions(recent, 8),
      weekdays: weekdayStats(recent, `${startOfWindow}-01`, lastDay),
      last12,
      fixed12,
      fixedShare: last12 > 0 ? fixed12 / last12 : 0,
      recent,
      year,
      ytd,
      prevYtd,
      topCategoryYtd,
      monthsElapsed: Number(monthNum),
    };
  }, [txs, end]);

  return { analytics, isLoading };
};

export type ExpenseAnalytics = NonNullable<ReturnType<typeof useExpenseAnalytics>["analytics"]>;
