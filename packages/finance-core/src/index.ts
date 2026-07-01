import {
    getCurrentMonth,
    getCurrentMonthStart,
    getCurrentYear,
    getNextMonthStart,
    normalizeMerchantName,
} from "@finance/shared-utils";

import type {
    BudgetInput,
    BudgetLike,
    FinancialEventInput,
    FinancialReport,
    FinancialRule,
    FinancialRuleInput,
    Json,
    MerchantReference,
    ReportGroup,
    ReportPeriod,
    RuleMatchOperator,
    TransactionLike,
} from "@finance/shared-types";

export type {
    FinancialReport,
    ReportGroup,
    ReportPeriod,
    RuleMatchOperator,
};

export const RULE_MATCH_OPERATORS: RuleMatchOperator[] = [
    "equals",
    "contains",
    "starts_with",
    "ends_with",
    "regex",
];

export function isRuleMatchOperator(
    value: string
): value is RuleMatchOperator {
    return RULE_MATCH_OPERATORS.includes(
        value as RuleMatchOperator
    );
}

export function matchesRule(
    merchantNameRaw: string,
    rule: FinancialRule
) {
    const operator = rule.match_operator;

    if (!isRuleMatchOperator(operator)) {
        return false;
    }

    const merchantName =
        normalizeMerchantName(merchantNameRaw);

    const matchValue =
        normalizeMerchantName(rule.match_value);

    if (!merchantName || !matchValue) {
        return false;
    }

    if (operator === "equals") {
        return merchantName === matchValue;
    }

    if (operator === "contains") {
        return merchantName.includes(matchValue);
    }

    if (operator === "starts_with") {
        return merchantName.startsWith(
            matchValue
        );
    }

    if (operator === "ends_with") {
        return merchantName.endsWith(matchValue);
    }

    try {
        return new RegExp(
            rule.match_value,
            "i"
        ).test(merchantNameRaw);
    } catch {
        return false;
    }
}

export function validateRule(
    rule: FinancialRuleInput
) {
    if (
        typeof rule.name === "string" &&
        !rule.name.trim()
    ) {
        throw new Error("Rule name is required.");
    }

    if (
        typeof rule.match_value === "string" &&
        !rule.match_value.trim()
    ) {
        throw new Error("Match value is required.");
    }

    if (
        typeof rule.match_operator ===
            "string" &&
        !isRuleMatchOperator(rule.match_operator)
    ) {
        throw new Error("Rule matcher is invalid.");
    }

    if (
        typeof rule.priority === "number" &&
        !Number.isInteger(rule.priority)
    ) {
        throw new Error("Rule priority must be a whole number.");
    }

    const hasMerchant =
        "merchant_id" in rule &&
        Boolean(rule.merchant_id);

    const hasCategory =
        "category_id" in rule &&
        Boolean(rule.category_id);

    if (
        "merchant_id" in rule &&
        "category_id" in rule &&
        !hasMerchant &&
        !hasCategory
    ) {
        throw new Error("Select at least one rule action.");
    }
}

export function evaluateRules<
    TRule extends FinancialRule,
>(
    event: FinancialEventInput,
    rules: TRule[]
) {
    const merchantNameRaw =
        event.merchant_name_raw ?? "";

    if (!merchantNameRaw.trim()) {
        return null;
    }

    return (
        rules.find((rule) =>
            matchesRule(merchantNameRaw, rule)
        ) ?? null
    );
}

function getObjectMetadata(
    metadata: Json | null | undefined
) {
    return typeof metadata === "object" &&
        metadata !== null &&
        !Array.isArray(metadata)
        ? metadata
        : {};
}

export function applyRuleToEvent<
    TEvent extends FinancialEventInput,
    TRule extends FinancialRule,
>(
    event: TEvent,
    rule: TRule | null
): {
    event: TEvent;
    rule: TRule | null;
} {
    if (!rule) {
        return {
            event,
            rule: null,
        };
    }

    const updatedEvent = {
        ...event,
        merchant_id:
            rule.merchant_id ??
            event.merchant_id ??
            null,
        merchant_name_raw:
            rule.merchant?.name ??
            event.merchant_name_raw ??
            null,
        metadata: {
            ...getObjectMetadata(event.metadata),
            rule_id: rule.id,
            rule_category_id:
                rule.category_id ?? null,
        },
    } as TEvent;

    return {
        event: updatedEvent,
        rule,
    };
}

