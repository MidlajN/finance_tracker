import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type BudgetInsert = Omit<
    Database["public"]["Tables"]["budgets"]["Insert"],
    "user_id"
>;

type BudgetUpdate =
    Database["public"]["Tables"]["budgets"]["Update"];

export class BudgetRepository {
    static async list() {
        const { data, error } = await supabase
            .from("budgets")
            .select(`
                *,
                category:categories(*)
            `)
            .order("starts_on", {
                ascending: false,
            })
            .order("created_at", {
                ascending: false,
            });

        if (error) {
            throw error;
        }

        return data;
    }

    static async create(budget: BudgetInsert) {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("User not authenticated.");
        }

        const { data, error } = await supabase
            .from("budgets")
            .insert({
                ...budget,
                user_id: user.id,
            })
            .select(`
                *,
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
        updates: BudgetUpdate
    ) {
        const { data, error } = await supabase
            .from("budgets")
            .update(updates)
            .eq("id", id)
            .select(`
                *,
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
            .from("budgets")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }
}
