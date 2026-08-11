import { twStyles } from "@/common/utils";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import { groupBy, sum } from "@/common/aggregate";
import { parseNum, useIsNarrowViewport } from "@/common/utils.ts";
import { ChartKeyValue } from "@/components/charts/ChartKeyValue";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { renderTouchDot } from "@/components/charts/TouchDot";
import { Periodicity } from "@/types/domain";
import { FullTransaction } from "..";

interface ChartRow {
  dateLabel: string;
  value: number;
}

const green = twStyles.getPropertyValue("--color-green-500");
const red = twStyles.getPropertyValue("--color-red-500");

const marginDesktop = { top: 20, right: 20, bottom: 0, left: 50 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 36 };
const getColor = (d: string) => (d === "Ingresos" ? green : red);

const ChartTooltipContent = ({ payload }: Pick<TooltipContentProps<number, string>, "payload">) => {
  const d = payload[0].payload as ChartRow;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{d.dateLabel}</span>
      <span style={{ color: getColor("Mixin") }}>{parseNum(d.value)}</span>
    </div>
  );
};

export const TransactsPlot = ({
  data,
  periodicity,
}: {
  data: FullTransaction[];
  periodicity: Periodicity;
}) => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;
  const format =
    periodicity == "yearly" ? "yyyy" : periodicity == "monthly" ? "yyyy-LL" : "yyyy-qq";

  const chartData: ChartRow[] = useMemo(() => {
    const grouped = groupBy(data, (d) => d.datePosted.toFormat(format));
    return Array.from(grouped, ([date, items]) => ({
      dateLabel: date,
      value: sum(items, (d) => d.value),
    })).sort((a, b) => (a.dateLabel > b.dateLabel ? 1 : -1));
  }, [data, format]);

  const color = getColor("Mixin");
  const latest = chartData[chartData.length - 1];

  return (
    <div className="relative w-full h-64 md:h-full">
      {latest && (
        <ChartKeyValue
          label={latest.dateLabel}
          value={<span style={{ color }}>{parseNum(latest.value)}</span>}
        />
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={margin}>
          <CartesianGrid strokeOpacity={0.1} vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-500"
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-gray-500"
            tickLine={false}
            tickFormatter={(value: number) => parseNum(value)}
            width={margin.left}
          />
          <RechartsTooltip
            content={(props: TooltipContentProps<number, string>) => (
              <ChartTooltip {...props}>
                {({ payload }) => <ChartTooltipContent payload={payload} />}
              </ChartTooltip>
            )}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={renderTouchDot(color, 5)}
            activeDot={renderTouchDot(color, 6)}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