export function getIncomeTotal<
    TTransaction extends TransactionLike,
>(transactions: TTransaction[]) {
    return transactions.reduce(
        (total, transaction) => {
            if (
                transaction.transaction_type ===
                    "income" ||
                transaction.transaction_type ===
                    "refund"
            ) {
                return total + transaction.amount;
            }

            return total;
        },
        0
    );
}

export function getExpenseTotal<
    TTransaction extends TransactionLike,
>(transactions: TTransaction[]) {
    return transactions.reduce(
        (total, transaction) =>
            transaction.transaction_type ===
            "expense"
                ? total + transaction.amount
                : total,
        0
    );
}

export interface CategorySummary {
    categoryName: string;
    totalSpent: number;
    percentage: number;
}

export interface MerchantSummary {
    merchantName: string;
    usageCount: number;
    categoryName: string;
}

export interface DashboardTotals {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    pendingEvents: number;
    confirmedTransactions: number;
    totalMerchants: number;
    totalCategories: number;
}

export interface DashboardData<
    TTransaction extends TransactionLike = TransactionLike,
> {
    totals: DashboardTotals;
    recentTransactions: TTransaction[];
    categorySummary: CategorySummary[];
    merchantSummary: MerchantSummary[];
}

export function getCategorySummary<
    TTransaction extends TransactionLike,
>(
    transactions: TTransaction[],
    totalExpenses: number
) {
    const summaries = new Map<
        string,
        CategorySummary
    >();

    transactions.forEach((transaction) => {
        if (
            transaction.transaction_type !==
            "expense"
        ) {
            return;
        }

        const categoryId =
            transaction.category_id ??
            "uncategorized";

        const current =
            summaries.get(categoryId);

        const categoryName =
            transaction.category?.name ??
            "Uncategorized";

        summaries.set(categoryId, {
            categoryName,
            totalSpent:
                (current?.totalSpent ?? 0) +
                transaction.amount,
            percentage: 0,
        });
    });

    return Array.from(summaries.values())
        .map((summary) => ({
            ...summary,
            percentage:
                totalExpenses > 0
                    ? (summary.totalSpent /
                          totalExpenses) *
                      100
                    : 0,
        }))
        .sort(
            (first, second) =>
                second.totalSpent -
                first.totalSpent
        )
        .slice(0, 5);
}

export function getMerchantSummary<
    TMerchant extends MerchantReference,
>(merchants: TMerchant[]) {
    return [...merchants]
        .sort((first, second) => {
            const firstUsage =
                first.usage_count ?? 0;
            const secondUsage =
                second.usage_count ?? 0;

            if (secondUsage !== firstUsage) {
                return secondUsage - firstUsage;
            }

            return first.name.localeCompare(
                second.name
            );
        })
        .slice(0, 5)
        .map((merchant) => ({
            merchantName: merchant.name,
            usageCount:
                merchant.usage_count ?? 0,
            categoryName:
                merchant.category?.name ??
                "Uncategorized",
        }));
}

export function buildDashboardData<
    TTransaction extends TransactionLike,
    TMerchant extends MerchantReference,
>(
    transactions: TTransaction[],
    merchants: TMerchant[],
    categoryCount: number,
    pendingEvents: number
): DashboardData<TTransaction> {
    const totalIncome =
        getIncomeTotal(transactions);
    const totalExpenses =
        getExpenseTotal(transactions);

    return {
        totals: {
            totalIncome,
            totalExpenses,
            netBalance:
                totalIncome - totalExpenses,
            pendingEvents,
            confirmedTransactions:
                transactions.length,
            totalMerchants: merchants.length,
            totalCategories: categoryCount,
        },
        recentTransactions:
            transactions.slice(0, 5),
        categorySummary:
            getCategorySummary(
                transactions,
                totalExpenses
            ),
        merchantSummary:
            getMerchantSummary(merchants),
    };
}

export interface BudgetProgress<
    TBudget extends BudgetLike = BudgetLike,
> {
    budget: TBudget;
    spent: number;
    remaining: number;
    percentage: number;
    status:
        | "on_track"
        | "near_limit"
        | "over_limit";
}

