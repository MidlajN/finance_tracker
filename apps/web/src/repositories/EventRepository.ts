import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type EventInsert =
    Omit<
        Database["public"]["Tables"]["financial_events"]["Insert"],
        "user_id"
    >;

type EventUpdate =
    Database["public"]["Tables"]["financial_events"]["Update"];

type EventSourceInsert =
    Database["public"]["Tables"]["event_sources"]["Insert"];

export class EventRepository {
    static async list() {
        const { data, error } = await supabase
            .from("financial_events")
            .select(`
                *,
                merchant:merchants(*),
                sources:event_sources(*)
            `)
            .order("occurred_at", {
                ascending: false,
            });

        if (error) {
            throw error;
        }

        return data;
    }

    static async pending() {
        const { data, error } = await supabase
            .from("financial_events")
            .select(`
                *,
                merchant:merchants(*),
                sources:event_sources(*)
            `)
            .eq("status", "pending")
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
            .from("financial_events")
            .select(`
                *,
                merchant:merchants(*),
                sources:event_sources(*)
            `)
            .eq("id", id)
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async create(event: EventInsert) {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("User not authenticated.");
        }

        const { data, error } = await supabase
            .from("financial_events")
            .insert({
                ...event,
                user_id: user.id,
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
        updates: EventUpdate
    ) {
        const { data, error } = await supabase
            .from("financial_events")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async addSource(
        source: EventSourceInsert
    ) {
        const { data, error } = await supabase
            .from("event_sources")
            .insert(source)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async confirm(id: string) {
        const { data, error } = await supabase.rpc(
            "confirm_financial_event",
            {
                p_event_id: id,
            }
        );

        if (error) {
            throw error;
        }

        return data;
    }

    static async ignore(id: string) {
        const { data, error } = await supabase
            .from("financial_events")
            .update({
                status: "ignored",
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async confirmedCount() {
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

    static async pendingCount() {
        const { count, error } = await supabase
            .from("financial_events")
            .select("*", {
                count: "exact",
                head: true,
            })
            .eq("status", "pending");

        if (error) {
            throw error;
        }

        return count ?? 0;
    }

    static async delete(id: string) {
        const { error } = await supabase
            .from("financial_events")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }
}