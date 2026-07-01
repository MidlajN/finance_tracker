import { create } from "zustand";

import { RuleEngineService } from "../services/RuleEngineService";

import type { Database } from "../lib/database.types";

type Rule = Awaited<
    ReturnType<typeof RuleEngineService.list>
>[number];

type RuleInput = Omit<
    Database["public"]["Tables"]["financial_rules"]["Insert"],
    "user_id"
>;

type RuleUpdate =
    Database["public"]["Tables"]["financial_rules"]["Update"];

interface RuleState {
    loading: boolean;

    error: string | null;

    rules: Rule[];

    refresh: () => Promise<void>;

    create: (rule: RuleInput) => Promise<void>;

    update: (
        id: string,
        updates: RuleUpdate
    ) => Promise<void>;

    delete: (id: string) => Promise<void>;

    clearError: () => void;
}

export const useRuleStore =
    create<RuleState>((set, get) => ({
        loading: false,

        error: null,

        rules: [],

        async refresh() {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                const rules =
                    await RuleEngineService.list();

                set({
                    rules,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load rules.",
                });
            }
        },

        async create(rule) {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                await RuleEngineService.create(rule);

                const rules =
                    await RuleEngineService.list();

                set({
                    rules,
                    loading: false,
                });
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to create rule.";

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
                await RuleEngineService.update(
                    id,
                    updates
                );

                const rules =
                    await RuleEngineService.list();

                set({
                    rules,
                    loading: false,
                });
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to update rule.";

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
                await RuleEngineService.delete(id);

                const rules =
                    await RuleEngineService.list();

                set({
                    rules,
                    loading: false,
                });
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to delete rule.";

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
