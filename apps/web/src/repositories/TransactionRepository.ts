import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type TransactionUpdate =
    Database["public"]["Tables"]["transactions"]["Update"];

export class TransactionRepository {
    static async list() {
        const { data, error } = await supabase
            .from("transactions")
            .select(`
                *,
                merchant:merchants(*),
                category:categories(*),
                event:financial_events(*)
            `)
            .order("occurred_at", {
                ascending: false,
            });

        if (error) {
            throw error;
        }

        return data;
    }

    static async get(id: string) {
        const { data, error } = await supabase
            .from("transactions")
            .select(`
                *,
                merchant:merchants(*),
                category:categories(*),
                event:financial_events(*)
            `)
            .eq("id", id)
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async update(
        id: string,
        updates: TransactionUpdate
    ) {
        const { data, error } = await supabase
            .from("transactions")
            .update(updates)
            .eq("id", id)
            .select(`
                *,
                merchant:merchants(*),
                category:categories(*),
                event:financial_events(*)
            `)
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async count() {
        const { count, error } = await supabase
            .from("transactions")
            .select("*", {
                count: "exact",
                head: true,
            });

        if (error) {
            throw error;
        }

        return count ?? 0;
    }

    static async delete(id: string) {
        const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }
}