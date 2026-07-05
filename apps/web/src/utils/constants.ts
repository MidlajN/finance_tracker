import {
    BellRing,
    BarChart3,
    FileText,
    Import,
    LayoutDashboard,
    Receipt,
    Repeat,
    SlidersHorizontal,
    Settings,
    Store,
    Tags,
    Target,
} from "lucide-react";

export const APP_NAME = "Finance Tracker";

export const DEFAULT_CURRENCY = "INR";

export const NAVIGATION = [
    {
        label: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
    },
    {
        label: "Events",
        path: "/events",
        icon: BellRing,
    },
    {
        label: "Transactions",
        path: "/transactions",
        icon: Receipt,
    },
    {
        label: "Merchants",
        path: "/merchants",
        icon: Store,
    },
    {
        label: "Categories",
        path: "/categories",
        icon: Tags,
    },
    {
        label: "Rules",
        path: "/rules",
        icon: SlidersHorizontal,
    },
    {
        label: "Budgets",
        path: "/budgets",
        icon: Target,
    },
    {
        label: "Recurring",
        path: "/recurring",
        icon: Repeat,
    },
    {
        label: "Reports",
        path: "/reports",
        icon: FileText,
    },
    {
        label: "Analytics",
        path: "/analytics",
        icon: BarChart3,
    },
    {
        label: "Import / Export",
        path: "/import-export",
        icon: Import,
    },
    {
        label: "Settings",
        path: "/settings",
        icon: Settings,
    },
];
