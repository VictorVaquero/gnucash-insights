import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/useAuthContext";
import { splitSumOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

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

  const { data: netGain } = useQuery(
    splitSumOptions(db, bookId, [dbconf.expenses, dbconf.income, dbconf.taxes]),
  );
  const { data: earnings } = useQuery(splitSumOptions(db, bookId, [dbconf.income, dbconf.taxes]));
  const { data: costs } = useQuery(splitSumOptions(db, bookId, [dbconf.expenses]));
  const { data: checking } = useQuery(splitSumOptions(db, bookId, [dbconf.checking]));
  const { data: savings } = useQuery(splitSumOptions(db, bookId, [dbconf.savings]));
  const { data: assets } = useQuery(splitSumOptions(db, bookId, [dbconf.assets]));
  const { data: investments } = useQuery(splitSumOptions(db, bookId, [dbconf.investments]));

  const { data: prevNetGain } = useQuery(
    splitSumOptions(
      db,
      bookId,
      [dbconf.expenses, dbconf.income, dbconf.taxes],
      prevMonth,
      latestMonth,
    ),
  );
  const { data: prevEarnings } = useQuery(
    splitSumOptions(db, bookId, [dbconf.income, dbconf.taxes], prevMonth, latestMonth),
  );
  const { data: prevCosts } = useQuery(
    splitSumOptions(db, bookId, [dbconf.expenses], prevMonth, latestMonth),
  );
  const { data: prevChecking } = useQuery(
    splitSumOptions(db, bookId, [dbconf.checking], undefined, latestMonth),
  );
  const { data: prevSavings } = useQuery(
    splitSumOptions(db, bookId, [dbconf.savings], undefined, latestMonth),
  );
  const { data: prevAssets } = useQuery(
    splitSumOptions(db, bookId, [dbconf.assets], undefined, latestMonth),
  );
  const { data: prevInvestments } = useQuery(
    splitSumOptions(db, bookId, [dbconf.investments], undefined, latestMonth),
  );
  const { data: costsLast3 } = useQuery(
    splitSumOptions(db, bookId, [dbconf.expenses], latestMonth?.minus({ months: 3 }), latestMonth),
  );

  const savingsRate = earnings ? ((netGain ?? 0) / earnings) * 100 : 0;
  const prevSavingsRate = prevEarnings ? ((prevNetGain ?? 0) / prevEarnings) * 100 : 0;
  const netWorth = (checking ?? 0) + (savings ?? 0) + (assets ?? 0) + (investments ?? 0);
  const prevNetWorth =
    (prevChecking ?? 0) + (prevSavings ?? 0) + (prevAssets ?? 0) + (prevInvestments ?? 0);

  const avgMonthlyExpense = Math.abs(costsLast3 ?? 0) / 3;
  const liquidFunds = (checking ?? 0) + (savings ?? 0);
  const runwayMonths = avgMonthlyExpense > 0 ? liquidFunds / avgMonthlyExpense : undefined;

  return (
    <Card className={cn(props.className)}>
      <CardContent className="pt-4">
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <KpiCard
            name={t("summary.kpi.net")}
            value={formatCurrency(netGain ?? 0, locale, { compact: true })}
            delta={<DeltaChip current={-(netGain ?? 0)} previous={-(prevNetGain ?? 0)} />}
          />
          <KpiCard
            name={t("summary.kpi.income")}
            value={formatCurrency(earnings ?? 0, locale, { compact: true })}
            color="text-green-600"
            delta={
              <DeltaChip current={Math.abs(earnings ?? 0)} previous={Math.abs(prevEarnings ?? 0)} />
            }
          />
          <KpiCard
            name={t("summary.kpi.expenses")}
            value={formatCurrency(costs ?? 0, locale, { compact: true })}
            color="text-red-600"
            delta={
              <DeltaChip
                current={Math.abs(costs ?? 0)}
                previous={Math.abs(prevCosts ?? 0)}
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
