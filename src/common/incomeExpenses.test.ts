import { describe, expect, it } from "vitest";
import { buildIncomeExpenses } from "./incomeExpenses";

const row = (date: string, value: number) => ({ date, dateLabel: date, value });

// A payroll split: income -3600, taxes +900, bank +2700; plus 1000 of other spending.
const income = [row("2024-09", -3600), row("2024-10", -3600)];
const spending = [row("2024-09", 1000), row("2024-10", 1500)];
const taxes = new Map([
  ["2024-09", 900],
  ["2024-10", 900],
]);

describe("buildIncomeExpenses", () => {
  it("shows gross income and taxes as expenses", () => {
    const [sep] = buildIncomeExpenses(income, spending, taxes, true);
    expect(sep).toMatchObject({ income: 3600, expenses: 1900, net: 1700 });
  });
  it("shows income as if taxes did not exist", () => {
    const [sep] = buildIncomeExpenses(income, spending, taxes, false);
    expect(sep).toMatchObject({ income: 2700, expenses: 1000, net: 1700 });
  });
  it("keeps the net identical in both views for every period", () => {
    const a = buildIncomeExpenses(income, spending, taxes, true);
    const b = buildIncomeExpenses(income, spending, taxes, false);
    expect(a.map((p) => p.net)).toEqual(b.map((p) => p.net));
    expect(a.map((p) => p.net)).toEqual([1700, 1200]);
  });
  it("handles periods without taxes (older, net-booked payrolls) and without income", () => {
    const pts = buildIncomeExpenses(
      [row("2024-07", -2000)],
      [row("2024-07", 500), row("2024-08", 3000)],
      new Map(),
      false,
    );
    expect(pts).toEqual([
      { date: "2024-07", dateLabel: "2024-07", income: 2000, expenses: 500, net: 1500 },
      { date: "2024-08", dateLabel: "2024-08", income: 0, expenses: 3000, net: -3000 },
    ]);
  });
  it("applies the scale (inflation) to every figure", () => {
    const [p] = buildIncomeExpenses(income, spending, taxes, false, (v) => v * 2);
    expect(p).toMatchObject({ income: 5400, expenses: 2000, net: 3400 });
  });
});
