import { useEffect } from "react";

import {
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    Clock3,
    FolderTree,
    Receipt,
    RefreshCw,
    Scale,
    Store,
    Tags,
} from "lucide-react";

import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { List } from "../../components/common/List";
import { ListItem } from "../../components/common/ListItem";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { StatCard } from "../../components/common/StatCard";
import { Surface } from "../../components/common/Surface";

import { useDashboardStore } from "../../stores/dashboardStore";
import { formatCurrency } from "../../utils/format";
import { cn } from "../../utils/helpers";

function formatDate(value: string) {
    return new Date(value).toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    );
}

function formatPercent(value: number) {
    return `${value.toFixed(1)}%`;
}

export function Dashboard() {
    const refresh = useDashboardStore(
        (state) => state.refresh
    );

    const data = useDashboardStore(
        (state) => state.data
    );

    const loading = useDashboardStore(
        (state) => state.loading
    );

    const error = useDashboardStore(
        (state) => state.error
    );

    const clearError = useDashboardStore(
        (state) => state.clearError
    );

    useEffect(() => {
        refresh();
    }, [refresh]);

    const refreshIconClassName = cn(
        "mr-2",
        loading && "animate-spin"
    );

    const showInitialLoading =
        loading && !data;

    return (
        <PageContainer className="space-y-6">
            <PageHeader
                title="Dashboard"
                description="Monitor your financial activity."
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
                <Surface className="flex items-start gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                        <p className="font-medium">
                            {error}
                        </p>
                    </div>

                    <Button
                        variant="ghost"
                        className="px-2 py-1 text-red-700 hover:bg-red-100"
                        onClick={clearError}
                    >
                        Dismiss
                    </Button>
                </Surface>
            )}

            {showInitialLoading ? (
                <Surface className="flex min-h-96 items-center justify-center p-8">
                    <div className="flex flex-col items-center gap-4 text-sm text-slate-500">
                        <RefreshCw
                            size={28}
                            className="animate-spin text-blue-600"
                        />
                        Loading dashboard...
                    </div>
                </Surface>
            ) : data ? (
                <>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Total Income"
                            value={formatCurrency(
                                data.totals
                                    .totalIncome
                            )}
                            subtitle="Confirmed inflows"
                            icon={
                                <ArrowDownRight
                                    size={20}
                                />
                            }
                        />

                        <StatCard
                            title="Total Expenses"
                            value={formatCurrency(
                                data.totals
                                    .totalExpenses
                            )}
                            subtitle="Confirmed spending"
                            icon={
                                <ArrowUpRight
                                    size={20}
                                />
                            }
                        />

                        <StatCard
                            title="Net Balance"
                            value={formatCurrency(
                                data.totals
                                    .netBalance
                            )}
                            subtitle="Income minus expenses"
                            icon={
                                <Scale size={20} />
                            }
                        />

                        <StatCard
                            title="Pending Events"
                            value={
                                data.totals
                                    .pendingEvents
                            }
                            subtitle="Waiting for review"
                            icon={
                                <Clock3 size={20} />
                            }
                        />

                        <StatCard
                            title="Transactions"
                            value={
                                data.totals
                                    .confirmedTransactions
                            }
                            subtitle="Confirmed history"
                            icon={
                                <Receipt
                                    size={20}
                                />
                            }
                        />

                        <StatCard
                            title="Merchants"
                            value={
                                data.totals
                                    .totalMerchants
                            }
                            subtitle="Known vendors"
                            icon={
                                <Store size={20} />
                            }
                        />

                        <StatCard
                            title="Categories"
                            value={
                                data.totals
                                    .totalCategories
                            }
                            subtitle="Spend groups"
                            icon={
                                <Tags size={20} />
                            }
                        />

                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                        <Section
                            title="Recent Activity"
                            description="Latest confirmed transactions."
                        >
                            {data.recentTransactions
                                .length === 0 ? (
                                <Surface>
                                    <EmptyState
                                        title="No transactions"
                                        description="Confirmed transactions will appear here."
                                    />
                                </Surface>
                            ) : (
                                <List>
                                    {data.recentTransactions.map(
                                        (
                                            transaction
                                        ) => {
                                            const isExpense =
                                                transaction.transaction_type ===
                                                "expense";

                                            return (
                                                <ListItem
                                                    key={
                                                        transaction.id
                                                    }
                                                    title={
                                                        transaction
                                                            .merchant
                                                            ?.name ??
                                                        "Unknown Merchant"
                                                    }
                                                    subtitle={`${transaction.category?.name ?? "Uncategorized"} • ${formatDate(transaction.occurred_at)}`}
                                                    right={
                                                        <div className="flex flex-col items-end gap-2">
                                                            <span
                                                                className={cn(
                                                                    "font-semibold",
                                                                    isExpense
                                                                        ? "text-red-600"
                                                                        : "text-green-600"
                                                                )}
                                                            >
                                                                {formatCurrency(
                                                                    transaction.amount
                                                                )}
                                                            </span>

                                                            <Badge
                                                                variant={
                                                                    isExpense
                                                                        ? "danger"
                                                                        : "success"
                                                                }
                                                            >
                                                                {
                                                                    transaction.transaction_type
                                                                }
                                                            </Badge>
                                                        </div>
                                                    }
                                                />
                                            );
                                        }
                                    )}
                                </List>
                            )}
                        </Section>

                        <Section
                            title="Merchant Summary"
                            description="Most frequently used merchants."
                        >
                            {data.merchantSummary
                                .length === 0 ? (
                                <Surface>
                                    <EmptyState
                                        title="No merchants"
                                        description="Merchants will appear after transactions are confirmed."
                                    />
                                </Surface>
                            ) : (
                                <List>
                                    {data.merchantSummary.map(
                                        (
                                            merchant
                                        ) => (
                                            <ListItem
                                                key={
                                                    merchant.merchantName
                                                }
                                                title={
                                                    merchant.merchantName
                                                }
                                                subtitle={
                                                    merchant.categoryName
                                                }
                                                icon={
                                                    <Store
                                                        size={
                                                            18
                                                        }
                                                        className="text-slate-400"
                                                    />
                                                }
                                                right={
                                                    <div className="text-right">
                                                        <p className="font-semibold text-slate-900">
                                                            {
                                                                merchant.usageCount
                                                            }
                                                        </p>

                                                        <p className="text-xs text-slate-500">
                                                            uses
                                                        </p>
                                                    </div>
                                                }
                                            />
                                        )
                                    )}
                                </List>
                            )}
                        </Section>
                    </div>

                    <Section
                        title="Category Summary"
                        description="Top spending categories by confirmed expenses."
                    >
                        {data.categorySummary
                            .length === 0 ? (
                            <Surface>
                                <EmptyState
                                    title="No spending yet"
                                    description="Expense categories will appear after spending is confirmed."
                                />
                            </Surface>
                        ) : (
                            <List>
                                {data.categorySummary.map(
                                    (category) => (
                                        <ListItem
                                            key={
                                                category.categoryName
                                            }
                                            title={
                                                category.categoryName
                                            }
                                            subtitle={`${formatPercent(category.percentage)} of total expenses`}
                                            icon={
                                                <FolderTree
                                                    size={18}
                                                    className="text-slate-400"
                                                />
                                            }
                                            right={
                                                <span className="font-semibold text-red-600">
                                                    {formatCurrency(
                                                        category.totalSpent
                                                    )}
                                                </span>
                                            }
                                        />
                                    )
                                )}
                            </List>
                        )}
                    </Section>
                </>
            ) : (
                <Surface>
                    <EmptyState
                        title="Dashboard unavailable"
                        description="Refresh to load your financial overview."
                    />
                </Surface>
            )}
        </PageContainer>
    );
}
