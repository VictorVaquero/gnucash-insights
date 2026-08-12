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
  const prevMonth = latestMonth?.minus({ months: 1 });

  const netGain = useSum(db, bookId, [dbconf.expenses, dbconf.income, dbconf.taxes]);
  const earnings = useSum(db, bookId, [dbconf.income, dbconf.taxes]);
  const costs = useSum(db, bookId, [dbconf.expenses]);
  const checking = useSum(db, bookId, [dbconf.checking]);
  const savings = useSum(db, bookId, [dbconf.savings]);
  const assets = useSum(db, bookId, [dbconf.assets]);
  const investments = useSum(db, bookId, [dbconf.investments]);

  const prevRange = { startDate: prevMonth, endDate: latestMonth };
  const prevNetGain = useSum(db, bookId, [dbconf.expenses, dbconf.income, dbconf.taxes], prevRange);
  const prevEarnings = useSum(db, bookId, [dbconf.income, dbconf.taxes], prevRange);
  const prevCosts = useSum(db, bookId, [dbconf.expenses], prevRange);
  const prevChecking = useSum(db, bookId, [dbconf.checking], { endDate: latestMonth });
  const prevSavings = useSum(db, bookId, [dbconf.savings], { endDate: latestMonth });
  const prevAssets = useSum(db, bookId, [dbconf.assets], { endDate: latestMonth });
  const prevInvestments = useSum(db, bookId, [dbconf.investments], { endDate: latestMonth });
  const costsLast3 = useSum(db, bookId, [dbconf.expenses], {
    startDate: latestMonth?.minus({ months: 3 }),
    endDate: latestMonth,
  });

  const savingsRate = earnings ? (netGain / earnings) * 100 : 0;
  const prevSavingsRate = prevEarnings ? (prevNetGain / prevEarnings) * 100 : 0;
  const netWorth = checking + savings + assets + investments;
  const prevNetWorth = prevChecking + prevSavings + prevAssets + prevInvestments;

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
            delta={<DeltaChip current={-netGain} previous={-prevNetGain} />}
          />
          <KpiCard
            name={t("summary.kpi.income")}
            value={formatCurrency(earnings, locale, { compact: true })}
            color="text-green-600"
            delta={<DeltaChip current={Math.abs(earnings)} previous={Math.abs(prevEarnings)} />}
          />
          <KpiCard
            name={t("summary.kpi.expenses")}
            value={formatCurrency(costs, locale, { compact: true })}
            color="text-red-600"
            delta={
              <DeltaChip
                current={Math.abs(costs)}
                previous={Math.abs(prevCosts)}
                positiveIsGood={false}
              />
            }
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
