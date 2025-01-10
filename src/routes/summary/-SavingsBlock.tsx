import { SQLJsDatabase } from "drizzle-orm/sql-js";
import { useContext, useMemo } from "react";
import { DateTime } from "luxon";

import {KpiCard} from "@/components/KpiCard.tsx";
import {parseNum} from "@/common/utils.ts";
import { getDomainQuery, getSplitSumQuery } from "@/db/views";
import { BookContext, DBContext } from "@/contexts/GlobalContext";

const calcSavings = (db: SQLJsDatabase, bookId: string, startDate?: DateTime, endDate?: DateTime) => {
    const savings = -getSplitSumQuery(db, bookId, ['Gastos', 'Ingresos'], startDate, endDate).all()[0].value
    const income = -getSplitSumQuery(db, bookId, ['Ingresos'], startDate, endDate).all()[0].value
    const months = startDate && endDate ? endDate.diff(startDate, ['months']).months : 1;
    
    return { 'value': parseNum(savings / months), 'title': `${parseNum(savings)}\n${parseNum(savings / income * 100, 0, '%')}` };
}

export const SavingsBlock = (props: { className: string }) => {
    const { db} = useContext(DBContext);
    const { bookId } = useContext(BookContext);

    const {startDate, endDate} = (!db||!bookId) ? {startDate: null, endDate: null} : getDomainQuery(db).all()[0]
    const latestMonth =  (!db||!bookId) ? null : endDate!.startOf('month')

    const lastMonth = useMemo(() => (!db || !bookId) ? null : calcSavings(db, bookId, latestMonth!), [db, bookId, latestMonth]);
    const lastThreeMonths = useMemo(()=>(!db || !bookId) ? null : calcSavings(db, bookId, latestMonth!.minus({ months: 3 }), latestMonth!), [db, bookId, latestMonth]);
    const lastSixMonths = useMemo(()=>(!db || !bookId) ? null : calcSavings(db, bookId, latestMonth!.minus({ months: 6 }), latestMonth!), [db, bookId, latestMonth]);
    const lastYear = useMemo(()=>(!db || !bookId) ? null : calcSavings(db, bookId, latestMonth!.minus({ year: 1 }), latestMonth!), [db, bookId, latestMonth]);
    const allTime = useMemo(()=>(!db || !bookId) ? null : calcSavings(db, bookId, startDate!, endDate!), [db, bookId, startDate, endDate]);

    if (!db || !bookId) return <></>

    return <section
        className={'grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2' + (props.className ? ' ' + props.className : '')}>
        <KpiCard name="Ahorro medio" value={allTime!.value} title={allTime!.title} />
        <KpiCard name="Último mes" value={lastMonth!.value} title={lastMonth!.title} />
        <KpiCard name="Últimos 3" value={lastThreeMonths!.value} title={lastThreeMonths!.title} />
        <KpiCard name="Últimos 6" value={lastSixMonths!.value} title={lastSixMonths!.title} />
        <KpiCard name="Último año" value={lastYear!.value} title={lastYear!.title} />
    </section>
}