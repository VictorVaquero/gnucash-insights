import { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouteContext,
  useRouterState,
} from "@tanstack/react-router";
import { AppDatabase } from "@/db/dbType";
import { DateTime } from "luxon";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AccountMenu } from "@/components/AccountMenu.tsx";
import { Footer } from "@/components/Footer.tsx";
import { SideBar } from "@/components/SideBar.tsx";
import { BarLoader } from "@/components/ui/BarLoader";
import { useAuthSetup } from "@/hooks/useAuth";
import ErrorPage from "@/layout/ErrorPage";
import { cn } from "@/lib/utils";
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [isCollapsed, setCollapse] = useState(true);
  const [prevSelected, setPrevSelected] = useState(selected);
  const mainRef = useRef<HTMLElement>(null);
  const { auth, db, bookId } = useRouteContext({ from: "__root__" });
  const { t, i18n } = useTranslation();

  const matchWithTitle = [...matches].reverse().find((d) => d.context.title);
  const titleKey = matchWithTitle?.context.title;
  // Route beforeLoad context stores a translation key, not the resolved string, so a
  // same-page language switch (no navigation) still updates the tab title.
  useEffect(() => {
    document.title = titleKey ? t(titleKey) : "GnuCash Insights";
  }, [titleKey, t, i18n.language]);

  // The drawer now overlays content on every viewport, so close it whenever navigation happens.
  // Adjusted during render (rather than in an effect) per React's guidance on resetting state
  // when a prop changes, so it takes effect in the same render pass as the navigation.
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    setCollapse(true);
  }
  // Scoped to pathname (not the full href/`selected`) so that in-place search-param updates --
  // e.g. the analysis page's debounced filter sync -- don't yank focus out from under whatever
  // the user is typing into every time the URL's query string changes.
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  // Once signed in, account config/db/book loading is async (Turso token fetch, default book
  // lookup). Routes read that state unconditionally, so rendering the Outlet before it's ready
  // throws ("Account config not yet loaded"). Unauthenticated routes (e.g. /login) don't need it.
  const isAppDataReady = !auth?.isAuthenticated?.() || (!!db && !!bookId);
  const toggleSidebar = useCallback(() => setCollapse((val) => !val), []);
  // /home and /login are public marketing/auth pages -- the internal nav rail has nothing to
  // navigate to there and shouldn't bleed into a logged-out visitor's first impression.
  const isAuthenticated = !!auth?.isAuthenticated?.();

  return (
    <>
      {isAuthenticated && <SideBar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />}
      {isAuthenticated && <AccountMenu />}
      <main
        ref={mainRef}
        tabIndex={-1}
        className={cn(
          "min-h-full w-full outline-none lg:min-h-[calc(100vh-2rem)]",
          isAuthenticated && "pl-14",
        )}
      >
        {isAppDataReady ? (
          <Outlet />
        ) : (
          <div className="flex h-full w-full items-center justify-center pt-24">
            <BarLoader />
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
