import {MutableRefObject, useMemo, useRef} from "react";
import {DateTime} from 'luxon';
import * as d3 from 'd3';

import {Account, NetCostsYearMonth} from "@/querys/entities.tsx";
import {fullTWConfig, parseNum, useWindowSize} from "@/common/utils.ts";
import {chooseTooltipPointNode} from "@/routes/summary/plots/tooltipFuncs.tsx";
import {Tooltip} from "@/routes/summary/plots/Tooltip.tsx";
import {StateHandler} from "@/components/StateHandler.tsx";
import {useAccounts, useNetCostsYearMonth} from "@/querys/apiQueryFunctions.tsx";


const margin = {'t': 5, 'r': 5, 'b': 5, 'l': 5}
// TODO: Refactor
const getColor = (d: string, v: number = 0):string => ({
    'Casa': fullTWConfig.theme.colors.rose[500+v],
    'Viajes': fullTWConfig.theme.colors.blue[500+v],
    'Compra': fullTWConfig.theme.colors.amber[700+v],
    'Restaurantes': fullTWConfig.theme.colors.yellow[500+v],
    'A Domicilio': fullTWConfig.theme.colors.yellow[500+v],
    'Deporte': fullTWConfig.theme.colors.lime[500+v],
    'Recreación': fullTWConfig.theme.colors.green[500+v],
    'Bar ': fullTWConfig.theme.colors.violet[500+v],
    'Cerveza': fullTWConfig.theme.colors.purple[500+v],
    'Transporte público': fullTWConfig.theme.colors.cyan[500+v],
    'Gas': fullTWConfig.theme.colors.cyan[500+v],
    'Olvidado': fullTWConfig.theme.colors.orange[500+v],
}[d]?? fullTWConfig.theme.colors.gray[500+v])
const xf = (d: NetCostsYearMonth) => DateTime.fromISO(d.yearmonth);
const yf = (d: NetCostsYearMonth) => d.value;
const gf = (d: NetCostsYearMonth) => d.account;

const DrawMonthDetailedExpensesPiePlot = (props: { data: NetCostsYearMonth[], accounts: Account[], date: DateTime, hideAccounts: string[], setHideAccounts: CallableFunction}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const range = useMemo(() => {
        return {'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t]}
    }, [width, height])

    const findAccount = (s: string) => props.accounts.filter((a)=>a.account === s)[0];
    const name_f = (d: NetCostsYearMonth) => findAccount(d.account)?.name ?? 'Otros';
    const color_f = (d: NetCostsYearMonth, v:number=0) => getColor(name_f(d), v) 

    const hide_accounts = ['']
    const filtered_data = props.data.filter(d => !hide_accounts.includes(d.account) && xf(d).year === props.date.year && xf(d).month === props.date.month)

    const radius = Math.min(...[range.x[1]-range.x[0], range.y[0]-range.y[1]])/2
    const pie_generator = d3.pie<NetCostsYearMonth>().value(yf);
    const arcGenerator = d3.arc<d3.PieArcDatum<NetCostsYearMonth>>().innerRadius(radius-25).outerRadius(radius).padAngle(0.03)

    const dataf = (id: string)=>filtered_data.filter((d)=>(gf(d))===id)[0];
    const choosePoint = chooseTooltipPointNode<NetCostsYearMonth>(dataf, 'path');
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement|null>, d: NetCostsYearMonth) => {
        if(ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#title').text(name_f(d))
            tooltip.select('#date').text(d.yearmonth)
            tooltip.select('#value').style('color', color_f(d))
            tooltip.select('#value').text(parseNum(d.value))
        }
    }
    const onClick = (d: NetCostsYearMonth) => props.setHideAccounts(d.account);
    return <div className='relative w-full h-full'>
        <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-center items-center pointer-events-none">
           <p className="text-shark-300">{props.date.toFormat('yyyy-MM')}</p> 
           <p className="text-red-500">{parseNum(d3.sum(filtered_data.map(yf)))}</p> 
        </div>
        <svg className='w-full h-full' ref={svgRef}>
            <g className='paths' transform={'translate('+width/2+','+height/2+')'}>
                {pie_generator(filtered_data).map((d) =>
                    <path fill={props.hideAccounts.includes(d.data.account) ? fullTWConfig.theme.colors.gray[400] : color_f(d.data)}
                        key={gf(d.data)}
                        id={gf(d.data)}
                        strokeWidth='1.5'
                        shapeRendering='geometricPrecision'
                        stroke='white'
                        d={arcGenerator(d)!}
                    />
                )}
            </g>
        </svg>
        <Tooltip svgRef={svgRef} choosePoint={choosePoint} updateTooltip={updateTooltip} onClick={onClick}>
            <div className='flex flex-col items-center px-6 py-2'>
                <span className='text-shark-300' id='title'>Title</span>
                <span className='text-shark-300' id='date'>Date</span>
                <span id='value'>Value</span>
            </div>
        </Tooltip>
    </div>;
}

export const MonthDetailedExpensesPiePlot = (props: {bookId: string, date: DateTime, hideAccounts: string[], setHideAccounts: CallableFunction}) => {
    const expenses = useNetCostsYearMonth(props.bookId);
    const accounts = useAccounts(props.bookId);
    return <StateHandler dependencies={[expenses, accounts]}>
        <DrawMonthDetailedExpensesPiePlot data={expenses.data!} accounts={accounts.data!} date={props.date} hideAccounts={props.hideAccounts} setHideAccounts={props.setHideAccounts}/>
    </StateHandler>
}
