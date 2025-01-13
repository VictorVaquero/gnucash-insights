import { createFileRoute, redirect } from '@tanstack/react-router'

import { isAuthenticated } from '@/services/authService'
import { getExpensesYearlyQuery } from '@/db/queries/expenses'
import { useContext, useMemo } from 'react';
import { BookContext, DBContext } from '@/contexts/GlobalContext';
import { getDomainQuery } from '@/db/queries/global';
import { TreeList } from '@/components/TreeList';
import { parseNum } from '@/common/utils';

export const Expenses = () => {
  const { db } = useContext(DBContext);
  const { bookId } = useContext(BookContext);

  const { startDate, endDate } = (!db || !bookId) ? { startDate: null, endDate: null } : getDomainQuery(db).all()[0]
  const data = useMemo(() => (!db || !bookId) ? null : getExpensesYearlyQuery(db, bookId).all(), [db, bookId]);
  const months = startDate && endDate ? endDate.diff(startDate, ['months']).months : 1;
  const yearRange = startDate && endDate ? Array.from({ length: endDate!.diff(startDate!, ['years']).years + 1 }, (_value, index) => startDate!.year + index) : [];
  
  if (!db || !bookId) return <></>

  const head = data!.filter((d)=>d.name === 'Gastos')[0];
  const hierarchy = toHierarchy(head!,
    data!.filter((d) => d.id !== head!.id),
    (d) => d.id,
    (d) => d.parentId ?? '',
    (a, b) => a.total > b.total ? -1 : 1,
    (d) => 
      <div className='w-full flex flex-row gap-x-6 py-4 border-b border-shark-500'>
        <span className='flex-grow text-left'>{d.name}</span>
        <span className='flex-grow-0 basis-14 flex-shrink-0 text-left'>{parseNum(d.total, {digits: 0})}</span>
        {yearRange.map((year) => <>
          <span key={d.id+year} className='flex-grow-0 basis-14 flex-shrink-0 text-left'>{parseNum((d as unknown as {[key: string]: number})[String(year)], {digits: 2, fixed: 3} )}</span>
        </>
        )}
        <span className='flex-grow-0 basis-14 flex-shrink-0 text-left'></span>
        <span className='flex-grow-0 basis-14 flex-shrink-0 text-left'>{parseNum(d.total/months, {digits: 0})}</span>
        {yearRange.map((year) => {
          const mean = d.total/months;
          const yearMean = (d as unknown as { [key: string]: number })[String(year)] / 12;
          return <>
            <span
              key={d.id+year+'mean'}
              className={`flex-grow-0 basis-14 flex-shrink-0 text-left ${mean > yearMean ? 'text-emerald-500' : 'text-red-500'}`}
              title={ `${parseNum(Math.abs(-mean+yearMean))} ${mean>yearMean ? 'less' : 'more'}` }
            >
              {parseNum(yearMean, { digits: 2, fixed: 3 })}
            </span>
          </>
        }
        )}
      </div>
  );

  return (
    <div
      className="
        w-full h-full p-10
        grid grid-cols-[1fr] grid-rows-[1fr_1fr_2fr]
        gap-x-6 gap-y-6
        "
    >
      <div className="row-start-1 row-end-4 flex flex-col">
        <div className='px-4 w-full flex flex-row gap-x-6 pb-6 text-white text-left border-b border-shark-500'>
          <span className='flex-grow text-left'>{}</span>
          <h4 className='flex-grow-0 basis-14 flex-shrink-0 text-left text-lg'>Total</h4>
          {yearRange.map((year) => <>
            <h4 key={year} className='flex-grow-0 basis-14 flex-shrink-0 text-left text-lg'>{year}</h4>
          </>
          )}
          <span className='flex-grow-0 basis-14 flex-shrink-0 text-left'></span>
          <h4 className='flex-grow-0 basis-14 flex-shrink-0 text-left text-lg'>Mean</h4>
          {yearRange.map((year) => <>
            <h4 key={year+'mean'} className='flex-grow-0 basis-14 flex-shrink-0 text-left text-lg'>{year}</h4>
          </>
          )}
        </div>
        <TreeList data={[hierarchy]} className='text-white w-full' />
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
    return { title: 'Expenses' }
  },
})

interface Nested<T> {
  key: string,
  node: T,
  children: Nested<T>[]
}

const toHierarchy = <T, U = T>(head: T, data: T[], key: (d: T) => string, parent: (d: T) => string, sort: (a:T,b:T)=> number, func: (d:T)=>U): Nested<U> => {
  const children = data.filter((d) => key(head) == parent(d))
  if (children.length == 0) return {key: key(head), node: func(head), children: [] }
  return {
    key: key(head),
    node: func(head),
    children: children.sort(sort).map((p) => (
      toHierarchy(p, data, key, parent, sort, func)
    ))
  }
}
