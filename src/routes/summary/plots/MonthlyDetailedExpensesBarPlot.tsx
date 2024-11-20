import {MutableRefObject, useMemo, useRef} from "react";
import {DateTime} from 'luxon';
import * as d3 from 'd3';

import {Account, NetCostsYearMonth} from "@/services/entities";
import {fullTWConfig, parseNum, useWindowSize} from "@/common/utils.ts";
import {chooseTooltipPointNode} from "@/routes/summary/plots/tooltipFuncs.tsx";
import {XAxis} from "@/routes/summary/plots/XAxis.tsx";
import {YAxis} from "@/routes/summary/plots/YAxis.tsx";
import {Tooltip} from "@/routes/summary/plots/Tooltip.tsx";
import {StateHandler} from "@/components/StateHandler.tsx";
import {useAccounts, useNetCostsYearMonth} from "@/services/apiQueryFunctions.tsx";


const margin = {'t': 20, 'r': 20, 'b': 20, 'l': 50}
const getColor = (d: string):string => ({
    'Casa': fullTWConfig.theme.colors.rose[500],
    'Viajes': fullTWConfig.theme.colors.blue[500],
    'Compra': fullTWConfig.theme.colors.amber[700],
    'Restaurantes': fullTWConfig.theme.colors.yellow[500],
    'Deporte': fullTWConfig.theme.colors.lime[500],
    'Recreación': fullTWConfig.theme.colors.green[500],
    'Bar ': fullTWConfig.theme.colors.violet[500],
    'Cerveza': fullTWConfig.theme.colors.purple[500],
    'Transporte público': fullTWConfig.theme.colors.cyan[500],
    'Olvidado': fullTWConfig.theme.colors.orange[500],
}[d]?? fullTWConfig.theme.colors.gray[500])
const xf = (d: NetCostsYearMonth) => DateTime.fromISO(d.yearmonth);
const yf = (d: NetCostsYearMonth) => d.value;
const gf = (d: NetCostsYearMonth) => d.account;
const orderxf = (a: NetCostsYearMonth, b: NetCostsYearMonth) => xf(a) > xf(b) ? 1 : -1;
const orderyf = (a: NetCostsYearMonth, b: NetCostsYearMonth) => yf(a) > yf(b) ? 1 : -1;

const DrawMonthlyDetailedExpenses = (props: { data: NetCostsYearMonth[], accounts: Account[], hideAccounts: string[], domain: DateTime[], setDate: CallableFunction}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [width, height] = useWindowSize(svgRef)
    const range = useMemo(() => {
        return {'x': [margin.l, width - margin.r], 'y': [height - margin.b, margin.t]}
    }, [width, height])

    const findAccount = (s: string) => props.accounts.filter((a)=>a.account === s)[0];
    const name_f = (d: NetCostsYearMonth) => findAccount(d.account)?.name ?? 'Otros';
    const color_f = (d: NetCostsYearMonth) => getColor(name_f(d)) 

    const filtered_data = props.data.filter(d => !props.hideAccounts.includes(d.account))
    const stack = d3.stack<[DateTime, d3.InternMap<string, NetCostsYearMonth>], string>()
        .keys(d3.union(filtered_data.map(gf)))
        .value(([,group], key) => group.get(key)?.value ?? 0)
        .order(d3.stackOrderDescending);
    const series = stack(d3.index(filtered_data, xf, gf));
    console.debug("SERIES", series)

    //const xDomain = [d3.min(props.data, xf)!.minus({'month':1}), d3.max(props.data, xf)!];
    const xDomain = [props.domain[0].minus({'month':1}), props.domain[1]];
    const yDomain = [0, d3.max(props.data, yf)!+500]; // TODO: Fix
    // Construct scales and axes.
    const xScale = d3.scaleUtc(xDomain, range.x);
    const yScale = d3.scaleLinear(yDomain, range.y);

    const dataf = (id: string)=>props.data.filter((d)=>(gf(d)+xf(d))===id)[0];
    const choosePoint = chooseTooltipPointNode<NetCostsYearMonth>(dataf, 'rect');
    const updateTooltip = (ref: MutableRefObject<HTMLDivElement|null>, d: NetCostsYearMonth) => {
        if(ref.current !== null) {
            const tooltip = d3.select(ref.current)
            tooltip.select('#title').text(name_f(d))
            tooltip.select('#date').text(d.yearmonth)
            tooltip.select('#value').style('color', color_f(d))
            tooltip.select('#value').text(parseNum(d.value))
        }
    }
    const onClick = (d: NetCostsYearMonth) => props.setDate(DateTime.fromISO(d.yearmonth));
    const rectWidth = width / series[0].length *0.7;
    return <div className='relative w-full h-full'>
        <svg className='w-full h-full' ref={svgRef}>
            <XAxis width={width} range={range} xScale={xScale}/>
            <YAxis height={height} range={range} scale={yScale}/>
            <g className='rects'>
                {series.map((s) =>
                    <g className='serie' key={s.key}>
                        {s.map((d)=>
                            <rect fill={getColor(findAccount(s.key)?.name)}
                                  key={s.key+d.data[0]}
                                  id={s.key+d.data[0]}
                                  strokeWidth='1.5'
                                  shapeRendering='geometricPrecision'
                                  stroke='white'
                                  x={xScale(d.data[0]) - rectWidth / 2}
                                  height={yScale(d[0])- yScale(d[1])}
                                  y={yScale(d[1])}
                                  width={rectWidth}
                            />
                        )}
                    </g>
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

export const MonthlyDetailedExpensesBarPlot = (props: {bookId: string, domain: DateTime[], setDate: CallableFunction, hideAccounts: string[]}) => {
    const expenses = useNetCostsYearMonth(props.bookId);
    const accounts = useAccounts(props.bookId);
    const collapsed_data = useMemo(()=> {
        if(expenses.data){
            const collapsed_data = nestCollapse(expenses.data, 10)
            return [...collapsed_data].sort(orderyf).sort(orderxf);
        }
        return expenses.data
    }, [expenses])
    return <StateHandler dependencies={[expenses, accounts]}>
        <DrawMonthlyDetailedExpenses data={collapsed_data!} accounts={accounts.data!} hideAccounts={props.hideAccounts} domain={props.domain} setDate={props.setDate}/>
    </StateHandler>
}


function nestCollapse(data: NetCostsYearMonth[], limit: number): NetCostsYearMonth[]{
    interface Collapsed {
        'key': string,
        'group': string,
        'value': number
    }
    function groupCollapse<Type>(
        data: Type[], limit: number,
        value_f: (t: Type) => number, group_f: (t: Type) => string, key_f: (t: Type) => string,
        default_group: string = 'AccountRest'): Collapsed[] {
        const grouped_data = d3.groupSort<Type, string>(data, (elem) => -d3.sum(elem, value_f), group_f);
        const biggest_groups = grouped_data.slice(0, limit)
        const get_collapsed_group = (d: Type) => biggest_groups.includes(group_f(d)) ? group_f(d) : default_group;
        const out_data = d3.flatRollup(data, (elem) => d3.sum(elem, value_f), key_f, get_collapsed_group)
        return out_data.map((d) => ({ 'key': d[0], 'group': d[1], 'value': d[2] }))
    }
    const collapsed_data = groupCollapse<NetCostsYearMonth>(data, limit, (d) => d.value, (d) => d.account, (d) => d.yearmonth)
    return collapsed_data.map((d) => ({ 'yearmonth': d.key, 'account': d.group, 'value': d.value }))
}
