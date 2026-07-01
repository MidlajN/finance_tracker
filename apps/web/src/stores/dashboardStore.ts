import { create } from "zustand";

import {
    DashboardService,
    type DashboardData,
} from "../services/DashboardService";

interface DashboardState {
    loading: boolean;

    error: string | null;

    data: DashboardData | null;

    refresh: () => Promise<void>;

    clearError: () => void;
}

export const useDashboardStore =
    create<DashboardState>((set, get) => ({
        loading: false,

        error: null,

        data: null,

        async refresh() {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                const data =
                    await DashboardService.getOverview();

                set({
                    data,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load dashboard.",
                });
            }
        },

        clearError() {
            set({
                error: null,
            });
        },
    }));
