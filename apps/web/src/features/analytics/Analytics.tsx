import { useEffect } from "react";
import {
    AlertCircle,
    BarChart3,
    RefreshCw,
    Scale,
    TrendingDown,
    TrendingUp,
    Wallet,
} from "lucide-react";

import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import {
    BarListChart,
    CashFlowChart,
    PairedBarChart,
} from "../../components/common/Charts";
import { EmptyState } from "../../components/common/EmptyState";
import { List } from "../../components/common/List";
import { ListItem } from "../../components/common/ListItem";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { StatCard } from "../../components/common/StatCard";
import { Surface } from "../../components/common/Surface";

import { useAnalyticsStore } from "../../stores/analyticsStore";
import { formatCurrency } from "../../utils/format";
import { cn } from "../../utils/helpers";

import type {
    AnalyticsComparison,
    AnalyticsGroup,
    AnalyticsTrendPoint,
} from "@finance/finance-core";

function formatPercent(value: number | null) {
    if (value === null) {
        return "New";
    }

    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatPeriod(value: string) {
    const [year, month] = value
        .split("-")
        .map(Number);

    return new Date(
        year,
        month - 1,
        1
    ).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
    });
}

function TrendList({
    emptyTitle,
    points,
    value,
}: {
    emptyTitle: string;
    points: AnalyticsTrendPoint[];
    value: (
        point: AnalyticsTrendPoint
    ) => number;
}) {
    if (points.length === 0) {
        return (
            <Surface>
                <EmptyState
                    title={emptyTitle}
                    description="Confirmed transactions will appear here."
                />
            </Surface>
        );
    }

    return (
        <List>
            {points.slice(-6).map((point) => (
                <ListItem
                    key={point.period}
                    title={formatPeriod(point.period)}
                    subtitle={`${point.transactionCount} transactions`}
                    right={
                        <span className="font-semibold text-slate-900">
                            {formatCurrency(
                                value(point)
                            )}
                        </span>
                    }
                />
            ))}
        </List>
    );
}

function GroupList({
    groups,
}: {
    groups: AnalyticsGroup[];
}) {
    if (groups.length === 0) {
        return (
            <Surface>
                <EmptyState
                    title="No grouped activity"
                    description="Confirmed transactions will appear here."
                />
            </Surface>
        );
    }

    return (
        <List>
            {groups.slice(0, 8).map((group) => (
                <ListItem
                    key={group.name}
                    title={group.name}
                    subtitle={`${group.transactionCount} transactions • ${formatPercent(group.percentageOfExpenses)} of expenses`}
                    right={
                        <div className="text-right">
                            <p className="font-semibold text-red-600">
                                {formatCurrency(
                                    group.expenses
                                )}
                            </p>
                            <p className="text-xs text-slate-500">
                                Avg{" "}
                                {formatCurrency(
                                    group.averageTransaction
                                )}
                            </p>
                        </div>
                    }
                />
            ))}
        </List>
    );
}

function ComparisonList({
    comparisons,
    showYearLabel = false,
}: {
    comparisons: AnalyticsComparison[];
    showYearLabel?: boolean;
}) {
    if (comparisons.length === 0) {
        return (
            <Surface>
                <EmptyState
                    title="No comparisons"
                    description="More confirmed history is needed for comparisons."
                />
            </Surface>
        );
    }

    return (
        <List>
            {comparisons
                .slice(-6)
                .reverse()
                .map((comparison) => (
                    <ListItem
                        key={`${comparison.period}:${comparison.previous?.period ?? "new"}`}
                        title={formatPeriod(
                            comparison.period
                        )}
                        subtitle={
                            comparison.previous
                                ? showYearLabel
                                    ? `Compared with ${formatPeriod(comparison.previous.period)}`
                                    : `Compared with ${formatPeriod(comparison.previous.period)}`
                                : "No previous period"
                        }
                        right={
                            <div className="flex flex-col items-end gap-2">
                                <span className="font-semibold text-slate-900">
                                    {formatCurrency(
                                        comparison.netChange
                                    )}
                                </span>
                                <div className="flex flex-wrap justify-end gap-2">
                                    <Badge>
                                        Income{" "}
                                        {formatPercent(
                                            comparison.incomeChangePercentage
                                        )}
                                    </Badge>
                                    <Badge>
                                        Expense{" "}
                                        {formatPercent(
                                            comparison.expensesChangePercentage
                                        )}
                                    </Badge>
                                </div>
                            </div>
                        }
                    />
                ))}
        </List>
    );
}

