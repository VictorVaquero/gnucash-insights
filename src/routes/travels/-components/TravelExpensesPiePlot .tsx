import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import { MutableRefObject, useMemo, useRef } from "react";
import { BarLoader } from "@/components/ui/BarLoader";

import { getDefaultColor, getRandomColor } from "@/common/getColors";
import { parseNum, useWindowSize } from "@/common/utils.ts";
import { travelExpensesByAccountOptions } from "@/db/queries/travel";
import { useBook, useDB } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointNode } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useAuth } from "@/contexts/useAuthContext";

interface Data {
  key: string;
  name: string;
  value: number;
}

const defaultAccount = "Others";

const margin = { t: 5, r: 5, b: 5, l: 5 };
const yf = (d: Data) => d.value;
const gf = (d: Data) => d.key;
const namef = (d: Data) => d.name;
const color_f = (d: Data) =>
  namef(d) !== defaultAccount ? getRandomColor(namef(d)) : getDefaultColor();
const orderyf = (a: Data, b: Data) => (yf(a) > yf(b) ? 1 : -1);

const DrawTravelExpensesPiePlot = (props: { data: Data[] }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, height] = useWindowSize(svgRef);
  const range = useMemo(() => {
    return { x: [margin.l, width - margin.r], y: [height - margin.b, margin.t] };
  }, [width, height]);

  const sortedData = [...props.data].sort(orderyf);
  const sumTotal = d3.sum(sortedData.map(yf));

  const radius = Math.min(...[range.x[1] - range.x[0], range.y[0] - range.y[1]]) / 2;
  const pie_generator = d3.pie<Data>().value(yf);
  const arcGenerator = d3
    .arc<d3.PieArcDatum<Data>>()
    .innerRadius(radius - 25)
    .outerRadius(radius)
    .padAngle(0.03);

  const dataf = (id: string) => sortedData.filter((d) => gf(d) === id)[0];
  const choosePoint = chooseTooltipPointNode<Data>(dataf, "path");
  const updateTooltip = (ref: MutableRefObject<HTMLDivElement | null>, d: Data) => {
    if (ref.current !== null) {
      const tooltip = d3.select(ref.current);
      tooltip.select("#title").text(namef(d));
      tooltip.select("#value").style("color", color_f(d));
      tooltip.select("#value").text(parseNum(yf(d)));
      tooltip
        .select("#percentage")
        .text(parseNum((yf(d) / sumTotal) * 100, { digits: 0, symbol: "%" }));
    }
  };
  return (
    <div className="relative w-full h-full">
      <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-center items-center pointer-events-none">
        <p className="text-red-500">{parseNum(sumTotal)}</p>
      </div>
      <svg className="w-full h-full" ref={svgRef}>
        <g className="paths" transform={"translate(" + width / 2 + "," + height / 2 + ")"}>
          {pie_generator(sortedData).map((d) => (
            <path
              fill={color_f(d.data)}
              key={gf(d.data)}
              id={gf(d.data)}
              strokeWidth="1.5"
              shapeRendering="geometricPrecision"
              stroke="white"
              d={arcGenerator(d) ?? ""}
            />
          ))}
        </g>
      </svg>
      <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip}>
        <div className="flex flex-col items-center px-6 py-2">
          <span className="text-shark-300" id="title">
            Title
          </span>
          <span id="value">Value</span>
          <span id="percentage">Percentage</span>
        </div>
      </Tooltip>
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
