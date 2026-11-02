import { useQuery } from "@tanstack/react-query";
import { AppDatabase } from "@/db/dbType";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { KpiRow } from "@/components/KpiRow.tsx";
import { useAuth } from "@/contexts/useAuthContext";
import { splitSumOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useTaxAccountIds } from "@/hooks/useTaxes";
import { useOutliers } from "@/hooks/useOutliers";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

interface DateRange {
  startDate?: DateTime;
  endDate?: DateTime;
}

const useSavings = (
  db: AppDatabase | undefined,
  dbconf: ReturnType<typeof getConfig>,
  bookId: string | undefined,
  { startDate, endDate }: DateRange = {},
  ignoreAccounts: string[] = [],
  taxIds: string[] = [],
) => {
  // Spending and income without the tax accounts, then taxes added once from the tax accounts
  // themselves: right whether taxes sit inside the expenses tree or in a root of their own.
  const { data: base } = useQuery(
    splitSumOptions(db, bookId, [dbconf.expenses, dbconf.income], {
      startDate,
      endDate,
      ignoreAccounts: [...ignoreAccounts, ...taxIds],
    }),
  );
  const { data: grossIncome } = useQuery(
    splitSumOptions(db, bookId, [dbconf.income], { startDate, endDate }),
  );
  const { data: taxes } = useQuery(
    splitSumOptions(db, bookId, [dbconf.taxes], { startDate, endDate }),
  );
  const savings = base == null || taxes == null ? undefined : base + taxes;
  // Income is booked gross (a credit, so negative) with its taxes as an expense.
  const income = grossIncome == null ? undefined : -(grossIncome + (taxes ?? 0));

  const months = startDate && endDate ? endDate.diff(startDate, ["months"]).months : 1;

  const { locale } = useLocale();
  const meanSavings = -(savings ?? 0) / months;
  const netIncome = income ?? 0;

  return {
    value: formatCurrency(meanSavings, locale, { compact: true }),
    title: `${formatCurrency(-(savings ?? 0), locale, { compact: true })}/${formatCurrency(netIncome, locale, { compact: true })}\n${formatNumber(
      (-(savings ?? 0) / netIncome) * 100,
      locale,
      { digits: 0 },
    )}%`,
  };
};

export const SavingsBlock = (props: { className?: string }) => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { from: startDate, to: endDate, latestMonth } = useDomain();
  const { user } = useAuth();
  const dbconf = getConfig(user);
  const { accountIds: outlierIds } = useOutliers();
  const taxIds = useTaxAccountIds();

  const lastMonth = useSavings(db, dbconf, bookId, { startDate: latestMonth }, outlierIds, taxIds);
  const lastThreeMonths = useSavings(
    db,
    dbconf,
    bookId,
    {
      startDate: latestMonth?.minus({ months: 3 }),
      endDate: latestMonth,
    },
    outlierIds,
    taxIds,
  );
  const lastSixMonths = useSavings(
    db,
    dbconf,
    bookId,
    {
      startDate: latestMonth?.minus({ months: 6 }),
      endDate: latestMonth,
    },
    outlierIds,
    taxIds,
  );
  const lastYear = useSavings(
    db,
    dbconf,
    bookId,
    {
      startDate: latestMonth?.minus({ year: 1 }),
      endDate: latestMonth,
    },
    outlierIds,
    taxIds,
  );
  const allTime = useSavings(db, dbconf, bookId, { startDate, endDate }, outlierIds, taxIds);
  const { t } = useTranslation();

  return (
    <div className={cn(props.className)}>
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {t("summary.savings.heading")}
      </p>
      <section className="flex flex-col">
        <KpiRow
          name={t("summary.savings.meanSavings")}
          value={allTime.value}
          title={allTime.title}
        />
        <KpiRow
          name={t("summary.savings.lastMonth")}
          value={lastMonth.value}
          title={lastMonth.title}
        />
        <KpiRow
          name={t("summary.savings.last3")}
          value={lastThreeMonths.value}
          title={lastThreeMonths.title}
        />
        <KpiRow
          name={t("summary.savings.last6")}
          value={lastSixMonths.value}
          title={lastSixMonths.title}
        />
        <KpiRow
          name={t("summary.savings.lastYear")}
          value={lastYear.value}
          title={lastYear.title}
        />
      </section>
    </div>
  );
};
