import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { checkQuality, type QualityIssue } from "@/common/quality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fullTransactionsOptions } from "@/db/queries/global";
import { useBook, useDB } from "@/hooks/useDB";
import { cn } from "@/lib/utils";
import { useHoldings } from "@/routes/investments/-useHoldings";

const tone = {
  error: "text-red-600",
  warning: "text-amber-600",
  info: "text-sky-600",
} as const;

const IssueCard = ({ issue }: { issue: QualityIssue }) => {
  const { t } = useTranslation();
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
      <CardContent className="text-sm">
        <p className="mb-2 text-muted-foreground">{t(`quality.checks.${issue.id}.help`)}</p>
        <ul className="space-y-0.5 font-mono text-xs">
          {issue.samples.map((s, i) => (
            <li key={i} className="truncate">
              {s}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

const Quality = () => {
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
    <div className="w-full p-4 pt-10 lg:p-10 flex flex-col gap-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("routes.quality.title")}
        </h1>
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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {result.issues.map((i) => (
            <IssueCard key={i.id} issue={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute("/quality")({
  component: Quality,
  beforeLoad: async ({ location, context: { auth } }) => {
    if (auth && !auth.isAuthenticated()) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { title: "routes.quality.title" };
  },
});
