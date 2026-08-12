import { describe, expect, it } from "vitest";
import { buildDeflateFactors, deflateValue } from "./deflate";

describe("common/deflate", () => {
  describe("buildDeflateFactors", () => {
    it("gives the base year a factor of 1", () => {
      const cpi = new Map([
        [2022, 0.08],
        [2023, 0.03],
        [2024, 0.02],
      ]);
      const factors = buildDeflateFactors(cpi, 2024);
      expect(factors.get(2024)).toBe(1);
    });

    it("compounds forward from a past year using each intervening year's own rate", () => {
      // 100 in 2022 money, expressed in 2024 money, should grow by 2023's and 2024's rates.
      const cpi = new Map([
        [2023, 0.03],
        [2024, 0.02],
      ]);
      const factors = buildDeflateFactors(cpi, 2024);
      expect(factors.get(2023)).toBeCloseTo(1.02, 10);
      expect(factors.get(2022)).toBeCloseTo(1.02 * 1.03, 10);
    });

    it("compounds backward for years after the base year", () => {
      const cpi = new Map([[2025, 0.05]]);
      const factors = buildDeflateFactors(cpi, 2024);
      expect(factors.get(2025)).toBeCloseTo(1 / 1.05, 10);
    });

    it("treats a year missing from the CPI series as 0 inflation instead of breaking the chain", () => {
      // 2024 has no published rate for the 2024->2025 step (e.g. not yet released),
      // so 2025 should fall back to no adjustment relative to the 2024 base.
      const cpi = new Map([[2023, 0.03]]);
      const factors = buildDeflateFactors(cpi, 2024);
      expect(factors.get(2025)).toBe(1);
    });
  });

  describe("deflateValue", () => {
    const factors = new Map([
      [2023, 1.05],
      [2024, 1],
    ]);

    it("scales a value tagged with a full year", () => {
      expect(deflateValue(100, "2023", factors)).toBeCloseTo(105, 10);
    });

    it("scales a value tagged with a year-month", () => {
      expect(deflateValue(100, "2023-06", factors)).toBeCloseTo(105, 10);
    });

    it("scales a value tagged with a full date", () => {
      expect(deflateValue(100, "2023-06-15", factors)).toBeCloseTo(105, 10);
    });

    it("leaves a value from the base year untouched", () => {
      expect(deflateValue(100, "2024-01", factors)).toBe(100);
    });

    it("passes the value through unchanged for a year with no known factor", () => {
      expect(deflateValue(100, "2019-01", factors)).toBe(100);
    });

    it("passes the value through unchanged for an unparseable date key", () => {
      expect(deflateValue(100, "not-a-date", factors)).toBe(100);
    });
  });
});
