import { createFileRoute, redirect } from '@tanstack/react-router'

import { isAuthenticated } from '@/services/authService'
import { TravelExpensesDetailedPlot } from './-components/TravelExpensesDetailedPlot'
import { TravelExpensesMonthlyPlot } from './-components/TravelExpensesMonthlyPlot'
import { TravelExpensesPlot } from './-components/TravelExpensesPlot'
import { KpiBlock } from './-components/KpiBlock'
import { TravelExpensesPiePlot } from './-components/TravelExpensesPiePlot '

export const Expenses = () => {
  return (
    <div
      className="
        w-full h-full p-10
        grid grid-cols-[max-content_1fr] grid-rows-[1fr_1fr_2fr]
        gap-x-6 gap-y-6
        "
    >
      <div className="row-start-1 row-end-4 flex flex-col gap-y-6">
        <KpiBlock />
        <TravelExpensesPiePlot/>
      </div>
      <div className="col-start-2 row-start-1">
        <TravelExpensesMonthlyPlot />
      </div>
      <div className="col-start-2 row-start-2">
        <TravelExpensesDetailedPlot />
      </div>
      <div className="col-start-2 row-start-3">
        <TravelExpensesPlot />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/travels/')({
  component: Expenses,
  beforeLoad: async ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return {title: 'Travels'}
  },
})
