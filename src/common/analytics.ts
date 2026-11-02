// Pure spending analytics. Everything here works on a flat list of expense splits
// (positive amount = money spent, negative = refund) so it can be unit tested without a
// database and reused by any page.

export interface ExpenseTx {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** YYYY-MM. */
  month: string;
  /** Positive = spent, negative = refund. */
  amount: number;
  accountId: string;
  accountName: string;
  /** Top-level expense category this split rolls up to. */
  categoryId: string;
  categoryName: string;
  description: string;
}

// ---------------------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------------------

/** Every YYYY-MM from `from` to `to`, both inclusive. */
export const monthRange = (from: string, to: string): string[] => {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ey, em] = to.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
};

export const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
};

/** The `count` months ending at (and including) `end`, oldest first. */
export const lastMonths = (end: string, count: number): string[] =>
  monthRange(shiftMonth(end, -(count - 1)), end);

const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sumOf(xs) / xs.length : 0);
const stddev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const mu = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - mu) ** 2)));
};
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** category id -> month -> amount. */
export const categoryMonthly = (txs: ExpenseTx[]): Map<string, Map<string, number>> => {
  const out = new Map<string, Map<string, number>>();
  for (const tx of txs) {
    const byMonth = out.get(tx.categoryId) ?? new Map<string, number>();
    byMonth.set(tx.month, (byMonth.get(tx.month) ?? 0) + tx.amount);
    out.set(tx.categoryId, byMonth);
  }
  return out;
};

const categoryNames = (txs: ExpenseTx[]): Map<string, string> => {
  const out = new Map<string, string>();
  for (const tx of txs) out.set(tx.categoryId, tx.categoryName);
  return out;
};

// ---------------------------------------------------------------------------------------
// Category trends: what is costing more over time
// ---------------------------------------------------------------------------------------

export interface CategoryTrend {
  categoryId: string;
  name: string;
  /** Spend over the 12 months ending at `end`. */
  last12: number;
  /** Spend over the 12 months before that. */
  prev12: number;
  /** last12 - prev12. */
  change: number;
  /** Relative change vs prev12, null when there is nothing to compare with. */
  changePct: number | null;
  /** Share of all spending in the last 12 months (0..1). */
  share: number;
  /** Share of all spending in the 12 months before (0..1). */
  prevShare: number;
  /** Monthly amounts for the last 12 months, oldest first. */
  spark: number[];
  /** Average monthly spend over the last 12 months. */
  avgMonthly: number;
}

export const categoryTrends = (txs: ExpenseTx[], end: string): CategoryTrend[] => {
  const cur = lastMonths(end, 12);
  const prev = lastMonths(shiftMonth(end, -12), 12);
  const byCat = categoryMonthly(txs);
  const names = categoryNames(txs);

  const rows = [...byCat.entries()].map(([categoryId, byMonth]) => {
    const spark = cur.map((m) => byMonth.get(m) ?? 0);
    const last12 = sumOf(spark);
    const prev12 = sumOf(prev.map((m) => byMonth.get(m) ?? 0));
    return { categoryId, last12, prev12, spark };
  });
  const totalCur = sumOf(rows.map((r) => r.last12));
  const totalPrev = sumOf(rows.map((r) => r.prev12));

  return rows
    .filter((r) => r.last12 !== 0 || r.prev12 !== 0)
    .map((r) => ({
      categoryId: r.categoryId,
      name: names.get(r.categoryId) ?? r.categoryId,
      last12: r.last12,
      prev12: r.prev12,
      change: r.last12 - r.prev12,
      changePct: r.prev12 > 0 ? ((r.last12 - r.prev12) / r.prev12) * 100 : null,
      share: totalCur > 0 ? r.last12 / totalCur : 0,
      prevShare: totalPrev > 0 ? r.prev12 / totalPrev : 0,
      spark: r.spark,
      avgMonthly: r.last12 / 12,
    }))
    .sort((a, b) => b.last12 - a.last12);
};

// ---------------------------------------------------------------------------------------
// Recurring / subscriptions
// ---------------------------------------------------------------------------------------

const MIN_MONTHS_SEEN = 3;
const MAX_CV = 0.2;

export const normalizeDescription = (d: string) => d.trim().toLowerCase().replace(/\s+/g, " ");

