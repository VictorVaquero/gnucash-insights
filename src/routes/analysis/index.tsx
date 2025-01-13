import { useContext, useMemo, useState } from 'react'
import { DateTime } from 'luxon'

import { TransactTable } from './-components/TransactsTable'
import { TransactsPlot } from './-components/TransactsPlot'
import { KpiBlock } from './-components/KpiBlock'
import { SearchList, SearchQuery } from './-components/FilterList'
import { fullTransactionsQuery } from '@/db/queries/global'
import { BookContext, DBContext } from '@/contexts/GlobalContext'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/services/authService'

export interface FullTransaction {
  accounts: {
    accountType: string
    name: string
  }
  transactions: {
    id: string
    description: string | null
    slNotes: string | null
    datePosted: DateTime<boolean>
    dateEntered: DateTime<boolean>
  }
  splits: {
    id: string
    isReconciled: string
    value: number
    account: string
  }
}

const queryData: SearchQuery[] = [
  { name: 'Gastos', query: { accounts_accountType: 'EXPENSE' } },
  {
    name: 'Tabaco',
    query: {
      accounts_accountType: 'EXPENSE',
      transactions_description: 'Tabaco',
    },
  },
  {
    name: 'Viajes',
    query: { accounts_accountType: 'EXPENSE', transactions_slNotes: 'Viaje' },
  },
  {
    name: 'Deporte',
    query: { accounts_accountType: 'EXPENSE', accounts_name: 'Escalada' },
  },
]

const Analysis = () => {
  const { db } = useContext(DBContext)
  const { bookId } = useContext(BookContext)

  const [filteredTransactions, setFilteredTransactions] = useState<
    FullTransaction[]
  >([])
  const [isYearly, setIsYearly] = useState<boolean>(false)

  const transactions = useMemo(
    () => (!db ? null : db.select().from(fullTransactionsQuery(db)).all()),
    [db],
  )!

  if (!db || !bookId) return <></>

  return (
    <div
      className="
        w-full h-full p-10
        grid grid-cols-[1fr_max-content] grid-rows-2
        gap-x-6 gap-y-6
        "
    >
      <div className="row-start-1 row-end-1">
        {filteredTransactions.length !== 0 ? (
          <TransactsPlot data={filteredTransactions!} isYearly={isYearly} />
        ) : (
          <div className="h-1/2"></div>
        )}
      </div>
      <div className="row-start-1 col-start-2">
        <KpiBlock data={filteredTransactions} />
      </div>
      <div className="row-start-2 col-start-1">
        <TransactTable
          data={transactions}
          setFilteredData={setFilteredTransactions}
        />
      </div>
      <div className="row-start-2 col-start-2">
        <button
          className="m-2 p-4 group hover:bg-shark-600 rounded flex item-center font-light text-white group-hover:text-white"
          onClick={() => setIsYearly((prev) => !prev)}
        >
          <span className="">Anual/Mensual</span>
        </button>
        <h2 className="text-white">Lista de filtros</h2>
        <SearchList data={queryData} />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/analysis/')({
  component: Analysis,
  beforeLoad: async ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return {title: 'Analysis'}
  },
  validateSearch: (
    search: Record<string, unknown>,
  ): Record<string, unknown> => {
    return search
  },
})
