import {MutableRefObject, useContext, useMemo, useRef} from "react";
import {DateTime} from "luxon";
import { BarLoader } from "react-spinners";
import * as d3 from 'd3';

import {fullTWConfig, parseNum, useWindowSize} from "@/common/utils.ts";
import {chooseTooltipPointLine} from "@/routes/summary/-plots/tooltipFuncs.tsx";
import {XAxis} from "@/routes/summary/-plots/XAxis.tsx";
import {YAxis} from "@/routes/summary/-plots/YAxis.tsx";
import {Tooltip} from "@/routes/summary/-plots/Tooltip.tsx";
import { getAssetsDebtsYearMonthQuery, getDomainQuery } from "@/db/views";
import { BookContext, DBContext } from "@/contexts/GlobalContext";

export interface AssetsDebts {
    name: string,
    yearmonth: string,
    value: number
}

const margin = {'t': 20, 'r': 20, 'b': 20, 'l': 50}
const getColor = (d: string) => ({
    'Cuenta de ahorros': fullTWConfig.theme.colors.emerald[500],
    'Cuenta corriente': fullTWConfig.theme.colors.amber[500],
    'Fondo Indexado S&P': fullTWConfig.theme.colors.red[500],
    'Metálico': fullTWConfig.theme.colors.orange[500],
    'Cuenta compartida': fullTWConfig.theme.colors.purple[500]
}[d]?? fullTWConfig.theme.colors.gray[500])
const xf = (d: AssetsDebts) => DateTime.fromISO(d.yearmonth);
const yf = (d: AssetsDebts) => d.value;
const orderxf = (a: AssetsDebts, b: AssetsDebts) => xf(a) > xf(b) ? 1 : -1;
const orderyf = (a: AssetsDebts, b: AssetsDebts) => yf(a) > yf(b) ? 1 : -1;

const DrawMonthlyAccountsPlot = (props: { data: AssetsDebts[], domain: {startDate: DateTime, endDate: DateTime} }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const range = {'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t]}

    const sortedData = [...props.data].sort(orderyf).sort(orderxf);
    //const xDomain = [d3.min(sortedData, xf)!.minus({'month':1}), d3.max(sortedData, xf)!];
    const xDomain = [props.domain.startDate.minus({'month': 1}), props.domain.endDate];
    const yDomain = [0, d3.max(sortedData, yf)!];

    const xScale = d3.scaleUtc(xDomain, range.x);
    const yScale = d3.scaleLinear(yDomain, range.y);
    const line = d3.line<AssetsDebts>()
        .curve(d3.curveLinear)
        .x((d) => xScale(xf(d)))
        .y((d) => yScale(yf(d)));

    const choosePoint = chooseTooltipPointLine<AssetsDebts>(sortedData, xf, yf, xScale, yScale);
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement|null>, d: AssetsDebts) => {
        if(ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#title').text(d.name)
            tooltip.select('#date').text(d.yearmonth)
            tooltip.select('#value').style('color', getColor(d.name))
            tooltip.select('#value').text(parseNum(d.value))
        }
    }
    const uniqueAccounts = useMemo(()=>[...new Set(sortedData.map((d)=>d.name))], [sortedData])

    return <div className='relative w-full h-full'>
        <svg className='w-full h-full' ref={svgRef}>
            <XAxis width={width} range={range} xScale={xScale}/>
            <YAxis height={height} range={range} scale={yScale}/>
            <g className='lines'>
                {uniqueAccounts.map((s) =>
                    <path
                        fill="none"
                        stroke={getColor(s)}
                        key={s}
                        strokeWidth='1.5' strokeLinecap="round" strokeLinejoin="round"
                        strokeOpacity="1" shapeRendering="geometricPrecision"
                        d={line(sortedData.filter((d)=>d.name===s))!}
                    />
                )}
            </g>
            <g className='circles'>
                {sortedData.map((d) =>
                    <circle className='transition-transform delay-75 duration-700 ease-in'
                            key={d.yearmonth+d.name}
                            fill={getColor(d.name)}
                            strokeWidth='1.5' shapeRendering='geometricPrecision' stroke='white' r='5'
                            cx={xScale(xf(d))} cy={yScale(yf(d))}
                    />
                )}
            </g>
        </svg>
        <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip}>
            <div className='flex flex-col items-center px-6 py-2'>
                <span className='text-shark-300' id='title'>Title</span>
                <span className='text-shark-300' id='date'>Date</span>
                <span id='value'>Value</span>
            </div>
        </Tooltip>
    </div>;
}


export const MonthlyAccountsPlot = () => {
    const { db} = useContext(DBContext);
    const { bookId } = useContext(BookContext);

    const data = useMemo( () => !db || !bookId ? null : getAssetsDebtsYearMonthQuery(db, bookId).all(), [db, bookId])!;
    const domain = useMemo( () => !db ? null : getDomainQuery(db).all()[0], [db])!;

    if (!db || !bookId) return <div className='w-full h-full flex flex-row items-center justify-center'><BarLoader color='#36d7b7'/></div>
    if(!domain.startDate || !domain.endDate) return <></> 

    return <DrawMonthlyAccountsPlot data={data} domain={{startDate: domain.startDate, endDate: domain.endDate}}/>
}

