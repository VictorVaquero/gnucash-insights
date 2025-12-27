import { BarLoader } from "@/components/ui/BarLoader";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { toHierarchy } from "@/common/toHierarchy";
import { parseNum } from "@/common/utils";
import { TreeList } from "@/components/TreeList";
import { useAuth } from "@/contexts/useAuthContext";
import { yearlyExpensesOptions } from "@/db/queries/expenses";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useMemo } from "react";

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

  return (
    <div className="w-full flex flex-row gap-x-0 lg:gap-x-6 py-4 border-b border-shark-500 text-sm lg:text-base hover:bg-shark-700 transition-colors">
      <span className="grow text-left font-medium">{item.name}</span>

      {/* Total Column */}
      <span className="grow-0 basis-10 md:basis-14 shrink-0 text-left">
        {parseNum(item.total, { digits: 0 })}
      </span>

      {/* Yearly Totals */}
      {yearRange.map((year) => (
        <span
          key={`val-${item.id}-${year}`}
          className="grow-0 basis-10 md:basis-14 shrink-0 text-left"
        >
          {parseNum(item[year], { digits: 2, fixed: 3 })}
        </span>
      ))}

      {/* Spacer */}
      <span className="grow-0 basis-10 md:basis-14 shrink-0" />

      {/* Overall Mean */}
      <span className="grow-0 basis-10 md:basis-14 shrink-0 text-left font-semibold">
        {parseNum(overallMean, { digits: 0 })}
      </span>

      {/* Yearly Means vs Overall Mean */}
      {yearRange.map((year) => {
        const yearMean = (item[year] || 0) / 12;
        const isUnderBudget = overallMean > yearMean;
        const diff = Math.abs(overallMean - yearMean);

        return (
          <span
            key={`mean-${item.id}-${year}`}
            title={`${parseNum(diff)} ${
              isUnderBudget ? "less" : "more"
            } than average`}
            className={`grow-0 basis-10 md:basis-14 shrink-0 text-left ${
              isUnderBudget ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {parseNum(yearMean, { digits: 2, fixed: 3 })}
          </span>
        );
      })}
    </div>
  );
};

export const Expenses = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { min, numMonths, numYears } = useDomain();

  const { data, isSuccess } = useQuery(yearlyExpensesOptions({ db, bookId }));
  const dbConfig = getConfig(user);

  // 1. Calculate Year Range
  const yearRange = useMemo(() => {
    if (min?.year == null || numYears == null) return [];
    return Array.from({ length: numYears + 1 }, (_, i) => min.year + i);
  }, [min?.year, numYears]);

  // 2. Loading State
  if (!isSuccess || !data || !min || numMonths == null) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );
  }

  // 3. Process Hierarchy
  const head = data.find((d) => d.id === dbConfig.expenses);
  const others = data.filter((d) => d.id !== head?.id);

  if (!head) return null;

  const hierarchy = toHierarchy(
    head,
    others,
    (d) => d.id ?? "",
    (d) => d.parentId ?? "",
    (a, b) => b.total - a.total, // Simplified sort
    (d: ExpenseData) => (
      <ExpenseRow item={d} yearRange={yearRange} numMonths={numMonths} />
    )
  );

  return (
    <div className="w-full h-full p-4 pt-10 lg:p-10 grid grid-cols-1 gap-y-2 lg:gap-y-6">
      <div className="flex flex-col overflow-x-auto">
        {/* Table Header */}
        <div className="px-4 w-full flex flex-row gap-x-0 lg:gap-x-6 pb-6 text-white text-left border-b border-shark-500 font-bold">
          <span className="grow">Category</span>
          <h4 className="grow-0 basis-10 md:basis-14 shrink-0">Total</h4>

          {yearRange.map((year) => (
            <h4 key={year} className="grow-0 basis-10 md:basis-14 shrink-0">
              {year}
            </h4>
          ))}

          <span className="grow-0 basis-10 md:basis-14 shrink-0" />
          <h4 className="grow-0 basis-10 md:basis-14 shrink-0">Mean</h4>

          {yearRange.map((year) => (
            <h4
              key={`${year}-m`}
              className="grow-0 basis-10 md:basis-14 shrink-0 "
            >
              {year}
            </h4>
          ))}
        </div>

        <TreeList data={[hierarchy]} className="text-white w-full" />
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
    return { title: "Expenses" };
  },
});
