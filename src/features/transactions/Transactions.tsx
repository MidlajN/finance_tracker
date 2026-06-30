import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "../../components/common/EmptyState";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { SearchInput } from "../../components/common/SearchInput";

import { useTransactionStore } from "../../stores/transactionStore";

import type { Transaction } from "../../types";

import { TransactionCard } from "./TransactionCard";
import { TransactionDetails } from "./TransactionDetails";

export function Transactions() {
    const refresh = useTransactionStore(
        (state) => state.refresh
    );

    const transactions = useTransactionStore(
        (state) => state.transactions
    );

    const loading = useTransactionStore(
        (state) => state.loading
    );

    const [search, setSearch] = useState("");

    const [selectedTransaction, setSelectedTransaction] =
        useState<Transaction | null>(null);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const filteredTransactions = useMemo(() => {
        const query = search.toLowerCase();

        return transactions.filter((transaction) =>
            (
                transaction.merchant?.name ??
                ""
            )
                .toLowerCase()
                .includes(query)
        );
    }, [transactions, search]);

    useEffect(() => {
        if (
            filteredTransactions.length === 0
        ) {
            setSelectedTransaction(null);
            return;
        }

        if (
            !selectedTransaction ||
            !filteredTransactions.some(
                (transaction) =>
                    transaction.id ===
                    selectedTransaction.id
            )
        ) {
            setSelectedTransaction(
                filteredTransactions[0]
            );
        }
    }, [
        filteredTransactions,
        selectedTransaction,
    ]);

    return (
        <PageContainer>
            <PageHeader
                title="Transactions"
                description="Browse your confirmed financial history."
            />

            <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search merchant..."
            />

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">

                {/* Transaction List */}

                <div className="space-y-4 overflow-y-auto">

                    {loading ? (
                        <EmptyState
                            title="Loading..."
                            description="Fetching transactions."
                        />
                    ) : filteredTransactions.length ===
                      0 ? (
                        <EmptyState
                            title="No transactions"
                            description="Confirmed transactions will appear here."
                        />
                    ) : (
                        filteredTransactions.map(
                            (
                                transaction
                            ) => (
                                <TransactionCard
                                    key={
                                        transaction.id
                                    }
                                    transaction={
                                        transaction
                                    }
                                    selected={
                                        selectedTransaction?.id ===
                                        transaction.id
                                    }
                                    onClick={
                                        setSelectedTransaction
                                    }
                                />
                            )
                        )
                    )}

                </div>

                {/* Details */}

                <TransactionDetails
                    transaction={
                        selectedTransaction
                    }
                />

            </div>
        </PageContainer>
    );
}