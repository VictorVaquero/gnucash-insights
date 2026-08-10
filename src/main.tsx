import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import React, { Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
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

const GlobalCOntextProvider = () => {
  const auth = useAuthSetup();
  const [db, setDB] = useState<AppDatabase>();
  const [bookId, setBookId] = useState<string>();
  const [domain, setDomain] = useState<DateRange>();

  const {
    data: queryDb,
    isError: isDBError,
    resetSetupDB,
  } = useSetupDB({
    user: auth.user,
    getIdToken: auth.getIdToken,
  });

  // On sign out reset global state & invalidate router
  const signOut = auth.signOut;
  const resetGlobalState = () => {
    resetSetupDB();
    setDB(undefined);
    setBookId(undefined);
    setDomain(undefined);
    signOut();
    router.invalidate();
    queryClient.invalidateQueries();
  };
  auth.signOut = resetGlobalState;

  // On sign in also invalidate router
  const signIn = auth.signIn;
  auth.signIn = async (username: string, password: string) => {
    const r = await signIn(username, password);
    router.invalidate();
    return r;
  };

  useEffect(() => {
    if (isDBError) {
      console.error("Error, reset auth & global state");
      auth.signOut();
    }
  }, [isDBError]);

  useEffect(() => {
    if (!!queryDb && !db) {
      const f = async () => {
        // Set DB
        setDB(queryDb);
        // Set default book
        const books = await getBooks(queryDb);
        const defaultBookId = books[0].id;
        setBookId(defaultBookId);
        console.info(`DEFAULT BOOK ID ${defaultBookId}`);
        // Set domain
        const domain = await getDomain(queryDb);
        if (!domain.min || !domain.max) throw Error("Problematic domain defined");
        setDomain({ from: domain.min, to: domain.max });
        console.info("DEFAULT DOMAIN: ", domain.min.toISODate(), domain.max.toISODate());
      };
      f().catch(() => console.error("Error setting default book/domain"));
    }
  }, [queryDb, db]);

  useEffect(() => {
    console.info("Invalidate router when context changes.");
    if (!!auth && !!db && !!bookId && !!domain) router.invalidate();
  }, [auth, db, bookId, domain]);

  console.info(`Current book ${bookId} db ${!!db} user ${auth.user}`);

  return (
    <DomainContext.Provider value={{ domain: domain }}>
      <RouterProvider router={router} context={{ auth, db, bookId }} />
      <Suspense>
        <ReactQueryDevtools />
      </Suspense>
    </DomainContext.Provider>
  );
};

const App = () => {
  return (
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorPage}
        onReset={() => {
          // reset the state of your app here
        }}
        resetKeys={["someKey"]}
      >
        <QueryClientProvider client={queryClient}>
          <GlobalCOntextProvider />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
