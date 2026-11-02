export interface PeriodRow {
  date: string;
  dateLabel: string;
  value: number;
}

export interface IncomeExpensesPoint {
  date: string;
  dateLabel: string;
  income: number;
  expenses: number;
  net: number;
}

/**
 * Income vs expenses per period from the ledger sums (GnuCash signs: income is negative, expenses
 * and taxes positive). A payroll books gross income, the taxes as an expense and the net pay in the
 * bank, so:
 *  - with taxes:    income = gross,        expenses = spending + taxes
 *  - without taxes: income = gross - taxes, expenses = spending
 * Both views have the very same net (gross income - spending - taxes).
 */
export const buildIncomeExpenses = (
  income: PeriodRow[],
  spending: PeriodRow[],
  taxes: Map<string, number>,
  showTaxes: boolean,
  scale: (value: number, date: string) => number = (v) => v,
): IncomeExpensesPoint[] => {
  const registry = new Map<string, IncomeExpensesPoint>();
  const entry = (date: string, dateLabel: string) => {
    let e = registry.get(date);
    if (!e) {
      e = { date, dateLabel, income: 0, expenses: 0, net: 0 };
      registry.set(date, e);
    }
    return e;
  };
  for (const r of income) entry(r.date, r.dateLabel).income = -scale(r.value, r.date);
  for (const r of spending) entry(r.date, r.dateLabel).expenses = scale(r.value, r.date);
  for (const e of registry.values()) {
    const tax = scale(taxes.get(e.date) ?? 0, e.date);
    e.net = e.income - e.expenses - tax;
    if (showTaxes) e.expenses += tax;
    else e.income -= tax;
  }
  return [...registry.values()].sort((a, b) => a.date.localeCompare(b.date));
};
