import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import ReactDOM from 'react-dom/client'
import {QueryClient, QueryClientProvider} from "react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { routeTree } from './routeTree.gen'

import './index.css'
import ErrorPage from './layout/ErrorPage.tsx';

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {title: 'GnuCash'}
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
