import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { useAuth } from "@/contexts/useAuthContext";
import { uniqueTravelsOptions, useGetTravelExpensesKPIs } from "@/db/queries/travel";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

const safeDivide = (numerator?: number, denominator?: number) =>
  numerator != null && denominator ? numerator / denominator : 0;

const calcExpenses = (
  t: TFunction,
  locale: string,
  { total, expense, months }: { total?: number; expense?: number; months?: number },
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
  const {
    total_lm,
    expense_lm,
    total_3m,
    expense_3m,
    total_6m,
    expense_6m,
    total_1y,
    expense_1y,
    total_all,
    expense_all,
  } = expenses ?? {};
  const { number: travelCount } = kpis ?? {};

  const lastMonth = calcExpenses(t, locale, { total: total_lm, expense: expense_lm, months: 1 });
  const lastThreeMonths = calcExpenses(t, locale, {
    total: total_3m,
    expense: expense_3m,
    months: 3,
  });
  const lastSixMonths = calcExpenses(t, locale, {
    total: total_6m,
    expense: expense_6m,
    months: 6,
  });
  const lastYear = calcExpenses(t, locale, { total: total_1y, expense: expense_1y, months: 12 });
  const allTime = calcExpenses(t, locale, {
    total: total_all,
    expense: expense_all,
    months: numMonths ?? 1,
  });

  const travelNum = travelCount ?? 0;
  const travelYearNum = safeDivide(travelCount, numYears);
  const meanTravel = safeDivide(expense_all, travelCount);

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
