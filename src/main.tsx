import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import "./i18n/config";
import "./index.css";

import { routeTree } from "./routeTree.gen";

import { AppDatabase } from "./db/dbType";
import { DomainContext } from "./contexts/GlobalContext.tsx";
import { getBooks, getDomain } from "./db/queries/global.ts";
import { useAuthSetup } from "./hooks/useAuth.ts";
import { useSetupDB } from "./hooks/useDB.tsx";
import ErrorPage from "./layout/ErrorPage.tsx";
import { DateRange } from "./types/domain.ts";

const ReactQueryDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : React.lazy(() =>
      // Lazy load in development
      import("@tanstack/react-query-devtools").then((res) => ({
        default: res.ReactQueryDevtools,
      })),
    );

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
    title: "GnuCash",
    queryClient,
  },
  defaultPreload: "viewport",
  basepath: "dashboard",
});

declare module "@tanstack/react-router" {
  interface Register {
    // This infers the type of our router and registers it across your entire project
    router: typeof router;
  }
}

interface GlobalDbState {
  db: AppDatabase | undefined;
  bookId: string | undefined;
  domain: DateRange | undefined;
}

const EMPTY_GLOBAL_DB_STATE: GlobalDbState = {
  db: undefined,
  bookId: undefined,
  domain: undefined,
};

const GlobalCOntextProvider = () => {
  const auth = useAuthSetup();
  const [{ db, bookId, domain }, setGlobalDbState] = useState<GlobalDbState>(EMPTY_GLOBAL_DB_STATE);

  const {
    data: queryDb,
    isError: isDBError,
    resetSetupDB,
  } = useSetupDB({
    user: auth.user,
    getIdToken: auth.getIdToken,
  });

  // On sign out reset global state & send the user back to the public landing page --
  // protected routes' own beforeLoad guards would otherwise bounce an invalidated router
  // to /login with a "come back here" redirect, which makes sense for an expired session
  // hitting a protected URL but not for an explicit sign-out.
  const resetGlobalState = useCallback(() => {
    resetSetupDB();
    setGlobalDbState(EMPTY_GLOBAL_DB_STATE);
    auth.signOut();
    router.navigate({ to: "/home" });
    queryClient.invalidateQueries();
  }, [resetSetupDB, auth]);

  // On sign in also invalidate router
  const signInAndInvalidate = useCallback(
    async (username: string, password: string) => {
      const r = await auth.signIn(username, password);
      router.invalidate();
      return r;
    },
    [auth],
  );

  const wrappedAuth = useMemo(
    () => ({ ...auth, signOut: resetGlobalState, signIn: signInAndInvalidate }),
    [auth, resetGlobalState, signInAndInvalidate],
  );

  useEffect(() => {
    if (isDBError) {
      console.error("Error, reset auth & global state");
      wrappedAuth.signOut();
    }
  }, [isDBError, wrappedAuth]);

  useEffect(() => {
    if (!!queryDb && !db) {
      const f = async () => {
        const books = await getBooks(queryDb);
        const defaultBookId = books[0].id;
        const fetchedDomain = await getDomain(queryDb);
        if (!fetchedDomain.min || !fetchedDomain.max) throw Error("Problematic domain defined");
        setGlobalDbState({
          db: queryDb,
          bookId: defaultBookId,
          domain: { from: fetchedDomain.min, to: fetchedDomain.max },
        });
        console.info(`DEFAULT BOOK ID ${defaultBookId}`);
        console.info(
          "DEFAULT DOMAIN: ",
          fetchedDomain.min.toISODate(),
          fetchedDomain.max.toISODate(),
        );
      };
      f().catch(() => console.error("Error setting default book/domain"));
    }
  }, [queryDb, db]);

  const isAuthenticated = auth.isAuthenticated();
  useEffect(() => {
    // Signed-in: wait until db/bookId/domain are ready before re-matching routes.
    // Signed-out: re-match immediately, or the already-matched route (e.g. /home after
    // sign-out's navigate) keeps serving its stale authenticated context, leaving the
    // sidebar/account bubble rendered until some unrelated re-render forces a re-match.
    console.info("Invalidate router when context changes.");
    if (!isAuthenticated || (!!db && !!bookId && !!domain)) router.invalidate();
  }, [isAuthenticated, db, bookId, domain]);

  console.info(`Current book ${bookId} db ${!!db} user ${auth.user}`);

  const domainContextValue = useMemo(() => ({ domain }), [domain]);
  const routerContext = useMemo(
    () => ({ auth: wrappedAuth, db, bookId }),
    [wrappedAuth, db, bookId],
  );

  return (
    <DomainContext.Provider value={domainContextValue}>
      <RouterProvider router={router} context={routerContext} />
      <Suspense>
        <ReactQueryDevtools />
      </Suspense>
    </DomainContext.Provider>
  );
};

const noopReset = () => {
  // reset the state of your app here
};
const errorBoundaryResetKeys = ["someKey"];

const App = () => {
  return (
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorPage}
        onReset={noopReset}
        resetKeys={errorBoundaryResetKeys}
      >
        <QueryClientProvider client={queryClient}>
          <GlobalCOntextProvider />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

if (import.meta.env.DEV) {
  const { default: axe } = await import("@axe-core/react");
  axe(React, ReactDOM, 1000);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
