import { describe, expect, it } from "vitest";
import type { Anomaly, CategoryTrend, RecurringItem } from "./analytics";
import type { CashMonth } from "./cashflow";
import { buildInsights } from "./insights";

const trend = (over: Partial<CategoryTrend>): CategoryTrend => ({
  categoryId: "c",
  name: "Cat",
  last12: 0,
  prev12: 0,
  change: 0,
  changePct: null,
  share: 0,
  prevShare: 0,
  spark: [],
  avgMonthly: 0,
  ...over,
});
const month = (i: number, rate: number | null): CashMonth => ({
  month: `2024-${String(i).padStart(2, "0")}`,
  income: 1000,
  expenses: 0,
  saved: 0,
  savingsRate: rate,
  netWorth: 0,
});
const rec = (over: Partial<RecurringItem>): RecurringItem => ({
  key: "k",
  description: "Netflix",
  categoryName: "Fun",
  accountName: "Fun",
  typical: 10,
  latest: 10,
  lastDate: "2024-12-01",
  firstDate: "2024-01-01",
  monthsSeen: 12,
  annualCost: 120,
  totalPaid: 120,
  priceChangePct: null,
  active: true,
  ...over,
});

describe("buildInsights", () => {
  it("is empty without signals", () => {
    expect(buildInsights({ anomalies: [], trends: [], recurring: [], cashflow: [] })).toEqual([]);
  });

  it("reports an unusual month", () => {
    const anomaly: Anomaly = {
      categoryId: "c",
      name: "Food",
      amount: 400,
      baseline: 100,
      zScore: 4,
    };
    const [i] = buildInsights({ anomalies: [anomaly], trends: [], recurring: [], cashflow: [] });
    expect(i).toMatchObject({ key: "insights.anomaly", tone: "warn" });
    expect(i.params).toMatchObject({ name: "Food", amount: 400 });
  });

  it("compares the latest savings rate with the previous year's average", () => {
    const cashflow = [...Array.from({ length: 12 }, (_, i) => month(i + 1, 20)), month(13, 40)];
    const [i] = buildInsights({ anomalies: [], trends: [], recurring: [], cashflow });
    expect(i.key).toBe("insights.savingsUp");
    expect(i.tone).toBe("good");
    const small = [...Array.from({ length: 12 }, (_, i) => month(i + 1, 20)), month(13, 22)];
    expect(buildInsights({ anomalies: [], trends: [], recurring: [], cashflow: small })).toEqual(
      [],
    );
  });

  it("flags the biggest riser and the biggest faller, ignoring small moves", () => {
    const trends = [
      trend({ categoryId: "a", name: "Leisure", change: 500, changePct: 40 }),
      trend({ categoryId: "b", name: "Health", change: -300, changePct: -30 }),
      trend({ categoryId: "c", name: "Tiny", change: 20, changePct: 80 }),
    ];
    const keys = buildInsights({ anomalies: [], trends, recurring: [], cashflow: [] }).map(
      (i) => i.key,
    );
    expect(keys).toEqual(["insights.categoryUp", "insights.categoryDown"]);
  });

  it("flags subscription price rises and the total recurring bill", () => {
    const recurring = [
      rec({ priceChangePct: 20 }),
      rec({ key: "b", description: "Gym", annualCost: 300 }),
      rec({ key: "c", description: "Phone", annualCost: 480 }),
    ];
    const out = buildInsights({ anomalies: [], trends: [], recurring, cashflow: [] });
    expect(out.map((i) => i.key)).toEqual(["insights.priceRise", "insights.recurring"]);
    expect(out[1].params.annual).toBe(900);
  });

  it("caps the list", () => {
    const out = buildInsights({
      anomalies: [{ categoryId: "c", name: "Food", amount: 400, baseline: 100, zScore: 4 }],
      trends: [
        trend({ categoryId: "a", name: "A", change: 500, changePct: 40 }),
        trend({ categoryId: "b", name: "B", change: -300, changePct: -30 }),
      ],
      recurring: [rec({ priceChangePct: 10 }), rec({ key: "2" }), rec({ key: "3" })],
      cashflow: [...Array.from({ length: 12 }, (_, i) => month(i + 1, 20)), month(13, 40)],
    });
    expect(out.length).toBeLessThanOrEqual(5);
  });
});
