import { describe, expect, it } from "vitest";
import {
  categoryStack,
  categoryTrends,
  detectAnomalies,
  detectRecurring,
  fixedVsVariable,
  forecastNetWorth,
  largestTransactions,
  lastMonths,
  marketGrowth,
  monthRange,
  monthsToTarget,
  normalizeDescription,
  rollingAverage,
  shiftMonth,
  topPayees,
  weekdayIndex,
  weekdayStats,
  type ExpenseTx,
} from "./analytics";

const tx = (over: Partial<ExpenseTx> & { month: string; amount: number }): ExpenseTx => ({
  date: `${over.month}-15`,
  accountId: "a",
  accountName: "Acc",
  categoryId: "c1",
  categoryName: "Food",
  description: "Thing",
  ...over,
});

describe("months", () => {
  it("builds ranges across year boundaries", () => {
    expect(monthRange("2023-11", "2024-02")).toEqual(["2023-11", "2023-12", "2024-01", "2024-02"]);
  });
  it("shifts months both ways", () => {
    expect(shiftMonth("2024-01", -1)).toBe("2023-12");
    expect(shiftMonth("2023-12", 2)).toBe("2024-02");
    expect(shiftMonth("2024-03", -12)).toBe("2023-03");
  });
  it("returns the trailing window oldest first", () => {
    const w = lastMonths("2024-03", 4);
    expect(w).toEqual(["2023-12", "2024-01", "2024-02", "2024-03"]);
  });
});

describe("categoryTrends", () => {
  it("compares the last 12 months with the 12 before and computes shares", () => {
    const txs: ExpenseTx[] = [];
    // Food: 100/month in prev year, 150/month in the last year.
    for (const m of lastMonths("2023-12", 12)) txs.push(tx({ month: m, amount: 100 }));
    for (const m of lastMonths("2024-12", 12)) txs.push(tx({ month: m, amount: 150 }));
    // Fun: only in the last year, 50/month.
    for (const m of lastMonths("2024-12", 12))
      txs.push(tx({ month: m, amount: 50, categoryId: "c2", categoryName: "Fun" }));

    const [food, fun] = categoryTrends(txs, "2024-12");
    expect(food.name).toBe("Food");
    expect(food.last12).toBe(1800);
    expect(food.prev12).toBe(1200);
    expect(food.changePct).toBeCloseTo(50);
    expect(food.share).toBeCloseTo(1800 / 2400);
    expect(food.prevShare).toBe(1);
    expect(food.spark).toHaveLength(12);
    expect(fun.changePct).toBeNull(); // nothing to compare against
    expect(fun.avgMonthly).toBe(50);
  });
});

describe("detectRecurring", () => {
  const netflix = (months: string[], amounts: number[]) =>
    months.map((m, i) =>
      tx({
        month: m,
        amount: amounts[i],
        description: "Netflix",
        categoryId: "c2",
        categoryName: "Fun",
      }),
    );

  it("finds a steady monthly charge and annualises it", () => {
    const months = lastMonths("2024-06", 6);
    const found = detectRecurring(netflix(months, [10, 10, 10, 10, 10, 10]), "2024-06");
    expect(found).toHaveLength(1);
    expect(found[0].typical).toBe(10);
    expect(found[0].annualCost).toBe(120);
    expect(found[0].priceChangePct).toBeNull();
    expect(found[0].active).toBe(true);
  });

  it("flags a price increase on the latest charge but still counts it as recurring", () => {
    const months = lastMonths("2024-06", 6);
    const [item] = detectRecurring(netflix(months, [10, 10, 10, 10, 10, 12]), "2024-06");
    expect(item.priceChangePct).toBeCloseTo(20);
    expect(item.annualCost).toBe(144); // priced at the new amount
  });

  it("ignores wildly varying or frequent purchases", () => {
    const months = lastMonths("2024-06", 6);
    const varying = detectRecurring(netflix(months, [5, 40, 8, 90, 3, 60]), "2024-06");
    expect(varying).toHaveLength(0);
    const shopping = months.flatMap((m) => [
      tx({ month: m, amount: 20, description: "Mercadona" }),
      tx({ month: m, amount: 20, date: `${m}-20`, description: "Mercadona" }),
      tx({ month: m, amount: 20, date: `${m}-25`, description: "Mercadona" }),
    ]);
    expect(detectRecurring(shopping, "2024-06")).toHaveLength(0);
  });

  it("marks something that stopped as inactive and keeps lifetime total", () => {
    const months = lastMonths("2024-01", 4);
    const [item] = detectRecurring(netflix(months, [10, 10, 10, 10]), "2024-06");
    expect(item.active).toBe(false);
    expect(item.totalPaid).toBe(40);
  });

  it("needs at least three distinct months", () => {
    expect(detectRecurring(netflix(["2024-05", "2024-06"], [10, 10]), "2024-06")).toHaveLength(0);
  });
});

