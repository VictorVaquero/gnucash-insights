import { BarLoader } from "@/components/ui/BarLoader";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { toHierarchy } from "@/common/toHierarchy";
import { formatCurrency } from "@/common/utils";
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

// Sub-component for a single row to reduce main component bloat
const ExpenseRow = ({
  item,
  yearRange,
  numMonths,
}: {
  item: ExpenseData;
  yearRange: number[];
  numMonths: number;
}) => {
  const overallMean = item.total / numMonths;
  const { locale } = useLocale();
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-subgrid col-start-6 col-span-full py-3 border-b border-shark-500 text-sm lg:text-base hover:bg-shark-700 transition-colors">
      {/* Total Column */}
      <span className="col-start-1 text-left">
        {formatCurrency(item.total, locale, { digits: 0, compact: true })}
      </span>

      {/* Yearly Totals */}
      {yearRange.map((year, index) => (
        <span key={`val-${item.id}-${year}`} className={"text-left col-start-" + (index + 2)}>
          {formatCurrency(item[year], locale, { digits: 2, compact: true })}
        </span>
      ))}

      {/* Overall Mean */}
      <span className="text-left font-semibold col-start-8">
        {formatCurrency(overallMean, locale, { digits: 0, compact: true })}
      </span>

      {/* Yearly Means vs Overall Mean */}
      {yearRange.map((year, index) => {
        const yearMean = (item[year] || 0) / 12;
        const isUnderBudget = overallMean > yearMean;
        const diff = Math.abs(overallMean - yearMean);

        return (
          <span
            key={`mean-${item.id}-${year}`}
            title={t(isUnderBudget ? "expenses.tooltip.diffLess" : "expenses.tooltip.diffMore", {
              diff: formatCurrency(diff, locale, { compact: true }),
            })}
            className={cn(
              "text-left",
              isUnderBudget ? "text-emerald-500" : "text-red-500",
              "col-start-" + (index + 9),
            )}
          >
            {formatCurrency(yearMean, locale, { digits: 2, compact: true })}
          </span>
        );
      })}
    </div>
  );
};

const Expenses = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { from, numMonths, numYears } = useDomain();
  const { t } = useTranslation();

  const { data, isSuccess } = useQuery(yearlyExpensesOptions({ db, bookId }));
  const dbConfig = getConfig(user);

  // 1. Calculate Year Range
  const yearRange = useMemo(() => {
    if (from?.year == null || numYears == null) return [];
    return Array.from({ length: numYears + 1 }, (_, i) => from.year + i);
  }, [from, numYears]);

  // 2. Process Hierarchy
  const hierarchyList = useMemo(() => {
    if (!isSuccess || !data || !from || numMonths == null) return undefined;
    const head = data.find((d: ExpensesYearlyRow) => d.id === dbConfig.expenses);
    const others = data.filter((d: ExpensesYearlyRow) => d.id !== head?.id);
    if (!head) return null;
    const hierarchy = toHierarchy(head, others, {
      key: (d) => d.id ?? "",
      header: (d) => d.name ?? "",
      parent: (d) => d.parentId ?? "",
      sort: (a, b) => b.total - a.total, // Simplified sort
      func: (d: ExpenseData) => <ExpenseRow item={d} yearRange={yearRange} numMonths={numMonths} />,
    });
    return [hierarchy];
  }, [isSuccess, data, from, numMonths, dbConfig.expenses, yearRange]);

  // 3. Loading State
  if (!isSuccess || !data || !from || numMonths == null) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <BarLoader />
      </div>
    );
  }

  if (!hierarchyList) return null;

  return (
    <div className="w-full p-4 pt-10 lg:p-10 overflow-x-auto">
      <div className="min-w-[900px] grid grid-cols-[repeat(4,1fr)_100px_repeat(6,1fr)_20px_repeat(6,1fr)] gap-y-2 lg:gap-y-6">
        {/* Table Header */}
        <div className="grid grid-cols-subgrid col-span-full py-4 text-foreground text-left border-b border-shark-500 font-bold">
          <span className="col-start-1 sticky left-0 bg-shark-900 text-white">
            {t("expenses.headers.category")}
          </span>
          <h4 className="col-start-6">{t("expenses.headers.total")}</h4>

          {yearRange.map((year, index) => (
            <h4 key={year} className={"col-start-" + (index + 7)}>
              {year}
            </h4>
          ))}

          <h4 className="col-start-13">{t("expenses.headers.mean")}</h4>

          {yearRange.map((year, index) => (
            <h4 key={`${year}-m`} className={"col-start-" + (index + 14)}>
              {year}
            </h4>
          ))}
        </div>
        <TreeList
          data={hierarchyList}
          className="text-foreground w-full grid grid-cols-subgrid col-span-full"
        />
      </div>
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
