import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "./components/layout/AppLayout";

import { Dashboard } from "./features/dashboard/Dashboard";
import { Events } from "./features/events/Events";
import { Merchants } from "./features/merchants/Merchants";
import { Categories } from "./features/categories/Categories";
import { Settings } from "./features/settings/Settings";
import { Transactions } from "./features/transactions/Transactions";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <AppLayout />,
        children: [
            {
                index: true,
                element: <Dashboard />,
            },
            {
                path: "events",
                element: <Events />,
            },
            {
                path: "merchants",
                element: <Merchants />,
            },
            {
                path: "categories",
                element: <Categories />,
            },
            {
                path: "settings",
                element: <Settings />,
            },
            {
                path: "transactions",
                element: <Transactions />,
            },
        ],
    },
]);