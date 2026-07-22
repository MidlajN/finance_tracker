import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "./components/layout/AppLayout";

import { Analytics } from "./features/analytics/Analytics";
import { Dashboard } from "./features/dashboard/Dashboard";
import { Events } from "./features/events/Events";
import { Merchants } from "./features/merchants/Merchants";
import { Categories } from "./features/categories/Categories";
import { Budgets } from "./features/budgets/Budgets";
import { Recurring } from "./features/recurring/Recurring";
import { Reports } from "./features/reports/Reports";
import { ImportExport } from "./features/import-export/ImportExport";
import { FinancialIntelligence } from "./features/financial-intelligence/FinancialIntelligence";
import { Settings } from "./features/settings/Settings";
import { Transactions } from "./features/transactions/Transactions";
import { Rules } from "./features/rules/Rules";

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
                path: "rules",
                element: <Rules />,
            },
            {
                path: "budgets",
                element: <Budgets />,
            },
            {
                path: "recurring",
                element: <Recurring />,
            },
            {
                path: "reports",
                element: <Reports />,
            },
            {
                path: "analytics",
                element: <Analytics />,
            },
            {
                path: "financial-intelligence",
                element: <FinancialIntelligence />,
            },
            {
                path: "import-export",
                element: <ImportExport />,
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
