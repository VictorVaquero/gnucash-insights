import { twStyles } from "@/common/utils";
import * as d3 from "d3";
import { RefObject, useMemo, useRef } from "react";

import { parseNum, useWindowSize } from "@/common/utils.ts";
import { XAxis } from "@/components/XAxis";
import { YAxis } from "@/components/YAxis";
import { Tooltip } from "@/routes/summary/-plots/Tooltip";
import { chooseTooltipPointLine } from "@/routes/summary/-plots/tooltipFuncs";
import { DateTime } from "luxon";
import { FullTransaction } from "..";

interface GroupedTransaction {
  split: DateTime;
  posted: DateTime;
  name: string;
  value: number;
}

const green = twStyles.getPropertyValue("--color-green-500");
const red = twStyles.getPropertyValue("--color-red-500");

const margin = { t: 20, r: 20, b: 20, l: 50 };
const getColor = (d: string) => (d === "Ingresos" ? green : red);
const xf = (d: GroupedTransaction) => d.posted;
const yf = (d: GroupedTransaction) => d.value;
const orderxf = (a: GroupedTransaction, b: GroupedTransaction) =>
  xf(a) > xf(b) ? 1 : -1;
const orderyf = (a: GroupedTransaction, b: GroupedTransaction) =>
  yf(a) > yf(b) ? 1 : -1;

export const TransactsPlot = (props: {
  data: FullTransaction[];
  isYearly: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, height] = useWindowSize(svgRef);
  const range = useMemo(() => {
    return {
      x: [margin.l, width - margin.r],
      y: [height - margin.b, margin.t],
    };
  }, [width, height]);

  const format = props.isYearly ? "yyyy" : "yyyy-LL";

  const groupedData = d3
    .groups(props.data, (d) => d.datePosted.toFormat(format))
    .map(([date, data]) => ({
      split: DateTime.fromFormat(date, format),
      posted: DateTime.fromFormat(date, format),
      name: "Mixin",
      value: d3.sum(data, (d) => d.value),
    }));
  const sortedData = [...groupedData].sort(orderyf).sort(orderxf);

  const xDomain = [
    (d3.min(sortedData, xf) as DateTime).minus({ month: 1 }),
    d3.max(sortedData, xf) as DateTime,
  ];
  const yDomain = [
    Math.min(...sortedData.map(yf)),
    Math.max(...sortedData.map(yf)),
  ];
  const xScale = d3.scaleUtc(xDomain, range.x);
  const yScale = d3.scaleLinear(yDomain as [number, number], range.y);
  const line = d3
    .line<GroupedTransaction>()
    .curve(d3.curveMonotoneX)
    .x((d) => xScale(xf(d)))
    .y((d) => yScale(yf(d)));

  const choosePoint = chooseTooltipPointLine<GroupedTransaction>(
    sortedData,
    xf,
    yf,
    xScale,
    yScale
  );
  const updateTooltip = (
    ref: RefObject<HTMLDivElement | null>,
    d: GroupedTransaction
  ) => {
    if (ref.current !== null) {
      const tooltip = d3.select(ref.current);
      tooltip.select("#title").text(d.posted.toFormat(format));
      tooltip.select("#value").style("color", getColor(d.name));
      tooltip.select("#value").text(parseNum(d.value));
    }
  };

  const uniqueAccounts = useMemo(
    () => [...new Set(sortedData.map((d) => d.name))],
    [sortedData]
  );
  //const paths = uniqueAccounts.map((s)=> line(sortedData.filter((d) => d.name === s)))

  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" ref={svgRef}>
        <XAxis width={width} range={range} xScale={xScale} />
        <YAxis height={height} range={range} scale={yScale} />
        <g className="lines">
          {uniqueAccounts.map((s) => (
            <path
              fill="none"
              stroke={getColor(s)}
              key={s}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="1"
              shapeRendering="geometricPrecision"
              d={line(sortedData.filter((d) => d.name === s)) ?? ""}
            />
          ))}
        </g>
        <g className="circles">
          {sortedData.map((d) => (
            <circle
              fill={getColor(d.name)}
              key={d.split.toFormat(format)}
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
          <span id="value">Value</span>
        </div>
      </Tooltip>
    </div>
  );
};
