import { parseNum } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { useAuth } from "@/contexts/useAuthContext";
import { uniqueTravelsOptions, useGetTravelExpensesKPIs } from "@/db/queries/travel";
import { useBook, useDB, useDomain } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";

const calcExpenses = (total?: number, expense?: number, months?: number) => {
    if (total == null || expense == null || months == null) return { value: 'value', title: 'title' };

    return {
        value: parseNum(expense / months),
        title: `${parseNum(expense)} (total)\n${parseNum(expense / total * 100, { digits: 0, symbol: '%' })} (% expenses)`
    };
}

export const KpiBlock = (props: { className?: string }) => {
    const { user } = useAuth()
    const { db } = useDB();
    const { bookId } = useBook();
    const { latestMonth, numMonths, numYears } = useDomain()

    const { data: kpis } = useQuery(uniqueTravelsOptions({ db, user, bookId }))
    const { data: expenses } = useGetTravelExpensesKPIs({ db, user, bookId, latestMonth })

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
            <KpiCard name="Trips total" value={travelNum} />
            <KpiCard name="Trips per year" value={parseNum(travelYearNum, { digits: 2, symbol: '' })} />
            <KpiCard name="Mean trip cost" value={parseNum(meanTravel)} />
        </section>
        <section
            className={'grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2' + (props.className ? ' ' + props.className : '')}>
            <KpiCard name="Mean expenses" value={allTime.value} title={allTime.title} />
            <KpiCard name="Last month" value={lastMonth.value} title={lastMonth.title} />
            <KpiCard name="Last 3" value={lastThreeMonths.value} title={lastThreeMonths.title} />
            <KpiCard name="Last 6" value={lastSixMonths.value} title={lastSixMonths.title} />
            <KpiCard name="Last year" value={lastYear.value} title={lastYear.title} />
        </section>
    </>
}