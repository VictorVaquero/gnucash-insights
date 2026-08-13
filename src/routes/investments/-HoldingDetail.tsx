import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";

import { getRandomColor } from "@/common/getColors";
import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { useInvestmentsPageContext } from "./-investmentsPageContext";
import { useHoldings } from "./-useHoldings";
import { HoldingPricePlot } from "./-plots/HoldingPricePlot";

const gainColor = (value: number | null) => {
  if (value == null || Math.abs(value) < 0.05) return "text-muted-foreground";
  return value > 0 ? "text-green-600" : "text-red-600";
};

export const HoldingDetail = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { selectedHoldingId, clearSelectedHolding } = useInvestmentsPageContext();
  const { holdings } = useHoldings();

  const holding = holdings.find((h) => h.accountId === selectedHoldingId);
  if (!holding) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span
            className="size-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: getRandomColor(holding.accountId) }}
          />
          {holding.ticker ? `${holding.ticker} — ${holding.name}` : holding.name}
        </CardTitle>
        <button
          type="button"
          aria-label={t("investments.detail.close")}
          onClick={clearSelectedHolding}
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <FontAwesomeIcon icon={faXmark} className="size-3.5" />
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t("investments.table.value")}</p>
            <p className="font-medium">
              {formatCurrency(holding.marketValue, locale, { compact: true })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("investments.table.gain")}</p>
            <p className={cn("font-medium", gainColor(holding.gainPct))}>
              {holding.gainPct != null
                ? `${formatNumber(holding.gainPct, locale, { digits: 1 })}%`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("investments.detail.nominal")}</p>
            <p className={cn("font-medium", gainColor(holding.xirrNominal))}>
              {holding.xirrNominal != null
                ? `${formatNumber(holding.xirrNominal * 100, locale, { digits: 1 })}%`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("investments.detail.real")}</p>
            <p className={cn("font-medium", gainColor(holding.xirrReal))}>
              {holding.xirrReal != null
                ? `${formatNumber(holding.xirrReal * 100, locale, { digits: 1 })}%`
                : "—"}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-[1.6fr_1fr] gap-4 items-start">
          {holding.priceHistory.length > 0 ? (
            <HoldingPricePlot priceHistory={holding.priceHistory} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("investments.detail.noHistory")}</p>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("investments.detail.lots")}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-1.5 pr-4 font-medium">{t("investments.detail.date")}</th>
                    <th className="py-1.5 pr-4 font-medium text-right tabular-nums">
                      {t("investments.detail.units")}
                    </th>
                    <th className="py-1.5 font-medium text-right tabular-nums">
                      {t("investments.detail.cost")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {holding.lots.map((lot, i) => (
                    <tr
                      key={`${lot.date}-${i}`}
                      className="border-b border-border/60 last:border-b-0"
                    >
                      <td className="py-1.5 pr-4">{lot.date}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {formatNumber(lot.quantity, locale, { digits: 4 })}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatCurrency(lot.value, locale, { digits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
