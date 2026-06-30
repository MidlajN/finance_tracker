import {
    Bell,
    LogOut,
    UserCircle,
} from "lucide-react";

import { Button } from "../common/Button";

import { useAuth } from "../../hooks/useAuth";

export function Topbar() {
    const user = useAuth((state) => state.user);
    const signOut = useAuth((state) => state.signOut);

    return (
        <header
            className="
                flex
                h-16
                items-center
                justify-between
                border-b
                border-slate-200
                bg-white
                px-8
            "
        >
            <div>
                <h2 className="text-lg font-semibold text-slate-900">
                    Welcome back
                </h2>

                <p className="text-sm text-slate-500">
                    {user?.email}
                </p>
            </div>

            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    className="h-10 w-10 p-0"
                >
                    <Bell size={18} />
                </Button>

                <Button
                    variant="ghost"
                    className="h-10 w-10 p-0"
                >
                    <UserCircle size={20} />
                </Button>

                <Button
                    variant="ghost"
                    onClick={signOut}
                >
                    <LogOut
                        size={18}
                        className="mr-2"
                    />

                    Logout
                </Button>
            </div>
        </header>
    );
}