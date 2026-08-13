import { DateTime } from "luxon";

export interface Cashflow {
  /** ISO date string ("YYYY-MM-DD" or a full ISO timestamp). */
  date: string;
  /** Negative = money out (a purchase), positive = money in (a sale or the current market value). */
  amount: number;
}

const npv = (cashflows: Cashflow[], t0: DateTime, rate: number): number =>
  cashflows.reduce((sum, cf) => {
    const days = DateTime.fromISO(cf.date).diff(t0, "days").days;
    return sum + cf.amount / Math.pow(1 + rate, days / 365);
  }, 0);

/**
 * Money-weighted annualized return (XIRR) for an irregular series of cashflows, solved by
 * bisection over a fixed rate range. Needs at least one outflow and one inflow to have a
 * root; returns `null` when that isn't the case (e.g. a holding with only purchases and no
 * current value yet) or when the search range doesn't bracket a root.
 */
export const xirr = (cashflows: Cashflow[]): number | null => {
  if (cashflows.length < 2) return null;
  if (!cashflows.some((cf) => cf.amount > 0) || !cashflows.some((cf) => cf.amount < 0)) return null;

  const sorted = [...cashflows].sort(
    (a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis(),
  );
  const t0 = DateTime.fromISO(sorted[0].date);

  let lo = -0.95;
  let hi = 6.0;
  let npvLo = npv(sorted, t0, lo);
  const npvHi = npv(sorted, t0, hi);
  if (Number.isNaN(npvLo) || Number.isNaN(npvHi) || npvLo * npvHi > 0) return null;

  let mid = (lo + hi) / 2;
  for (let i = 0; i < 80; i++) {
    mid = (lo + hi) / 2;
    const npvMid = npv(sorted, t0, mid);
    if (Math.abs(npvMid) < 1e-7) return mid;
    if (npvLo * npvMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      npvLo = npvMid;
    }
  }
  return mid;
};
