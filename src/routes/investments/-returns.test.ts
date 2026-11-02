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
  it("skips holdings that lived under a year", () => {
    const cf = [
      { date: "2024-01-01", amount: -100 },
      { date: "2024-06-01", amount: 120 },
    ];
    expect(spanDays(cf)).toBe(152);
    expect(annualizedReturn(cf)).toBeNull();
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
