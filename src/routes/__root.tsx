import { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext, useRouterState } from '@tanstack/react-router';
import { SQLJsDatabase } from 'drizzle-orm/sql-js';
import { DateTime } from 'luxon';
import { Suspense, useEffect, useState } from 'react';

import { isMobile } from '@/common/utils';
import { Header } from "@/components/Header.tsx";
import { SideBar } from "@/components/SideBar.tsx";
import { useAuthSetup } from '@/hooks/useAuth';
import ErrorPage from '@/layout/ErrorPage';
import { NotFoundPage } from '@/layout/NotFoundPage';
import React from 'react';

interface AuthContext {
  auth?: ReturnType<typeof useAuthSetup>
}

interface DBContext {
  fileName?: string,
  db?: SQLJsDatabase,
  bookId?: string,
  domain?: { min: DateTime, max: DateTime },
}

interface RootContext extends AuthContext, DBContext {
  title: string,
  queryClient: QueryClient
}


const TanStackRouterDevtools =
  import.meta.env.PROD
    ? () => null // Render nothing in production
    : React.lazy(() =>
      // Lazy load in development
      import('@tanstack/router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
        // For Embedded Mode
        // default: res.TanStackRouterDevtoolsPanel
      })),
    )


const RootComponent = () => {
  const matches = useRouterState({ select: (s) => s.matches })
  const selected = useRouterState({ select: (state) => state.location.href, })
  const [isCollapsed, setCollapse] = useState(true);

  const matchWithTitle = [...matches].reverse().find((d) => d.context.title);
  const title = matchWithTitle?.context.title || 'My App'
  // Update document title with context
  useEffect(() => { document.title = title; }, [title])

  // Hide menu when moving between options, only on mobile
  useEffect(() => {
    if (isMobile()) setCollapse(true);
  }, [selected])

  return <>
    <Header isCollapsed={isCollapsed} setCollapse={setCollapse} />
    <div className='bg-background flex h-full lg:h-[calc(100vh-6rem)] '>
      <SideBar isCollapsed={isCollapsed} />
      <main className='h-full w-full'>
        <Outlet />
        <Suspense>
          <TanStackRouterDevtools />
        </Suspense>
      </main>
    </div>
  </>
}


export const Route = createRootRouteWithContext<RootContext>()(
  {
    component: RootComponent,
    notFoundComponent: () => <NotFoundPage />,
    errorComponent: ({ error, reset }) => <ErrorPage error={error} resetErrorBoundary={reset} />
  });