export interface BudgetOverview<
    TBudget extends BudgetLike = BudgetLike,
> {
    monthStart: string;
    totalBudgeted: number;
    totalSpent: number;
    remaining: number;
    budgets: BudgetProgress<TBudget>[];
}

export function isTransactionInMonth<
    TTransaction extends TransactionLike,
>(
    transaction: TTransaction,
    monthStart: string
) {
    const occurredAt =
        transaction.occurred_at.slice(0, 10);

    return (
        occurredAt >= monthStart &&
        occurredAt <
            getNextMonthStart(monthStart)
    );
}

export function getBudgetStatus(
    percentage: number
): BudgetProgress["status"] {
    if (percentage >= 100) {
        return "over_limit";
    }

    if (percentage >= 80) {
        return "near_limit";
    }

    return "on_track";
}

export function validateBudget(
    budget: BudgetInput
) {
    if (
        typeof budget.amount === "number" &&
        budget.amount <= 0
    ) {
        throw new Error("Budget amount must be greater than zero.");
    }

    if (
        typeof budget.category_id ===
            "string" &&
        !budget.category_id
    ) {
        throw new Error("Category is required.");
    }

    if (
        typeof budget.month_start ===
            "string" &&
        !/^\d{4}-\d{2}-01$/.test(
            budget.month_start
        )
    ) {
        throw new Error("Budget month is invalid.");
    }
}

export function buildBudgetOverview<
    TBudget extends BudgetLike,
    TTransaction extends TransactionLike,
>(
    budgets: TBudget[],
    transactions: TTransaction[],
    monthStart = getCurrentMonthStart()
): BudgetOverview<TBudget> {
    const monthlyExpenses =
        transactions.filter(
            (transaction) =>
                transaction.transaction_type ===
                    "expense" &&
                isTransactionInMonth(
                    transaction,
                    monthStart
                )
        );

    const progress = budgets.map((budget) => {
        const spent =
            monthlyExpenses
                .filter(
                    (transaction) =>
                        transaction.category_id ===
                        budget.category_id
                )
                .reduce(
                    (total, transaction) =>
                        total +
                        transaction.amount,
                    0
                );

        const percentage =
            budget.amount > 0
                ? (spent / budget.amount) *
                  100
                : 0;

        return {
            budget,
            spent,
            remaining: budget.amount - spent,
            percentage,
            status:
                getBudgetStatus(percentage),
        };
    });

    const totalBudgeted = budgets.reduce(
        (total, budget) =>
            total + budget.amount,
        0
    );

    const totalSpent = progress.reduce(
        (total, budget) =>
            total + budget.spent,
        0
    );

    return {
        monthStart,
        totalBudgeted,
        totalSpent,
        remaining:
            totalBudgeted - totalSpent,
        budgets: progress,
    };
}

export type RecurringFrequency =
    | "weekly"
    | "biweekly"
    | "monthly"
    | "yearly";

export interface RecurringActivity {
    id: string;
    merchantName: string;
    categoryName: string;
    activityType:
        | "salary"
        | "subscription"
        | "bill";
    transactionType:
        | "income"
        | "expense";
    averageAmount: number;
    frequency: RecurringFrequency;
    confidence: number;
    occurrenceCount: number;
    lastOccurredAt: string;
    nextExpectedAt: string;
}

export interface RecurringOverview {
    activities: RecurringActivity[];
    salaryCount: number;
    subscriptionCount: number;
    billCount: number;
    highConfidenceCount: number;
}

interface TransactionGroup<
    TTransaction extends TransactionLike,
> {
    id: string;
    merchantName: string;
    categoryName: string;
    transactionType: "income" | "expense";
    transactions: TTransaction[];
}

function getDaysBetween(
    first: string,
    second: string
) {
    const firstDate = new Date(first);
    const secondDate = new Date(second);

    return Math.abs(
        (secondDate.getTime() -
            firstDate.getTime()) /
            86_400_000
    );
}

function addDays(value: string, days: number) {
    const date = new Date(value);

    date.setDate(
        date.getDate() + Math.round(days)
    );

    return date.toISOString();
}

function average(values: number[]) {
    if (values.length === 0) {
        return 0;
    }

    return (
        values.reduce(
            (total, value) =>
                total + value,
            0
        ) / values.length
    );
}

