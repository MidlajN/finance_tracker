import { create } from "zustand";

import { TransactionRepository } from "../repositories/TransactionRepository";
import { TransactionService } from "../services/TransactionService";

import type { Merchant } from "../types";

type Transaction = Awaited<
    ReturnType<typeof TransactionRepository.list>
>[number];

interface UpdateTransactionInput {
    transactionId: string;

    eventId: string;

    merchant: Merchant | null;

    categoryId: string | null;

    amount: number;

    occurredAt: string;

    notes: string | null;
}

interface TransactionState {
    loading: boolean;

    error: string | null;

    transactions: Transaction[];

    refresh: () => Promise<void>;

    update: (
        input: UpdateTransactionInput
    ) => Promise<void>;

    delete: (id: string) => Promise<void>;

    clearError: () => void;
}

export const useTransactionStore =
    create<TransactionState>((set, get) => ({
        loading: false,

        error: null,

        transactions: [],

        async refresh() {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                const transactions =
                    await TransactionRepository.list();

                set({
                    transactions,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load transactions.",
                });
            }
        },

        async update(input) {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                await TransactionService.update(input);

                const transactions =
                    await TransactionRepository.list();

                set({
                    transactions,
                    loading: false,
                });
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to update transaction.";

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
                await TransactionRepository.delete(id);

                const transactions =
                    await TransactionRepository.list();

                set({
                    transactions,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to delete transaction.",
                });
            }
        },

        clearError() {
            set({
                error: null,
            });
        },
    }));
