import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { WeekdayStat } from "@/common/analytics";
import { formatCurrency } from "@/common/utils";
import { SimpleTooltip } from "@/components/charts/SimpleTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";

const axisTick = { fontSize: 10, fill: "currentColor" };

/** Average spend on each day of the week: shows weekend overspending or payday habits. */
export const WeekdayPlot = (props: { stats: WeekdayStat[]; className?: string }) => {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const rows = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
    return props.stats.map((s) => ({
      name: fmt.format(new Date(Date.UTC(2024, 0, 1 + s.weekday))),
      value: Math.max(s.avgPerDay, 0),
    }));
  }, [props.stats, locale]);
  const max = Math.max(...rows.map((r) => r.value), 0);
  const label = t("expenses.weekday.average");

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle>{t("expenses.weekday.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-1 text-xs text-muted-foreground">{t("expenses.weekday.subtitle")}</p>
        <div className="h-44" data-testid="weekday-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={axisTick} tickLine={false} />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={36}
                tickFormatter={(v: number) =>
                  formatCurrency(v, locale, { compact: true, digits: 0 })
                }
              />
              <Tooltip
                cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                content={(p) => (
                  <SimpleTooltip {...p} format={(v) => formatCurrency(v, locale, { digits: 0 })} />
                )}
              />
              <Bar dataKey="value" name={label} radius={[3, 3, 0, 0]}>
                {rows.map((r) => (
                  <Cell
                    key={r.name}
                    fill="var(--color-brand)"
                    fillOpacity={max > 0 && r.value === max ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
