import * as d3 from "d3";
import { DateTime } from "luxon";
import { MutableRefObject, useMemo, useRef } from "react";
import { BarLoader } from "react-spinners";

import { getRandomColor } from "@/common/getColors";
import { parseNum, useWindowSize } from "@/common/utils.ts";
import { XAxis } from "@/components/XAxis";
import { YAxis } from "@/components/YAxis";
import { useAuth } from "@/contexts/useAuthContext";
import { assetsDebtsYearMonthOptions } from "@/db/queries/summary";
import { useBook, useDB } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointLine } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useQuery } from "@tanstack/react-query";
import { useSummaryPageContext } from "../-summaryPageContext";

export interface Data {
  name: string;
  yearmonth: string;
  value: number;
}

const margin = { t: 20, r: 20, b: 20, l: 50 };
const xf = (d: Data) => DateTime.fromISO(d.yearmonth);
const yf = (d: Data) => d.value;
const orderxf = (a: Data, b: Data) => (xf(a) > xf(b) ? 1 : -1);
const orderyf = (a: Data, b: Data) => (yf(a) > yf(b) ? 1 : -1);

const DrawMonthlyAccountsPlot = (props: {
  data: Data[];
  domain: { startDate: DateTime; endDate: DateTime };
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, height] = useWindowSize(svgRef);
  const range = {
    x: [margin.l, width - margin.r],
    y: [height - margin.b, margin.t],
  };

  const name_f = (d: Data) => d.name;
  const color_f = (d: Data) => getRandomColor(name_f(d));

  const sortedData = [...props.data]
    .sort(orderyf)
    .sort(orderxf)
    .filter((d) => d.yearmonth >= props.domain.startDate.toString())
    .filter((d) => d.yearmonth <= props.domain.endDate.toString());
  //const xDomain = [d3.min(sortedData, xf)!.minus({'month':1}), d3.max(sortedData, xf)!];
  const xDomain = [
    props.domain.startDate.minus({ month: 1 }),
    props.domain.endDate,
  ];
  const yDomain = [0, d3.max(sortedData, yf) as number];

  const xScale = d3.scaleUtc(xDomain, range.x);
  const yScale = d3.scaleLinear(yDomain, range.y);
  const line = d3
    .line<Data>()
    .curve(d3.curveLinear)
    .x((d) => xScale(xf(d)))
    .y((d) => yScale(yf(d)));

  const choosePoint = chooseTooltipPointLine<Data>(
    sortedData,
    xf,
    yf,
    xScale,
    yScale
  );
  const updateTooltip = (
    ref: MutableRefObject<HTMLDivElement | null>,
    d: Data
  ) => {
    if (ref.current !== null) {
      const tooltip = d3.select(ref.current);
      tooltip.select("#title").text(d.name);
      tooltip.select("#date").text(d.yearmonth);
      tooltip.select("#value").style("color", color_f(d));
      tooltip.select("#value").text(parseNum(d.value));
    }
  };
  const uniqueAccounts = useMemo(
    () => [...new Set(sortedData.map((d) => d.name))],
    [sortedData]
  );

  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" ref={svgRef}>
        <XAxis width={width} range={range} xScale={xScale} />
        <YAxis height={height} range={range} scale={yScale} />
        <g className="lines">
          {uniqueAccounts.map((s) => (
            <path
              fill="none"
              stroke={getRandomColor(s)}
              key={s}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="1"
              shapeRendering="geometricPrecision"
              d={line(sortedData.filter((d) => d.name === s)) as string}
            />
          ))}
        </g>
        <g className="circles">
          {sortedData.map((d) => (
            <circle
              className="transition-transform delay-75 duration-700 ease-in"
              key={d.yearmonth + d.name}
              fill={color_f(d)}
              strokeWidth="1.5"
              shapeRendering="geometricPrecision"
              stroke="white"
              r="5"
              cx={xScale(xf(d))}
              cy={yScale(yf(d))}
            />
          ))}
        </g>
      </svg>
      <Tooltip
        svgRef={svgRef}
        choosePoint={choosePoint}
        updateTooltip={updateTooltip}
      >
        <div className="flex flex-col items-center px-6 py-2">
          <span className="text-shark-300" id="title">
            Title
          </span>
          <span className="text-shark-300" id="date">
            Date
          </span>
          <span id="value">Value</span>
        </div>
      </Tooltip>
    </div>
  );
};

export const MonthlyAccountsPlot = () => {
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const { dateRange } = useSummaryPageContext();

  const { data, isSuccess } = useQuery(
    assetsDebtsYearMonthOptions({ db, user, bookId })
  );

  if (!isSuccess || !dateRange)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader color="#36d7b7" />
      </div>
    );

  return (
    <DrawMonthlyAccountsPlot
      data={data}
      domain={{ startDate: dateRange.from, endDate: dateRange.to }}
    />
  );
};
