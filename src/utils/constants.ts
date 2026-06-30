import {
    BellRing,
    LayoutDashboard,
    Receipt,
    Settings,
    Store,
    Tags,
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
        label: "Settings",
        path: "/settings",
        icon: Settings,
    },
];