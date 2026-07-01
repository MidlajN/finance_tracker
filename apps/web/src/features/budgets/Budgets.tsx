import {
    useEffect,
    useState,
    type FormEvent,
} from "react";
import {
    AlertCircle,
    Calendar,
    Plus,
    RefreshCw,
    Target,
    Trash2,
    Wallet,
} from "lucide-react";

import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { CategorySelect } from "../../components/common/CategorySelect";
import { Dialog } from "../../components/common/Dialog";
import { EmptyState } from "../../components/common/EmptyState";
import { FormField } from "../../components/common/FormField";
import { Input } from "../../components/common/Input";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { StatCard } from "../../components/common/StatCard";
import { Surface } from "../../components/common/Surface";

import { useBudgetStore } from "../../stores/budgetStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { formatCurrency } from "../../utils/format";
import { cn } from "../../utils/helpers";

type BudgetProgress =
    NonNullable<
        ReturnType<
            typeof useBudgetStore.getState
        >["overview"]
    >["budgets"][number];

function toMonthInput(
    monthStart: string
) {
    return monthStart.slice(0, 7);
}

function toMonthStart(month: string) {
    return `${month}-01`;
}

function getStatusVariant(
    status: BudgetProgress["status"]
) {
    if (status === "over_limit") {
        return "danger";
    }

    if (status === "near_limit") {
        return "warning";
    }

    return "success";
}

function getStatusLabel(
    status: BudgetProgress["status"]
) {
    if (status === "over_limit") {
        return "Over limit";
    }

    if (status === "near_limit") {
        return "Near limit";
    }

    return "On track";
}

interface BudgetDialogProps {
    open: boolean;

    budget: BudgetProgress | null;

    monthStart: string;

    onClose: () => void;
}

