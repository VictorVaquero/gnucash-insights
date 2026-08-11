import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { formatCurrency } from "@/common/utils.ts";
import { KpiRow } from "@/components/KpiRow.tsx";
import { useAuth } from "@/contexts/useAuthContext";
import { splitSumOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

export const BalancesBlock = (props: { className?: string }) => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const dbconf = getConfig(user);

  const { data: checking } = useQuery(splitSumOptions(db, bookId, [dbconf.checking]));
  const { data: savings } = useQuery(splitSumOptions(db, bookId, [dbconf.savings]));
  const { data: assets } = useQuery(splitSumOptions(db, bookId, [dbconf.assets]));
  const { data: investments } = useQuery(splitSumOptions(db, bookId, [dbconf.investments]));
  const { data: taxes } = useQuery(splitSumOptions(db, bookId, [dbconf.taxes]));
  const { locale } = useLocale();
  const { t } = useTranslation();

  return (
    <div className={cn(props.className)}>
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {t("summary.balances.heading")}
      </p>
      <section className="flex flex-col">
        <KpiRow
          name={t("summary.balances.assets")}
          value={formatCurrency(assets ?? 0, locale, { compact: true })}
        />
        <KpiRow
          name={t("summary.balances.checking")}
          value={formatCurrency(checking ?? 0, locale, { compact: true })}
        />
        <KpiRow
          name={t("summary.balances.savings")}
          value={formatCurrency(savings ?? 0, locale, { compact: true })}
        />
        <KpiRow
          name={t("summary.balances.investment")}
          value={formatCurrency(investments ?? 0, locale, { compact: true })}
        />
        <KpiRow
          name={t("summary.balances.taxes")}
          value={formatCurrency(taxes ?? 0, locale, { compact: true })}
          color="text-red-600"
        />
      </section>
    </div>
  );
};
