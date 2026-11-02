import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

import type { ExpenseTx } from "@/common/analytics";
import { formatCurrency } from "@/common/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";

/** The biggest single purchases: separates "one big thing" from "a drift in my baseline". */
export const LargestPurchases = (props: { txs: ExpenseTx[]; className?: string }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  if (props.txs.length === 0) return null;
  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle>{t("expenses.largest.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul>
          {props.txs.map((tx, i) => (
            <li
              key={`${tx.date}-${i}`}
              className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{tx.description || tx.accountName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {DateTime.fromISO(tx.date).setLocale(locale).toLocaleString(DateTime.DATE_MED)} ·{" "}
                  {tx.categoryName}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(tx.amount, locale, { digits: 0 })}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
