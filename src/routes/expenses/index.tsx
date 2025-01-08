import { createFileRoute, redirect } from '@tanstack/react-router'

import { isAuthenticated } from '@/services/authService'

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
      </div>
      <div className="col-start-2 row-start-1">
      </div>
      <div className="col-start-2 row-start-2">
      </div>
      <div className="col-start-2 row-start-3">
      </div>
    </div>
  )
}

export const Route = createFileRoute('/expenses/')({
  component: Expenses,
  beforeLoad: async ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
})
