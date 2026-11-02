import { describe, expect, it } from "vitest";
import { allocation } from "./-allocation";

describe("allocation", () => {
  it("splits by holding and platform, skipping closed positions", () => {
    const a = allocation([
      { label: "A", platform: "Degiro", marketValue: 600 },
      { label: "B", platform: "Degiro", marketValue: 200 },
      { label: "C", platform: null, marketValue: 200 },
      { label: "Old", platform: "Ing", marketValue: 0, isClosed: true },
    ]);
    expect(a.byHolding.map((s) => s.name)).toEqual(["A", "B", "C"]);
    expect(a.topShare).toBeCloseTo(0.6);
    expect(a.byPlatform[0]).toMatchObject({ name: "Degiro", value: 800 });
    expect(a.byPlatform[0].share).toBeCloseTo(0.8);
    expect(a.hhi).toBeCloseTo(0.36 + 0.04 + 0.04);
  });
  it("handles an empty portfolio", () => {
    expect(allocation([])).toMatchObject({ byHolding: [], topShare: 0, hhi: 0 });
  });
});
