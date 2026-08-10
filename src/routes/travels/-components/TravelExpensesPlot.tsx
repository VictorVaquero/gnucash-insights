import { BarLoader } from "@/components/ui/BarLoader";
import { DateTime } from "luxon";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import { parseNum, useIsNarrowViewport } from "@/common/utils.ts";
import { useAuth } from "@/contexts/useAuthContext";
import { travelExpensesDetailedOptions } from "@/db/queries/travel";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";
import { getColor } from "./utils";

interface Data {
  name: string;
  ini: string;
  fin: string;
  value: number;
}
interface ChartRow extends Data {
  finLabel: string;
}

const marginDesktop = { top: 20, right: 20, bottom: 0, left: 44 };
const marginMobile = { top: 10, right: 10, bottom: 0, left: 32 };
const xf = (d: Data) => DateTime.fromISO(d.fin);

const ChartTooltipContent = ({ active, payload }: TooltipContentProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload as ChartRow;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span style={{ color: getColor(d.name) }}>{d.name}</span>
      <span className="text-muted-foreground text-xs">
        {d.ini} | {d.fin}
      </span>
      <span className="text-red-500">{parseNum(d.value)}</span>
    </div>
  );
};

const DrawTravelExpensesPlot = (props: { data: Data[] }) => {
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;

  const chartData: ChartRow[] = useMemo(
    () =>
      [...props.data]
        .sort((a, b) => (xf(a) > xf(b) ? 1 : -1))
        .map((d) => ({ ...d, finLabel: xf(d).toFormat("LLL yy") })),
    [props.data],
  );

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={margin}>
          <CartesianGrid strokeOpacity={0.1} vertical={false} />
          <XAxis
            dataKey="finLabel"
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
          <Bar dataKey="value" fillOpacity={0.4} isAnimationActive={false}>
            {chartData.map((d) => (
              <Cell key={d.name + d.fin} fill={getColor(d.name)} stroke={getColor(d.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TravelExpensesPlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { from, to } = useDomain();

  const { data, isSuccess } = useQuery(travelExpensesDetailedOptions({ db, user, bookId }));

  if (!isSuccess || from == null || to == null)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  return <DrawTravelExpensesPlot data={data as Data[]} />;
};
