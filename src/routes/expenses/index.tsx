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

export const Expenses = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { min, max, numMonths, numYears } = useDomain();

  const { data, isSuccess } = useQuery(yearlyExpensesOptions({ db, bookId }));

  const dbConfig = getConfig(user);

  if (!isSuccess || !data || min == null || max == null || numMonths == null)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );

  const yearRange =
    min != null && numYears != null
      ? Array.from(
          { length: numYears + 1 },
          (_value, index) => min.year + index
        )
      : [];
  const head = data.filter((d) => d.name === dbConfig.expenses)[0];
  const hierarchy = toHierarchy(
    head,
    data.filter((d) => d.id !== head.id),
    (d) => d.id ?? "",
    (d) => d.parentId ?? "",
    (a, b) => (a.total > b.total ? -1 : 1),
    (d) => (
      <div className="w-full flex flex-row gap-x-0 lg:gap-x-6 py-4 border-b border-shark-500 text-sm lg:text-base">
        <span className="grow text-left">{d.name}</span>
        <span className="grow-0 basis-10 md:basis-14 shrink-0 text-left">
          {parseNum(d.total, { digits: 0 })}
        </span>
        {yearRange.map((year) => (
          <span
            key={"expense" + d.id + year}
            className="grow-0 basis-10 md:basis-14 shrink-0 text-left"
          >
            {parseNum((d as unknown as Record<string, number>)[String(year)], {
              digits: 2,
              fixed: 3,
            })}
          </span>
        ))}
        <span className="grow-0 basis-10 md:basis-14 shrink-0 text-left"></span>
        <span className="grow-0 basis-10 md:basis-14 shrink-0 text-left">
          {parseNum(d.total / numMonths, { digits: 0 })}
        </span>
        {yearRange.map((year) => {
          const mean = d.total / numMonths;
          const yearMean =
            (d as unknown as Record<string, number>)[String(year)] / 12;
          return (
            <span
              key={"expense" + d.id + year + "mean"}
              className={`grow-0 basis-10 md:basis-14 shrink-0 text-left ${
                mean > yearMean ? "text-emerald-500" : "text-red-500"
              }`}
              title={`${parseNum(Math.abs(-mean + yearMean))} ${
                mean > yearMean ? "less" : "more"
              }`}
            >
              {parseNum(yearMean, { digits: 2, fixed: 3 })}
            </span>
          );
        })}
      </div>
    )
  );

  return (
    <div
      className="
        w-full h-full p-4 pt-10 lg:p-10
        grid grid-cols-[1fr] grid-rows-[1fr_1fr_2fr]
        gap-x-0 lg:gap-x-6 gap-y-2 lg:gap-y-6
        "
    >
      <div className="row-start-1 row-end-4 flex flex-col">
        <div className="px-4 w-full flex flex-row gap-x-0 lg:gap-x-6 pb-6 text-white text-left border-b border-shark-500">
          <span className="grow text-left">{}</span>
          <h4 className="grow-0 basis-10 md:basis-14 shrink-0 text-left text-base lg:text-base">
            Total
          </h4>
          {yearRange.map((year) => (
            <h4
              key={year}
              className="grow-0 basis-10 md:basis-14 shrink-0 text-left text-base lg:text-base"
            >
              {year}
            </h4>
          ))}
          <span className="grow-0 basis-10 md:basis-14 shrink-0 text-left"></span>
          <h4 className="grow-0 basis-10 md:basis-14 shrink-0 text-left text-base lg:text-base">
            Mean
          </h4>
          {yearRange.map((year) => (
            <h4
              key={year + "mean"}
              className="grow-0 basis-10 md:basis-14 shrink-0 text-left text-base lg:text-base"
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
