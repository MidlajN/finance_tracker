import { NavLink } from "react-router-dom";

import { NAVIGATION } from "../../utils/constants";
import { cn } from "../../utils/helpers";

export function Sidebar() {
    return (
        <aside
            className="
                flex
                h-screen
                w-64
                flex-col
                border-r
                border-slate-200
                bg-white
            "
        >
            <div className="border-b border-slate-200 p-6">
                <h1 className="text-xl font-bold text-slate-900">
                    Finance Tracker
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Personal Finance
                </p>
            </div>

            <nav className="flex-1 space-y-1 p-4">
                {NAVIGATION.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                )
                            }
                        >
                            <Icon size={18} />

                            {item.label}
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
}