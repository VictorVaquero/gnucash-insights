import {KpiCard} from "@/components/KpiCard.tsx";
import {parseNum} from "@/common/utils.ts";
import { FullTransaction } from "@/services/entities";
import { DateTime } from "luxon";
import * as d3 from 'd3';

export const KpiBlock = (props: {data: FullTransaction[]}) => {
    const xf = (d: FullTransaction) => DateTime.fromISO(d.posted);
    const groupedData = d3.groups(props.data, d => xf(d).toFormat('yyyy-LL')).map(([date, data])=> ({
        'date': date,
        'value': d3.sum(data, (d)=>d.value) 
    }))
    const sortedData = [...groupedData].sort((a,b)=> a.date > b.date ? 1 : -1);
    console.debug("KPIBLOCK:", sortedData);
    console.debug("Slice", sortedData.slice(-3));

    const total_value_all_time = props.data.reduce((v, d) => v + d.value, 0);
    const mean_value_all_time = props.data.reduce((v, d) => v + d.value, 0)/sortedData.length;
    const mean_value_last_month = sortedData.slice(-1).reduce((v, d) => v + d.value, 0);
    const mean_value_last_three_months = sortedData.slice(-3).reduce((v, d) => v + d.value, 0)/3;
    const mean_value_last_six_months = sortedData.slice(-6).reduce((v, d) => v + d.value, 0)/6;
    const mean_value_last_year = sortedData.slice(-12).reduce((v, d) => v + d.value, 0)/12;

    return <section
        className={'grid grid-cols-2 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2'}>
        <KpiCard name="Media" value={parseNum(mean_value_all_time)} title={parseNum(mean_value_all_time)}/>
        <KpiCard name="Último mes" value={parseNum(mean_value_last_month)} title={parseNum(mean_value_last_month)}/>
        <KpiCard name="Últimos 3" value={parseNum(mean_value_last_three_months)} title={parseNum(mean_value_last_three_months)}/>
        <KpiCard name="Últimos 6" value={parseNum(mean_value_last_six_months)} title={parseNum(mean_value_last_six_months)}/>
        <KpiCard name="Último año" value={parseNum(mean_value_last_year)} title={parseNum(mean_value_last_year)}/>
        <KpiCard name="Total" value={parseNum(total_value_all_time)} title={parseNum(total_value_all_time)}/>
    </section>
}