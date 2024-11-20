import {KpiCard} from "@/components/KpiCard.tsx";
import {useSavings} from "@/services/apiQueryFunctions.tsx";
import {useMemo} from "react";
import {parseNum} from "@/common/utils.ts";

export const SavingsBlock = (props: {className: string, bookId: string}) => {
    const savingList = useSavings(props.bookId);
    const savings: {[p: string]: number}  = useMemo(() => {
        if(savingList.data) return savingList.data.reduce((obj, item) => Object.assign(obj, { [item.kpi]: item.value }), {});
        return {}
    }, [savingList.data])

    return <section
        className={'grid grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2'+(props.className?' '+props.className:'')}>
        <KpiCard name="Ahorro medio" value={parseNum(savings.mean_savings_all_time)} title={parseNum(savings.percentage_savings_all_time*100, 0, '%')}/>
        <KpiCard name="Último mes" value={parseNum(savings.mean_savings_last_month)} title={parseNum(savings.percentage_savings_last_month*100, 0, '%')}/>
        <KpiCard name="Últimos 3" value={parseNum(savings.mean_savings_last_three_months)} title={parseNum(savings.percentage_savings_last_three_months*100, 0, '%')}/>
        <KpiCard name="Últimos 6" value={parseNum(savings.mean_savings_last_six_months)} title={parseNum(savings.percentage_savings_last_six_months*100, 0, '%')}/>
        <KpiCard name="Último año" value={parseNum(savings.mean_savings_last_year)} title={parseNum(savings.percentage_savings_last_year*100, 0, '%')}/>
    </section>
}