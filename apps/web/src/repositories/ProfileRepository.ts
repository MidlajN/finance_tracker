import { supabase } from "../lib/supabase";

export class ProfileRepository {
    static async getCurrent() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return null;
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async update(
        updates: {
            full_name?: string;
            avatar_url?: string;
            currency?: string;
            timezone?: string;
        }
    ) {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("User not authenticated.");
        }

        const { data, error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", user.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }
}