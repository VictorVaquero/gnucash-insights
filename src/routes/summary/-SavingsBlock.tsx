import { useQuery } from "@tanstack/react-query";
import { AppDatabase } from "@/db/dbType";
import { DateTime } from "luxon";

import { parseNum } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { useAuth } from "@/contexts/useAuthContext";
import { splitSumOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";

const useSavings = (
  db: AppDatabase | undefined,
  dbconf: ReturnType<typeof getConfig>,
  bookId: string | undefined,
  startDate?: DateTime,
  endDate?: DateTime
) => {
  const { data: savings } = useQuery(
    splitSumOptions(
      db,
      bookId,
      [dbconf.expenses, dbconf.income, dbconf.taxes],
      startDate,
      endDate
    )
  );
  const { data: income } = useQuery(
    splitSumOptions(
      db,
      bookId,
      [dbconf.income, dbconf.taxes],
      startDate,
      endDate
    )
  );
  //const { data: taxes } = useQuery(splitSumOptions(db, bookId, [dbconf.taxes], startDate, endDate))

  const months =
    startDate && endDate ? endDate.diff(startDate, ["months"]).months : 1;

  const meanSavings = -(savings ?? 0) / months;
  const netIncome = income ?? 0;

  return {
    value: parseNum(meanSavings),
    title: `${parseNum(-(savings ?? 0))}/${parseNum(netIncome)}\n${parseNum(
      ((savings ?? 0) / netIncome) * 100,
      { digits: 0, symbol: "%" }
    )}`,
  };
};

export const SavingsBlock = (props: { className: string }) => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { from: startDate, to: endDate, latestMonth } = useDomain();
  const { user } = useAuth();
  const dbconf = getConfig(user);

  const lastMonth = useSavings(db, dbconf, bookId, latestMonth);
  const lastThreeMonths = useSavings(
    db,
    dbconf,
    bookId,
    latestMonth?.minus({ months: 3 }),
    latestMonth
  );
  const lastSixMonths = useSavings(
    db,
    dbconf,
    bookId,
    latestMonth?.minus({ months: 6 }),
    latestMonth
  );
  const lastYear = useSavings(
    db,
    dbconf,
    bookId,
    latestMonth?.minus({ year: 1 }),
    latestMonth
  );
  const allTime = useSavings(db, dbconf, bookId, startDate, endDate);

  return (
    <section
      className={
        "grid grid-cols-2 md:grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2" +
        (props.className ? " " + props.className : "")
      }
    >
      <KpiCard
        name="Mean Savings"
        value={allTime.value}
        title={allTime.title}
      />
      <KpiCard
        name="Last Month"
        value={lastMonth.value}
        title={lastMonth.title}
      />
      <KpiCard
        name="Last 3"
        value={lastThreeMonths.value}
        title={lastThreeMonths.title}
      />
      <KpiCard
        name="Last 6"
        value={lastSixMonths.value}
        title={lastSixMonths.title}
      />
      <KpiCard name="Last Year" value={lastYear.value} title={lastYear.title} />
    </section>
  );
};
