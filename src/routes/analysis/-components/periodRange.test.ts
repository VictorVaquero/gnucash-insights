import { describe, expect, it } from "vitest";
import { periodRange } from "./TransactsPlot";

const iso = (r: ReturnType<typeof periodRange>) => [r?.from.toISODate(), r?.to.toISODate()];

describe("periodRange", () => {
  it("expands each chart label to the days it covers", () => {
    expect(iso(periodRange("2024-02-10", "daily"))).toEqual(["2024-02-10", "2024-02-10"]);
    expect(iso(periodRange("2024-02", "monthly"))).toEqual(["2024-02-01", "2024-02-29"]);
    expect(iso(periodRange("2024-02", "quarterly"))).toEqual(["2024-04-01", "2024-06-30"]);
    expect(iso(periodRange("2024", "yearly"))).toEqual(["2024-01-01", "2024-12-31"]);
    expect(iso(periodRange("2024-W09", "weekly"))).toEqual(["2024-02-26", "2024-03-03"]);
  });
});
