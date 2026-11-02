import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { checkQuality, type QualityIssue, type QualityItem } from "@/common/quality";
import { formatCurrency } from "@/common/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fullTransactionsOptions } from "@/db/queries/global";
import { useBook, useDB } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import { InvestmentsPageContextProvider } from "@/routes/investments/-investmentsPageContext";
import { useHoldings } from "@/routes/investments/-useHoldings";

const tone = {
  error: "text-red-600",
  warning: "text-amber-600",
  info: "text-sky-600",
} as const;

const PAGE = 25;

const ItemRow = ({ item }: { item: QualityItem }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  return (
    <details className="group rounded border border-border px-2 py-1.5 text-sm">
      <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="font-mono text-xs text-muted-foreground">{item.date ?? "—"}</span>
        <span className="font-medium">{item.title}</span>
        <span className="text-xs text-muted-foreground">
          {t(`quality.reasons.${item.reason.key}`, item.reason.params)}
        </span>
      </summary>
      <div className="mt-2 space-y-1 text-xs">
        <p>
          <span className="text-muted-foreground">{t("quality.id")}: </span>
          <span className="break-all font-mono">{item.id}</span>
        </p>
        {item.splits.length > 0 && (
          <table className="w-full">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="pr-3 font-normal">{t("quality.account")}</th>
                <th className="pr-3 text-right font-normal">{t("quality.value")}</th>
                <th className="font-normal">{t("quality.splitId")}</th>
              </tr>
            </thead>
            <tbody>
              {item.splits.map((s) => (
                <tr key={s.splitId}>
                  <td className="pr-3">{s.accountName}</td>
                  <td className="pr-3 text-right tabular-nums">
                    {formatCurrency(s.value, locale, { digits: 2 })}
                  </td>
                  <td className="break-all font-mono text-muted-foreground">{s.splitId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
};

const IssueCard = ({ issue }: { issue: QualityIssue }) => {
  const { t } = useTranslation();
  const [limit, setLimit] = useState(PAGE);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={issue.severity === "info" ? faCircleInfo : faCircleExclamation}
            className={tone[issue.severity]}
          />
          {t(`quality.checks.${issue.id}.title`)}
          <span className={cn("ml-auto tabular-nums", tone[issue.severity])}>{issue.count}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{t(`quality.checks.${issue.id}.help`)}</p>
        {issue.items.slice(0, limit).map((item) => (
          <ItemRow key={`${item.id}-${item.reason.key}`} item={item} />
        ))}
        {issue.items.length > limit && (
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => setLimit(limit + PAGE)}
          >
            {t("quality.showMore", { count: issue.items.length - limit })}
          </button>
        )}
      </CardContent>
    </Card>
  );
};

const QualityInner = () => {
  const { t } = useTranslation();
  const { db } = useDB();
  const { bookId } = useBook();
  const { data } = useQuery(fullTransactionsOptions(db, bookId));
  const { holdings } = useHoldings();

  const result = useMemo(() => {
    if (!data) return null;
    return checkQuality(
      data.map((r) => ({
        transactionId: r.transactionId,
        splitId: r.splitId,
        accountId: r.accountId,
        accountName: r.accountName,
        date: String(r.ymdPosted).slice(0, 10),
        value: r.value,
        description: r.description ?? "",
      })),
      holdings,
      DateTime.now().toISODate() ?? "",
    );
  }, [data, holdings]);

  if (!result) return null;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {t("quality.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.lastDate
            ? t("quality.lastEntry", { date: result.lastDate, days: result.daysSinceLast })
            : t("quality.noData")}
        </p>
      </div>
      {result.issues.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-green-600">
          <FontAwesomeIcon icon={faCircleCheck} /> {t("quality.allGood")}
        </p>
      ) : (
        result.issues.map((i) => <IssueCard key={i.id} issue={i} />)
      )}
    </section>
  );
};

/** Data-quality findings with the exact reason and the full transaction behind each one. */
export const QualitySection = () => (
  <InvestmentsPageContextProvider>
    <QualityInner />
  </InvestmentsPageContextProvider>
);
