import { useTranslation } from "react-i18next";

import type { Payee } from "@/common/analytics";
import { formatCurrency } from "@/common/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";

/** Where the money went, by what the transaction is called. Small purchases that repeat add up. */
export const TopPayees = (props: { payees: Payee[]; className?: string }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  if (props.payees.length === 0) return null;
  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle>{t("expenses.payees.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-xs text-muted-foreground">{t("expenses.payees.subtitle")}</p>
        <ul>
          {props.payees.map((p) => (
            <li
              key={p.key}
              className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{p.description}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.categoryName} · {t("expenses.payees.times", { count: p.count })}
                  {p.count > 1 &&
                    ` · ${t("expenses.payees.avg", {
                      amount: formatCurrency(p.average, locale, { digits: 0 }),
                    })}`}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(p.total, locale, { digits: 0, compact: true })}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
