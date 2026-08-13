import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { useInvestmentsPageContext } from "./-investmentsPageContext";
import { useHoldings } from "./-useHoldings";

const gainColor = (value: number | null) => {
  if (value == null || Math.abs(value) < 0.05) return undefined;
  return value > 0 ? "text-green-600" : "text-red-600";
};

const pctLabel = (value: number | null, locale: string) =>
  value == null ? "—" : `${formatNumber(value, locale, { digits: 1 })}%`;

export const KpiBlock = (props: { className?: string }) => {
  const { locale } = useLocale();
  const { t } = useTranslation();
  const { deflate } = useInvestmentsPageContext();
  const { holdings, totalMarketValue, totalGain, totalGainPct, xirrNominal, xirrReal } =
    useHoldings();

  const { best, worst } = useMemo(() => {
    const ranked = holdings.filter((h) => h.gainPct != null);
    if (ranked.length === 0) return { best: undefined, worst: undefined };
    return {
      best: ranked.reduce((a, b) => ((a.gainPct as number) >= (b.gainPct as number) ? a : b)),
      worst: ranked.reduce((a, b) => ((a.gainPct as number) <= (b.gainPct as number) ? a : b)),
    };
  }, [holdings]);

  const annualized = deflate ? xirrReal : xirrNominal;

  return (
    <Card className={cn(props.className)}>
      <CardContent className="pt-4">
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <KpiCard
            name={t("investments.kpi.totalValue")}
            value={formatCurrency(totalMarketValue, locale, { compact: true })}
          />
          <KpiCard
            name={t("investments.kpi.totalGain")}
            value={formatCurrency(totalGain, locale, { compact: true })}
            color={gainColor(totalGain)}
            delta={
              totalGainPct != null ? (
                <span className={cn("text-xs font-medium", gainColor(totalGainPct))}>
                  {totalGainPct > 0 ? "▲" : "▼"} {pctLabel(Math.abs(totalGainPct), locale)}
                </span>
              ) : undefined
            }
          />
          <KpiCard
            name={t(deflate ? "investments.kpi.annualizedReal" : "investments.kpi.annualized")}
            value={pctLabel(annualized != null ? annualized * 100 : null, locale)}
            color={gainColor(annualized != null ? annualized * 100 : null)}
          />
          <KpiCard
            name={t("investments.kpi.best")}
            value={best ? `${best.ticker ?? best.name}` : "—"}
            color="text-green-600"
            delta={
              best ? <span className="text-xs">{pctLabel(best.gainPct, locale)}</span> : undefined
            }
          />
          <KpiCard
            name={t("investments.kpi.worst")}
            value={worst ? `${worst.ticker ?? worst.name}` : "—"}
            color="text-red-600"
            delta={
              worst ? <span className="text-xs">{pctLabel(worst.gainPct, locale)}</span> : undefined
            }
          />
        </section>
      </CardContent>
    </Card>
  );
};
