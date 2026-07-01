import { useEffect } from "react";
import {
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    FileText,
    RefreshCw,
    Scale,
} from "lucide-react";

import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { Input } from "../../components/common/Input";
import { List } from "../../components/common/List";
import { ListItem } from "../../components/common/ListItem";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { StatCard } from "../../components/common/StatCard";
import { Surface } from "../../components/common/Surface";

import { useReportStore } from "../../stores/reportStore";
import { formatCurrency } from "../../utils/format";
import { cn } from "../../utils/helpers";

import type { ReportPeriod } from "../../services/ReportService";

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

export function Reports() {
    const refresh = useReportStore(
        (state) => state.refresh
    );

    const report = useReportStore(
        (state) => state.report
    );

    const period = useReportStore(
        (state) => state.period
    );

    const value = useReportStore(
        (state) => state.value
    );

    const loading = useReportStore(
        (state) => state.loading
    );

    const error = useReportStore(
        (state) => state.error
    );

    const clearError = useReportStore(
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
        loading && !report;

    return (
        <PageContainer className="space-y-6">
            <PageHeader
                title="Reports"
                description="Review income, expenses, categories and merchants by period."
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={period}
                            disabled={loading}
                            onChange={(event) =>
                                refresh(
                                    event.target
                                        .value as ReportPeriod,
                                    value
                                )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="monthly">
                                Monthly
                            </option>

                            <option value="yearly">
                                Yearly
                            </option>
                        </select>

                        <Input
                            type={
                                period ===
                                "monthly"
                                    ? "month"
                                    : "number"
                            }
                            value={value}
                            disabled={loading}
                            onChange={(event) =>
                                refresh(
                                    period,
                                    event.target
                                        .value
                                )
                            }
                            className="w-40"
                        />

                        <Button
                            variant="secondary"
                            disabled={loading}
                            onClick={() =>
                                refresh()
                            }
                        >
                            <RefreshCw
                                size={16}
                                className={
                                    refreshIconClassName
                                }
                            />
                            Refresh
                        </Button>
                    </div>
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
                        Loading report...
                    </div>
                </Surface>
            ) : report ? (
                <>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Income"
                            value={formatCurrency(
                                report.totalIncome
                            )}
                            subtitle="Selected period"
                            icon={
                                <ArrowDownRight
                                    size={20}
                                />
                            }
                        />

                        <StatCard
                            title="Expenses"
                            value={formatCurrency(
                                report.totalExpenses
                            )}
                            subtitle="Selected period"
                            icon={
                                <ArrowUpRight
                                    size={20}
                                />
                            }
                        />

                        <StatCard
                            title="Net"
                            value={formatCurrency(
                                report.netBalance
                            )}
                            subtitle="Income minus expenses"
                            icon={
                                <Scale size={20} />
                            }
                        />

                        <StatCard
                            title="Transactions"
                            value={
                                report.transactionCount
                            }
                            subtitle="Confirmed records"
                            icon={
                                <FileText
                                    size={20}
                                />
                            }
                        />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Section
                            title="Category Report"
                            description="Income and expenses grouped by category."
                        >
                            {report.categoryReport
                                .length === 0 ? (
                                <Surface>
                                    <EmptyState
                                        title="No category activity"
                                        description="Transactions in this period will appear here."
                                    />
                                </Surface>
                            ) : (
                                <List>
                                    {report.categoryReport.map(
                                        (group) => (
                                            <ListItem
                                                key={
                                                    group.name
                                                }
                                                title={
                                                    group.name
                                                }
                                                subtitle={`${group.transactionCount} transactions`}
                                                right={
                                                    <div className="text-right">
                                                        <p className="font-semibold text-red-600">
                                                            {formatCurrency(
                                                                group.expenses
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            Net{" "}
                                                            {formatCurrency(
                                                                group.net
                                                            )}
                                                        </p>
                                                    </div>
                                                }
                                            />
                                        )
                                    )}
                                </List>
                            )}
                        </Section>

                        <Section
                            title="Merchant Report"
                            description="Income and expenses grouped by merchant."
                        >
                            {report.merchantReport
                                .length === 0 ? (
                                <Surface>
                                    <EmptyState
                                        title="No merchant activity"
                                        description="Transactions in this period will appear here."
                                    />
                                </Surface>
                            ) : (
                                <List>
                                    {report.merchantReport.map(
                                        (group) => (
                                            <ListItem
                                                key={
                                                    group.name
                                                }
                                                title={
                                                    group.name
                                                }
                                                subtitle={`${group.transactionCount} transactions`}
                                                right={
                                                    <div className="text-right">
                                                        <p className="font-semibold text-red-600">
                                                            {formatCurrency(
                                                                group.expenses
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            Net{" "}
                                                            {formatCurrency(
                                                                group.net
                                                            )}
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
                        title="Period Transactions"
                        description="Confirmed records included in this report."
                    >
                        {report.transactions
                            .length === 0 ? (
                            <Surface>
                                <EmptyState
                                    title="No transactions"
                                    description="Confirmed transactions for this period will appear here."
                                />
                            </Surface>
                        ) : (
                            <List>
                                {report.transactions.map(
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
                </>
            ) : (
                <Surface>
                    <EmptyState
                        title="Report unavailable"
                        description="Refresh to load the selected report."
                    />
                </Surface>
            )}
        </PageContainer>
    );
}