export function Analytics() {
    const refresh = useAnalyticsStore(
        (state) => state.refresh
    );

    const analytics = useAnalyticsStore(
        (state) => state.analytics
    );

    const loading = useAnalyticsStore(
        (state) => state.loading
    );

    const error = useAnalyticsStore(
        (state) => state.error
    );

    const clearError = useAnalyticsStore(
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
        loading && !analytics;

    return (
        <PageContainer className="space-y-6">
            <PageHeader
                title="Analytics"
                description="Analyze long-term income, spending, cash flow, categories and merchants from confirmed transactions."
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
                <Surface className="flex min-h-72 items-center justify-center p-8">
                    <div className="flex flex-col items-center gap-4 text-sm text-slate-500">
                        <RefreshCw
                            size={28}
                            className="animate-spin text-blue-600"
                        />
                        Loading analytics...
                    </div>
                </Surface>
            ) : analytics ? (
                <>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Income"
                            value={formatCurrency(
                                analytics.totalIncome
                            )}
                            subtitle="All confirmed history"
                            icon={
                                <TrendingUp
                                    size={20}
                                />
                            }
                        />

                        <StatCard
                            title="Expenses"
                            value={formatCurrency(
                                analytics.totalExpenses
                            )}
                            subtitle="All confirmed history"
                            icon={
                                <TrendingDown
                                    size={20}
                                />
                            }
                        />

                        <StatCard
                            title="Cash Flow"
                            value={formatCurrency(
                                analytics.netBalance
                            )}
                            subtitle="Income minus expenses"
                            icon={
                                <Scale size={20} />
                            }
                        />

                        <StatCard
                            title="Savings Rate"
                            value={formatPercent(
                                analytics.savingsRate
                            )}
                            subtitle="Net as share of income"
                            icon={
                                <Wallet size={20} />
                            }
                        />
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <StatCard
                            title="Avg Income"
                            value={formatCurrency(
                                analytics.averageMonthlyIncome
                            )}
                            subtitle="Per active month"
                            icon={
                                <TrendingUp
                                    size={20}
                                />
                            }
                        />

                        <StatCard
                            title="Avg Expenses"
                            value={formatCurrency(
                                analytics.averageMonthlyExpenses
                            )}
                            subtitle="Per active month"
                            icon={
                                <TrendingDown
                                    size={20}
                                />
                            }
                        />

                        <StatCard
                            title="Avg Net"
                            value={formatCurrency(
                                analytics.averageMonthlyNet
                            )}
                            subtitle="Per active month"
                            icon={
                                <BarChart3
                                    size={20}
                                />
                            }
                        />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Section
                            title="Income vs Expense"
                            description="Visual comparison of monthly income and expense totals."
                        >
                            <PairedBarChart
                                data={analytics.cashFlow
                                    .slice(-8)
                                    .map((point) => ({
                                        label: formatPeriod(
                                            point.period
                                        ),
                                        firstValue:
                                            point.income,
                                        secondValue:
                                            point.expenses,
                                    }))}
                                emptyTitle="No income or expense chart"
                                firstLabel="Income"
                                secondLabel="Expenses"
                                formatValue={
                                    formatCurrency
                                }
                            />
                        </Section>

                        <Section
                            title="Cash Flow Visualization"
                            description="Monthly net cash flow after expenses."
                        >
                            <CashFlowChart
                                data={analytics.cashFlow
                                    .slice(-8)
                                    .map((point) => ({
                                        label: formatPeriod(
                                            point.period
                                        ),
                                        income:
                                            point.income,
                                        expenses:
                                            point.expenses,
                                        net: point.net,
                                    }))}
                                emptyTitle="No cash flow chart"
                                formatValue={
                                    formatCurrency
                                }
                            />
                        </Section>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Section
                            title="Income Trend"
                            description="Monthly income from confirmed transactions."
                        >
                            <TrendList
                                emptyTitle="No income trend"
                                points={
                                    analytics.incomeTrend
                                }
                                value={(point) =>
                                    point.income
                                }
                            />
                        </Section>

                        <Section
                            title="Spending Trend"
                            description="Monthly expense movement from confirmed transactions."
                        >
                            <BarListChart
                                data={analytics.spendingTrend
                                    .slice(-8)
                                    .map((point) => ({
                                        label: formatPeriod(
                                            point.period
                                        ),
                                        value: point.expenses,
                                    }))}
                                emptyTitle="No spending trend"
                                formatValue={
                                    formatCurrency
                                }
                            />
                        </Section>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Section
                            title="Category Analytics"
                            description="Expense concentration and average activity by category."
                        >
                            <div className="space-y-4">
                                <BarListChart
                                    data={analytics.categoryAnalytics
                                        .slice(0, 8)
                                        .map(
                                            (group) => ({
                                                label: group.name,
                                                value: group.expenses,
                                            })
                                        )}
                                    emptyTitle="No category chart"
                                    formatValue={
                                        formatCurrency
                                    }
                                />
                                <GroupList
                                    groups={
                                        analytics.categoryAnalytics
                                    }
                                />
                            </div>
                        </Section>

                        <Section
                            title="Merchant Analytics"
                            description="Expense concentration and average activity by merchant."
                        >
                            <div className="space-y-4">
                                <BarListChart
                                    data={analytics.merchantAnalytics
                                        .slice(0, 8)
                                        .map(
                                            (group) => ({
                                                label: group.name,
                                                value: group.expenses,
                                            })
                                        )}
                                    emptyTitle="No merchant chart"
                                    formatValue={
                                        formatCurrency
                                    }
                                />
                                <GroupList
                                    groups={
                                        analytics.merchantAnalytics
                                    }
                                />
                            </div>
                        </Section>
                    </div>

                    <Section
                        title="Cash Flow"
                        description="Monthly income, expenses and net movement."
                    >
                        <List>
                            {analytics.cashFlow
                                .slice(-8)
                                .map((point) => (
                                    <ListItem
                                        key={
                                            point.period
                                        }
                                        title={formatPeriod(
                                            point.period
                                        )}
                                        subtitle={`${formatCurrency(point.income)} income • ${formatCurrency(point.expenses)} expenses`}
                                        right={
                                            <span className="font-semibold text-slate-900">
                                                {formatCurrency(
                                                    point.net
                                                )}
                                            </span>
                                        }
                                    />
                                ))}
                        </List>
                    </Section>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Section
                            title="Monthly Comparisons"
                            description="Month-over-month income, expense and cash flow changes."
                        >
                            <ComparisonList
                                comparisons={
                                    analytics.monthlyComparisons
                                }
                            />
                        </Section>

                        <Section
                            title="Year-over-Year"
                            description="Compare each month with the same month in the previous year."
                        >
                            <ComparisonList
                                comparisons={
                                    analytics.yearOverYearComparisons
                                }
                                showYearLabel
                            />
                        </Section>
                    </div>
                </>
            ) : (
                <Surface>
                    <EmptyState
                        title="Analytics unavailable"
                        description="Refresh to analyze confirmed transaction history."
                    />
                </Surface>
            )}
        </PageContainer>
    );
}
