import React from 'react'
import ReactDOM from 'react-dom/client'
import {QueryClient, QueryClientProvider} from "react-query";
import {createBrowserRouter, RouterProvider} from "react-router-dom";

import './index.css'
import Root from './routes/Root.tsx'
import {Home} from "./routes/Home.tsx";
import {Metadata} from "./routes/Metadata.tsx";
import ErrorPage from "./routes/Error.tsx";
import {Summary} from "@/routes/summary";
import { Other } from './routes/other/index.tsx';
import { isAuthenticated } from './services/authService.tsx';
import { ProtectedRoute } from './routes/ProtectedRoute.tsx';
import LoginPage from './routes/loginPage.tsx';
import ConfirmUserPage from './routes/confirmUserPage.tsx';


const router = createBrowserRouter([
    {
        element: <LoginPage />,
        path: "/login"
    },
    {
        element: <ConfirmUserPage />,
        path: "/confirmLogin"
    },
    {
        element: <ProtectedRoute isAuthenticated={isAuthenticated()} />,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "/",
                element: <Root/>,
                children: [
                    {
                        path: "/home",
                        element: <Home />,
                    },
                    {
                        path: "/metadata",
                        element: <Metadata />,
                    },
                    {
                        path: '/graphs',
                        element: <Summary />
                    },
                    {
                        path: '/investments',
                        element: <></>//<Investments/>
                    },
                    {
                        path: '/other',
                        element: <Other />
                    }
                ]

            }
        ]
    },
]);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </React.StrictMode>,
)
