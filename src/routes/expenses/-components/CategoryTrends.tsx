import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CategoryTrend } from "@/common/analytics";
import { formatCurrency, formatNumber } from "@/common/utils";
import { Sparkline } from "@/components/charts/Sparkline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

type SortKey = "spend" | "growth";

const Pill = (props: { active: boolean; onClick: () => void; children: string }) => (
  <button
    type="button"
    onClick={props.onClick}
    aria-pressed={props.active}
    className={cn(
      "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
      props.active
        ? "border-brand bg-brand/10 text-foreground"
        : "border-border text-muted-foreground hover:text-foreground",
    )}
  >
    {props.children}
  </button>
);

/**
 * Which categories cost the most, and which are creeping up: last 12 months against the
 * 12 before, with a monthly sparkline so a one-off spike looks different from a steady climb.
 */
export const CategoryTrends = (props: { trends: CategoryTrend[]; className?: string }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [sort, setSort] = useState<SortKey>("spend");

  const rows = useMemo(() => {
    const base = props.trends.filter((r) => r.last12 > 0);
    const sorted =
      sort === "spend"
        ? [...base].sort((a, b) => b.last12 - a.last12)
        : [...base].filter((r) => r.change > 0).sort((a, b) => b.change - a.change);
    return sorted.slice(0, 12);
  }, [props.trends, sort]);
  const maxShare = Math.max(...rows.map((r) => r.share), 0.0001);

  return (
    <Card className={props.className}>
      <CardHeader className="flex-wrap gap-2">
        <CardTitle>{t("expenses.trends.title")}</CardTitle>
        <div className="flex gap-1.5">
          <Pill active={sort === "spend"} onClick={() => setSort("spend")}>
            {t("expenses.trends.bySpend")}
          </Pill>
          <Pill active={sort === "growth"} onClick={() => setSort("growth")}>
            {t("expenses.trends.byGrowth")}
          </Pill>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-xs text-muted-foreground">{t("expenses.trends.subtitle")}</p>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("expenses.trends.noGrowth")}
          </p>
        ) : (
          <ul className="flex flex-col">
            {rows.map((r) => {
              const up = r.change > 0;
              return (
                <li
                  key={r.categoryId}
                  className="flex items-center gap-3 border-b border-border/60 py-1.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(r.share / maxShare) * 100}%` }}
                      />
                    </div>
                  </div>
                  <Sparkline
                    values={r.spark}
                    color={up ? "var(--color-red-500)" : "var(--color-emerald-500)"}
                    className="hidden sm:block"
                  />
                  <div className="w-16 shrink-0 text-right tabular-nums sm:w-20">
                    <p className="text-sm font-semibold">
                      {formatCurrency(r.last12, locale, { digits: 0, compact: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(r.share * 100, locale, { digits: 0 })}%
                    </p>
                  </div>
                  <span
                    className={cn(
                      "w-16 shrink-0 text-right text-xs font-semibold tabular-nums",
                      r.changePct == null
                        ? "text-muted-foreground"
                        : up
                          ? "text-red-600"
                          : "text-green-600",
                    )}
                    title={t("expenses.trends.changeTooltip", {
                      amount: formatCurrency(Math.abs(r.change), locale, { digits: 0 }),
                    })}
                  >
                    {r.changePct == null
                      ? t("expenses.trends.new")
                      : `${up ? "▲" : "▼"} ${formatNumber(Math.abs(r.changePct), locale, { digits: 0 })}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
