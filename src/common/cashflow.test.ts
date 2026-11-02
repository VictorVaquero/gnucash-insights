import { describe, expect, it } from "vitest";
import { buildCashflow, type CashSplit } from "./cashflow";

const s = (over: Partial<CashSplit> & { month: string; value: number }): CashSplit => ({
  accountType: "BANK",
  isTax: false,
  isNetWorth: false,
  ...over,
});

describe("buildCashflow", () => {
  it("takes taxes out of income and out of expenses, and flips GnuCash signs", () => {
    const rows = buildCashflow([
      s({ month: "2024-01", value: -1000, accountType: "INCOME" }), // gross salary
      s({ month: "2024-01", value: 200, accountType: "EXPENSE", isTax: true }),
      s({ month: "2024-01", value: 300, accountType: "EXPENSE" }),
      s({ month: "2024-01", value: 500, isNetWorth: true }), // money landing in the bank
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ income: 800, expenses: 300, saved: 500, netWorth: 500 });
    expect(rows[0].savingsRate).toBeCloseTo(62.5);
  });

  it("fills empty months and carries net worth forward", () => {
    const rows = buildCashflow([
      s({ month: "2024-01", value: 100, isNetWorth: true }),
      s({ month: "2024-03", value: 50, isNetWorth: true }),
    ]);
    expect(rows.map((r) => r.month)).toEqual(["2024-01", "2024-02", "2024-03"]);
    expect(rows.map((r) => r.netWorth)).toEqual([100, 100, 150]);
    expect(rows[1].savingsRate).toBeNull();
  });

  it("returns nothing for no data", () => {
    expect(buildCashflow([])).toEqual([]);
  });
});
