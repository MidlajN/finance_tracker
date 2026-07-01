import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type RuleInsert = Omit<
    Database["public"]["Tables"]["financial_rules"]["Insert"],
    "user_id"
>;

type RuleUpdate =
    Database["public"]["Tables"]["financial_rules"]["Update"];

export class RuleRepository {
    static async list() {
        const { data, error } = await supabase
            .from("financial_rules")
            .select(`
                *,
                merchant:merchants(*),
                category:categories(*)
            `)
            .order("priority", {
                ascending: true,
            })
            .order("created_at", {
                ascending: true,
            });

        if (error) {
            throw error;
        }

        return data;
    }

    static async enabled() {
        const { data, error } = await supabase
            .from("financial_rules")
            .select(`
                *,
                merchant:merchants(*),
                category:categories(*)
            `)
            .eq("enabled", true)
            .order("priority", {
                ascending: true,
            })
            .order("created_at", {
                ascending: true,
            });

        if (error) {
            throw error;
        }

        return data;
    }

    static async create(rule: RuleInsert) {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("User not authenticated.");
        }

        const { data, error } = await supabase
            .from("financial_rules")
            .insert({
                ...rule,
                user_id: user.id,
            })
            .select(`
                *,
                merchant:merchants(*),
                category:categories(*)
            `)
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async update(
        id: string,
        updates: RuleUpdate
    ) {
        const { data, error } = await supabase
            .from("financial_rules")
            .update(updates)
            .eq("id", id)
            .select(`
                *,
                merchant:merchants(*),
                category:categories(*)
            `)
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async delete(id: string) {
        const { error } = await supabase
            .from("financial_rules")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }
}
