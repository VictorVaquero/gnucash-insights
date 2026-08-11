import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { useAuth } from "@/contexts/useAuthContext";
import { uniqueTravelsOptions, useGetTravelExpensesKPIs } from "@/db/queries/travel";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

const calcExpenses = (
  t: TFunction,
  locale: string,
  total?: number,
  expense?: number,
  months?: number,
) => {
  if (total == null || expense == null || months == null) return { value: "value", title: "title" };

  return {
    value: formatCurrency(expense / months, locale, { compact: true }),
    title: t("travel.kpi.expenseTooltip", {
      total: formatCurrency(expense, locale, { compact: true }),
      pct: formatNumber((expense / total) * 100, locale, { digits: 0 }),
    }),
  };
};

export const KpiBlock = (props: { className?: string }) => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { latestMonth, numMonths, numYears } = useDomain();
  const { locale } = useLocale();
  const { t } = useTranslation();

  const { data: kpis } = useQuery(uniqueTravelsOptions({ db, user, bookId }));
  const { data: expenses } = useGetTravelExpensesKPIs({ db, user, bookId, latestMonth });

  const lastMonth = calcExpenses(t, locale, expenses?.total_lm, expenses?.expense_lm, 1);
  const lastThreeMonths = calcExpenses(t, locale, expenses?.total_3m, expenses?.expense_3m, 3);
  const lastSixMonths = calcExpenses(t, locale, expenses?.total_6m, expenses?.expense_6m, 6);
  const lastYear = calcExpenses(t, locale, expenses?.total_1y, expenses?.expense_1y, 12);
  const allTime = calcExpenses(
    t,
    locale,
    expenses?.total_all,
    expenses?.expense_all,
    numMonths ?? 1,
  );

  const travelNum = kpis?.number ?? 0;
  const travelYearNum = kpis && numYears ? kpis?.number / numYears : 0;
  const meanTravel = kpis && expenses ? expenses.expense_all / kpis.number : 0;

  return (
    <>
      <section
        className={
          "grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2" +
          (props.className ? " " + props.className : "")
        }
      >
        <KpiCard name={t("travel.kpi.tripsTotal")} value={travelNum} />
        <KpiCard
          name={t("travel.kpi.tripsPerYear")}
          value={formatNumber(travelYearNum, locale, { digits: 2 })}
        />
        <KpiCard
          name={t("travel.kpi.meanTripCost")}
          value={formatCurrency(meanTravel, locale, { compact: true })}
        />
      </section>
      <section
        className={
          "grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2" +
          (props.className ? " " + props.className : "")
        }
      >
        <KpiCard name={t("travel.kpi.meanExpenses")} value={allTime.value} title={allTime.title} />
        <KpiCard name={t("travel.kpi.lastMonth")} value={lastMonth.value} title={lastMonth.title} />
        <KpiCard
          name={t("travel.kpi.last3")}
          value={lastThreeMonths.value}
          title={lastThreeMonths.title}
        />
        <KpiCard
          name={t("travel.kpi.last6")}
          value={lastSixMonths.value}
          title={lastSixMonths.title}
        />
        <KpiCard name={t("travel.kpi.lastYear")} value={lastYear.value} title={lastYear.title} />
      </section>
    </>
  );
};
