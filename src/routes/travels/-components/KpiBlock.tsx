import { useContext } from "react";

import { KpiCard } from "@/components/KpiCard.tsx";
import { parseNum } from "@/common/utils.ts";
import { useGetTravelExpensesKPIs, useGetUniqueTravels } from "@/db/queries/travel";
import { BookContext, DBContext } from "@/contexts/GlobalContext";
import { useDomain } from "@/hooks/useDB";

const calcExpenses = (total?: number, expense?: number, months?: number) => {
    if (total == null || expense == null || months == null) return { value: 'value', title: 'title' };

    return {
        value: parseNum(expense / months),
        title: `${parseNum(expense)} (total)\n${parseNum(expense / total * 100, { digits: 0, symbol: '%' })} (% gasto)`
    };
}

export const KpiBlock = (props: { className?: string }) => {
    const { db } = useContext(DBContext);
    const { bookId } = useContext(BookContext);
    const { latestMonth, numMonths, numYears } = useDomain()

    const { data: kpis } = useGetUniqueTravels(db, bookId)
    const { data: expenses } = useGetTravelExpensesKPIs(db, bookId, latestMonth)

    const lastMonth = calcExpenses(expenses?.total_lm, expenses?.expense_lm, 1);
    const lastThreeMonths = calcExpenses(expenses?.total_3m, expenses?.expense_3m, 3);
    const lastSixMonths = calcExpenses(expenses?.total_6m, expenses?.expense_6m, 6);
    const lastYear = calcExpenses(expenses?.total_1y, expenses?.expense_1y, 12);
    const allTime = calcExpenses(expenses?.total_all, expenses?.expense_all, numMonths ?? 1);

    const travelNum = kpis?.number ?? 0;
    const travelYearNum = kpis && numYears ? kpis?.number / numYears : 0;
    const meanTravel = kpis && expenses ? expenses.expense_all / kpis.number : 0;

    return <>
        <section
            className={'grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2' + (props.className ? ' ' + props.className : '')}>
            <KpiCard name="Viajes totals" value={travelNum} />
            <KpiCard name="Viajes al año" value={parseNum(travelYearNum, { digits: 2, symbol: '' })} />
            <KpiCard name="Viaje medio" value={parseNum(meanTravel)} />
        </section>
        <section
            className={'grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2' + (props.className ? ' ' + props.className : '')}>
            <KpiCard name="Gasto medio" value={allTime.value} title={allTime.title} />
            <KpiCard name="Último mes" value={lastMonth.value} title={lastMonth.title} />
            <KpiCard name="Últimos 3" value={lastThreeMonths.value} title={lastThreeMonths.title} />
            <KpiCard name="Últimos 6" value={lastSixMonths.value} title={lastSixMonths.title} />
            <KpiCard name="Último año" value={lastYear.value} title={lastYear.title} />
        </section>
    </>
}