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
import { CategoryHeatmap } from "./-components/CategoryHeatmap";
import { CategoryTrends } from "./-components/CategoryTrends";
import { FixedVariablePlot } from "./-components/FixedVariablePlot";
import { LargestPurchases } from "./-components/LargestPurchases";
import { TopPayees } from "./-components/TopPayees";
import { UnusualSpending } from "./-components/UnusualSpending";
import { WeekdayPlot } from "./-components/WeekdayPlot";
import { useExpenseAnalytics, type ExpenseAnalytics } from "./-useExpenseAnalytics";

// Types
interface ExpenseData {
  id: string | null;
  parentId: string | null;
  name: string;
  total: number;
  [year: number]: number;
}

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

const ThisYearKpis = ({ analytics }: { analytics: ExpenseAnalytics }) => {
  const { locale } = useLocale();
  const { t } = useTranslation();

  const { ytd, prevYtd, year, topCategoryYtd, monthsElapsed, fixedShare } = analytics;
  const pct = prevYtd > 0 ? ((ytd - prevYtd) / prevYtd) * 100 : undefined;

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      <KpiCard
        name={t("expenses.kpi.thisYear", { year })}
        value={formatCurrency(ytd, locale, { compact: true })}
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
        title={t("expenses.kpi.vsLastYearTooltip")}
      />
      <KpiCard
        name={t("expenses.kpi.topCategory")}
        value={topCategoryYtd?.name ?? "—"}
        title={t("expenses.kpi.topCategoryTooltip")}
      />
      <KpiCard
        name={t("expenses.kpi.avgMonthly")}
        value={formatCurrency(monthsElapsed > 0 ? ytd / monthsElapsed : 0, locale, {
          compact: true,
        })}
      />
      <KpiCard
        name={t("expenses.kpi.committed")}
        value={`${formatNumber(fixedShare * 100, locale, { digits: 0 })}%`}
        title={t("expenses.kpi.committedTooltip")}
      />
    </section>
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
  const { analytics } = useExpenseAnalytics();
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

  // 2. Process Hierarchy
  const head = useMemo(
    () => data?.find((d: ExpensesYearlyRow) => d.id === dbConfig.expenses),
    [data, dbConfig.expenses],
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

      {analytics && <ThisYearKpis analytics={analytics} />}

      {analytics && (
        <>
          <UnusualSpending anomalies={analytics.anomalies} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <CategoryTrends trends={analytics.trends} />
            <FixedVariablePlot
              data={analytics.fixedVariable}
              fixedShare={analytics.fixedShare}
              fixed12={analytics.fixed12}
            />
          </div>
          <CategoryHeatmap
            txs={analytics.recent}
            months={analytics.months12}
            trends={analytics.trends}
          />
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <TopPayees payees={analytics.payees} />
            <div className="flex flex-col gap-6">
              <WeekdayPlot stats={analytics.weekdays} />
              <LargestPurchases txs={analytics.largest} />
            </div>
          </div>
        </>
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
