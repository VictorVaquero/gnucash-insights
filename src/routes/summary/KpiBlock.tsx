import {KpiCard} from "@/components/KpiCard.tsx";
import {useKpis} from "@/querys/apiQueryFunctions.tsx";
import {useMemo} from "react";
import {parseNum} from "@/common/utils.ts";

export const KpiBlock = (props: {className: string, bookId: string}) => {
    const kpiList = useKpis(props.bookId);
    const kpis: {[p: string]: number}  = useMemo(() => {
        if(kpiList.data) return kpiList.data.reduce((obj, item) => Object.assign(obj, { [item.kpi]: item.value }), {});
        return {}
    }, [kpiList.data])

    return <section className={'grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2'+(props.className?' '+props.className:'')}>
        <KpiCard name="Neto" value={parseNum(kpis.net_gain)}/>
        <KpiCard name="Ingresos" value={parseNum(kpis.earnings)} color='text-green-600'/>
        <KpiCard name="Gasto" value={parseNum(kpis.costs)} color='text-red-600'/>
        <KpiCard name="Activo" value={parseNum(kpis.assets)}/>
        <KpiCard name="Corriente" value={parseNum(kpis.checking)}/>
        <KpiCard name="Ahorro" value={parseNum(kpis.savings)}/>
        <KpiCard name="Inversion" value={'TODO'}/>
    </section>
}