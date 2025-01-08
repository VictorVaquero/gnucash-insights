import { useContext } from "react";

import {KpiCard} from "@/components/KpiCard.tsx";
import {parseNum} from "@/common/utils.ts";
import {getSplitSumQuery} from "@/db/views";
import { BookContext, DBContext } from "@/contexts/GlobalContext";

export const KpiBlock = (props: {className: string}) => {
    const { db} = useContext(DBContext);
    const { bookId } = useContext(BookContext);
    
    if(!db || !bookId) return <></> 
        
    const netGain = -getSplitSumQuery(db, bookId, ['Gastos', 'Ingresos']).all()[0].value
    const earnings = -getSplitSumQuery(db, bookId, ['Ingresos']).all()[0].value
    const costs = getSplitSumQuery(db, bookId, ['Gastos']).all()[0].value
    const checking = getSplitSumQuery(db, bookId, ['Cuenta corriente']).all()[0].value
    const savings = getSplitSumQuery(db, bookId, ['Cuenta de ahorros']).all()[0].value
    const assets = getSplitSumQuery(db, bookId, ['Activo']).all()[0].value
    const investments = getSplitSumQuery(db, bookId, ['Inversiones']).all()[0].value

    return <section className={'grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2'+(props.className?' '+props.className:'')}>
        <KpiCard name="Neto" value={parseNum(netGain)}/>
        <KpiCard name="Ingresos" value={parseNum(earnings)} color='text-green-600'/>
        <KpiCard name="Gasto" value={parseNum(costs)} color='text-red-600'/>
        <KpiCard name="Activo" value={parseNum(assets)}/>
        <KpiCard name="Corriente" value={parseNum(checking)}/>
        <KpiCard name="Ahorro" value={parseNum(savings)}/>
        <KpiCard name="Inversion" value={parseNum(investments)}/>
    </section>
}