import { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouteContext,
  useRouterState,
} from "@tanstack/react-router";
import { AppDatabase } from "@/db/dbType";
import { DateTime } from "luxon";
import { Suspense, useEffect, useState } from "react";

import { AccountMenu } from "@/components/AccountMenu.tsx";
import { Footer } from "@/components/Footer.tsx";
import { SideBar } from "@/components/SideBar.tsx";
import { BarLoader } from "@/components/ui/BarLoader";
import { useAuthSetup } from "@/hooks/useAuth";
import ErrorPage from "@/layout/ErrorPage";
import { NotFoundPage } from "@/layout/NotFoundPage";
import React from "react";

interface AuthContext {
  auth?: ReturnType<typeof useAuthSetup>;
}

interface DBContext {
  fileName?: string;
  db?: AppDatabase;
  bookId?: string;
  domain?: { min: DateTime; max: DateTime };
}

interface RootContext extends AuthContext, DBContext {
  title: string;
  queryClient: QueryClient;
}

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : React.lazy(() =>
      // Lazy load in development
      import("@tanstack/react-router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
        // For Embedded Mode
        // default: res.TanStackRouterDevtoolsPanel
      })),
    );

const RootComponent = () => {
  const matches = useRouterState({ select: (s) => s.matches });
  const selected = useRouterState({ select: (state) => state.location.href });
  const [isCollapsed, setCollapse] = useState(true);
  const { auth, db, bookId } = useRouteContext({ from: "__root__" });

  const matchWithTitle = [...matches].reverse().find((d) => d.context.title);
  const title = matchWithTitle?.context.title || "My App";
  // Update document title with context
  useEffect(() => {
    document.title = title;
  }, [title]);

  // The drawer now overlays content on every viewport, so close it whenever navigation happens
  useEffect(() => {
    setCollapse(true);
  }, [selected]);

  // Once signed in, account config/db/book loading is async (Turso token fetch, default book
  // lookup). Routes read that state unconditionally, so rendering the Outlet before it's ready
  // throws ("Account config not yet loaded"). Unauthenticated routes (e.g. /login) don't need it.
  const isAppDataReady = !auth?.isAuthenticated?.() || (!!db && !!bookId);

  return (
    <>
      <SideBar isCollapsed={isCollapsed} toggleSidebar={() => setCollapse((val) => !val)} />
      <AccountMenu />
      <main className="min-h-full w-full pl-14 lg:min-h-[calc(100vh-2rem)]">
        {isAppDataReady ? (
          <Outlet />
        ) : (
          <div className="flex h-full w-full items-center justify-center pt-24">
            <BarLoader color="#36d7b7" />
          </div>
        )}
        <Suspense>
          <TanStackRouterDevtools />
        </Suspense>
      </main>
      <Footer />
    </>
  );
};

export const Route = createRootRouteWithContext<RootContext>()({
  component: RootComponent,
  notFoundComponent: () => <NotFoundPage />,
  errorComponent: ({ error, reset }) => <ErrorPage error={error} resetErrorBoundary={reset} />,
});
