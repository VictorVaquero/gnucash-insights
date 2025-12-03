import * as d3 from "d3";
import { DateTime } from "luxon";
import { MutableRefObject, useMemo, useRef } from "react";
import { BarLoader } from "react-spinners";

import { getDefaultColor, getRandomColor } from "@/common/getColors";
import { parseNum, twStyles, useWindowSize } from "@/common/utils.ts";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { netCostsYearMonthOptions } from "@/db/queries/summary";
import { Account } from "@/db/schema";
import { useBook, useDB } from "@/hooks/useDB";
import { Tooltip } from "@/routes/summary/-plots/Tooltip.tsx";
import { chooseTooltipPointNode } from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { useQuery } from "@tanstack/react-query";
import { useSummaryPageContext } from "../-summaryPageContext";

export interface Data {
  account: string;
  date: string;
  value: number;
}

const margin = { t: 5, r: 5, b: 5, l: 5 };
const xf = (d: Data) => DateTime.fromISO(d.date);
const yf = (d: Data) => d.value;
const gf = (d: Data) => d.account;
const defaultAccount = "Others";
const gray = twStyles.getPropertyValue("--color-gray-400");

export const DrawMonthDetailedExpensesPiePlot = (props: {
  data: Data[];
  accounts: Account[];
  date: DateTime;
  hideAccounts: string[];
  setHideAccounts: CallableFunction;
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, height] = useWindowSize(svgRef);
  const range = useMemo(() => {
    return {
      x: [margin.l, width - margin.r],
      y: [height - margin.b, margin.t],
    };
  }, [width, height]);

  const findAccount = (s: string) =>
    props.accounts.filter((a) => a.id === s)[0];
  const name_f = (d: Data) => findAccount(d.account)?.name ?? defaultAccount;
  const color_f = (d: Data) =>
    name_f(d) !== defaultAccount
      ? getRandomColor(name_f(d))
      : getDefaultColor();

  const hide_accounts = [""];
  const filtered_data = props.data.filter(
    (d) =>
      !hide_accounts.includes(d.account) &&
      xf(d).year === props.date.year &&
      xf(d).month === props.date.month
  );

  const radius =
    Math.min(...[range.x[1] - range.x[0], range.y[0] - range.y[1]]) / 2;
  const pie_generator = d3.pie<Data>().value(yf);
  const arcGenerator = d3
    .arc<d3.PieArcDatum<Data>>()
    .innerRadius(radius - 25)
    .outerRadius(radius)
    .padAngle(0.03);

  const dataf = (id: string) => filtered_data.filter((d) => gf(d) === id)[0];
  const choosePoint = chooseTooltipPointNode<Data>(dataf, "path");
  const updateTooltip = (
    ref: MutableRefObject<HTMLDivElement | null>,
    d: Data
  ) => {
    if (ref.current !== null) {
      const tooltip = d3.select(ref.current);
      tooltip.select("#title").text(name_f(d));
      tooltip.select("#date").text(d.date);
      tooltip.select("#value").style("color", color_f(d));
      tooltip.select("#value").text(parseNum(d.value));
    }
  };
  const onClick = (d: Data) => props.setHideAccounts(d.account);
  return (
    <div className="relative w-full h-full">
      <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-center items-center pointer-events-none">
        <p className="text-shark-300">{props.date.toFormat("yyyy-MM")}</p>
        <p className="text-red-500">
          {parseNum(d3.sum(filtered_data.map(yf)))}
        </p>
      </div>
      <svg className="w-full h-full" ref={svgRef}>
        <g
          className="paths cursor-pointer"
          transform={"translate(" + width / 2 + "," + height / 2 + ")"}
        >
          {pie_generator(filtered_data).map((d) => (
            <path
              fill={
                props.hideAccounts.includes(d.data.account)
                  ? gray
                  : color_f(d.data)
              }
              key={gf(d.data)}
              id={gf(d.data)}
              strokeWidth="1.5"
              shapeRendering="geometricPrecision"
              stroke="white"
              d={arcGenerator(d) as string}
            />
          ))}
        </g>
      </svg>
      <Tooltip
        svgRef={svgRef}
        choosePoint={choosePoint}
        updateTooltip={updateTooltip}
        onClick={onClick}
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

export const MonthDetailedExpensesPiePlot = () => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const { hideAccounts, toggleHideAccount, detailedDate } =
    useSummaryPageContext();

  const { data: accounts, isSuccess: isSuccessAccounts } = useQuery(
    accountsOptions(db, bookId)
  );
  const { data, isSuccess } = useQuery(
    netCostsYearMonthOptions({ db, user, bookId })
  );

  if (!isSuccessAccounts || !isSuccess)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        {" "}
        <BarLoader color="#36d7b7" />{" "}
      </div>
    );

  return (
    <DrawMonthDetailedExpensesPiePlot
      data={data}
      accounts={accounts}
      date={detailedDate}
      hideAccounts={hideAccounts}
      setHideAccounts={toggleHideAccount}
    />
  );
};
