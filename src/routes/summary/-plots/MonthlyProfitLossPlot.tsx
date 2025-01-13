import {MutableRefObject, useContext, useEffect, useMemo, useRef} from "react";
import { BarLoader } from "react-spinners";
import {DateTime} from 'luxon';
import * as d3 from 'd3';

import {fullTWConfig, parseNum, useWindowSize} from "@/common/utils.ts";
import {chooseTooltipPointLine} from "@/routes/summary/-plots/tooltipFuncs.tsx";
import {XAxis} from "@/routes/summary/-plots/XAxis.tsx";
import {YAxis} from "@/routes/summary/-plots/YAxis.tsx";
import {Tooltip} from "@/routes/summary/-plots/Tooltip.tsx";
import { BookContext, DBContext } from "@/contexts/GlobalContext";
import { getProfitLossYearMonthQuery } from "@/db/queries/summary";
import { getDomainQuery } from "@/db/queries/global";

export interface ProfitLoss {
    name: string,
    yearmonth: string,
    value: number
}

const margin = {'t': 20, 'r': 20, 'b': 20, 'l': 50}

const DrawMonthlyProfitLossPlot = (props: { data: ProfitLoss[], domain:{startDate: DateTime, endDate: DateTime}}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const range = useMemo(() => {
        return {'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t]}
    }, [width, height])

    const getColor = (d: string) => d === 'Ganancia' ? fullTWConfig.theme.colors.emerald[500] : fullTWConfig.theme.colors.red[500]
    const xf = (d: ProfitLoss) => DateTime.fromISO(d.yearmonth);
    const yf = (d: ProfitLoss) => d.value;
    const orderxf = (a: ProfitLoss, b: ProfitLoss) => xf(a) > xf(b) ? 1 : -1;
    const orderyf = (a: ProfitLoss, b: ProfitLoss) => yf(a) > yf(b) ? 1 : -1;
    props.data.sort(orderyf).sort(orderxf);


    // const xDomain = [d3.min(props.data, xf)!.minus({'month':1}), d3.max(props.data, xf)!];
    const xDomain = [props.domain.startDate.minus({'month': 1}), props.domain.endDate];
    const yDomain = [0, d3.max(props.data, yf)!];
    // Construct scales and axes.
    const xScale = d3.scaleUtc(xDomain, range.x);
    const yScale = d3.scaleLinear(yDomain, range.y);

    const choosePoint = chooseTooltipPointLine<ProfitLoss>(props.data, xf, yf, xScale, yScale);
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement|null>, d: ProfitLoss) => {
        if(ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#date').text(d.yearmonth)
            tooltip.select('#value').style('color', getColor(d.name))
            tooltip.select('#value').text(parseNum(d.value))
        }
    }
    useEffect(() => {
        d3.select(svgRef.current)
            .select('g.rect')
            .selectAll('rect')
            .data(props.data)
            .transition()
            .delay(100)
            .duration(1000)
            .ease(d3.easeQuadOut)
            .attr('height', (d)=>range.y[0]-yScale(yf(d)))
            .attr('y', (d) =>yScale(yf(d)))
    }, [props.data, yScale, range]);
    const rectWidth = width / props.data.length *0.7
    return <div className='relative w-full h-full'>
        <svg className='w-full h-full' ref={svgRef}>
            <XAxis width={width} range={range} xScale={xScale}/>
            <YAxis height={height} range={range} scale={yScale}/>
            <g className='rect'>
                {props.data.map((d) =>
                    <rect fill={getColor(d.name)}
                          key={d.name+d.yearmonth}
                          strokeWidth='1.5'
                          shapeRendering='geometricPrecision'
                          stroke='white'
                          x={xScale(xf(d))-rectWidth/2}
                          y={yScale(range.y[1])}
                          height='0'
                          width={rectWidth}
                    />
                )}
            </g>
        </svg>
        <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip}>
            <div className='flex flex-col items-center px-6 py-2'>
                <span className='text-shark-300' id='date'>Date</span>
                <span id='value'>Value</span>
            </div>
        </Tooltip>
    </div>;
}

export const MonthlyProfitLossPlot = () => {
    const { db} = useContext(DBContext);
    const { bookId } = useContext(BookContext);

    const data = useMemo( () => !db || !bookId ? null : getProfitLossYearMonthQuery(db, bookId).all(), [db, bookId])!;
    const domain = useMemo( () => !db ? null : getDomainQuery(db).all()[0], [db])!;

    if (!db || !bookId) return <div className='w-full h-full flex flex-row items-center justify-center'><BarLoader color='#36d7b7'/></div>
    if(!domain.startDate || !domain.endDate) return <></> 

    return <DrawMonthlyProfitLossPlot data={data} domain={{startDate: domain.startDate, endDate: domain.endDate}}/>
}