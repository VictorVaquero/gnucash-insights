import {KpiBlock} from "@/routes/summary/KpiBlock.tsx";
import {useOutletContext} from "react-router";
import {RootContext} from "@/routes/Root.tsx";
import {SavingsBlock} from "@/routes/summary/SavingsBlock.tsx";
import {MonthlyAccountsPlot} from "@/routes/summary/plots/MonthlyAccountsPlot.tsx";
import {MonthlyIncomeExpensesPlot} from "@/routes/summary/plots/MonthlyIncomeExpensesPlot.tsx";
import {MonthlyProfitLossPlot} from "@/routes/summary/plots/MonthlyProfitLossPlot.tsx";
import { MonthlyDetailedExpensesBarPlot } from "./plots/MonthlyDetailedExpensesBarPlot";
import { MonthDetailedExpensesPiePlot } from "./plots/MonthDetailedExpensesPiePlot ";
import { DateTime } from "luxon";
import { useReducer, useState } from "react";

export const Summary = () => {
    const {bookId, domain} = useOutletContext<RootContext>();
    const [date, setDate] = useState(DateTime.fromISO('2024-01'));
    const [hideAccounts, setHideAccounts] = useReducer(
        (state: string[], action: string)=>{
        if(state.includes(action)) return state.filter((s)=>s!==action)
        return [...state, action]
        }
    ,[])
    
    return <div className='
        w-full h-full p-10
        grid grid-cols-[max-content_1fr] grid-rows-4
        gap-x-6 gap-y-6
        '>
        <div className="row-start-1 row-end-5 flex flex-col gap-y-6">
            <KpiBlock className='' bookId={bookId} />
            <SavingsBlock className='' bookId={bookId} />
            <MonthDetailedExpensesPiePlot bookId={bookId} date={date} hideAccounts={hideAccounts} setHideAccounts={setHideAccounts}/>
        </div>
        <div className='col-start-2 row-start-1'>
            <MonthlyAccountsPlot bookId={bookId} domain={domain}/>
        </div>
        <div className='col-start-2 row-start-2'>
            <MonthlyIncomeExpensesPlot bookId={bookId} domain={domain}/>
        </div>
        <div className='col-start-2 row-start-3'>
            <MonthlyProfitLossPlot bookId={bookId} domain={domain}/>
        </div>
        <div className='col-start-2 row-start-4'>
            <MonthlyDetailedExpensesBarPlot bookId={bookId} domain={domain} setDate={setDate} hideAccounts={hideAccounts}/>
        </div>
    </div>
}