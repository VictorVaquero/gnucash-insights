import { createFileRoute, redirect } from '@tanstack/react-router'
import { DateTime } from 'luxon'
import { useReducer, useState } from 'react'

import { accountsOptions } from '@/db/queries/global'
import { assetsDebtsYearMonthOptions, incomeExpensesYearMonthOptions, netCostsYearMonthOptions, profitLossYearMonthOptions, taxesYearMonthOptions } from '@/db/queries/summary'
import { KpiBlock } from '@/routes/summary/-KpiBlock.tsx'
import { SavingsBlock } from '@/routes/summary/-SavingsBlock.tsx'
import { MonthlyAccountsPlot } from '@/routes/summary/-plots/MonthlyAccountsPlot.tsx'
import { MonthlyIncomeExpensesPlot } from '@/routes/summary/-plots/MonthlyIncomeExpensesPlot.tsx'
import { MonthDetailedExpensesPiePlot } from './-plots/MonthDetailedExpensesPiePlot '
import { MonthlyDetailedExpensesBarPlot } from './-plots/MonthlyDetailedExpensesBarPlot'

const Summary = () => {
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
        w-full md:h-full p-10 pt-0
        flex-col
        md:grid md:grid-cols-[max-content_1fr] md:grid-rows-[1fr_1fr_2fr]
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
  beforeLoad: async ({ location, context: { auth } }) => {
    if (auth && !auth.isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return { title: 'Summary' }
  },
  loader: ({ context: { queryClient, db, bookId, auth } }) => {
    if (db && bookId && auth?.user) {
      queryClient.ensureQueryData(accountsOptions(db, bookId))
      queryClient.ensureQueryData(netCostsYearMonthOptions({ db, user: auth.user, bookId }))
      queryClient.ensureQueryData(assetsDebtsYearMonthOptions({ db, user: auth.user, bookId }))
      queryClient.ensureQueryData(incomeExpensesYearMonthOptions({ db, user: auth.user, bookId }))
      queryClient.ensureQueryData(taxesYearMonthOptions({ db, user: auth.user, bookId }))
      queryClient.ensureQueryData(profitLossYearMonthOptions({ db, user: auth.user, bookId }))
    }
  }
})
