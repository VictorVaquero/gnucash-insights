import { useTranslation } from "react-i18next";

import { formatCurrency, formatNumber } from "@/common/utils";
import { useLocale } from "@/hooks/useLocale";

import { allocation, type Slice } from "./-allocation";
import { useHoldings } from "./-useHoldings";

const Bars = (props: { title: string; slices: Slice[] }) => {
  const { locale } = useLocale();
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{props.title}</p>
      <ul className="flex flex-col gap-1.5">
        {props.slices.slice(0, 8).map((s) => (
          <li key={s.name} className="text-sm">
            <div className="flex justify-between gap-3">
              <span className="truncate">{s.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatCurrency(s.value, locale, { digits: 0, compact: true })} ·{" "}
                {formatNumber(s.share * 100, locale, { digits: 0 })}%
              </span>
            </div>
            <div className="mt-0.5 h-1.5 rounded bg-muted">
              <div
                className="h-full rounded bg-[var(--brand)]"
                style={{ width: `${Math.max(s.share * 100, 1)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Where the money is: by holding and by platform, with a concentration warning. */
export const AllocationCard = () => {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { holdings } = useHoldings();
  const a = allocation(holdings);
  if (a.byHolding.length === 0)
    return <p className="text-sm text-muted-foreground">{t("investments.allocation.empty")}</p>;
  const top = a.byHolding[0];
  return (
    <div className="flex flex-col gap-4" data-testid="allocation-card">
      {a.topShare >= 0.4 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {t("investments.allocation.concentrated", {
            name: top.name,
            share: formatNumber(a.topShare * 100, locale, { digits: 0 }),
          })}
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Bars title={t("investments.allocation.byHolding")} slices={a.byHolding} />
        {(a.byPlatform.length > 1 || a.byPlatform[0]?.name !== "—") && (
          <Bars title={t("investments.allocation.byPlatform")} slices={a.byPlatform} />
        )}
      </div>
    </div>
  );
};