function getFrequency(
    intervalDays: number
): RecurringFrequency | null {
    if (
        intervalDays >= 6 &&
        intervalDays <= 8
    ) {
        return "weekly";
    }

    if (
        intervalDays >= 12 &&
        intervalDays <= 17
    ) {
        return "biweekly";
    }

    if (
        intervalDays >= 25 &&
        intervalDays <= 35
    ) {
        return "monthly";
    }

    if (
        intervalDays >= 330 &&
        intervalDays <= 400
    ) {
        return "yearly";
    }

    return null;
}

function getActivityType(
    transactionType: "income" | "expense",
    frequency: RecurringFrequency,
    averageAmount: number
): RecurringActivity["activityType"] {
    if (transactionType === "income") {
        return "salary";
    }

    if (
        frequency === "monthly" &&
        averageAmount >= 1000
    ) {
        return "bill";
    }

    return "subscription";
}

function getConfidence(
    occurrenceCount: number,
    intervals: number[],
    amounts: number[]
) {
    const averageInterval =
        average(intervals);

    const intervalDeviation =
        average(
            intervals.map((interval) =>
                Math.abs(
                    interval -
                        averageInterval
                )
            )
        );

    const averageAmount =
        average(amounts);

    const amountDeviation =
        average(
            amounts.map((amount) =>
                Math.abs(
                    amount -
                        averageAmount
                )
            )
        );

    const intervalScore =
        averageInterval > 0
            ? Math.max(
                  0,
                  1 -
                      intervalDeviation /
                          averageInterval
              )
            : 0;

    const amountScore =
        averageAmount > 0
            ? Math.max(
                  0,
                  1 -
                      amountDeviation /
                          averageAmount
              )
            : 0;

    return Math.min(
        0.98,
        0.35 +
            Math.min(
                occurrenceCount,
                5
            ) *
                0.08 +
            intervalScore * 0.15 +
            amountScore * 0.1
    );
}

function groupTransactions<
    TTransaction extends TransactionLike,
>(transactions: TTransaction[]) {
    const groups = new Map<
        string,
        TransactionGroup<TTransaction>
    >();

    transactions.forEach((transaction) => {
        if (
            transaction.transaction_type !==
                "income" &&
            transaction.transaction_type !==
                "expense"
        ) {
            return;
        }

        const merchantName =
            transaction.merchant?.name ??
            "Unknown Merchant";

        const key = `${transaction.transaction_type}:${transaction.merchant_id ?? merchantName}`;

        const group =
            groups.get(key) ?? {
                id: key,
                merchantName,
                categoryName:
                    transaction.category?.name ??
                    "Uncategorized",
                transactionType:
                    transaction.transaction_type,
                transactions: [],
            };

        group.transactions.push(transaction);
        groups.set(key, group);
    });

    return Array.from(groups.values());
}

function detectGroup<
    TTransaction extends TransactionLike,
>(
    group: TransactionGroup<TTransaction>
): RecurringActivity | null {
    const transactions = [
        ...group.transactions,
    ].sort(
        (first, second) =>
            new Date(
                first.occurred_at
            ).getTime() -
            new Date(
                second.occurred_at
            ).getTime()
    );

    if (transactions.length < 2) {
        return null;
    }

    const intervals =
        transactions
            .slice(1)
            .map((transaction, index) =>
                getDaysBetween(
                    transactions[index]
                        .occurred_at,
                    transaction.occurred_at
                )
            );

    const averageInterval =
        average(intervals);

    const frequency =
        getFrequency(averageInterval);

    if (!frequency) {
        return null;
    }

    const amounts =
        transactions.map(
            (transaction) =>
                transaction.amount
        );

    const averageAmount =
        average(amounts);

    const lastTransaction =
        transactions[
            transactions.length - 1
        ];

    return {
        id: group.id,
        merchantName:
            group.merchantName,
        categoryName:
            group.categoryName,
        activityType:
            getActivityType(
                group.transactionType,
                frequency,
                averageAmount
            ),
        transactionType:
            group.transactionType,
        averageAmount,
        frequency,
        confidence:
            getConfidence(
                transactions.length,
                intervals,
                amounts
            ),
        occurrenceCount:
            transactions.length,
        lastOccurredAt:
            lastTransaction.occurred_at,
        nextExpectedAt:
            addDays(
                lastTransaction.occurred_at,
                averageInterval
            ),
    };
}

