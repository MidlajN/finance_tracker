import { supabase } from "../lib/supabase";

import type { Database } from "../lib/database.types";

type MerchantInsert = Database["public"]["Tables"]["merchants"]["Insert"];

export class MerchantRepository {
    static async list() {
        const { data, error } = await supabase
            .from("merchants")
            .select(`
                *,
                category:categories(*)
            `)
            .order("name");

        if (error) {
            throw error;
        }

        return data;
    }

    static async get(id: string) {
        const { data, error } = await supabase
            .from("merchants")
            .select(`
                *,
                category:categories(*)
            `)
            .eq("id", id)
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async create(
        merchant: Omit<MerchantInsert, "user_id">
    ) {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("User not authenticated.");
        }

        const { data, error } = await supabase
            .from("merchants")
            .insert({
                ...merchant,
                user_id: user.id
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async update(
        id: string,
        updates: {
            name?: string;
            normalized_name?: string;
            category_id?: string | null;
        }
    ) {
        const { data, error } = await supabase
            .from("merchants")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async delete(id: string) {
        const { error } = await supabase
            .from("merchants")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }

    static async search(query: string) {
        const value = query.trim();

        if (!value) {
            return [];
        }

        const { data, error } =
            await supabase.rpc(
                "search_merchants",
                {
                    p_query: value,
                    p_limit: 10,
                }
            );

        if (error) {
            throw error;
        }

        return data;
    }

    static async findByNormalizedName(
        normalizedName: string
    ) {
        const { data, error } = await supabase
            .from("merchants")
            .select(`
                *,
                category:categories(*)
            `)
            .eq(
                "normalized_name",
                normalizedName
            )
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }
}