export interface RecurringItem {
  key: string;
  description: string;
  categoryName: string;
  accountName: string;
  /** Typical charge (median of the charges in the window). */
  typical: number;
  /** Most recent charge. */
  latest: number;
  lastDate: string;
  firstDate: string;
  monthsSeen: number;
  /** Annualised cost at the typical amount, assuming one charge per active month. */
  annualCost: number;
  /** Total paid across the whole history (not only the window). */
  totalPaid: number;
  /** Relative change of the latest charge vs the typical one before it, null if flat. */
  priceChangePct: number | null;
  /** Still billed in the most recent months (seen within the last 2 months of `end`). */
  active: boolean;
}

/**
 * Finds charges that repeat with a near-constant amount. Uses the last `windowMonths` of
 * history to decide *whether* something is recurring and the whole history for totals.
 */
export const detectRecurring = (
  txs: ExpenseTx[],
  end: string,
  windowMonths = 12,
): RecurringItem[] => {
  const windowStart = shiftMonth(end, -(windowMonths - 1));
  const groups = new Map<string, ExpenseTx[]>();
  for (const tx of txs) {
    const key = normalizeDescription(tx.description);
    if (!key || tx.amount <= 0) continue;
    const g = groups.get(key) ?? [];
    g.push(tx);
    groups.set(key, g);
  }

  const out: RecurringItem[] = [];
  for (const [key, all] of groups) {
    const inWindow = all.filter((t) => t.month >= windowStart && t.month <= end);
    const months = new Set(inWindow.map((t) => t.month));
    if (months.size < MIN_MONTHS_SEEN) continue;
    // One charge per month: a description that appears many times a month is shopping, not a bill.
    if (inWindow.length > months.size * 1.5) continue;

    const amounts = inWindow.map((t) => t.amount);
    const mu = mean(amounts);
    if (mu <= 0) continue;
    // Judge steadiness on the amounts *before* a price step, so a subscription that just
    // went up is still recognised as a subscription.
    const sorted = [...inWindow].sort((a, b) => a.date.localeCompare(b.date));
    const latestTx = sorted[sorted.length - 1];
    const before = sorted.slice(0, -1).map((t) => t.amount);
    const base = before.length >= 2 ? before : amounts;
    const baseMu = mean(base);
    if (baseMu <= 0 || stddev(base) / baseMu > MAX_CV) continue;

    const typical = median(base);
    const priceChangePct =
      before.length >= 2 && Math.abs(latestTx.amount - typical) / typical > 0.03
        ? ((latestTx.amount - typical) / typical) * 100
        : null;
    const allSorted = [...all].sort((a, b) => a.date.localeCompare(b.date));

    out.push({
      key,
      description: latestTx.description.trim(),
      categoryName: latestTx.categoryName,
      accountName: latestTx.accountName,
      typical,
      latest: latestTx.amount,
      lastDate: latestTx.date,
      firstDate: allSorted[0].date,
      monthsSeen: months.size,
      annualCost: (priceChangePct != null ? latestTx.amount : typical) * 12,
      totalPaid: sumOf(all.map((t) => t.amount)),
      priceChangePct,
      active: latestTx.month >= shiftMonth(end, -1),
    });
  }
  return out.sort((a, b) => b.annualCost - a.annualCost);
};

// ---------------------------------------------------------------------------------------
// Fixed vs variable
// ---------------------------------------------------------------------------------------

export interface FixedVariableMonth {
  month: string;
  fixed: number;
  variable: number;
}

/** Splits each month's spending into committed (recurring items) and everything else. */
export const fixedVsVariable = (
  txs: ExpenseTx[],
  recurringKeys: Set<string>,
  months: string[],
): FixedVariableMonth[] => {
  const fixed = new Map<string, number>();
  const variable = new Map<string, number>();
  for (const tx of txs) {
    const target = recurringKeys.has(normalizeDescription(tx.description)) ? fixed : variable;
    target.set(tx.month, (target.get(tx.month) ?? 0) + tx.amount);
  }
  return months.map((month) => ({
    month,
    fixed: fixed.get(month) ?? 0,
    variable: variable.get(month) ?? 0,
  }));
};

// ---------------------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------------------

