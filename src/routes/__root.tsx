import { Outlet, createRootRouteWithContext, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';

import { SideBar } from "@/components/SideBar.tsx";
import { Header } from "@/components/Header.tsx";
import { BookContext, DBContext, FileContext } from '@/contexts/GlobalContext';
import { useFolders } from '@/hooks/useS3';
import { useFetchDB } from '@/hooks/useDB';
import { getBooks } from '@/db/queries';
import { NotFoundPage } from '@/layout/NotFoundPage';
import ErrorPage from '@/layout/ErrorPage';

interface RootContext {
  title: string
}


const RootComponent = () => {
  const matches = useRouterState({ select: (s) => s.matches })
  const navigate = useNavigate();

  const [fileName, setFileName] = useState<string>();
  const [bookId, setBookId] = useState<string>();
  const { data: folders, isError: isErrorFolders } = useFolders()
  const { data: db, isError: isErrorDB } = useFetchDB(fileName)
  
  const matchWithTitle = [...matches].reverse().find((d) => d.context.title);
  const title = matchWithTitle?.context.title || 'My App'
  useEffect(()=>{ document.title = title; }, [title])

  if ((isErrorFolders || isErrorDB) && location.pathname !== '/login') navigate({ to: '/login', search: { redirect: location.href, }, })

  useEffect(() => {
    if (folders && !fileName) {
      const dbList = [...new Set(folders.map((f) => f.Key!.split('/')[2]))].filter((n) => n);
      const parseDate = (dt: string): string => DateTime.fromFormat(dt.slice(0, 15), 'yyyyLLdd_hhmmss').toISODate()!
      const fileOptions = dbList.map((item) => ({ key: item, value: parseDate(item), }));
      const file = fileOptions[fileOptions.length - 1]
      setFileName(file.key)
      console.debug(`Set starting database file to ${file.key}`)
    }
  }, [folders, fileName, setFileName])

  useEffect(() => {
    if (db && !bookId) {
      const books = getBooks(db);
      const defaultBookId = books[0].id;
      setBookId(defaultBookId)
      console.debug('Set starting book id to ' + defaultBookId)
    }
  }, [db, bookId, setBookId])

  return <>
    <Header />
    <div className='flex h-full'>
      <aside className='h-full'>
        <SideBar />
      </aside>
      <main className='h-full w-full'>
        <FileContext.Provider value={{ fileName, setFileName }}>
          <BookContext.Provider value={{ bookId, setBookId }}>
            <DBContext.Provider value={{ db }}>
              <Outlet />
            </DBContext.Provider>
          </BookContext.Provider>
        </FileContext.Provider>
      </main>
    </div>
  </>
}


export const Route = createRootRouteWithContext<RootContext>()(
  {
    component: RootComponent,
    notFoundComponent: () => <NotFoundPage/>,
    errorComponent: ({error, reset}) => <ErrorPage error={error} resetErrorBoundary={reset}/>
  });
