import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import { AuthService } from "../services/AuthService";

interface AuthState {
  error: string | null;
  initialized: boolean;
  loading: boolean;
  session: Session | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  error: null,
  initialized: false,
  loading: false,
  session: null,

  async initialize() {
    set({ loading: true });

    try {
      const session = await AuthService.getSession();

      set({
        error: null,
        initialized: true,
        loading: false,
        session
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to initialize authentication.",
        initialized: true,
        loading: false,
        session: null
      });
    }
  },

  async signIn(email, password) {
    set({ error: null, loading: true });

    try {
      const session = await AuthService.signInWithEmail(email, password);

      set({
        error: null,
        loading: false,
        session
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in.";

      set({
        error: message,
        loading: false,
        session: null
      });

      throw new Error(message, {
        cause: error
      });
    }
  },

  async signOut() {
    set({ error: null, loading: true });

    try {
      await AuthService.signOut();

      set({
        error: null,
        loading: false,
        session: null
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Unable to sign out.",
        loading: false
      });
    }
  }
}));
