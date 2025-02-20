import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { DateTime } from 'luxon';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import { routeTree } from './routeTree.gen';

import { _Object } from "@aws-sdk/client-s3";
import { SQLJsDatabase } from "drizzle-orm/sql-js";
import { DomainContext, FileContext } from './contexts/GlobalContext.tsx';
import { getBooks, getDomain } from './db/queries/global.ts';
import { useAuthSetup } from "./hooks/useAuth.ts";
import { useSetupDB } from './hooks/useDB.tsx';
import './index.css';
import ErrorPage from './layout/ErrorPage.tsx';
import { awsFolderOptions } from "./services/s3Service.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

const router = createRouter({
  routeTree,
  context: {
    title: 'GnuCash',
    queryClient
  },
  defaultPreload: 'viewport',
  basepath: 'dashboard'
})

declare module '@tanstack/react-router' {
  interface Register {
    // This infers the type of our router and registers it across your entire project
    router: typeof router
  }
}

const GlobalCOntextProvider = () => {
  const auth = useAuthSetup();
  //const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [folders, setFolders] = useState<_Object[]>()
  const [db, setDB] = useState<SQLJsDatabase>();
  const [fileName, setFileName] = useState<string>();
  const [bookId, setBookId] = useState<string>();
  const [domain, setDomain] = useState<{ min: DateTime<boolean>, max: DateTime<boolean> }>();

  const { data: queryFolders, isError: isFolderError } = useQuery(awsFolderOptions({ user: auth.user, credentials: auth.getCredentials() }))
  const { data: queryDb, isError: isDBError, resetSetupDB } = useSetupDB({ fileName, user: auth.user, credentials: auth.getCredentials() })

  // On sign out reset global state & invalidate router
  const signOut = auth.signOut;
  const resetGlobalState = () => {
    setFolders(undefined);
    setFileName(undefined);
    resetSetupDB()
    setDB(undefined);
    setBookId(undefined);
    setDomain(undefined);
    signOut();
    router.invalidate();
    queryClient.invalidateQueries();
  }
  auth.signOut = resetGlobalState

  // On sign in also invalidate router
  const signIn = auth.signIn;
  auth.signIn = async (username: string, password: string) => { const r = await signIn(username, password); router.invalidate(); return r; }

  useEffect(() => {
    if (!!isFolderError || !!isDBError) {
      console.error("Error, reset auth & global state")
      auth.signOut()
    }
  }, [isFolderError, isDBError])

  // Only set defaults the first time you reload the db
  useEffect(() => {
    if (!!queryFolders && !folders) {
      // Set default folder
      setFolders(queryFolders)
      // Set default file
      const dbList = [...new Set(queryFolders.map((f) => f.Key).filter((k): k is string => !!k).map((k) => k.split('/')[2]))].filter((n) => !!n);
      const parseDate = (dt: string): string => DateTime.fromFormat(dt.slice(0, 15), 'yyyyLLdd_hhmmss').toISODate() ?? '';
      const fileOptions = dbList.map((item) => ({ key: item, value: parseDate(item), }));
      const file = fileOptions[fileOptions.length - 1]
      setFileName(file.key)
      console.info(`DEFAULT DATABASE FILE: ${file.key}`)
    }
  }, [queryFolders, folders, fileName, setFileName])

  useEffect(() => {
    if (!!fileName && !!queryDb && !db) {
      // Set DB
      setDB(queryDb)
      // Set default book
      const books = getBooks(queryDb);
      const defaultBookId = books[0].id;
      setBookId(defaultBookId)
      console.info(`DEFAULT BOOK ID ${defaultBookId}`)
      // Set domain
      const domain = getDomain(queryDb)
      if (!domain.min || !domain.max) throw Error('Problematic domain defined')
      setDomain({ min: domain.min, max: domain.max })
      console.info('DEFAULT DOMAIN: ', domain.min.toISODate(), domain.max.toISODate())
    };
  }, [fileName, queryDb, db])


  useEffect(() => {
    console.debug('Invalidate router when context changes.')
    if (!!auth && !!db && !!bookId && !!domain) router.invalidate()
  }, [auth, db, bookId, domain])

  console.info(`Current files ${fileName} book ${bookId} db ${!!db} user ${auth.user}`)
  console.debug("DB", db)


  return <FileContext.Provider value={{ fileName, setFileName }} >
    <DomainContext.Provider value={{ domain: domain }} >
      <RouterProvider router={router} context={{ auth, db, bookId }} />
      <ReactQueryDevtools />
    </DomainContext.Provider>
  </FileContext.Provider>

}

const App = () => {

  return <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorPage}
      onReset={() => {
        // reset the state of your app here
      }}
      resetKeys={['someKey']}
    >
      <QueryClientProvider client={queryClient}>
        <GlobalCOntextProvider />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
