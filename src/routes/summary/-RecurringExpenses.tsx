import { useTranslation } from "react-i18next";

import { formatCurrency, formatNumber } from "@/common/utils.ts";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

import { useSummaryAnalytics } from "./-useSummaryAnalytics";

/** Subscriptions and other steady charges, biggest annual cost first, price rises flagged. */
export const RecurringExpenses = (props: { className?: string }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { recurring } = useSummaryAnalytics();
  const money = (v: number) => formatCurrency(v, locale, { digits: 0, compact: true });

  const active = recurring.filter((r) => r.active).sort((a, b) => b.annualCost - a.annualCost);
  if (active.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", props.className)}>
        {t("summary.recurring.empty")}
      </p>
    );
  }
  const annual = active.reduce((s, r) => s + r.annualCost, 0);

  return (
    <div className={cn("flex flex-col", props.className)}>
      <p className="mb-2 text-xs text-muted-foreground">
        {t("summary.recurring.total", { annual: money(annual), monthly: money(annual / 12) })}
      </p>
      {active.slice(0, 8).map((r) => (
        <div
          key={r.key}
          className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 last:border-b-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{r.description}</p>
            <p className="truncate text-xs text-muted-foreground/70">{r.categoryName}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end tabular-nums">
            <span className="text-sm font-medium">
              {t("summary.recurring.perYear", { value: money(r.annualCost) })}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("summary.recurring.perMonth", { value: money(r.typical) })}
              {r.priceChangePct != null && r.priceChangePct > 0 && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">
                  ▲{formatNumber(r.priceChangePct, locale, { digits: 0 })}%
                </span>
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
