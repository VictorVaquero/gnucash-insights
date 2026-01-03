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
import { cn } from "@/lib/utils";
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
    <div className="grid grid-cols-subgrid col-start-6 col-span-full py-3 border-b border-shark-500 text-sm lg:text-base hover:bg-shark-700 transition-colors">
      {/* Total Column */}
      <span className="col-start-1 text-left">
        {parseNum(item.total, { digits: 0 })}
      </span>

      {/* Yearly Totals */}
      {yearRange.map((year, index) => (
        <span
          key={`val-${item.id}-${year}`}
          className={"text-left col-start-" + (index + 2)}
        >
          {parseNum(item[year], { digits: 2, fixed: 3 })}
        </span>
      ))}

      {/* Overall Mean */}
      <span className="text-left font-semibold col-start-8">
        {parseNum(overallMean, { digits: 0 })}
      </span>

      {/* Yearly Means vs Overall Mean */}
      {yearRange.map((year, index) => {
        const yearMean = (item[year] || 0) / 12;
        const isUnderBudget = overallMean > yearMean;
        const diff = Math.abs(overallMean - yearMean);

        return (
          <span
            key={`mean-${item.id}-${year}`}
            title={`${parseNum(diff)} ${
              isUnderBudget ? "less" : "more"
            } than average`}
            className={cn(
              "text-left",
              isUnderBudget ? "text-emerald-500" : "text-red-500",
              "col-start-" + (index + 9)
            )}
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
    (d) => d.name ?? "",
    (d) => d.parentId ?? "",
    (a, b) => b.total - a.total, // Simplified sort
    (d: ExpenseData) => (
      <ExpenseRow item={d} yearRange={yearRange} numMonths={numMonths} />
    ),
    0
  );

  return (
    <div className="w-full  p-4 pt-10 lg:p-10 grid grid-cols-[repeat(4,1fr)_100px_repeat(6,1fr)_20px_repeat(6,1fr)] gap-y-2 lg:gap-y-6">
      {/* Table Header */}
      <div className="grid grid-cols-subgrid col-span-full py-4 text-white text-left border-b border-shark-500 font-bold">
        <span className="col-start-1">Category</span>
        <h4 className="col-start-6">Total</h4>

        {yearRange.map((year, index) => (
          <h4 key={year} className={"col-start-" + (index + 7)}>
            {year}
          </h4>
        ))}

        <h4 className="col-start-13">Mean</h4>

        {yearRange.map((year, index) => (
          <h4 key={`${year}-m`} className={"col-start-" + (index + 14)}>
            {year}
          </h4>
        ))}
      </div>
      <TreeList
        data={[hierarchy]}
        className="text-white w-full grid grid-cols-subgrid col-span-full"
      />
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
