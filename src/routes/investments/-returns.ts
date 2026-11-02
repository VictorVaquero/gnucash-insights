import type { Cashflow } from "@/common/finance";
import { xirr } from "@/common/finance";
import type { Lot, PricePoint } from "./-useHoldings";

/** Below this, an annualised rate is extrapolating a few months and is shown as period return only. */
export const MIN_ANNUALIZE_DAYS = 365;

const CASH_NAME = /\b(cash|efectivo|liquidez|saldo|wallet|monedero)\b/i;

/**
 * Cash-like holdings are parking spots for money moving between investments: they have no
 * market of their own (no quotes, or a price pinned at 1), so any "return" on them is just
 * the timing of transfers, never a real gain or loss.
 */
export const isCashLike = (name: string, priceHistory: PricePoint[]): boolean => {
  if (CASH_NAME.test(name)) return true;
  if (priceHistory.length === 0) return false;
  return priceHistory.every((p) => Math.abs(p.value - 1) < 0.005);
};

const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

/** Days between the first and last cashflow (a still-open holding ends today via its value). */
export const spanDays = (cashflows: Cashflow[]): number => {
  if (cashflows.length < 2) return 0;
  const dates = cashflows.map((c) => c.date).sort();
  return days(dates[0], dates[dates.length - 1]);
};

/**
 * Annualised return, only when the holding lived long enough for it to mean something.
 * A closed position ends at its last sale -- no stale market value is added -- and open ones
 * end today with their current value.
 */
export const annualizedReturn = (cashflows: Cashflow[]): number | null =>
  spanDays(cashflows) >= MIN_ANNUALIZE_DAYS ? xirr(cashflows) : null;

export const heldDays = (lots: Lot[], isClosed: boolean, today: string): number => {
  if (lots.length === 0) return 0;
  const dates = lots.map((l) => l.date).sort();
  return days(dates[0], isClosed ? dates[dates.length - 1] : today);
};
