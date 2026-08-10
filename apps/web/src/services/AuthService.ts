import { supabase } from "../lib/supabase";

export class AuthService {
    static signInWithGoogle() {
        return supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.origin,
            },
        });
    }

    static signInWithEmail(email: string, password: string) {
        return supabase.auth.signInWithPassword({
            email,
            password,
        });
    }

    static signUpWithEmail(email: string, password: string) {
        return supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin,
            },
        });
    }

    static signOut() {
        return supabase.auth.signOut();
    }

    static getSession() {
        return supabase.auth.getSession();
    }

    static onAuthStateChange(
        callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
    ) {
        return supabase.auth.onAuthStateChange(callback);
    }
}