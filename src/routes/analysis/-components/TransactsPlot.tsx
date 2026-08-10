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
import { parseNum } from "@/common/utils.ts";
import { Periodicity } from "@/types/domain";
import { FullTransaction } from "..";

interface ChartRow {
  dateLabel: string;
  value: number;
}

const green = twStyles.getPropertyValue("--color-green-500");
const red = twStyles.getPropertyValue("--color-red-500");

const margin = { top: 20, right: 20, bottom: 0, left: 50 };
const getColor = (d: string) => (d === "Ingresos" ? green : red);

const ChartTooltipContent = ({ active, payload }: TooltipContentProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;
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

  return (
    <div className="relative w-full h-full">
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
              <ChartTooltipContent {...props} />
            )}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={{ r: 5, fill: color, stroke: "white", strokeWidth: 1.5 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
