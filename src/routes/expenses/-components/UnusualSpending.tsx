import { useTranslation } from "react-i18next";

import type { Anomaly } from "@/common/analytics";
import { formatCurrency } from "@/common/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";

/** Categories that stand well above their own 12-month norm this month; hidden when none do. */
export const UnusualSpending = (props: { anomalies: Anomaly[]; className?: string }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  if (props.anomalies.length === 0) return null;
  return (
    <Card className={props.className} role="status">
      <CardContent className="flex flex-col gap-1 pt-4">
        <p className="text-sm font-semibold">{t("expenses.unusual.title")}</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {props.anomalies.slice(0, 4).map((a) => (
            <li key={a.categoryId}>
              <span className="font-medium">{a.name}</span>{" "}
              <span className="text-red-600 tabular-nums">
                {formatCurrency(a.amount, locale, { digits: 0 })}
              </span>{" "}
              <span className="text-muted-foreground">
                {t("expenses.unusual.vsNormal", {
                  amount: formatCurrency(a.baseline, locale, { digits: 0 }),
                })}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
