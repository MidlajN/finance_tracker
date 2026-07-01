import { create } from "zustand";

import {
    BudgetService,
    type BudgetOverview,
} from "../services/BudgetService";

import type { Database } from "../lib/database.types";

type BudgetInput = Omit<
    Database["public"]["Tables"]["budgets"]["Insert"],
    "user_id"
>;

type BudgetUpdate =
    Database["public"]["Tables"]["budgets"]["Update"];

interface BudgetState {
    loading: boolean;

    error: string | null;

    monthStart: string;

    overview: BudgetOverview | null;

    refresh: (
        monthStart?: string
    ) => Promise<void>;

    create: (
        budget: BudgetInput
    ) => Promise<void>;

    update: (
        id: string,
        updates: BudgetUpdate
    ) => Promise<void>;

    delete: (id: string) => Promise<void>;

    clearError: () => void;
}

export const useBudgetStore =
    create<BudgetState>((set, get) => ({
        loading: false,

        error: null,

        monthStart:
            BudgetService.getCurrentMonthStart(),

        overview: null,

        async refresh(monthStart) {
            if (get().loading) {
                return;
            }

            const targetMonth =
                monthStart ?? get().monthStart;

            set({
                loading: true,
                error: null,
                monthStart: targetMonth,
            });

            try {
                const overview =
                    await BudgetService.getOverview(
                        targetMonth
                    );

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
                            : "Failed to load budgets.",
                });
            }
        },

        async create(budget) {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                await BudgetService.create(
                    budget
                );

                const overview =
                    await BudgetService.getOverview(
                        get().monthStart
                    );

                set({
                    overview,
                    loading: false,
                });
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to create budget.";

                set({
                    loading: false,
                    error: message,
                });

                throw new Error(message, {
                    cause: error,
                });
            }
        },

        async update(id, updates) {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                await BudgetService.update(
                    id,
                    updates
                );

                const overview =
                    await BudgetService.getOverview(
                        get().monthStart
                    );

                set({
                    overview,
                    loading: false,
                });
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to update budget.";

                set({
                    loading: false,
                    error: message,
                });

                throw new Error(message, {
                    cause: error,
                });
            }
        },

        async delete(id) {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                await BudgetService.delete(id);

                const overview =
                    await BudgetService.getOverview(
                        get().monthStart
                    );

                set({
                    overview,
                    loading: false,
                });
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to delete budget.";

                set({
                    loading: false,
                    error: message,
                });

                throw new Error(message, {
                    cause: error,
                });
            }
        },

        clearError() {
            set({
                error: null,
            });
        },
    }));
