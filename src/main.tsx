import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import ReactDOM from 'react-dom/client'
import {QueryClient, QueryClientProvider} from "react-query";
import {createRouter, RouterProvider, NotFoundRoute} from "@tanstack/react-router";

import { Route as rootRoute } from './routes/__root.tsx'
import { routeTree } from './routeTree.gen'

import './index.css'
import ErrorPage from './layout/ErrorPage.tsx';

const notFoundRoute = new NotFoundRoute({
  getParentRoute: () => rootRoute,
  component: () => '404 Not Found',
})
const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  notFoundRoute,
  context: {queryClient: queryClient}
})

declare module '@tanstack/react-router' {
  interface Register {
    // This infers the type of our router and registers it across your entire project
    router: typeof router
  }
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
                <RouterProvider router={router} />
            </QueryClientProvider>

        </ErrorBoundary>
    </React.StrictMode>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
