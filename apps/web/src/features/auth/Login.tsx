import { useState } from "react";
import type { FormEvent } from "react";
import {
    ArrowRight,
    CreditCard,
    ShieldCheck,
} from "lucide-react";

import { Button } from "../../components/common/Button";
import { AuthService } from "../../services/AuthService";

type AuthMode = "signin" | "signup";

export function Login() {
    const [mode, setMode] = useState<AuthMode>("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const trimmedEmail = email.trim();

        if (!trimmedEmail || !password) {
            setError("Enter your email and password.");
            return;
        }

        if (mode === "signup" && password.length < 8) {
            setError("Use at least 8 characters for the password.");
            return;
        }

        setBusy(true);
        setError(null);
        setNotice(null);

        try {
            if (mode === "signin") {
                const { error: signInError } =
                    await AuthService.signInWithEmail(
                        trimmedEmail,
                        password
                    );

                if (signInError) {
                    setError(signInError.message);
                }
                // Success: the auth listener flips the session and the
                // app leaves this screen on its own.
            } else {
                const { data, error: signUpError } =
                    await AuthService.signUpWithEmail(
                        trimmedEmail,
                        password
                    );

                if (signUpError) {
                    setError(signUpError.message);
                } else if (!data.session) {
                    // Email confirmation is enabled on the project, so
                    // there is no session yet.
                    setNotice(
                        "Account created. Check your inbox for the confirmation link, then sign in."
                    );
                    setMode("signin");
                }
            }
        } catch {
            setError("Something went wrong. Try again.");
        } finally {
            setBusy(false);
        }
    }

    function switchMode(nextMode: AuthMode) {
        setMode(nextMode);
        setError(null);
        setNotice(null);
    }

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

                <form className="mt-8" onSubmit={handleSubmit}>
                    <label
                        className="block text-sm font-medium text-slate-300"
                        htmlFor="login-email"
                    >
                        Email
                    </label>
                    <input
                        autoComplete="email"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-blue-500/60 focus:bg-white/10"
                        id="login-email"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        type="email"
                        value={email}
                    />

                    <label
                        className="mt-4 block text-sm font-medium text-slate-300"
                        htmlFor="login-password"
                    >
                        Password
                    </label>
                    <input
                        autoComplete={
                            mode === "signin"
                                ? "current-password"
                                : "new-password"
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-blue-500/60 focus:bg-white/10"
                        id="login-password"
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                        placeholder={
                            mode === "signup"
                                ? "At least 8 characters"
                                : "Your password"
                        }
                        type="password"
                        value={password}
                    />

                    {error ? (
                        <p className="mt-4 text-sm text-red-400">
                            {error}
                        </p>
                    ) : null}

                    {notice ? (
                        <p className="mt-4 text-sm text-green-400">
                            {notice}
                        </p>
                    ) : null}

                    <Button
                        className="mt-6 w-full justify-between"
                        disabled={busy}
                        type="submit"
                    >
                        {busy
                            ? "Please wait..."
                            : mode === "signin"
                              ? "Sign in"
                              : "Create account"}

                        <ArrowRight size={18} />
                    </Button>
                </form>

                <p className="mt-4 text-sm text-slate-400">
                    {mode === "signin" ? (
                        <>
                            New here?{" "}
                            <button
                                className="font-semibold text-blue-400 hover:text-blue-300"
                                onClick={() => switchMode("signup")}
                                type="button"
                            >
                                Create an account
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{" "}
                            <button
                                className="font-semibold text-blue-400 hover:text-blue-300"
                                onClick={() => switchMode("signin")}
                                type="button"
                            >
                                Sign in
                            </button>
                        </>
                    )}
                </p>

                <div className="mt-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        or
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                </div>

                <Button
                    className="mt-6 w-full justify-between"
                    onClick={() =>
                        AuthService.signInWithGoogle()
                    }
                    variant="secondary"
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
