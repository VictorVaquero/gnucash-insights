import type { CpiSeries } from "@/services/cpiService";

/**
 * Year -> factor that converts a nominal amount from that year into `baseYear` money.
 * Built by compounding each year's CPI rate from `baseYear` backward/forward, e.g. with
 * 3% inflation in 2024, factor[2023] = 1.03 (2023 money is worth 3% more once expressed
 * in 2024 terms) and factor[2024] = 1.
 *
 * A year missing from `cpi` (e.g. the current, not-yet-published year) falls back to 1
 * (no adjustment) rather than breaking the chain for every earlier year.
 */
export const buildDeflateFactors = (cpi: CpiSeries, baseYear: number): Map<number, number> => {
  const years = Array.from(cpi.keys());
  // Extend one year past the known CPI range so the adjacent year still gets a
  // factor (using that boundary year's own rate, or falling back to 0 beyond it).
  const minYear = Math.min(baseYear, ...years) - 1;
  const maxYear = Math.max(baseYear, ...years) + 1;

  const factors = new Map<number, number>([[baseYear, 1]]);

  for (let year = baseYear - 1; year >= minYear; year--) {
    const rateOfFollowingYear = cpi.get(year + 1) ?? 0;
    factors.set(year, (factors.get(year + 1) ?? 1) * (1 + rateOfFollowingYear));
  }
  for (let year = baseYear + 1; year <= maxYear; year++) {
    const rateOfThisYear = cpi.get(year) ?? 0;
    factors.set(year, (factors.get(year - 1) ?? 1) / (1 + rateOfThisYear));
  }

  return factors;
};

const yearFromDateKey = (dateKey: string): number | undefined => {
  const year = Number(dateKey.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
};

/** Rescales `value`, tagged with a "YYYY", "YYYY-MM", or "YYYY-MM-DD" date key, into base-year money. */
export const deflateValue = (
  value: number,
  dateKey: string,
  factors: Map<number, number>,
): number => {
  const year = yearFromDateKey(dateKey);
  if (year == null) return value;
  return value * (factors.get(year) ?? 1);
};
