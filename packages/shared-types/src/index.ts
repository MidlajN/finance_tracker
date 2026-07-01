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

export interface MerchantReference {
    id?: string | null;
    name: string;
    normalized_name?: string | null;
    usage_count?: number;
    category?: CategoryReference | null;
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

export interface FinancialRule {
    id: string;
    name?: string;
    match_operator: string;
    match_value: string;
    merchant_id?: string | null;
    merchant?: MerchantReference | null;
    category_id?: string | null;
    auto_confirm?: boolean;
    enabled?: boolean;
    priority?: number;
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

export interface BudgetLike {
    id?: string;
    amount: number;
    category_id: string | null;
    month_start?: string;
    category?: CategoryReference | null;
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

export interface ImportResult {
    imported: number;
    skipped: number;
    errors: string[];
}
