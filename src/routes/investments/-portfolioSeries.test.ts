import { describe, expect, it } from "vitest";

import { buildPortfolioSeries } from "./-portfolioSeries";

const lot = (date: string, quantity: number, value: number) => ({ date, quantity, value });

describe("buildPortfolioSeries", () => {
  it("does not count a holding bought later as a loss of the portfolio", () => {
    const rows = buildPortfolioSeries([
      {
        id: "a",
        lots: [lot("2024-01-01", 10, 100)],
        priceHistory: [
          { date: "2024-01-01", value: 10 },
          { date: "2024-06-01", value: 10 },
          { date: "2024-12-01", value: 10 },
        ],
      },
      {
        id: "b",
        lots: [lot("2024-06-01", 1, 1000)],
        priceHistory: [
          { date: "2024-06-01", value: 1000 },
          { date: "2024-12-01", value: 1000 },
        ],
      },
    ]);
    // Nothing moved in price, so the portfolio index must stay flat despite 100 -> 1100 of value.
    expect(rows.at(-1)?.totalIndex).toBeCloseTo(100);
    expect(rows.at(-1)?.value).toBeCloseTo(1100);
    expect(rows.at(-1)?.invested).toBeCloseTo(1100);
    // b starts at 100 on its own first day.
    expect(rows.find((r) => r.date === "2024-06-01")?.index.b).toBeCloseTo(100);
    expect(rows[0].index.b).toBeUndefined();
  });

  it("ends a sold holding's line without a drop to zero", () => {
    const rows = buildPortfolioSeries([
      {
        id: "a",
        lots: [lot("2024-01-01", 10, 100), lot("2024-03-01", -10, -150)],
        priceHistory: [
          { date: "2024-01-01", value: 10 },
          { date: "2024-03-01", value: 15 },
          { date: "2024-06-01", value: 5 },
        ],
      },
    ]);
    expect(rows.find((r) => r.date === "2024-03-01")?.index.a).toBeCloseTo(150);
    const last = rows.at(-1);
    expect(last?.index.a).toBeUndefined();
    expect(rows.find((r) => r.date === "2024-03-01")?.totalIndex).toBeCloseTo(150);
    expect(last?.totalIndex).toBeNull();
    expect(last?.value).toBe(0);
  });

  it("values a holding at its purchase price when no quote exists yet", () => {
    const rows = buildPortfolioSeries([
      {
        id: "a",
        lots: [lot("2024-01-01", 2, 50)],
        priceHistory: [{ date: "2024-02-01", value: 30 }],
      },
    ]);
    expect(rows[0].value).toBeCloseTo(50);
    expect(rows.at(-1)?.value).toBeCloseTo(60);
  });
});
