export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type EventDirection = "debit" | "credit";

export type EventStatus =
    | "pending"
    | "confirmed"
    | "ignored"
    | "merged";

export type TransactionType =
    | "expense"
    | "income"
    | "transfer"
    | "refund";

export type RuleMatchOperator =
    | "equals"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "regex";

export interface CategoryReference {
    id?: string | null;
    name?: string | null;
    icon?: string | null;
    color?: string | null;
}

export interface CachedCategory
    extends CategoryReference {
    id: string;
    is_system: boolean;
    created_at: string;
    updated_at: string;
}

export interface MerchantReference {
    id?: string | null;
    name: string;
    normalized_name?: string | null;
    usage_count?: number;
    category?: CategoryReference | null;
}

export interface CachedMerchant
    extends MerchantReference {
    id: string;
    category_id?: string | null;
    last_seen_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface FinancialEventInput {
    amount: number;
    confidence?: number;
    currency?: string;
    direction: EventDirection;
    merchant_id?: string | null;
    merchant_name_raw?: string | null;
    metadata?: Json | null;
    notes?: string | null;
    occurred_at: string;
    status?: EventStatus;
}

export interface CachedFinancialEvent
    extends FinancialEventInput {
    id: string;
    source: string;
    created_at: string;
    updated_at: string;
}

export interface ParsedFinancialEvent {
    source: string;
    packageName?: string;
    merchantName: string | null;
    amount: number;
    currency: string;
    direction: EventDirection;
    occurredAt: string;
    reference?: string | null;
    confidence: number;
    rawPayload: string;
}

export interface RawNotificationPayload {
    id: string;
    packageName: string;
    applicationName: string | null;
    title: string | null;
    text: string | null;
    subText: string | null;
    postedAt: string;
}

export interface FinancialRule {
    id: string;
    name?: string;
    match_operator: string;
    match_value: string;
    merchant_id?: string | null;
    merchant?: MerchantReference | null;
    category_id?: string | null;
    category?: CategoryReference | null;
    auto_confirm?: boolean;
    enabled?: boolean;
    priority?: number;
}

export interface CachedFinancialRule
    extends FinancialRule {
    name: string;
    auto_confirm: boolean;
    enabled: boolean;
    priority: number;
    created_at: string;
    updated_at: string;
}

export interface FinancialRuleInput {
    name?: string;
    match_operator?: string;
    match_value?: string;
    merchant_id?: string | null;
    category_id?: string | null;
    auto_confirm?: boolean;
    enabled?: boolean;
    priority?: number;
}

export interface TransactionLike {
    id?: string;
    amount: number;
    category_id?: string | null;
    currency?: string;
    merchant_id?: string | null;
    notes?: string | null;
    occurred_at: string;
    transaction_type: TransactionType;
    merchant?: MerchantReference | null;
    category?: CategoryReference | null;
}

export interface CachedTransaction
    extends TransactionLike {
    id: string;
    event_id: string;
    created_at: string;
    updated_at: string;
}

export interface BudgetLike {
    id?: string;
    amount: number;
    category_id: string | null;
    month_start?: string;
    category?: CategoryReference | null;
}

export interface CachedBudget extends BudgetLike {
    id: string;
    currency: string;
    created_at: string;
    updated_at: string;
}

export interface BudgetInput {
    amount?: number;
    category_id?: string | null;
    month_start?: string;
}

export type ReportPeriod = "monthly" | "yearly";

export interface ReportGroup {
    name: string;
    income: number;
    expenses: number;
    net: number;
    transactionCount: number;
}

export interface FinancialReport<
    TTransaction extends TransactionLike = TransactionLike,
> {
    period: ReportPeriod;
    value: string;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    transactionCount: number;
    categoryReport: ReportGroup[];
    merchantReport: ReportGroup[];
    transactions: TTransaction[];
}

export interface AnalyticsTrendPoint {
    period: string;
    income: number;
    expenses: number;
    net: number;
    transactionCount: number;
}

export interface AnalyticsGroup {
    name: string;
    income: number;
    expenses: number;
    net: number;
    transactionCount: number;
    averageTransaction: number;
    percentageOfExpenses: number;
}

export interface AnalyticsComparison {
    period: string;
    current: AnalyticsTrendPoint;
    previous: AnalyticsTrendPoint | null;
    incomeChange: number;
    incomeChangePercentage: number | null;
    expensesChange: number;
    expensesChangePercentage: number | null;
    netChange: number;
    netChangePercentage: number | null;
}

export interface YearOverYearComparison
    extends AnalyticsComparison {
    previousYearPeriod: string;
}

export interface FinancialAnalytics {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    averageMonthlyIncome: number;
    averageMonthlyExpenses: number;
    averageMonthlyNet: number;
    savingsRate: number;
    incomeTrend: AnalyticsTrendPoint[];
    spendingTrend: AnalyticsTrendPoint[];
    cashFlow: AnalyticsTrendPoint[];
    categoryAnalytics: AnalyticsGroup[];
    merchantAnalytics: AnalyticsGroup[];
    monthlyComparisons: AnalyticsComparison[];
    yearOverYearComparisons: YearOverYearComparison[];
}

export interface ImportResult {
    imported: number;
    skipped: number;
    errors: string[];
}
