import { describe, expect, it } from "vitest";
import { annualizedReturn, heldDays, isCashLike, spanDays } from "./-returns";

describe("isCashLike", () => {
  it("detects by name or pinned price", () => {
    expect(isCashLike("Cash", [])).toBe(true);
    expect(isCashLike("Fondo X", [{ date: "2024-01-01", value: 1 }])).toBe(true);
    expect(isCashLike("Fondo X", [{ date: "2024-01-01", value: 12.3 }])).toBe(false);
    expect(isCashLike("Fondo X", [])).toBe(false);
  });
});

describe("annualizedReturn", () => {
  it("annualises over the open period, not a full year", () => {
    const cf = [
      { date: "2024-01-01", amount: -100 },
      { date: "2024-07-01", amount: 110 },
    ];
    expect(spanDays(cf)).toBe(182);
    expect(annualizedReturn(cf)).toBeCloseTo(Math.pow(1.1, 365 / 182) - 1, 2);
  });
  it("skips spans of a few days", () => {
    expect(
      annualizedReturn([
        { date: "2024-01-01", amount: -100 },
        { date: "2024-01-05", amount: 110 },
      ]),
    ).toBeNull();
  });
  it("annualises longer ones", () => {
    const r = annualizedReturn([
      { date: "2022-01-01", amount: -100 },
      { date: "2024-01-01", amount: 121 },
    ]);
    expect(r).toBeCloseTo(0.1, 1);
  });
});

describe("heldDays", () => {
  const lots = [
    { date: "2024-01-01", quantity: 1, value: 10 },
    { date: "2024-03-01", quantity: -1, value: -11 },
  ];
  it("ends closed positions at the last lot", () => {
    expect(heldDays(lots, true, "2025-01-01")).toBe(60);
    expect(heldDays(lots, false, "2025-01-01")).toBe(366);
  });
});
