import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    RefreshCw,
} from "lucide-react";

import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { SearchInput } from "../../components/common/SearchInput";
import { Surface } from "../../components/common/Surface";

import { useTransactionStore } from "../../stores/transactionStore";
import { cn } from "../../utils/helpers";

import type { Transaction } from "../../types";

import { EditTransactionDialog } from "./EditTransactionDialog";
import { TransactionDetails } from "./TransactionDetails";

export function Transactions() {
    const [selectedTransactionId, setSelectedTransactionId] =
        useState<string | null>(null);

    const [editingTransaction, setEditingTransaction] =
        useState<Transaction | null>(null);

    const refresh = useTransactionStore(
        (state) => state.refresh
    );

    const transactions = useTransactionStore(
        (state) => state.transactions
    );

    const loading = useTransactionStore(
        (state) => state.loading
    );

    const error = useTransactionStore(
        (state) => state.error
    );

    const clearError = useTransactionStore(
        (state) => state.clearError
    );

    const [search, setSearch] =
        useState("");

    useEffect(() => {
        refresh();
    }, [refresh]);

    const filtered = useMemo(() => {
        const query =
            search.trim().toLowerCase();

        if (!query) {
            return transactions;
        }

        return transactions.filter(
            (transaction) =>
                [
                    transaction.merchant?.name ??
                        "",
                    transaction.category
                        ?.name ?? "",
                    transaction.notes ?? "",
                    transaction.transaction_type,
                    transaction.amount.toString(),
                ].some((value) =>
                    value
                        .toLowerCase()
                        .includes(query)
                )
        );
    }, [transactions, search]);

    const selectedTransaction =
        filtered.find(
            (transaction) =>
                transaction.id ===
                selectedTransactionId
        ) ??
        filtered[0] ??
        null;

    const refreshIconClassName =
        cn(
            "mr-2",
            loading &&
                "animate-spin"
        );

    return (
        <PageContainer className="space-y-6">
            <PageHeader
                title="Transactions"
                description="Browse your confirmed financial transactions."
                actions={
                    <Button
                        variant="secondary"
                        disabled={loading}
                        onClick={refresh}
                    >
                        <RefreshCw
                            size={16}
                            className={
                                refreshIconClassName
                            }
                        />
                        Refresh
                    </Button>
                }
            />

            {error && (
                <Surface className="flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0"
                    />

                    <div className="flex-1">
                        <p>{error}</p>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={
                            clearError
                        }
                    >
                        Dismiss
                    </Button>
                </Surface>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
                <section className="space-y-4">

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                            <h2 className="text-xl font-semibold text-slate-900">
                                Transactions
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {filtered.length} transaction
                                {filtered.length !==
                                1
                                    ? "s"
                                    : ""}
                            </p>

                        </div>

                        <div className="w-full sm:max-w-sm">

                            <SearchInput
                                value={search}
                                onChange={
                                    setSearch
                                }
                                placeholder="Search..."
                            />

                        </div>

                    </div>

                    {filtered.length ===
                    0 ? (
                        <Surface>

                            <EmptyState
                                title="No transactions"
                                description="Confirmed transactions will appear here."
                            />

                        </Surface>
                    ) : (
                        <div className="grid gap-3">

                            {filtered.map(
                                (
                                    transaction
                                ) => (
                                    <button
                                        key={
                                            transaction.id
                                        }
                                        onClick={() =>
                                            setSelectedTransactionId(
                                                transaction.id
                                            )
                                        }
                                        className={cn(
                                            "rounded-xl border p-5 text-left transition",
                                            selectedTransaction?.id ===
                                                transaction.id
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-slate-200 bg-white hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">

                                            <div>

                                                <h3 className="font-semibold">
                                                    {transaction
                                                        .merchant
                                                        ?.name ??
                                                        "Unknown Merchant"}
                                                </h3>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {transaction
                                                        .category
                                                        ?.name ??
                                                        "Uncategorized"}
                                                </p>

                                            </div>

                                            <div className="text-right">

                                                <p className="font-bold">
                                                    ₹
                                                    {transaction.amount.toLocaleString(
                                                        "en-IN",
                                                        {
                                                            minimumFractionDigits:
                                                                2,
                                                        }
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {new Date(
                                                        transaction.occurred_at
                                                    ).toLocaleDateString()}
                                                </p>

                                            </div>

                                        </div>

                                    </button>
                                )
                            )}

                        </div>
                    )}
                </section>

                <div className="lg:sticky lg:top-0 lg:h-[calc(100vh-12rem)]">

                    <TransactionDetails
                        transaction={
                            selectedTransaction
                        }
                        onEdit={
                            setEditingTransaction
                        }
                    />

                </div>

            </div>

            <EditTransactionDialog
                open={
                    Boolean(editingTransaction)
                }
                transaction={
                    editingTransaction
                }
                onClose={() =>
                    setEditingTransaction(null)
                }
            />

        </PageContainer>
    );
}
