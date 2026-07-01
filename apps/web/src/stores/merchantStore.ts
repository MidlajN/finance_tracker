import { create } from "zustand";

import { MerchantRepository } from "../repositories/MerchantRepository";

type Merchant = Awaited<
    ReturnType<typeof MerchantRepository.list>
>[number];

interface MerchantState {
    loading: boolean;

    error: string | null;

    merchants: Merchant[];

    refresh: () => Promise<void>;

    updateCategory: (
        merchantId: string,
        categoryId: string | null
    ) => Promise<void>;

    clearError: () => void;
}

export const useMerchantStore =
    create<MerchantState>((set, get) => ({
        loading: false,

        error: null,

        merchants: [],

        async refresh() {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                const merchants =
                    await MerchantRepository.list();

                set({
                    merchants,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load merchants.",
                });
            }
        },

        async updateCategory(
            merchantId,
            categoryId
        ) {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                const merchant =
                    get().merchants.find(
                        (item) =>
                            item.id ===
                            merchantId
                    );

                if (!merchant) {
                    throw new Error(
                        "Merchant not found."
                    );
                }

                await MerchantRepository.update(
                    merchantId,
                    {
                        name: merchant.name,
                        normalized_name:
                            merchant.normalized_name,
                        category_id:
                            categoryId,
                    }
                );

                const merchants =
                    await MerchantRepository.list();

                set({
                    merchants,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to update merchant.",
                });
            }
        },

        clearError() {
            set({
                error: null,
            });
        },
    }));