import { BarLoader } from "@/components/ui/BarLoader";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { toHierarchy } from "@/common/toHierarchy";
import {
  formatCurrency,
  formatNumber,
  intensityCellStyle,
  useIsNarrowViewport,
} from "@/common/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { TreeList } from "@/components/TreeList";
import { useAuth } from "@/contexts/useAuthContext";
import { ExpensesYearlyRow, yearlyExpensesOptions } from "@/db/queries/expenses";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

// Types
interface ExpenseData {
  id: string | null;
  parentId: string | null;
  name: string;
  total: number;
  [year: number]: number;
}

// The yearly query returns one dynamic column per year (e.g. "2024") alongside its typed
// columns, so ExpensesYearlyRow has no index signature — this reads a year column safely.
const yearValue = (row: ExpensesYearlyRow, year: number): number =>
  Number((row as unknown as Record<string, number | undefined>)[year.toString()] ?? 0);

// One tile per year: background intensity reflects that category's own spend range,
// so a light-vs-dark row lets you spot a creeping category before reading the number.
const YearCells = ({
  item,
  yearRange,
  min,
  max,
}: {
  item: ExpenseData;
  yearRange: number[];
  min: number;
  max: number;
}) => {
  const { locale } = useLocale();

  return (
    <div className="flex gap-1 shrink-0">
      {yearRange.map((year) => (
        <span
          key={year}
          style={intensityCellStyle(item[year] ?? 0, min, max)}
          className="w-14 sm:w-16 h-7 rounded-sm flex items-center justify-center text-[11px] font-semibold tabular-nums"
        >
          {formatCurrency(item[year] ?? 0, locale, { digits: 0, compact: true })}
        </span>
      ))}
    </div>
  );
};

const ExpenseRow = ({ item, yearRange }: { item: ExpenseData; yearRange: number[] }) => {
  const { locale } = useLocale();
  const values = yearRange.map((year) => item[year] ?? 0);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);

  return (
    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
      <span className="w-16 sm:w-20 text-right font-semibold tabular-nums text-sm shrink-0">
        {formatCurrency(item.total, locale, { digits: 0, compact: true })}
      </span>
      <YearCells item={item} yearRange={yearRange} min={min} max={max} />
    </div>
  );
};

const ThisYearKpis = ({
  total,
  topCategory,
  previousYearTotal,
  currentYear,
  monthsElapsed,
}: {
  total: ExpensesYearlyRow;
  topCategory: ExpensesYearlyRow | undefined;
  previousYearTotal: number | undefined;
  currentYear: number;
  monthsElapsed: number;
}) => {
  const { locale } = useLocale();
  const { t } = useTranslation();

  const thisYearTotal = Math.abs(Number(total.last ?? 0));
  const diff = previousYearTotal ? thisYearTotal - previousYearTotal : undefined;
  const pct = diff != null && previousYearTotal ? (diff / previousYearTotal) * 100 : undefined;
  const avgMonthly = monthsElapsed > 0 ? thisYearTotal / monthsElapsed : 0;

  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <KpiCard
        name={t("expenses.kpi.thisYear", { year: currentYear })}
        value={formatCurrency(thisYearTotal, locale, { compact: true })}
        color="text-red-600"
      />
      <KpiCard
        name={t("expenses.kpi.vsLastYear")}
        value={
          pct != null
            ? `${pct > 0 ? "▲" : "▼"} ${formatNumber(Math.abs(pct), locale, { digits: 0 })}%`
            : "—"
        }
        color={pct == null ? undefined : pct > 0 ? "text-red-600" : "text-green-600"}
      />
      <KpiCard
        name={t("expenses.kpi.topCategory")}
        value={topCategory?.name ?? "—"}
        title={t("expenses.kpi.topCategoryTooltip")}
      />
      <KpiCard
        name={t("expenses.kpi.avgMonthly")}
        value={formatCurrency(avgMonthly, locale, { compact: true })}
      />
    </section>
  );
};

