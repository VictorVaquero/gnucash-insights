import { useContext, useMemo } from "react";
import { SQLJsDatabase } from "drizzle-orm/sql-js";
import { DateTime } from "luxon";

import {KpiCard} from "@/components/KpiCard.tsx";
import {parseNum} from "@/common/utils.ts";
import {getDomainQuery, getSplitSumQuery, getTravelKpiQuery} from "@/db/views";
import { BookContext, DBContext } from "@/contexts/GlobalContext";

const calcExpenses = (db: SQLJsDatabase, bookId: string, startDate?: DateTime, endDate?: DateTime) => {
    const expenses = getSplitSumQuery(db, bookId, ['Gastos'], startDate, endDate, 'Viaje').all()[0].value
    const all = getSplitSumQuery(db, bookId, ['Gastos'], startDate, endDate).all()[0].value
    const months = startDate && endDate ? endDate.diff(startDate, ['months']).months : 1;
    
    return {'total': expenses, 'value': parseNum(expenses / months), 'title': `${parseNum(expenses)} (total)\n${parseNum(expenses / all * 100, 0, '%')} (% gasto)` };
}

export const KpiBlock = (props: {className?: string}) => {
    const { db} = useContext(DBContext);
    const { bookId } = useContext(BookContext);
    
    const {startDate, endDate} = (!db||!bookId) ? {startDate: null, endDate: null} : getDomainQuery(db).all()[0]
    const latestMonth =  (!db||!bookId) ? null : endDate!.startOf('month')
    const numYears = (!db||!bookId) ? null : endDate!.diff(startDate!, ['years']).toObject().years!;
    
    const kpis = useMemo(() => (!db || !bookId) ? null : getTravelKpiQuery(db, bookId).all()[0], [db, bookId]);

    const lastMonth = useMemo(() => (!db || !bookId) ? null : calcExpenses(db, bookId, latestMonth!), [db, bookId, latestMonth]);
    const lastThreeMonths = useMemo(()=>(!db || !bookId) ? null : calcExpenses(db, bookId, latestMonth!.minus({ months: 3 }), latestMonth!), [db, bookId, latestMonth]);
    const lastSixMonths = useMemo(()=>(!db || !bookId) ? null : calcExpenses(db, bookId, latestMonth!.minus({ months: 6 }), latestMonth!), [db, bookId, latestMonth]);
    const lastYear = useMemo(()=>(!db || !bookId) ? null : calcExpenses(db, bookId, latestMonth!.minus({ year: 1 }), latestMonth!), [db, bookId, latestMonth]);
    const allTime = useMemo(()=>(!db || !bookId) ? null : calcExpenses(db, bookId, startDate!, endDate!), [db, bookId, startDate, endDate]);

    if(!db || !bookId) return <></> 

    return <>
        <section
            className={'grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2' + (props.className ? ' ' + props.className : '')}>
            <KpiCard name="Viajes totals" value={kpis!.number}/>
            <KpiCard name="Viajes al año" value={parseNum(kpis!.number/numYears!, 2, '')}/>
            <KpiCard name="Viaje medio" value={parseNum(allTime!.total/kpis!.number)}/>
        </section>
        <section
            className={'grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2' + (props.className ? ' ' + props.className : '')}>
            <KpiCard name="Gasto medio" value={allTime!.value} title={allTime!.title} />
            <KpiCard name="Último mes" value={lastMonth!.value} title={lastMonth!.title} />
            <KpiCard name="Últimos 3" value={lastThreeMonths!.value} title={lastThreeMonths!.title} />
            <KpiCard name="Últimos 6" value={lastSixMonths!.value} title={lastSixMonths!.title} />
            <KpiCard name="Último año" value={lastYear!.value} title={lastYear!.title} />
        </section>
    </>
}