describe("fixedVsVariable", () => {
  it("splits each month by whether the description is recurring", () => {
    const txs = [
      tx({ month: "2024-01", amount: 10, description: "Netflix" }),
      tx({ month: "2024-01", amount: 90, description: "Shop" }),
      tx({ month: "2024-02", amount: 10, description: " NETFLIX " }),
    ];
    const rows = fixedVsVariable(txs, new Set([normalizeDescription("Netflix")]), [
      "2024-01",
      "2024-02",
      "2024-03",
    ]);
    expect(rows).toEqual([
      { month: "2024-01", fixed: 10, variable: 90 },
      { month: "2024-02", fixed: 10, variable: 0 },
      { month: "2024-03", fixed: 0, variable: 0 },
    ]);
  });
});

describe("detectAnomalies", () => {
  const history = lastMonths("2024-11", 12).map((m, i) =>
    tx({ month: m, amount: 100 + (i % 2) * 10 }),
  );

  it("flags a category far above its own norm", () => {
    const found = detectAnomalies([...history, tx({ month: "2024-12", amount: 400 })], "2024-12");
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe("Food");
    expect(found[0].amount).toBe(400);
  });
  it("leaves normal months alone", () => {
    expect(
      detectAnomalies([...history, tx({ month: "2024-12", amount: 108 })], "2024-12"),
    ).toHaveLength(0);
  });
  it("needs enough history", () => {
    const few = [tx({ month: "2024-10", amount: 10 }), tx({ month: "2024-12", amount: 500 })];
    expect(detectAnomalies(few, "2024-12")).toHaveLength(0);
  });
});

describe("payees and biggest purchases", () => {
  const txs = [
    tx({ month: "2024-01", amount: 30, description: "Bar Pepe" }),
    tx({ month: "2024-02", amount: 50, description: "bar pepe" }),
    tx({ month: "2024-02", amount: 500, description: "TV" }),
    tx({ month: "2024-02", amount: 5, description: "" }),
  ];
  it("groups case-insensitively and ranks by total", () => {
    const payees = topPayees(txs);
    expect(payees.map((p) => p.key)).toEqual(["tv", "bar pepe"]);
    expect(payees[1]).toMatchObject({ total: 80, count: 2, average: 40 });
  });
  it("lists the largest single purchases", () => {
    expect(largestTransactions(txs, 2).map((t) => t.amount)).toEqual([500, 50]);
  });
});

describe("weekdays", () => {
  it("indexes Monday as 0 and Sunday as 6", () => {
    expect(weekdayIndex("2024-01-01")).toBe(0); // Monday
    expect(weekdayIndex("2024-01-07")).toBe(6); // Sunday
  });
  it("averages per occurrence of the weekday in the period", () => {
    // Jan 2024 starts on a Monday and has 31 days: 5 Mondays, 5 Tuesdays, 5 Wednesdays.
    const txs = [
      tx({ month: "2024-01", date: "2024-01-01", amount: 50 }),
      tx({ month: "2024-01", date: "2024-01-02", amount: 40 }),
    ];
    const stats = weekdayStats(txs, "2024-01-01", "2024-01-31");
    expect(stats[0]).toMatchObject({ total: 50, count: 1 });
    expect(stats[0].avgPerDay).toBeCloseTo(10);
    expect(stats[1].avgPerDay).toBeCloseTo(8);
  });
});

