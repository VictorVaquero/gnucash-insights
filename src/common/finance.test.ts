import { describe, expect, it } from "vitest";
import { xirr } from "./finance";

describe("common/finance", () => {
  describe("xirr", () => {
    it("solves a simple single-outflow/single-inflow round trip", () => {
      // 1000 out on day 0, 1100 back exactly a year later -> ~10% annualized.
      const rate = xirr([
        { date: "2023-01-01", amount: -1000 },
        { date: "2024-01-01", amount: 1100 },
      ]);
      expect(rate).not.toBeNull();
      expect(rate).toBeCloseTo(0.1, 2);
    });

    it("handles multiple purchase lots plus a final market-value cashflow", () => {
      // 500 in on day 0, another 500 six months later, worth 1200 a year after the first buy.
      const rate = xirr([
        { date: "2023-01-01", amount: -500 },
        { date: "2023-07-01", amount: -500 },
        { date: "2024-01-01", amount: 1200 },
      ]);
      expect(rate).not.toBeNull();
      // Sanity: reinvesting the exact same total (1000) flat for ~1 year at this rate
      // should roughly reproduce the 1200 final value.
      const impliedGrowth = 1 + (rate as number);
      expect(impliedGrowth).toBeGreaterThan(1.15);
      expect(impliedGrowth).toBeLessThan(1.35);
    });

    it("returns null when there are fewer than two cashflows", () => {
      expect(xirr([])).toBeNull();
      expect(xirr([{ date: "2023-01-01", amount: -1000 }])).toBeNull();
    });

    it("returns null when every cashflow has the same sign", () => {
      expect(
        xirr([
          { date: "2023-01-01", amount: -100 },
          { date: "2023-06-01", amount: -200 },
        ]),
      ).toBeNull();
      expect(
        xirr([
          { date: "2023-01-01", amount: 100 },
          { date: "2023-06-01", amount: 200 },
        ]),
      ).toBeNull();
    });

    it("is order-independent (sorts cashflows by date internally)", () => {
      const forward = xirr([
        { date: "2023-01-01", amount: -1000 },
        { date: "2024-01-01", amount: 1100 },
      ]);
      const shuffled = xirr([
        { date: "2024-01-01", amount: 1100 },
        { date: "2023-01-01", amount: -1000 },
      ]);
      expect(shuffled).toBeCloseTo(forward as number, 10);
    });

    it("recovers a known negative return", () => {
      // 1000 out, only 900 back a year later -> negative annualized return.
      const rate = xirr([
        { date: "2023-01-01", amount: -1000 },
        { date: "2024-01-01", amount: 900 },
      ]);
      expect(rate).not.toBeNull();
      expect(rate).toBeCloseTo(-0.1, 2);
    });
  });
});
