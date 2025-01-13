import { createFileRoute, redirect } from '@tanstack/react-router'
import { DateTime } from 'luxon'

import { DropDownForm } from '@/components/DropDownForm.tsx'
import { KpiCard } from '@/components/KpiCard.tsx'
import { useFolders } from '@/hooks/useS3'
import { getBooks, getDomain } from '@/db/queries/global'
import { isAuthenticated } from '@/services/authService'
import { useBook, useDB, useFile } from '@/hooks/useDB'

const parseDate = (dt: string): string =>
  DateTime.fromFormat(dt.slice(0, 15), 'yyyyLLdd_hhmmss').toISODate()!

const Metadata = () => {
  const { fileName, setFileName } = useFile()
  const { bookId, setBookId } = useBook()
  const { db } = useDB()

  const { data: folders } = useFolders()

  let fileOptions: { key: string; value: string }[] = []
  let bookOptions: { key: string; value: string }[] = []
  let book = {
    id: '',
    version: '',
    countAccount: 0,
    countCommodity: 0,
    countPrice: 0,
    countSchedxaction: 0,
    countTransaction: 0,
  }
  let domain = { min: '-', max: '-' }

  if (db) {
    const books = getBooks(db)
    bookOptions = books.map((b) => ({ key: b.id, value: b.id }))
    book = books.filter((b) => b.id === bookId)[0] ?? book

    const dbList = [
      ...new Set(folders?.map((f) => f.Key!.split('/')[2])),
    ].filter((n) => n)
    fileOptions =
      dbList?.map((item) => ({
        key: item,
        value: parseDate(item),
      })) ?? []

    const domainDates = getDomain(db)
    domain = {
      min: domainDates.min ? domainDates.min.toISODate()! : domain.min,
      max: domainDates.max ? domainDates.max.toISODate()! : domain.max,
    }
  }

  return (
    <div className="p-10 flex flex-col gap-y-4">
      <DropDownForm
        id="files"
        label="Archivo"
        list={fileOptions}
        value={fileName}
        setValue={setFileName}
      />
      <DropDownForm
        id="books"
        label="Libro"
        list={bookOptions}
        value={bookId}
        setValue={setBookId}
      />
      <div className="mt-6 flex flex-row flex-wrap gap-x-6 gap-y-4">
        <KpiCard name="Cuentas" value={book.countAccount} />
        <KpiCard name="Transacciones" value={book.countTransaction} />
        <KpiCard name="Monedas" value={book.countPrice} />
        <KpiCard name="Fecha inicial" value={domain.min} />
        <KpiCard name="Fecha final" value={domain.max} />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/metadata')({
  component: Metadata,
  beforeLoad: async ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return {title: 'Metadata'}
  },
})