describe("forecast", () => {
  it("projects steady savings linearly with a widening band", () => {
    const f = forecastNetWorth(1000, [100, 100, 100], "2024-06", 3);
    expect(f.map((p) => p.expected)).toEqual([1100, 1200, 1300]);
    expect(f.map((p) => p.month)).toEqual(["2024-07", "2024-08", "2024-09"]);
    expect(f[2].low).toBe(1300); // no variance, no band
  });
  it("widens the band with uncertainty", () => {
    const f = forecastNetWorth(0, [0, 200, 0, 200], "2024-06", 4);
    expect(f[3].high - f[3].low).toBeGreaterThan(f[0].high - f[0].low);
  });
  it("returns nothing without history", () => {
    expect(forecastNetWorth(1000, [], "2024-06")).toEqual([]);
  });
  it("estimates time to a target", () => {
    expect(monthsToTarget(1000, 2000, 100)).toBe(10);
    expect(monthsToTarget(3000, 2000, 100)).toBe(0);
    expect(monthsToTarget(1000, 2000, -5)).toBeNull();
  });
});

describe("rollingAverage", () => {
  it("averages over a trailing window", () => {
    expect(rollingAverage([2, 4, 6, 8], 2)).toEqual([2, 3, 5, 7]);
  });
});

describe("categoryStack", () => {
  const txs = [
    tx({ month: "2024-01", amount: 100, categoryName: "Food" }),
    tx({ month: "2024-02", amount: 50, categoryName: "Food" }),
    tx({ month: "2024-01", amount: 30, categoryName: "Fun" }),
    tx({ month: "2024-02", amount: 5, categoryName: "Gifts" }),
    tx({ month: "2024-02", amount: 3, categoryName: "Pets" }),
    tx({ month: "2023-12", amount: 999, categoryName: "Food" }),
  ];
  it("keeps the top categories, folds the rest and keeps a full ranking", () => {
    const s = categoryStack(txs, "2024-01", "2024-02", "monthly", 2, "Other");
    expect(s.keys).toEqual(["Food", "Fun", "Other"]);
    expect(s.rows).toEqual([
      { label: "2024-01", Food: 100, Fun: 30, Other: 0 },
      { label: "2024-02", Food: 50, Fun: 0, Other: 8 },
    ]);
    expect(s.ranking.map((r) => r.name)).toEqual(["Food", "Fun", "Gifts", "Pets"]);
    expect(s.total).toBe(188);
    expect(s.ranking[0].share).toBeCloseTo(150 / 188);
  });
  it("groups by quarter and year and applies a scale", () => {
    const q = categoryStack(txs, "2024-01", "2024-02", "quarterly", 5, "Other");
    expect(q.rows).toEqual([{ label: "2024-Q1", Food: 150, Fun: 30, Gifts: 5, Pets: 3 }]);
    const y = categoryStack(txs, "2023-12", "2024-02", "yearly", 1, "Other", (v) => v * 2);
    expect(y.rows.map((r) => r.label)).toEqual(["2023", "2024"]);
    expect(y.rows[0].Food).toBe(1998);
  });
});

describe("marketGrowth", () => {
  it("compounds and caps the rate", () => {
    expect(marketGrowth(1000, 0.1, 12)).toBeCloseTo(100);
    expect(marketGrowth(1000, 0.9, 12)).toBeCloseTo(120);
    expect(marketGrowth(1000, null, 12)).toBe(0);
    expect(marketGrowth(0, 0.1, 12)).toBe(0);
  });
});
