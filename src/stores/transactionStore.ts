import { create } from "zustand";
import { TransactionRepository } from "../repositories/TransactionRepository";


type Transaction = Awaited<
    ReturnType<typeof TransactionRepository.list>
>[number];

interface TransactionState {
    loading: boolean;

    error: string | null;

    transactions: Transaction[];

    refresh: () => Promise<void>;

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

        async delete(id: string) {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                await TransactionRepository.delete(
                    id
                );

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