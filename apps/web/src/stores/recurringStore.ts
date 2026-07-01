import { create } from "zustand";

import {
    RecurringService,
    type RecurringOverview,
} from "../services/RecurringService";

interface RecurringState {
    loading: boolean;

    error: string | null;

    overview: RecurringOverview | null;

    refresh: () => Promise<void>;

    clearError: () => void;
}

export const useRecurringStore =
    create<RecurringState>((set, get) => ({
        loading: false,

        error: null,

        overview: null,

        async refresh() {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                const overview =
                    await RecurringService.getOverview();

                set({
                    overview,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load recurring activity.",
                });
            }
        },

        clearError() {
            set({
                error: null,
            });
        },
    }));
