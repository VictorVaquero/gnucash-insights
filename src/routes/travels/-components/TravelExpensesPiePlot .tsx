import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
} from "recharts";
import { BarLoader } from "@/components/ui/BarLoader";

import { sum } from "@/common/aggregate";
import { getDefaultColor, getRandomColor } from "@/common/getColors";
import { parseNum } from "@/common/utils.ts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useAuth } from "@/contexts/useAuthContext";
import { travelExpensesByAccountOptions } from "@/db/queries/travel";
import { useBook, useDB } from "@/hooks/useDB";
import { useChartScrubber } from "@/hooks/useChartScrubber";

interface Data {
  key: string;
  name: string;
  value: number;
  [key: string]: unknown;
}

const defaultAccount = "Others";

const yf = (d: Data) => d.value;
const gf = (d: Data) => d.key;
const namef = (d: Data) => d.name;
const color_f = (d: Data) =>
  namef(d) !== defaultAccount ? getRandomColor(namef(d)) : getDefaultColor();
const orderyf = (a: Data, b: Data) => (yf(a) > yf(b) ? 1 : -1);

const ChartTooltipContent = ({
  payload,
  sumTotal,
}: Pick<TooltipContentProps<number, string>, "payload"> & { sumTotal: number }) => {
  const d = payload[0].payload as Data;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{namef(d)}</span>
      <span style={{ color: color_f(d) }}>{parseNum(yf(d))}</span>
      <span className="text-muted-foreground text-xs">
        {parseNum((yf(d) / sumTotal) * 100, { digits: 0, symbol: "%" })}
      </span>
    </div>
  );
};

const DrawTravelExpensesPiePlot = (props: { data: Data[] }) => {
  const sortedData = [...props.data].sort(orderyf);
  const sumTotal = sum(sortedData, yf);

  // Same scrubber-adjacent deviation as MonthDetailedExpensesPiePlot: a horizontal drag
  // cycles through wedges by draw-order index rather than tracking a literal x position,
  // since a pie has no linear axis (see chart-component-contract.md's non-goal on
  // pixel-identical behavior).
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex } = useChartScrubber(containerRef, { length: sortedData.length });
  const scrubbed = activeIndex != null ? sortedData[activeIndex] : undefined;

  return (
    <div ref={containerRef} className="relative w-full h-64 md:h-full touch-none">
      <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-center items-center pointer-events-none">
        {scrubbed ? (
          <>
            <p className="text-muted-foreground text-sm">{namef(scrubbed)}</p>
            <p style={{ color: color_f(scrubbed) }}>{parseNum(yf(scrubbed))}</p>
          </>
        ) : (
          <p className="text-red-500">{parseNum(sumTotal)}</p>
        )}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <RechartsTooltip
            content={(p: TooltipContentProps<number, string>) => (
              <ChartTooltip {...p}>
                {({ payload }) => <ChartTooltipContent payload={payload} sumTotal={sumTotal} />}
              </ChartTooltip>
            )}
          />
          <Pie
            data={sortedData}
            dataKey="value"
            nameKey="key"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="white"
            strokeWidth={1.5}
            isAnimationActive={false}
          >
            {sortedData.map((d, i) => (
              <Cell
                key={gf(d)}
                fill={color_f(d)}
                stroke={i === activeIndex ? "var(--color-foreground)" : "white"}
                strokeWidth={i === activeIndex ? 3 : 1.5}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TravelExpensesPiePlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();

  const { data, isSuccess } = useQuery(travelExpensesByAccountOptions({ db, user, bookId }));

  if (!isSuccess)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        {" "}
        <BarLoader />{" "}
      </div>
    );

  return <DrawTravelExpensesPiePlot data={data} />;
};