export function detectRecurringOverview<
    TTransaction extends TransactionLike,
>(
    transactions: TTransaction[]
): RecurringOverview {
    const activities =
        groupTransactions(transactions)
            .map(detectGroup)
            .filter(
                (
                    activity
                ): activity is RecurringActivity =>
                    activity !== null
            )
            .sort(
                (first, second) =>
                    second.confidence -
                    first.confidence
            );

    return {
        activities,
        salaryCount:
            activities.filter(
                (activity) =>
                    activity.activityType ===
                    "salary"
            ).length,
        subscriptionCount:
            activities.filter(
                (activity) =>
                    activity.activityType ===
                    "subscription"
            ).length,
        billCount:
            activities.filter(
                (activity) =>
                    activity.activityType ===
                    "bill"
            ).length,
        highConfidenceCount:
            activities.filter(
                (activity) =>
                    activity.confidence >= 0.8
            ).length,
    };
}

function isInPeriod<
    TTransaction extends TransactionLike,
>(
    transaction: TTransaction,
    period: ReportPeriod,
    value: string
) {
    const date = transaction.occurred_at;

    if (period === "monthly") {
        return date.startsWith(value);
    }

    return date.startsWith(value);
}

function getIncomeAmount<
    TTransaction extends TransactionLike,
>(transaction: TTransaction) {
    if (
        transaction.transaction_type ===
            "income" ||
        transaction.transaction_type ===
            "refund"
    ) {
        return transaction.amount;
    }

    return 0;
}

function getExpenseAmount<
    TTransaction extends TransactionLike,
>(transaction: TTransaction) {
    if (
        transaction.transaction_type ===
        "expense"
    ) {
        return transaction.amount;
    }

    return 0;
}

function summarize<
    TTransaction extends TransactionLike,
>(
    transactions: TTransaction[],
    getName: (
        transaction: TTransaction
    ) => string
) {
    const groups = new Map<
        string,
        ReportGroup
    >();

    transactions.forEach((transaction) => {
        const name = getName(transaction);

        const current =
            groups.get(name) ?? {
                name,
                income: 0,
                expenses: 0,
                net: 0,
                transactionCount: 0,
            };

        const income =
            getIncomeAmount(transaction);

        const expenses =
            getExpenseAmount(transaction);

        groups.set(name, {
            name,
            income:
                current.income + income,
            expenses:
                current.expenses +
                expenses,
            net:
                current.net +
                income -
                expenses,
            transactionCount:
                current.transactionCount +
                1,
        });
    });

    return Array.from(groups.values()).sort(
        (first, second) =>
            second.expenses -
            first.expenses
    );
}

export function getDefaultReportPeriod() {
    return {
        period: "monthly" as const,
        value: getCurrentMonth(),
    };
}

export function buildFinancialReport<
    TTransaction extends TransactionLike,
>(
    transactions: TTransaction[],
    period: ReportPeriod,
    value: string
): FinancialReport<TTransaction> {
    const reportValue =
        value ||
        (period === "monthly"
            ? getCurrentMonth()
            : getCurrentYear());

    const scopedTransactions =
        transactions.filter((transaction) =>
            isInPeriod(
                transaction,
                period,
                reportValue
            )
        );

    const totalIncome =
        scopedTransactions.reduce(
            (total, transaction) =>
                total +
                getIncomeAmount(
                    transaction
                ),
            0
        );

    const totalExpenses =
        scopedTransactions.reduce(
            (total, transaction) =>
                total +
                getExpenseAmount(
                    transaction
                ),
            0
        );

    return {
        period,
        value: reportValue,
        totalIncome,
        totalExpenses,
        netBalance:
            totalIncome - totalExpenses,
        transactionCount:
            scopedTransactions.length,
        categoryReport: summarize(
            scopedTransactions,
            (transaction) =>
                transaction.category?.name ??
                "Uncategorized"
        ),
        merchantReport: summarize(
            scopedTransactions,
            (transaction) =>
                transaction.merchant?.name ??
                "Unknown Merchant"
        ),
        transactions: scopedTransactions,
    };
}

export {
    getCurrentMonthStart,
    getNextMonthStart,
};
