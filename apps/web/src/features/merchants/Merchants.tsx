import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { EmptyState } from "../../components/common/EmptyState";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { Surface } from "../../components/common/Surface";
import { Button } from "../../components/common/Button";

import { useMerchantStore } from "../../stores/merchantStore";
import { useCategoryStore } from "../../stores/categoryStore";

export function Merchants() {
    const merchants = useMerchantStore(
        (state) => state.merchants
    );

    const loading = useMerchantStore(
        (state) => state.loading
    );

    const error = useMerchantStore(
        (state) => state.error
    );

    const refreshMerchants =
        useMerchantStore(
            (state) => state.refresh
        );

    const updateCategory =
        useMerchantStore(
            (state) => state.updateCategory
        );

    const clearMerchantError =
        useMerchantStore(
            (state) => state.clearError
        );

    const categories =
        useCategoryStore(
            (state) => state.categories
        );

    const refreshCategories =
        useCategoryStore(
            (state) => state.refresh
        );

    useEffect(() => {
        refreshMerchants();
        refreshCategories();
    }, [
        refreshMerchants,
        refreshCategories,
    ]);

    return (
        <PageContainer>
            <PageHeader
                title="Merchants"
                description="Assign a default category to each merchant."
            />

            {error && (
                <Surface className="mb-6 flex items-start justify-between border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle
                            size={18}
                            className="mt-0.5 text-red-600"
                        />

                        <p className="text-sm text-red-700">
                            {error}
                        </p>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={
                            clearMerchantError
                        }
                    >
                        Dismiss
                    </Button>
                </Surface>
            )}

            <Section
                title="Known Merchants"
                description="Future transactions inherit the assigned category automatically."
            >
                <Surface className="overflow-hidden">
                    {merchants.length === 0 ? (
                        <EmptyState
                            title="No merchants"
                            description="Merchants will appear here after confirming financial events."
                        />
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {merchants.map(
                                (merchant) => (
                                    <div
                                        key={
                                            merchant.id
                                        }
                                        className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <h3 className="truncate font-semibold text-slate-900">
                                                {
                                                    merchant.name
                                                }
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Used{" "}
                                                {
                                                    merchant.usage_count
                                                }{" "}
                                                time
                                                {merchant.usage_count !==
                                                1
                                                    ? "s"
                                                    : ""}
                                            </p>
                                        </div>

                                        <div className="w-full md:w-72">
                                            <select
                                                disabled={
                                                    loading
                                                }
                                                value={
                                                    merchant.category_id ??
                                                    ""
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateCategory(
                                                        merchant.id,
                                                        event
                                                            .target
                                                            .value ||
                                                            null
                                                    )
                                                }
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                                            >
                                                <option value="">
                                                    Uncategorized
                                                </option>

                                                {categories.map(
                                                    (
                                                        category
                                                    ) => (
                                                        <option
                                                            key={
                                                                category.id
                                                            }
                                                            value={
                                                                category.id
                                                            }
                                                        >
                                                            {
                                                                category.name
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </Surface>
            </Section>
        </PageContainer>
    );
}