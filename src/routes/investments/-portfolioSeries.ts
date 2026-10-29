import type { Lot, PricePoint } from "./-useHoldings";

export const TOTAL_ID = "__total";
export const VALUE_ID = "__value";
export const INVESTED_ID = "__invested";

export interface SeriesInput {
  id: string;
  lots: Lot[];
  priceHistory: PricePoint[];
}

export interface SeriesRow {
  date: string;
  /** Per-holding performance index (100 = first day held), keyed by holding id; absent while not held. */
  index: Record<string, number>;
  /** Chain-linked (time-weighted) index of the whole portfolio, 100 = first day anything was held. */
  totalIndex: number | null;
  /** Market value of everything held that day. */
  value: number;
  /** Net money put in so far (buys minus sells). */
  invested: number;
}

const EPS = 1e-9;

/** Prices a holding can be valued at: the market quotes plus the price each purchase implied,
 * so a fund whose quotes start after the first purchase (or are missing) is still valued. */
const pricePoints = (h: SeriesInput): PricePoint[] => {
  const quoted = new Map(h.priceHistory.map((p) => [p.date, p.value]));
  for (const l of h.lots) {
    if (!quoted.has(l.date) && Math.abs(l.quantity) > EPS && l.value !== 0) {
      quoted.set(l.date, Math.abs(l.value / l.quantity));
    }
  }
  return Array.from(quoted, ([date, value]) => ({ date, value })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
};

/**
 * Daily portfolio history built so that holdings entering or leaving never distort a return.
 *
 * Each day's return is measured only on what was held the day before (yesterday's units times
 * today's price move), then chained. A holding bought later therefore starts at 100 on its own
 * first day and a sold one just ends -- neither shows up as a gain or a loss of the portfolio.
 */
export const buildPortfolioSeries = (holdings: SeriesInput[]): SeriesRow[] => {
  const states = holdings.map((h) => ({
    id: h.id,
    lots: [...h.lots].sort((a, b) => a.date.localeCompare(b.date)),
    prices: pricePoints(h),
    lotIdx: 0,
    priceIdx: 0,
    qty: 0,
    price: null as number | null,
    idx: 100,
    started: false,
  }));

  const firstLot = states
    .flatMap((s) => s.lots.map((l) => l.date))
    .reduce<string | null>((min, d) => (min == null || d < min ? d : min), null);
  if (firstLot == null) return [];

  const dates = Array.from(
    new Set([
      ...states.flatMap((s) => s.prices.map((p) => p.date)),
      ...states.flatMap((s) => s.lots.map((l) => l.date)),
    ]),
  ).sort();

  const rows: SeriesRow[] = [];
  let totalIndex = 100;
  let invested = 0;

  for (const date of dates) {
    // Snapshot yesterday's position before today's lots and quotes are applied.
    const prev = states.map((s) => ({ qty: s.qty, price: s.price }));

    for (const s of states) {
      while (s.lotIdx < s.lots.length && s.lots[s.lotIdx].date <= date) {
        s.qty += s.lots[s.lotIdx].quantity;
        invested += s.lots[s.lotIdx].value;
        s.lotIdx++;
      }
      while (s.priceIdx < s.prices.length && s.prices[s.priceIdx].date <= date) {
        s.price = s.prices[s.priceIdx].value;
        s.priceIdx++;
      }
    }
    if (date < firstLot) continue;

    let gain = 0;
    let base = 0;
    let value = 0;
    const index: Record<string, number> = {};
    states.forEach((s, i) => {
      const { qty: q0, price: p0 } = prev[i];
      const p1 = s.price;
      const held = q0 > EPS && p0 != null && p1 != null;
      if (held) {
        s.idx *= p1 / p0;
        gain += q0 * (p1 - p0);
        base += q0 * p0;
      }
      if (s.qty > EPS && s.price != null) {
        value += s.qty * s.price;
        s.started = true;
      }
      // Present while held, plus the day it was sold out so the line ends on its real last move.
      if (s.started && (s.qty > EPS || held)) index[s.id] = s.idx;
    });

    if (base > 0) totalIndex *= 1 + gain / base;
    rows.push({
      date,
      index,
      totalIndex: value > 0 || base > 0 ? totalIndex : null,
      value,
      invested,
    });
  }
  return rows;
};
