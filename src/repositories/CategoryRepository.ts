import type { Database } from "../lib/database.types";
import { supabase } from "../lib/supabase";

type CategoryInsert =
    Database["public"]["Tables"]["categories"]["Insert"];



export class CategoryRepository {
    static async list() {
        const { data, error } = await supabase
            .from("categories")
            .select("*")
            .order("name");

        if (error) {
            throw error;
        }

        return data;
    }

    static async create(
        category: Omit<CategoryInsert, "user_id">
    ) {
        const { data, error } = await supabase
            .from("categories")
            .insert(category)
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
            icon?: string;
            color?: string;
        }
    ) {
        const { data, error } = await supabase
            .from("categories")
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
            .from("categories")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }
}