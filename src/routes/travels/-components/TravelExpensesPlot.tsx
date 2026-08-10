import { BarLoader } from "@/components/ui/BarLoader";
import * as d3 from "d3";
import { DateTime } from "luxon";
import { RefObject, useMemo, useRef } from "react";

import { parseNum, useIsNarrowViewport, useWindowSize } from "@/common/utils.ts";
import { XAxis } from "@/components/charts/XAxis";
import { YAxis } from "@/components/charts/YAxis";
import { useAuth } from "@/contexts/useAuthContext";
import { travelExpensesDetailedOptions } from "@/db/queries/travel";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointLine } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useQuery } from "@tanstack/react-query";
import { getColor } from "./utils";

interface Data {
  name: string;
  ini: string;
  fin: string;
  value: number;
}

const marginDesktop = { t: 20, r: 20, b: 20, l: 50 };
const marginMobile = { t: 10, r: 10, b: 20, l: 36 };
const xf = (d: Data) => DateTime.fromISO(d.fin);
const yf = (d: Data) => d.value;
const orderxf = (a: Data, b: Data) => (xf(a) > xf(b) ? 1 : -1);
const orderyf = (a: Data, b: Data) => (yf(a) > yf(b) ? 1 : -1);

const DrawTravelExpensesPlot = (props: {
  data: Data[];
  domain: { startDate: DateTime; endDate: DateTime };
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, height] = useWindowSize(svgRef);
  const isNarrowViewport = useIsNarrowViewport();
  const margin = isNarrowViewport ? marginMobile : marginDesktop;
  const range = useMemo(() => {
    return {
      x: [margin.l, width - margin.r],
      y: [height - margin.b, margin.t],
    };
  }, [width, height, margin]);

  const sortedData = [...props.data].sort(orderyf).sort(orderxf);

  const xDomain = [props.domain.startDate.minus({ month: 4 }), props.domain.endDate];
  const yDomain = [0, Math.max(...sortedData.map(yf))];
  const xScale = d3.scaleUtc(xDomain, range.x);
  const yScale = d3.scaleLinear(yDomain as [number, number], range.y);
  const rectWidth = (width / sortedData.length) * 1.4;

  const choosePoint = chooseTooltipPointLine(sortedData, xf, yf, xScale, yScale);
  const updateTooltip = (ref: RefObject<HTMLDivElement | null>, d: Data) => {
    if (ref.current !== null) {
      const tooltip = d3.select(ref.current);
      tooltip.select("#title").text(d.name);
      tooltip.select("#title").style("color", getColor(d.name));
      tooltip.select("#range").text(`${d.ini} | ${d.fin}`);
      tooltip.select("#value").text(parseNum(d.value));
    }
  };

  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" ref={svgRef}>
        <XAxis width={width} range={range} xScale={xScale} />
        <YAxis height={height} range={range} scale={yScale} />
        <g className="rect">
          {sortedData.map((d) => (
            <rect
              fill={getColor(d.name)}
              fillOpacity={0.4}
              key={d.name + d.fin}
              strokeWidth="1.5"
              shapeRendering="geometricPrecision"
              stroke={getColor(d.name)}
              x={xScale(xf(d)) - rectWidth / 2}
              y={yScale(yf(d))}
              height={range.y[0] - yScale(yf(d))}
              width={rectWidth}
            />
          ))}
        </g>
      </svg>
      <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip}>
        <div className="flex flex-col items-center px-6 py-2">
          <span className="text-shark-300" id="title">
            Title
          </span>
          <span className="text-shark-300" id="range">
            Range
          </span>
          <span id="value" className="text-red-500">
            Value
          </span>
        </div>
      </Tooltip>
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

  return <DrawTravelExpensesPlot data={data as Data[]} domain={{ startDate: from, endDate: to }} />;
};
