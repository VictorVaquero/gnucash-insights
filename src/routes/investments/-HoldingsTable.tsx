import { useTranslation } from "react-i18next";

import { getRandomColor } from "@/common/getColors";
import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { useInvestmentsPageContext } from "./-investmentsPageContext";
import { useHoldings } from "./-useHoldings";

const gainColor = (value: number | null) => {
  if (value == null || Math.abs(value) < 0.05) return "text-muted-foreground";
  return value > 0 ? "text-green-600" : "text-red-600";
};

export const HoldingsTable = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { deflate, selectedHoldingId, selectHolding } = useInvestmentsPageContext();
  const { holdings, isLoading } = useHoldings();

  if (!isLoading && holdings.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{t("investments.table.empty")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border">
            <th className="py-2 pr-4 font-medium">{t("investments.table.holding")}</th>
            <th className="py-2 pr-4 font-medium text-right tabular-nums">
              {t("investments.table.quantity")}
            </th>
            <th className="py-2 pr-4 font-medium text-right tabular-nums">
              {t("investments.table.price")}
            </th>
            <th className="py-2 pr-4 font-medium text-right tabular-nums">
              {t("investments.table.value")}
            </th>
            <th className="py-2 pr-4 font-medium text-right tabular-nums">
              {t("investments.table.gain")}
            </th>
            <th className="py-2 font-medium text-right tabular-nums">
              {t("investments.table.annualized")}
            </th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const annualized = deflate ? h.xirrReal : h.xirrNominal;
            const isSelected = h.accountId === selectedHoldingId;
            return (
              <tr
                key={h.accountId}
                onClick={() => selectHolding(h.accountId)}
                className={cn(
                  "cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-accent/50",
                  isSelected && "bg-accent",
                )}
              >
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: getRandomColor(h.accountId) }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium">{h.ticker ?? h.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{h.name}</span>
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {formatNumber(h.quantity, locale, { digits: 4 })}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {h.price != null ? formatCurrency(h.price, locale, { digits: 2 }) : "—"}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums font-medium">
                  {formatCurrency(h.marketValue, locale, { compact: true })}
                </td>
                <td className={cn("py-2 pr-4 text-right tabular-nums", gainColor(h.gainPct))}>
                  {h.gainPct != null ? `${formatNumber(h.gainPct, locale, { digits: 1 })}%` : "—"}
                </td>
                <td className={cn("py-2 text-right tabular-nums", gainColor(annualized))}>
                  {annualized != null
                    ? `${formatNumber(annualized * 100, locale, { digits: 1 })}%`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