export interface Anomaly {
  categoryId: string;
  name: string;
  amount: number;
  /** Mean of the previous 12 months. */
  baseline: number;
  /** How many standard deviations above baseline. */
  zScore: number;
}

/** Categories whose spend in `month` stands well above their own previous-12-month norm. */
export const detectAnomalies = (
  txs: ExpenseTx[],
  month: string,
  { minZ = 1.5, minExtra = 25 }: { minZ?: number; minExtra?: number } = {},
): Anomaly[] => {
  const history = lastMonths(shiftMonth(month, -1), 12);
  const byCat = categoryMonthly(txs);
  const names = categoryNames(txs);
  const out: Anomaly[] = [];
  for (const [categoryId, byMonth] of byCat) {
    const past = history.map((m) => byMonth.get(m) ?? 0);
    // Not enough history to call anything unusual.
    if (past.filter((v) => v !== 0).length < 4) continue;
    const baseline = mean(past);
    const sd = stddev(past);
    const amount = byMonth.get(month) ?? 0;
    const extra = amount - baseline;
    if (extra < minExtra) continue;
    // A perfectly flat category has sd 0: any real jump then counts, with z capped.
    const z = sd > 0 ? extra / sd : extra > minExtra * 2 ? 99 : 0;
    if (z >= minZ)
      out.push({
        categoryId,
        name: names.get(categoryId) ?? categoryId,
        amount,
        baseline,
        zScore: z,
      });
  }
  return out.sort((a, b) => b.amount - b.baseline - (a.amount - a.baseline));
};

// ---------------------------------------------------------------------------------------
// Payees, weekdays, biggest purchases
// ---------------------------------------------------------------------------------------

export interface Payee {
  key: string;
  description: string;
  categoryName: string;
  total: number;
  count: number;
  average: number;
  lastDate: string;
}