function BudgetForm({
    budget,
    monthStart,
    onClose,
}: Omit<BudgetDialogProps, "open">) {
    const create = useBudgetStore(
        (state) => state.create
    );

    const update = useBudgetStore(
        (state) => state.update
    );

    const loading = useBudgetStore(
        (state) => state.loading
    );

    const categories = useCategoryStore(
        (state) => state.categories
    );

    const [categoryId, setCategoryId] =
        useState<string | null>(
            budget?.budget.category_id ?? null
        );

    const [month, setMonth] =
        useState(
            toMonthInput(
                budget?.budget.month_start ??
                    monthStart
            )
        );

    const [amount, setAmount] =
        useState(
            budget?.budget.amount.toString() ??
                ""
        );

    const [formError, setFormError] =
        useState<string | null>(null);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();
        setFormError(null);

        const parsedAmount =
            Number(amount);

        if (!categoryId) {
            setFormError(
                "Select a category."
            );
            return;
        }

        if (!month) {
            setFormError(
                "Select a budget month."
            );
            return;
        }

        if (
            Number.isNaN(parsedAmount) ||
            parsedAmount <= 0
        ) {
            setFormError(
                "Enter an amount greater than zero."
            );
            return;
        }

        try {
            const payload = {
                category_id:
                    categoryId,
                month_start:
                    toMonthStart(month),
                amount: parsedAmount,
                currency: "INR",
            };

            if (budget) {
                await update(
                    budget.budget.id,
                    payload
                );
            } else {
                await create(payload);
            }

            onClose();
        } catch {
            setFormError(
                "Unable to save budget. Please try again."
            );
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
        >
            <FormField
                label="Category"
                required
            >
                <CategorySelect
                    value={categoryId}
                    categories={categories}
                    onChange={setCategoryId}
                    disabled={loading}
                />
            </FormField>

            <FormField
                label="Month"
                required
            >
                <Input
                    type="month"
                    value={month}
                    disabled={loading}
                    onChange={(event) =>
                        setMonth(
                            event.target.value
                        )
                    }
                />
            </FormField>

            <FormField
                label="Amount"
                required
            >
                <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    disabled={loading}
                    onChange={(event) =>
                        setAmount(
                            event.target.value
                        )
                    }
                />
            </FormField>

            {formError && (
                <p className="text-sm text-red-600">
                    {formError}
                </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
                <Button
                    type="button"
                    variant="secondary"
                    disabled={loading}
                    onClick={onClose}
                >
                    Cancel
                </Button>

                <Button
                    type="submit"
                    disabled={loading}
                >
                    {loading
                        ? "Saving..."
                        : "Save Budget"}
                </Button>
            </div>
        </form>
    );
}

function BudgetDialog({
    open,
    budget,
    monthStart,
    onClose,
}: BudgetDialogProps) {
    return (
        <Dialog
            open={open}
            title={
                budget
                    ? "Edit Budget"
                    : "New Budget"
            }
            onClose={onClose}
        >
            <BudgetForm
                key={
                    budget?.budget.id ??
                    "new"
                }
                budget={budget}
                monthStart={monthStart}
                onClose={onClose}
            />
        </Dialog>
    );
}

export function Budgets() {
    const [dialogOpen, setDialogOpen] =
        useState(false);

    const [selectedBudget, setSelectedBudget] =
        useState<BudgetProgress | null>(null);

    const refresh = useBudgetStore(
        (state) => state.refresh
    );

    const overview = useBudgetStore(
        (state) => state.overview
    );

    const monthStart = useBudgetStore(
        (state) => state.monthStart
    );

    const loading = useBudgetStore(
        (state) => state.loading
    );

    const error = useBudgetStore(
        (state) => state.error
    );

    const clearError = useBudgetStore(
        (state) => state.clearError
    );

    const deleteBudget = useBudgetStore(
        (state) => state.delete
    );

    const refreshCategories =
        useCategoryStore(
            (state) => state.refresh
        );

    useEffect(() => {
        refresh();
        refreshCategories();
    }, [refresh, refreshCategories]);

    function handleCreate() {
        setSelectedBudget(null);
        setDialogOpen(true);
    }

    function handleEdit(
        budget: BudgetProgress
    ) {
        setSelectedBudget(budget);
        setDialogOpen(true);
    }

    const refreshIconClassName = cn(
        "mr-2",
        loading && "animate-spin"
    );

    const showInitialLoading =
        loading && !overview;

    return (
        <PageContainer className="space-y-6">
            <PageHeader
                title="Budgets"
                description="Define monthly category spending limits."
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            type="month"
                            value={toMonthInput(
                                monthStart
                            )}
                            disabled={loading}
                            onChange={(event) =>
                                refresh(
                                    toMonthStart(
                                        event
                                            .target
                                            .value
                                    )
                                )
                            }
                            className="w-40"
                        />

                        <Button
                            onClick={handleCreate}
                        >
                            <Plus
                                size={16}
                                className="mr-2"
                            />
                            New Budget
                        </Button>

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
                        Loading budgets...
                    </div>
                </Surface>
            ) : overview ? (
                <>
                    <div className="grid gap-6 md:grid-cols-3">
                        <StatCard
                            title="Monthly Budget"
                            value={formatCurrency(
                                overview.totalBudgeted
                            )}
                            subtitle="Planned category spend"
                            icon={
                                <Target size={20} />
                            }
                        />

                        <StatCard
                            title="Spent"
                            value={formatCurrency(
                                overview.totalSpent
                            )}
                            subtitle="Confirmed expenses"
                            icon={
                                <Wallet size={20} />
                            }
                        />

                        <StatCard
                            title="Remaining"
                            value={formatCurrency(
                                overview.remaining
                            )}
                            subtitle="Budget minus spending"
                            icon={
                                <Calendar
                                    size={20}
                                />
                            }
                        />
                    </div>

                    <Section
                        title="Category Budgets"
                        description="Progress is calculated from confirmed expense transactions in the selected month."
                    >
                        {overview.budgets
                            .length === 0 ? (
                            <Surface>
                                <EmptyState
                                    title="No budgets"
                                    description="Create a category budget to track monthly spending."
                                />
                            </Surface>
                        ) : (
                            <div className="grid gap-4">
                                {overview.budgets.map(
                                    (budget) => (
                                        <Surface
                                            key={
                                                budget
                                                    .budget
                                                    .id
                                            }
                                            className="p-5"
                                        >
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <h3 className="text-lg font-semibold text-slate-900">
                                                            {budget
                                                                .budget
                                                                .category
                                                                ?.name ??
                                                                "Uncategorized"}
                                                        </h3>

                                                        <Badge
                                                            variant={getStatusVariant(
                                                                budget.status
                                                            )}
                                                        >
                                                            {getStatusLabel(
                                                                budget.status
                                                            )}
                                                        </Badge>
                                                    </div>

                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {formatCurrency(
                                                            budget.spent
                                                        )}{" "}
                                                        of{" "}
                                                        {formatCurrency(
                                                            budget
                                                                .budget
                                                                .amount
                                                        )}{" "}
                                                        spent
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        disabled={
                                                            loading
                                                        }
                                                        onClick={() =>
                                                            handleEdit(
                                                                budget
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="danger"
                                                        disabled={
                                                            loading
                                                        }
                                                        className="px-3"
                                                        onClick={async () => {
                                                            try {
                                                                await deleteBudget(
                                                                    budget
                                                                        .budget
                                                                        .id
                                                                );
                                                            } catch {
                                                                // Store exposes the friendly error message.
                                                            }
                                                        }}
                                                    >
                                                        <Trash2
                                                            size={
                                                                16
                                                            }
                                                        />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all",
                                                        budget.status ===
                                                            "over_limit"
                                                            ? "bg-red-500"
                                                            : budget.status ===
                                                                "near_limit"
                                                              ? "bg-yellow-500"
                                                              : "bg-green-500"
                                                    )}
                                                    style={{
                                                        width: `${Math.min(
                                                            budget.percentage,
                                                            100
                                                        )}%`,
                                                    }}
                                                />
                                            </div>

                                            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                                                <span>
                                                    {budget.percentage.toFixed(
                                                        1
                                                    )}
                                                    %
                                                </span>

                                                <span>
                                                    Remaining{" "}
                                                    {formatCurrency(
                                                        budget.remaining
                                                    )}
                                                </span>
                                            </div>
                                        </Surface>
                                    )
                                )}
                            </div>
                        )}
                    </Section>
                </>
            ) : (
                <Surface>
                    <EmptyState
                        title="Budgets unavailable"
                        description="Refresh to load monthly budgets."
                    />
                </Surface>
            )}

            <BudgetDialog
                open={dialogOpen}
                budget={selectedBudget}
                monthStart={monthStart}
                onClose={() =>
                    setDialogOpen(false)
                }
            />
        </PageContainer>
    );
}
