import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Link } from "@tanstack/react-router";
import {
  faCircleInfo,
  faTriangleExclamation,
  faArrowTrendUp,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";

import type { Insight, InsightTone } from "@/common/insights";
import { formatCurrency, formatNumber } from "@/common/utils";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

import { useSummaryAnalytics } from "./-useSummaryAnalytics";

const TONE: Record<InsightTone, { icon: IconDefinition; className: string }> = {
  good: { icon: faArrowTrendUp, className: "text-emerald-600 dark:text-emerald-400" },
  warn: { icon: faTriangleExclamation, className: "text-amber-600 dark:text-amber-400" },
  info: { icon: faCircleInfo, className: "text-sky-600 dark:text-sky-400" },
};

const MONEY_PARAMS = new Set(["amount", "baseline", "annual"]);
const PERCENT_PARAMS = new Set(["pct", "rate", "avg", "diff"]);

/** A handful of plain-language findings about the current period. */
export const InsightsStrip = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { insights } = useSummaryAnalytics();
  if (insights.length === 0) return null;

  const text = (i: Insight) => {
    const params: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(i.params)) {
      if (typeof v !== "number") params[k] = v;
      else if (MONEY_PARAMS.has(k)) params[k] = formatCurrency(v, locale, { digits: 0 });
      else if (PERCENT_PARAMS.has(k)) params[k] = formatNumber(v, locale, { digits: 0 });
      else params[k] = v;
    }
    return t(i.key, params);
  };

  return (
    <section aria-label={t("insights.title")} data-testid="insights-strip">
      <h2 className="mb-2 text-sm font-semibold tracking-tight">{t("insights.title")}</h2>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((i) => {
          const { icon: Icon, className } = TONE[i.tone];
          const body = (
            <>
              <FontAwesomeIcon
                icon={Icon}
                className={cn("mt-1 size-3.5 shrink-0", className)}
                aria-hidden
              />
              <span className="text-sm">{text(i)}</span>
            </>
          );
          return (
            <li key={i.id} className="rounded-lg border border-border">
              {i.to ? (
                <Link to={i.to} className="flex gap-2 p-3 hover:bg-muted/40 rounded-lg">
                  {body}
                </Link>
              ) : (
                <div className="flex gap-2 p-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
