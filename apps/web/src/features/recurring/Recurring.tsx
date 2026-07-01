import { useEffect } from "react";
import {
    AlertCircle,
    CalendarClock,
    CreditCard,
    RefreshCw,
    Repeat,
    Wallet,
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

import { useRecurringStore } from "../../stores/recurringStore";
import { formatCurrency } from "../../utils/format";
import { cn } from "../../utils/helpers";

type RecurringActivity =
    NonNullable<
        ReturnType<
            typeof useRecurringStore.getState
        >["overview"]
    >["activities"][number];

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

function getActivityVariant(
    activity: RecurringActivity
) {
    if (
        activity.activityType === "salary"
    ) {
        return "success";
    }

    if (
        activity.activityType === "bill"
    ) {
        return "warning";
    }

    return "default";
}

export function Recurring() {
    const refresh = useRecurringStore(
        (state) => state.refresh
    );

    const overview = useRecurringStore(
        (state) => state.overview
    );

    const loading = useRecurringStore(
        (state) => state.loading
    );

    const error = useRecurringStore(
        (state) => state.error
    );

    const clearError = useRecurringStore(
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
        loading && !overview;

    return (
        <PageContainer className="space-y-6">
            <PageHeader
                title="Recurring Activity"
                description="Detect repeated salary, subscription and bill patterns from confirmed transactions."
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
                        Detecting recurring activity...
                    </div>
                </Surface>
            ) : overview ? (
                <>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Detected"
                            value={
                                overview
                                    .activities
                                    .length
                            }
                            subtitle="Recurring patterns"
                            icon={
                                <Repeat size={20} />
                            }
                        />

                        <StatCard
                            title="Salary"
                            value={
                                overview.salaryCount
                            }
                            subtitle="Recurring income"
                            icon={
                                <Wallet size={20} />
                            }
                        />

                        <StatCard
                            title="Subscriptions"
                            value={
                                overview.subscriptionCount
                            }
                            subtitle="Recurring smaller expenses"
                            icon={
                                <CreditCard
                                    size={20}
                                />
                            }
                        />

                        <StatCard
                            title="Bills"
                            value={
                                overview.billCount
                            }
                            subtitle="Recurring larger expenses"
                            icon={
                                <CalendarClock
                                    size={20}
                                />
                            }
                        />
                    </div>

                    <Section
                        title="Detected Patterns"
                        description="Confidence is based on timing and amount consistency."
                    >
                        {overview.activities
                            .length === 0 ? (
                            <Surface>
                                <EmptyState
                                    title="No recurring activity"
                                    description="At least two matching transactions are needed before a recurring pattern can be detected."
                                />
                            </Surface>
                        ) : (
                            <List>
                                {overview.activities.map(
                                    (activity) => (
                                        <ListItem
                                            key={
                                                activity.id
                                            }
                                            title={
                                                activity.merchantName
                                            }
                                            subtitle={`${activity.categoryName} • ${activity.frequency} • next ${formatDate(activity.nextExpectedAt)}`}
                                            icon={
                                                <Repeat
                                                    size={18}
                                                    className="text-slate-400"
                                                />
                                            }
                                            right={
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className="font-semibold text-slate-900">
                                                        {formatCurrency(
                                                            activity.averageAmount
                                                        )}
                                                    </span>

                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <Badge
                                                            variant={getActivityVariant(
                                                                activity
                                                            )}
                                                        >
                                                            {
                                                                activity.activityType
                                                            }
                                                        </Badge>

                                                        <Badge>
                                                            {Math.round(
                                                                activity.confidence *
                                                                    100
                                                            )}
                                                            %
                                                        </Badge>
                                                    </div>

                                                    <span className="text-xs text-slate-500">
                                                        {
                                                            activity.occurrenceCount
                                                        }{" "}
                                                        occurrences
                                                    </span>
                                                </div>
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
                        title="Recurring activity unavailable"
                        description="Refresh to detect recurring financial activity."
                    />
                </Surface>
            )}
        </PageContainer>
    );
}
