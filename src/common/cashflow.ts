// Monthly cashflow and net worth from raw splits. Pure so it can be tested without a database.

import { monthRange } from "./analytics";

export interface CashSplit {
  /** YYYY-MM */
  month: string;
  value: number;
  accountType: string;
  /** Belongs to the taxes account tree. */
  isTax: boolean;
  /** Belongs to assets or liabilities, so it counts towards net worth. */
  isNetWorth: boolean;
}

export interface CashMonth {
  month: string;
  /** Earnings after tax (gross income minus taxes). */
  income: number;
  /** Spending, taxes left out. */
  expenses: number;
  /** income - expenses. */
  saved: number;
  /** saved / income as a percentage, null when there was no income. */
  savingsRate: number | null;
  netWorth: number;
}

export const buildCashflow = (splits: CashSplit[]): CashMonth[] => {
  if (splits.length === 0) return [];
  const income = new Map<string, number>();
  const tax = new Map<string, number>();
  const expenses = new Map<string, number>();
  const worth = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);

  let first = splits[0].month;
  let last = splits[0].month;
  for (const s of splits) {
    if (s.month < first) first = s.month;
    if (s.month > last) last = s.month;
    if (s.isNetWorth) add(worth, s.month, s.value);
    // GnuCash: income is a credit (negative), expenses a debit (positive).
    if (s.accountType === "INCOME") add(income, s.month, -s.value);
    else if (s.accountType === "EXPENSE") add(s.isTax ? tax : expenses, s.month, s.value);
  }

  let running = 0;
  return monthRange(first, last).map((month) => {
    running += worth.get(month) ?? 0;
    const earned = (income.get(month) ?? 0) - (tax.get(month) ?? 0);
    const spent = expenses.get(month) ?? 0;
    return {
      month,
      income: earned,
      expenses: spent,
      saved: earned - spent,
      savingsRate: earned > 0 ? ((earned - spent) / earned) * 100 : null,
      netWorth: running,
    };
  });
};
