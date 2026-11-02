import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FixedVariableMonth } from "@/common/analytics";
import { formatCurrency, formatNumber } from "@/common/utils";
import { SimpleTooltip } from "@/components/charts/SimpleTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

const axisTick = { fontSize: 10, fill: "currentColor" };
const FIXED_COLOR = "var(--color-violet-500)";
const VARIABLE_COLOR = "var(--color-amber-400)";

/**
 * Committed spending (rent, subscriptions, anything that repeats at a steady amount) against
 * everything else. The committed part is spoken for before the month starts; the variable
 * part is where a saving decision actually has room to act.
 */
export const FixedVariablePlot = (props: {
  data: FixedVariableMonth[];
  fixedShare: number;
  fixed12: number;
  className?: string;
}) => {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const rows = useMemo(
    () =>
      props.data.map((d) => ({
        label: d.month,
        [t("expenses.fixedVariable.fixed")]: Math.max(d.fixed, 0),
        [t("expenses.fixedVariable.variable")]: Math.max(d.variable, 0),
      })),
    [props.data, t],
  );
  const fixedName = t("expenses.fixedVariable.fixed");
  const variableName = t("expenses.fixedVariable.variable");
  const money = (v: number) => formatCurrency(v, locale, { digits: 0 });

  return (
    <Card className={cn("flex flex-col", props.className)}>
      <CardHeader>
        <CardTitle>{t("expenses.fixedVariable.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          {t("expenses.fixedVariable.summary", {
            share: formatNumber(props.fixedShare * 100, locale, { digits: 0 }),
            monthly: formatCurrency(props.fixed12 / 12, locale, { digits: 0, compact: true }),
          })}
        </p>
        <div className="h-64 min-h-0 flex-1" data-testid="fixed-variable-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} minTickGap={24} />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(v: number) =>
                  formatCurrency(v, locale, { compact: true, digits: 0 })
                }
              />
              <Tooltip
                cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                content={(p) => <SimpleTooltip {...p} format={money} total />}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey={fixedName} stackId="s" fill={FIXED_COLOR} />
              <Bar dataKey={variableName} stackId="s" fill={VARIABLE_COLOR} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
