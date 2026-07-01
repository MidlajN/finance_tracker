import { create } from "zustand";

import { CategoryRepository } from "../repositories/CategoryRepository";

type Category = Awaited<
    ReturnType<typeof CategoryRepository.list>
>[number];

interface CategoryState {
    loading: boolean;

    error: string | null;

    categories: Category[];

    refresh: () => Promise<void>;

    clearError: () => void;
}

export const useCategoryStore =
    create<CategoryState>((set, get) => ({
        loading: false,

        error: null,

        categories: [],

        async refresh() {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                const categories =
                    await CategoryRepository.list();

                set({
                    categories,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load categories.",
                });
            }
        },

        clearError() {
            set({
                error: null,
            });
        },
    }));