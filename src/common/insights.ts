// Turns the numbers into a few plain-language observations. Each insight is data (a message
// key plus parameters) so the UI can translate and format it.

import type { Anomaly, CategoryTrend, RecurringItem } from "./analytics";
import type { CashMonth } from "./cashflow";

export type InsightTone = "good" | "warn" | "info";

export interface Insight {
  id: string;
  tone: InsightTone;
  /** i18n key under `insights.*`. */
  key: string;
  params: Record<string, string | number>;
  /** Optional page to open for more detail. */
  to?: string;
}

export interface InsightInput {
  anomalies: Anomaly[];
  trends: CategoryTrend[];
  recurring: RecurringItem[];
  cashflow: CashMonth[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const buildInsights = ({
  anomalies,
  trends,
  recurring,
  cashflow,
}: InsightInput): Insight[] => {
  const out: Insight[] = [];

  const topAnomaly = anomalies[0];
  if (topAnomaly) {
    out.push({
      id: "anomaly",
      tone: "warn",
      key: "insights.anomaly",
      params: { name: topAnomaly.name, amount: topAnomaly.amount, baseline: topAnomaly.baseline },
      to: "/expenses",
    });
  }

  // Savings rate: the latest month against the average of the 12 before it.
  const withRate = cashflow.filter((m) => m.savingsRate != null);
  const latest = withRate[withRate.length - 1];
  const history = withRate.slice(-13, -1);
  if (latest && history.length >= 6) {
    const avg = mean(history.map((m) => m.savingsRate as number));
    const diff = (latest.savingsRate as number) - avg;
    if (Math.abs(diff) >= 5) {
      out.push({
        id: "savingsRate",
        tone: diff > 0 ? "good" : "warn",
        key: diff > 0 ? "insights.savingsUp" : "insights.savingsDown",
        params: { rate: latest.savingsRate as number, avg, diff: Math.abs(diff) },
      });
    }
  }

  // The category that grew the most in absolute money, if it grew meaningfully.
  const grower = [...trends]
    .filter((t) => t.changePct != null && t.change > 0)
    .sort((a, b) => b.change - a.change)[0];
  if (grower && (grower.changePct as number) >= 10 && grower.change >= 100) {
    out.push({
      id: "grower",
      tone: "warn",
      key: "insights.categoryUp",
      params: { name: grower.name, pct: grower.changePct as number, amount: grower.change },
      to: "/expenses",
    });
  }

  // The category that shrank the most is worth celebrating.
  const shrinker = [...trends]
    .filter((t) => t.changePct != null && t.change < 0)
    .sort((a, b) => a.change - b.change)[0];
  if (shrinker && (shrinker.changePct as number) <= -15 && shrinker.change <= -100) {
    out.push({
      id: "shrinker",
      tone: "good",
      key: "insights.categoryDown",
      params: {
        name: shrinker.name,
        pct: Math.abs(shrinker.changePct as number),
        amount: Math.abs(shrinker.change),
      },
      to: "/expenses",
    });
  }

  const raised = recurring.filter(
    (r) => r.active && r.priceChangePct != null && r.priceChangePct > 0,
  );
  if (raised.length > 0) {
    const r = raised[0];
    out.push({
      id: "priceRise",
      tone: "warn",
      key: raised.length > 1 ? "insights.priceRiseMany" : "insights.priceRise",
      params: { name: r.description, pct: r.priceChangePct as number, count: raised.length },
    });
  }

  const active = recurring.filter((r) => r.active);
  if (active.length >= 3) {
    out.push({
      id: "recurring",
      tone: "info",
      key: "insights.recurring",
      params: { annual: active.reduce((a, r) => a + r.annualCost, 0), count: active.length },
    });
  }

  return out.slice(0, 5);
};
