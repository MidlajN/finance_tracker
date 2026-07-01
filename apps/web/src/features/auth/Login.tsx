import {
    ArrowRight,
    CreditCard,
    ShieldCheck,
} from "lucide-react";

import { Button } from "../../components/common/Button";
import { AuthService } from "../../services/AuthService";

export function Login() {
    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#2563eb22,transparent_40%)]" />

            <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
                    <CreditCard className="text-white" size={30} />
                </div>

                <h1 className="text-4xl font-bold text-white">
                    Finance Tracker
                </h1>

                <p className="mt-4 leading-7 text-slate-400">
                    Automatically organize your financial
                    events, review pending transactions,
                    and keep your spending under control.
                </p>

                <Button
                    className="mt-10 w-full justify-between"
                    onClick={() =>
                        AuthService.signInWithGoogle()
                    }
                >
                    Continue with Google

                    <ArrowRight size={18} />
                </Button>

                <div className="mt-8 flex items-center gap-3 text-sm text-slate-400">
                    <ShieldCheck
                        size={18}
                        className="text-green-400"
                    />

                    Secure authentication powered by
                    Supabase
                </div>
            </div>
        </main>
    );
}