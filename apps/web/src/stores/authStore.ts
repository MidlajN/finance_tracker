import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

import { AuthService } from "../services/AuthService";

interface AuthState {
    loading: boolean;
    session: Session | null;
    user: User | null;

    initialize: () => Promise<void>;

    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    loading: true,

    session: null,

    user: null,

    async initialize() {
        const {
            data: { session },
        } = await AuthService.getSession();

        set({
            session,
            user: session?.user ?? null,
            loading: false,
        });

        AuthService.onAuthStateChange(async (_, session) => {
            set({
                session,
                user: session?.user ?? null,
                loading: false,
            });
        });
    },

    async signOut() {
        await AuthService.signOut();

        set({
            session: null,
            user: null,
        });
    },
}));