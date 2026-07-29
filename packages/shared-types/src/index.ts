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

export type AccountType =
    | "cash"
    | "bank"
    | "credit_card"
    | "investment"
    | "loan"
    | "digital_wallet"
    | "other";

export type AssetType =
    | "cash"
    | "bank_deposit"
    | "real_estate"
    | "vehicle"
    | "precious_metals"
    | "equity"
    | "mutual_fund"
    | "etf"
    | "cryptocurrency"
    | "bond"
    | "other";

export type LiabilityType =
    | "credit_card"
    | "mortgage"
    | "vehicle_loan"
    | "education_loan"
    | "personal_loan"
    | "other";

export type LoanType =
    | "mortgage"
    | "personal_loan"
    | "vehicle_loan"
    | "student_loan"
    | "business_loan";

export type GoalStatus =
    | "active"
    | "completed"
    | "archived";

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

export interface CategoryLike {
    id?: string;
    name: string;
    icon?: string | null;
    color?: string | null;
}

export interface CachedCategory
    extends CategoryLike {
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

export interface MerchantLike extends Omit<MerchantReference, "id"> {
    id?: string;
    category_id?: string | null;
    last_seen_at?: string | null;
}

export interface CachedMerchant
    extends MerchantLike {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface MerchantAliasLike {
    id?: string;
    merchant_id: string;
    alias: string;
}

export interface CachedMerchantAlias
    extends MerchantAliasLike {
    id: string;
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

export interface ParsedAccountHint {
    accountType?: AccountType | null;
    last4?: string | null;
    providerName?: string | null;
    rawLabel?: string | null;
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
    captureId?: string | null;
    packageName?: string;
    merchantName: string | null;
    amount: number;
    currency: string;
    direction: EventDirection;
    occurredAt: string;
    reference?: string | null;
    accountHint?: ParsedAccountHint | null;
    confidence: number;
    rawPayload: string;
}

export interface RawNotificationPayload {
    id: string;
    captureId?: string | null;
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
    account_id?: string | null;
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
    event?: CachedFinancialEvent | null;
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

export interface CurrencyLike {
    code: string;
    name: string;
    symbol: string;
    decimal_precision: number;
}

export interface ExchangeRateLike {
    id?: string;
    base_currency: string;
    quote_currency: string;
    rate: number;
    valid_on: string;
    source: string;
    created_at?: string;
}

export interface AccountLike {
    id?: string;
    name: string;
    account_type: AccountType;
    currency: string;
    opening_balance: number;
    institution?: string | null;
    archived: boolean;
}

export interface CachedAccount
    extends AccountLike {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface AssetLike {
    id?: string;
    name: string;
    asset_type: AssetType;
    currency: string;
    quantity: number;
    acquisition_value: number;
    current_valuation: number;
    acquisition_date: string;
    notes?: string | null;
}

export interface CachedAsset
    extends AssetLike {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface LiabilityLike {
    id?: string;
    name: string;
    liability_type: LiabilityType;
    currency: string;
    outstanding_balance: number;
    original_amount: number;
    interest_rate: number;
    start_date: string;
    end_date?: string | null;
}

export interface CachedLiability
    extends LiabilityLike {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface LoanLike {
    id?: string;
    liability_id: string;
    loan_type: LoanType;
    monthly_payment: number;
    remaining_payments: number;
    interest_accrued: number;
    liability?: LiabilityLike | null;
}

export interface CachedLoan extends LoanLike {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface InvestmentLike {
    id?: string;
    symbol: string;
    quantity: number;
    average_purchase_price: number;
    current_price?: number | null;
    currency: string;
    exchange?: string | null;
    purchase_history?: Json;
}

export interface CachedInvestment
    extends InvestmentLike {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface GoalLike {
    id?: string;
    name: string;
    target_amount: number;
    currency: string;
    target_date?: string | null;
    status: GoalStatus;
}

export interface CachedGoal extends GoalLike {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface FinancialIntelligenceInput {
    accounts: AccountLike[];
    assets: AssetLike[];
    liabilities: LiabilityLike[];
    loans: LoanLike[];
    investments: InvestmentLike[];
    goals: GoalLike[];
    transactions: TransactionLike[];
    exchangeRates: ExchangeRateLike[];
    baseCurrency: string;
}

export interface AccountBalance {
    account: AccountLike;
    currentBalance: number;
    convertedBalance: number;
}

export interface GoalProgress {
    goal: GoalLike;
    currentProgress: number;
    convertedTargetAmount: number;
    progressPercentage: number;
    remainingAmount: number;
}

export interface InvestmentPerformance {
    investment: InvestmentLike;
    costBasis: number;
    marketValue: number;
    convertedMarketValue: number;
    gainLoss: number;
    gainLossPercentage: number | null;
}

export interface LoanSummary {
    loan: LoanLike;
    projectedRemainingPaymentTotal: number;
    interestAccrued: number;
}

export interface NetWorthSummary {
    baseCurrency: string;
    totalAccounts: number;
    totalAssets: number;
    totalInvestments: number;
    totalLiabilities: number;
    netWorth: number;
}

export interface FinancialIntelligenceOverview {
    baseCurrency: string;
    accounts: AccountBalance[];
    goals: GoalProgress[];
    investments: InvestmentPerformance[];
    loans: LoanSummary[];
    netWorth: NetWorthSummary;
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