// Ranked, flat breakdown of this year's top-level categories — the "what's driving this
// year" read that the year-by-year tree below doesn't answer at a glance.
const ThisYearBreakdown = ({
  categories,
  currentYear,
  previousYear,
}: {
  categories: ExpensesYearlyRow[];
  currentYear: number;
  previousYear: number | undefined;
}) => {
  const { locale } = useLocale();
  const { t } = useTranslation();

  const rows = useMemo(() => {
    const withTotals = categories
      .map((row) => ({
        row,
        value: Math.abs(yearValue(row, currentYear)),
        previousValue: previousYear != null ? Math.abs(yearValue(row, previousYear)) : undefined,
      }))
      .filter(({ value }) => value > 0)
      .sort((a, b) => b.value - a.value);
    const max = withTotals[0]?.value ?? 0;
    return withTotals.map(({ row, value, previousValue }) => ({
      row,
      value,
      max,
      pct: previousValue ? ((value - previousValue) / previousValue) * 100 : undefined,
    }));
  }, [categories, currentYear, previousYear]);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("expenses.sections.thisYear", { year: currentYear })}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {rows.map(({ row, value, max, pct }) => (
          <div key={row.id} className="flex items-center gap-3 py-1.5">
            <span className="flex-1 min-w-0 truncate text-sm font-medium">{row.name}</span>
            <div className="hidden sm:block w-24 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
              />
            </div>
            <span className="w-16 sm:w-20 text-right text-sm font-semibold tabular-nums shrink-0">
              {formatCurrency(value, locale, { digits: 0, compact: true })}
            </span>
            <span
              className={cn(
                "w-14 text-right text-xs font-semibold tabular-nums shrink-0",
                pct == null ? "text-muted-foreground" : pct > 0 ? "text-red-600" : "text-green-600",
              )}
            >
              {pct != null
                ? `${pct > 0 ? "▲" : "▼"} ${formatNumber(Math.abs(pct), locale, { digits: 0 })}%`
                : "—"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// Small screens can't fit every year as a cell without forcing horizontal scroll on each
// row individually, so mobile shows a recent window instead of the full history.
const MOBILE_YEAR_WINDOW = 3;

const Expenses = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { from, to, numMonths } = useDomain();
  const { t } = useTranslation();
  const isNarrow = useIsNarrowViewport();

  const { data, isSuccess } = useQuery(yearlyExpensesOptions({ db, bookId }));
  const dbConfig = getConfig(user);

  // 1. Calculate Year Range
  // Calendar-year span (matches the query's own yearRange), not a fractional
  // Luxon year-diff — see getExpensesYearlyQuery for why that undercounts.
  const fullYearRange = useMemo(() => {
    if (from?.year == null || to?.year == null) return [];
    return Array.from({ length: to.year - from.year + 1 }, (_, i) => from.year + i);
  }, [from, to]);
  const yearRange = useMemo(
    () => (isNarrow ? fullYearRange.slice(-MOBILE_YEAR_WINDOW) : fullYearRange),
    [fullYearRange, isNarrow],
  );
  const currentYear = fullYearRange[fullYearRange.length - 1];
  const previousYear = fullYearRange[fullYearRange.length - 2];

  // 2. Process Hierarchy
  const head = useMemo(
    () => data?.find((d: ExpensesYearlyRow) => d.id === dbConfig.expenses),
    [data, dbConfig.expenses],
  );
  const topCategory = useMemo(() => {
    if (!data || !currentYear) return undefined;
    return data
      .filter((d: ExpensesYearlyRow) => d.id !== head?.id)
      .reduce<ExpensesYearlyRow | undefined>((best, row) => {
        const value = Math.abs(yearValue(row, currentYear));
        const bestValue = best ? Math.abs(yearValue(best, currentYear)) : -Infinity;
        return value > bestValue ? row : best;
      }, undefined);
  }, [data, head?.id, currentYear]);
  const previousYearTotal = useMemo(() => {
    if (!head || !previousYear) return undefined;
    return Math.abs(yearValue(head, previousYear));
  }, [head, previousYear]);
  const topLevelCategories = useMemo(
    () => data?.filter((d: ExpensesYearlyRow) => d.parentId === head?.id) ?? [],
    [data, head?.id],
  );

  const hierarchyList = useMemo(() => {
    if (!isSuccess || !data || !from || numMonths == null) return undefined;
    const others = data.filter((d: ExpensesYearlyRow) => d.id !== head?.id);
    if (!head) return null;
    const hierarchy = toHierarchy(head, others, {
      key: (d) => d.id ?? "",
      header: (d) => d.name ?? "",
      parent: (d) => d.parentId ?? "",
      sort: (a, b) => b.total - a.total, // Simplified sort
      func: (d: ExpenseData) => <ExpenseRow item={d} yearRange={yearRange} />,
    });
    return [hierarchy];
  }, [isSuccess, data, from, numMonths, head, yearRange]);

  // 3. Loading State
  if (!isSuccess || !data || !from || numMonths == null) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <BarLoader />
      </div>
    );
  }

  if (!hierarchyList || !head) return null;

  return (
    <div className="w-full p-4 pt-10 lg:p-10 flex flex-col gap-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {t("routes.expenses.title")}
      </h1>

      {currentYear != null && to != null && (
        <ThisYearKpis
          total={head}
          topCategory={topCategory}
          previousYearTotal={previousYearTotal}
          currentYear={currentYear}
          monthsElapsed={to.diff(to.startOf("year"), "months").months + 1}
        />
      )}

      {currentYear != null && (
        <ThisYearBreakdown
          categories={topLevelCategories}
          currentYear={currentYear}
          previousYear={previousYear}
        />
      )}

      <Card>
        <CardHeader className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <CardTitle>{t("expenses.sections.allYears")}</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground self-end">
            <span className="w-16 sm:w-20 text-right">{t("expenses.headers.total")}</span>
            <div className="flex gap-1">
              {yearRange.map((year) => (
                <span key={year} className="w-14 sm:w-16 text-center">
                  {year}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        {isNarrow && fullYearRange.length > MOBILE_YEAR_WINDOW && (
          <p className="px-4 text-xs text-muted-foreground">
            {t("expenses.mobileYearWindow", { count: MOBILE_YEAR_WINDOW })}
          </p>
        )}
        <CardContent className="overflow-x-auto">
          <TreeList data={hierarchyList} className={cn("text-foreground w-full min-w-fit")} />
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/expenses/")({
  component: Expenses,
  beforeLoad: async ({ location, context: { auth } }) => {
    if (auth && !auth.isAuthenticated()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    return { title: "routes.expenses.title" };
  },
});
