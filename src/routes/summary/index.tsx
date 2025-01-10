import { DateTime } from 'luxon'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useReducer, useState } from 'react'

import { KpiBlock } from '@/routes/summary/-KpiBlock.tsx'
import { SavingsBlock } from '@/routes/summary/-SavingsBlock.tsx'
import { MonthlyAccountsPlot } from '@/routes/summary/-plots/MonthlyAccountsPlot.tsx'
import { MonthlyIncomeExpensesPlot } from '@/routes/summary/-plots/MonthlyIncomeExpensesPlot.tsx'
import { MonthlyDetailedExpensesBarPlot } from './-plots/MonthlyDetailedExpensesBarPlot'
import { MonthDetailedExpensesPiePlot } from './-plots/MonthDetailedExpensesPiePlot '
import { isAuthenticated } from '@/services/authService'

export const Summary = () => {
  const [date, setDate] = useState(DateTime.fromISO('2024-01'))
  const [hideAccounts, setHideAccounts] = useReducer(
    (state: string[], account: string) => {
      if (state.includes(account)) return state.filter((s) => s !== account)
      return [...state, account]
    },
    [],
  )

  return (
    <div
      className="
        w-full h-full p-10
        grid grid-cols-[max-content_1fr] grid-rows-[1fr_1fr_2fr]
        gap-x-6 gap-y-6
        "
    >
      <div className="row-start-1 row-end-4 flex flex-col gap-y-6">
        <KpiBlock className="" />
        <SavingsBlock className="" />
        <MonthDetailedExpensesPiePlot
          date={date}
          hideAccounts={hideAccounts}
          setHideAccounts={setHideAccounts}
        />
      </div>
      <div className="col-start-2 row-start-1">
        <MonthlyAccountsPlot />
      </div>
      <div className="col-start-2 row-start-2">
        <MonthlyIncomeExpensesPlot />
      </div>
      <div className="col-start-2 row-start-3">
        <MonthlyDetailedExpensesBarPlot
          setDate={setDate}
          hideAccounts={hideAccounts}
        />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/summary/')({
  component: Summary,
  beforeLoad: async ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return {title: 'Summary'}
  },
})
