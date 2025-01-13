import {MutableRefObject, useContext, useMemo, useRef} from "react";
import {BarLoader} from "react-spinners";
import {DateTime} from "luxon";
import * as d3 from 'd3';

import {fullTWConfig, parseNum, useWindowSize} from "@/common/utils.ts";
import {XAxis} from "@/routes/summary/-plots/XAxis.tsx";
import {YAxis} from "@/routes/summary/-plots/YAxis.tsx";
import {Tooltip} from "@/routes/summary/-plots/Tooltip.tsx";
import {chooseTooltipPointLine} from "@/routes/summary/-plots/tooltipFuncs.tsx";
import { getTravelExpensesYearMonthQuery, getTravelExpensesYearQuery } from "@/db/queries/travel";
import { BookContext, DBContext } from "@/contexts/GlobalContext";
import { useDomain } from "@/hooks/useDB";
import { useQuery } from "react-query";

export interface Data { 
    date: string,
    value: number
}

const redColor = fullTWConfig.theme.colors.red[500];

const margin = {'t': 20, 'r': 20, 'b': 20, 'l': 50}
const getColor = () => redColor; 
const xf = (d: Data) => DateTime.fromISO(d.date);
const yf = (d: Data) => d.value;
const orderxf = (a: Data, b: Data) => xf(a) > xf(b) ? 1 : -1;
const orderyf = (a: Data, b: Data) => yf(a) > yf(b) ? 1 : -1;

const DrawTravelExpensesMonthlyPlot = (props: { data: Data[], dataYearly: Data[], domain: {startDate: DateTime, endDate: DateTime}}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const range = useMemo(() => {
        return {'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t]}
    }, [width, height])

    const sortedData = [...props.data].sort(orderyf).sort(orderxf);
    const sortedDataYearly = [...props.dataYearly].sort(orderyf).sort(orderxf);

    const xDomain = [props.domain.startDate.minus({'month': 4}), props.domain.endDate];
    const yDomain = [0, Math.max(...sortedDataYearly.map(yf))];
    const xScale = d3.scaleUtc(xDomain, range.x);
    const yScale = d3.scaleLinear(yDomain as [number, number], range.y);
    const rectWidth = width / sortedData.length *0.6 *0.7
    const rectWidthYearly = xScale(props.domain.startDate.plus({year: 1}))-xScale(props.domain.startDate) 

    const choosePoint = chooseTooltipPointLine(sortedData, xf, yf, xScale, yScale);
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement|null>, d: Data) => {
        if(ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#title').text(d.date)
            tooltip.select('#value').text(parseNum(d.value))
        }
    }


    return <div className='relative w-full h-full'>
        <svg className='w-full h-full' ref={svgRef}>
            <XAxis width={width} range={range} xScale={xScale}/>
            <YAxis height={height} range={range} scale={yScale}/>
            <g className='rectYear'>
                {sortedDataYearly.map((d) =>
                    <rect fill={getColor()}
                          fillOpacity={0.2}
                          key={d.date}
                          strokeWidth='0'
                          shapeRendering='geometricPrecision'
                          stroke={getColor()}
                          x={xScale(xf(d))}
                          y={yScale(yf(d))}
                          height={range.y[0]-yScale(yf(d))}
                          width={rectWidthYearly}
                    />
                )}
            </g>
            <g className='rect'>
                {sortedData.map((d) =>
                    <rect fill={getColor()}
                          fillOpacity={0.4}
                          key={d.date}
                          strokeWidth='1.5'
                          shapeRendering='geometricPrecision'
                          stroke={getColor()}
                          x={xScale(xf(d))-rectWidth/2}
                          y={yScale(yf(d))}
                          height={range.y[0]-yScale(yf(d))}
                          width={rectWidth}
                    />
                )}
            </g>
        </svg>
        <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip}>
            <div className='flex flex-col items-center px-6 py-2'>
                <span className='text-shark-300' id='title'>Title</span>
                <span id='value' className="text-red-500">Value</span>
            </div>
        </Tooltip>
    </div>
    ;
}


export const TravelExpensesMonthlyPlot = () => {
    const { db } = useContext(DBContext);
    const { bookId } = useContext(BookContext);
    const { min, max } = useDomain()

    const {data} = useQuery(['travelExpensesYearMonth', bookId], async ()=> getTravelExpensesYearMonthQuery(db!, bookId!).execute(), {enabled: [db, bookId].every(item=>Boolean(item)), staleTime: Infinity} );
    const {data:dataYearly} = useQuery(['travelExpensesYear', bookId], async () => getTravelExpensesYearQuery(db!, bookId!).execute(), {enabled: [db, bookId].every(item=>Boolean(item)), staleTime: Infinity});

    if (!data || !dataYearly || !min || !max) return <div className='w-full h-full flex flex-row items-center justify-center'><BarLoader color='#36d7b7'/></div>

    return <DrawTravelExpensesMonthlyPlot data={data} dataYearly={dataYearly} domain={{startDate: min, endDate: max}}/>
}