export const topPayees = (txs: ExpenseTx[], limit = 20): Payee[] => {
  const groups = new Map<string, Payee>();
  for (const tx of txs) {
    const key = normalizeDescription(tx.description);
    if (!key) continue;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, {
        key,
        description: tx.description.trim(),
        categoryName: tx.categoryName,
        total: tx.amount,
        count: 1,
        average: tx.amount,
        lastDate: tx.date,
      });
    } else {
      g.total += tx.amount;
      g.count += 1;
      if (tx.date > g.lastDate) {
        g.lastDate = tx.date;
        g.categoryName = tx.categoryName;
      }
    }
  }
  return [...groups.values()]
    .map((g) => ({ ...g, average: g.total / g.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
};

/** 0 = Monday ... 6 = Sunday (ISO order), from a YYYY-MM-DD string, timezone-independent. */
export const weekdayIndex = (date: string): number => {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};

export interface WeekdayStat {
  weekday: number;
  total: number;
  count: number;
  /** Average spent on this weekday per calendar week in the period. */
  avgPerDay: number;
}

export const weekdayStats = (txs: ExpenseTx[], from: string, to: string): WeekdayStat[] => {
  const totals = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
  for (const tx of txs) {
    if (tx.date < from || tx.date > to) continue;
    const w = weekdayIndex(tx.date);
    totals[w].total += tx.amount;
    totals[w].count += 1;
  }
  // How many of each weekday fall in [from, to], so averages are per occurrence of that day.
  const occurrences = Array<number>(7).fill(0);
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const stop = Date.UTC(ty, tm - 1, td);
  for (let t = start; t <= stop; t += 86_400_000) {
    occurrences[(new Date(t).getUTCDay() + 6) % 7] += 1;
  }
  return totals.map((v, weekday) => ({
    weekday,
    total: v.total,
    count: v.count,
    avgPerDay: occurrences[weekday] ? v.total / occurrences[weekday] : 0,
  }));
};

export const largestTransactions = (txs: ExpenseTx[], limit = 10): ExpenseTx[] =>
  [...txs].sort((a, b) => b.amount - a.amount).slice(0, limit);

// ---------------------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------------------

export interface ForecastPoint {
  month: string;
  /** Projected net worth. */
  expected: number;
  low: number;
  high: number;
}

/**
 * Projects net worth `horizon` months ahead from the average monthly saving of the last
 * `window` months. The band is the standard deviation of monthly saving, which widens with
 * the square root of time (independent months).
 */
export const forecastNetWorth = (
  netWorth: number,
  monthlySavings: number[],
  endMonth: string,
  horizon = 12,
  window = 12,
): ForecastPoint[] => {
  const recent = monthlySavings.slice(-window);
  if (recent.length === 0) return [];
  const mu = mean(recent);
  const sd = stddev(recent);
  return Array.from({ length: horizon }, (_, i) => {
    const n = i + 1;
    const spread = sd * Math.sqrt(n);
    return {
      month: shiftMonth(endMonth, n),
      expected: netWorth + mu * n,
      low: netWorth + mu * n - spread,
      high: netWorth + mu * n + spread,
    };
  });
};

/**
 * Extra net worth after `n` months from investments compounding at `annualRate` (capped to a
 * sane band so one great or awful year does not run away), on top of the savings projection.
 */
export const marketGrowth = (invested: number, annualRate: number | null, n: number): number => {
  if (invested <= 0 || annualRate == null) return 0;
  const r = Math.max(-0.1, Math.min(0.12, annualRate));
  return invested * (Math.pow(1 + r, n / 12) - 1);
};

/** Months until `target` is reached at `monthlyRate`, null when it never will. */
export const monthsToTarget = (
  current: number,
  target: number,
  monthlyRate: number,
): number | null => {
  if (current >= target) return 0;
  if (monthlyRate <= 0) return null;
  return Math.ceil((target - current) / monthlyRate);
};

export const rollingAverage = (values: number[], window: number): number[] =>
  values.map((_, i) => mean(values.slice(Math.max(0, i - window + 1), i + 1)));

// ---------------------------------------------------------------------------------------
// Category stacks (few colours + "other") and ranking (all categories)
// ---------------------------------------------------------------------------------------

export type StackPeriodicity = "monthly" | "quarterly" | "yearly";

const periodKey = (month: string, periodicity: StackPeriodicity): string => {
  if (periodicity === "monthly") return month;
  if (periodicity === "yearly") return month.slice(0, 4);
  return `${month.slice(0, 4)}-Q${Math.floor((Number(month.slice(5, 7)) - 1) / 3) + 1}`;
};

export interface CategoryStack {
  /** Largest first, at most `top` names; everything else is merged under `otherLabel`. */
  keys: string[];
  rows: Record<string, number | string>[];
  /** Every category in the range, largest first, for a full ranking. */
  ranking: { name: string; value: number; share: number }[];
  total: number;
}

/**
 * Stacks spending by period for the biggest `top` categories and folds the rest into one
 * "other" series, so a stacked chart stays readable. The ranking keeps every category.
 */
export const categoryStack = (
  txs: ExpenseTx[],
  from: string,
  to: string,
  periodicity: StackPeriodicity,
  top: number,
  otherLabel: string,
  scale: (value: number, month: string) => number = (v) => v,
): CategoryStack => {
  const inRange = txs.filter((t) => t.month >= from && t.month <= to);
  const byCategory = new Map<string, number>();
  for (const t of inRange)
    byCategory.set(
      t.categoryName,
      (byCategory.get(t.categoryName) ?? 0) + scale(t.amount, t.month),
    );
  const ranked = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((s, [, v]) => s + v, 0);
  const keys = ranked.slice(0, top).map(([name]) => name);
  const hasOther = ranked.length > top;
  const keySet = new Set(keys);

  const periods = [...new Set(monthRange(from, to).map((m) => periodKey(m, periodicity)))];
  const rows = new Map<string, Record<string, number | string>>(
    periods.map((p) => [
      p,
      {
        label: p,
        ...Object.fromEntries([...keys, ...(hasOther ? [otherLabel] : [])].map((k) => [k, 0])),
      },
    ]),
  );
  for (const t of inRange) {
    const row = rows.get(periodKey(t.month, periodicity));
    if (!row) continue;
    const key = keySet.has(t.categoryName) ? t.categoryName : otherLabel;
    row[key] = (row[key] as number) + scale(t.amount, t.month);
  }
  return {
    keys: hasOther ? [...keys, otherLabel] : keys,
    rows: [...rows.values()],
    ranking: ranked.map(([name, value]) => ({ name, value, share: total > 0 ? value / total : 0 })),
    total,
  };
};
