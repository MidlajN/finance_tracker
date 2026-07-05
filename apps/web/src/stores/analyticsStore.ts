import { create } from "zustand";

import {
    AnalyticsService,
    type FinancialAnalytics,
} from "../services/AnalyticsService";

interface AnalyticsState {
    loading: boolean;

    error: string | null;

    analytics: FinancialAnalytics | null;

    refresh: () => Promise<void>;

    clearError: () => void;
}

export const useAnalyticsStore =
    create<AnalyticsState>((set, get) => ({
        loading: false,

        error: null,

        analytics: null,

        async refresh() {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                const analytics =
                    await AnalyticsService.getAnalytics();

                set({
                    analytics,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load analytics.",
                });
            }
        },

        clearError() {
            set({
                error: null,
            });
        },
    }));
