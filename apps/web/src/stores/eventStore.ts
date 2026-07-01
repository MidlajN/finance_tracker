import { create } from "zustand";

import { EventRepository } from "../repositories/EventRepository";
import { EventService } from "../services/EventService";
import type { Database } from "../lib/database.types";

type Event = Awaited<
    ReturnType<typeof EventRepository.list>
>[number];

interface EventState {
    loading: boolean;

    error: string | null;

    search: string;

    events: Event[];

    refresh: () => Promise<void>;

    confirm: (id: string) => Promise<void>;

    ignore: (id: string) => Promise<void>;

    setSearch: (search: string) => void;

    clearError: () => void;

    create: (
        event: Omit<
            Database["public"]["Tables"]["financial_events"]["Insert"],
            "user_id"
        >
    ) => Promise<void>;
}

export const useEventStore = create<EventState>(
    (set, get) => ({
        loading: false,

        error: null,

        search: "",

        events: [],

        async refresh() {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                const events =
                    await EventRepository.list();

                set({
                    events,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load events.",
                });
            }
        },

        async confirm(id: string) {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                await EventService.confirm(id);

                const events =
                    await EventRepository.list();

                set({
                    events,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to confirm event.",
                });
            }
        },

        async ignore(id: string) {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                await EventService.ignore(id);

                const events =
                    await EventRepository.list();

                set({
                    events,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to ignore event.",
                });
            }
        },

        setSearch(search) {
            set({
                search,
            });
        },

        clearError() {
            set({
                error: null,
            });
        },

        async create(event) {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                await EventService.create(event);

                const events = await EventRepository.list();

                set({
                    events,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to create event.",
                });
            }
        },
    })
);
