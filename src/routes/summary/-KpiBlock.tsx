import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/useAuthContext";
import { splitSumOptions } from "@/db/queries/global";
import { AnyDB } from "@/db/dbType";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { useDeflator } from "./-useDeflator";

const useSum = (
  db: AnyDB | undefined,
  bookId: string | undefined,
  accountNames: string[],
  filters?: { startDate?: DateTime; endDate?: DateTime },
) => useQuery(splitSumOptions(db, bookId, accountNames, filters)).data ?? 0;

const DeltaChip = (props: { current: number; previous: number; positiveIsGood?: boolean }) => {
  const { current, previous, positiveIsGood = true } = props;
  const { locale } = useLocale();
  const { t } = useTranslation();
  if (!previous) return null;

  const diff = current - previous;
  const pct = (diff / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) {
    return <span className="text-xs text-muted-foreground">{t("summary.kpi.deltaFlat")}</span>;
  }

  const isUp = diff > 0;
  const isGood = isUp === positiveIsGood;
  return (
    <span className={cn("text-xs font-medium", isGood ? "text-green-600" : "text-red-600")}>
      {isUp ? "▲" : "▼"} {formatNumber(Math.abs(pct), locale, { digits: 0 })}%{" "}
      {t("summary.kpi.vsLastMonth")}
    </span>
  );
};

export const KpiBlock = (props: { className?: string }) => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const { latestMonth } = useDomain();
  const dbconf = getConfig(user);
  const { locale } = useLocale();
  const { t } = useTranslation();
  const { deflate } = useDeflator();
  const prevMonth = latestMonth?.minus({ months: 1 });
  const latestDateKey = latestMonth?.toISODate() ?? "";
  const prevDateKey = prevMonth?.toISODate() ?? "";

  // GnuCash books income as a credit (negative) and expenses as a debit (positive), so the
  // raw sums come out with the "wrong" sign for display. Flip them once here: income and
  // net are positive when you earn / save, expenses are positive when you spend.
  // The flow KPIs describe the latest month and are compared with the month before it.
  const latestRange = { startDate: latestMonth };
  const prevRange = { startDate: prevMonth, endDate: latestMonth };
  const upToLatest = { endDate: latestMonth };

  const earnings = -deflate(
    useSum(db, bookId, [dbconf.income, dbconf.taxes], latestRange),
    latestDateKey,
  );
  const costs = deflate(useSum(db, bookId, [dbconf.expenses], latestRange), latestDateKey);
  const netGain = earnings - costs;
  const prevEarnings = -deflate(
    useSum(db, bookId, [dbconf.income, dbconf.taxes], prevRange),
    prevDateKey,
  );
  const prevCosts = deflate(useSum(db, bookId, [dbconf.expenses], prevRange), prevDateKey);
  const prevNetGain = prevEarnings - prevCosts;

  // `assets` is the parent of checking, savings and investments, so adding those on top of
  // it counted them twice. Liabilities are negative in GnuCash, so adding them nets them off.
  const assets = deflate(useSum(db, bookId, [dbconf.assets]), latestDateKey);
  const liabilities = deflate(useSum(db, bookId, [dbconf.liability]), latestDateKey);
  const checking = deflate(useSum(db, bookId, [dbconf.checking]), latestDateKey);
  const savings = deflate(useSum(db, bookId, [dbconf.savings]), latestDateKey);
  const prevAssets = deflate(useSum(db, bookId, [dbconf.assets], upToLatest), prevDateKey);
  const prevLiabilities = deflate(useSum(db, bookId, [dbconf.liability], upToLatest), prevDateKey);
  const costsLast3 = deflate(
    useSum(db, bookId, [dbconf.expenses], {
      startDate: latestMonth?.minus({ months: 3 }),
      endDate: latestMonth,
    }),
    latestDateKey,
  );

  const savingsRate = earnings ? (netGain / earnings) * 100 : 0;
  const prevSavingsRate = prevEarnings ? (prevNetGain / prevEarnings) * 100 : 0;
  const netWorth = assets + liabilities;
  const prevNetWorth = prevAssets + prevLiabilities;

  const avgMonthlyExpense = Math.abs(costsLast3) / 3;
  const liquidFunds = checking + savings;
  const runwayMonths = avgMonthlyExpense > 0 ? liquidFunds / avgMonthlyExpense : undefined;

  return (
    <Card className={cn(props.className)}>
      <CardContent className="pt-4">
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <KpiCard
            name={t("summary.kpi.net")}
            value={formatCurrency(netGain, locale, { compact: true })}
            delta={<DeltaChip current={netGain} previous={prevNetGain} />}
          />
          <KpiCard
            name={t("summary.kpi.income")}
            value={formatCurrency(earnings, locale, { compact: true })}
            color="text-green-600"
            delta={<DeltaChip current={earnings} previous={prevEarnings} />}
          />
          <KpiCard
            name={t("summary.kpi.expenses")}
            value={formatCurrency(costs, locale, { compact: true })}
            color="text-red-600"
            delta={<DeltaChip current={costs} previous={prevCosts} positiveIsGood={false} />}
          />
          <KpiCard
            name={t("summary.kpi.savingsRate")}
            value={`${formatNumber(savingsRate, locale, { digits: 0 })}%`}
            delta={<DeltaChip current={savingsRate} previous={prevSavingsRate} />}
          />
          <KpiCard
            name={t("summary.kpi.netWorth")}
            value={formatCurrency(netWorth, locale, { compact: true })}
            delta={<DeltaChip current={netWorth} previous={prevNetWorth} />}
          />
          <KpiCard
            name={t("summary.kpi.runway")}
            value={
              runwayMonths != null
                ? t("summary.kpi.runwayValue", {
                    value: formatNumber(runwayMonths, locale, { digits: 1 }),
                  })
                : "—"
            }
            title={t("summary.kpi.runwayTooltip")}
          />
        </section>
      </CardContent>
    </Card>
  );
};
