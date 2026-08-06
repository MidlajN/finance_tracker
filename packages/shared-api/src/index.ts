import type {
    AccountLike,
    AssetLike,
    BudgetLike,
    CachedFinancialRule,
    CategoryLike,
    FinancialEventInput,
    GoalLike,
    ImportResult,
    InvestmentLike,
    LiabilityLike,
    LoanLike,
    MerchantAliasLike,
    MerchantLike,
    ParsedFinancialEvent,
} from "@finance/shared-types";

export const API_VERSION = "v1";

export const API_BASE_PATH = `/api/${API_VERSION}`;

export const API_RESOURCES = {
    financialEvents: "financial-events",
    transactions: "transactions",
    merchants: "merchants",
    categories: "categories",
    budgets: "budgets",
    accounts: "accounts",
    assets: "assets",
    liabilities: "liabilities",
    loans: "loans",
    investments: "investments",
    goals: "goals",
    currencies: "currencies",
    exchangeRates: "exchange-rates",
    rules: "rules",
    reports: "reports",
    sync: "sync",
} as const;

export type ApiResource =
    (typeof API_RESOURCES)[keyof typeof API_RESOURCES];

export interface ApiErrorResponse {
    code: string;
    message: string;
}

export type ApiResponse<TData> =
    | {
          ok: true;
          data: TData;
      }
    | {
          ok: false;
          error: ApiErrorResponse;
      };

export interface PaginatedResponse<TItem> {
    items: TItem[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface CreateFinancialEventRequest {
    event: FinancialEventInput;
    idempotencyKey?: string;
}

export interface CreateFinancialEventSyncPayload
    extends CreateFinancialEventRequest {
    localEventId: string;
    source: string;
}

export interface UpdateFinancialEventSyncPayload {
    eventId: string;
    updates: Partial<FinancialEventInput>;
}

export interface DeleteFinancialEventSyncPayload {
    eventId: string;
}

export interface TransactionUpdates {
    account_id?: string | null;
    amount?: number;
    category_id?: string | null;
    notes?: string | null;
    occurred_at?: string;
    transaction_type?: string;
}

export interface UpdateTransactionSyncPayload {
    transactionId: string;
    updates: TransactionUpdates;
}

export interface ConfirmFinancialEventSyncPayload {
    eventId: string;
}

export interface IgnoreFinancialEventSyncPayload {
    eventId: string;
}

export interface CreateResourceSyncPayload<
    TResource,
> {
    localId: string;
    resource: TResource;
}

export interface UpdateResourceSyncPayload<
    TResource,
> {
    id: string;
    updates: Partial<TResource>;
}

export interface DeleteResourceSyncPayload {
    id: string;
}

export type CreateAccountSyncPayload =
    CreateResourceSyncPayload<AccountLike>;
export type CreateBudgetSyncPayload =
    CreateResourceSyncPayload<BudgetLike>;
export type CreateCategorySyncPayload =
    CreateResourceSyncPayload<CategoryLike>;
export type CreateMerchantSyncPayload =
    CreateResourceSyncPayload<MerchantLike>;
export type UpdateMerchantSyncPayload =
    UpdateResourceSyncPayload<MerchantLike>;
export type CreateMerchantAliasSyncPayload =
    CreateResourceSyncPayload<MerchantAliasLike>;
export type CreateFinancialRuleSyncPayload =
    CreateResourceSyncPayload<CachedFinancialRule>;
export type UpdateAccountSyncPayload =
    UpdateResourceSyncPayload<AccountLike>;
export type CreateAssetSyncPayload =
    CreateResourceSyncPayload<AssetLike>;
export type UpdateAssetSyncPayload =
    UpdateResourceSyncPayload<AssetLike>;
export type CreateLiabilitySyncPayload =
    CreateResourceSyncPayload<LiabilityLike>;
export type UpdateLiabilitySyncPayload =
    UpdateResourceSyncPayload<LiabilityLike>;
export type CreateLoanSyncPayload =
    CreateResourceSyncPayload<LoanLike>;
export type UpdateLoanSyncPayload =
    UpdateResourceSyncPayload<LoanLike>;
export type CreateInvestmentSyncPayload =
    CreateResourceSyncPayload<InvestmentLike>;
export type UpdateInvestmentSyncPayload =
    UpdateResourceSyncPayload<InvestmentLike>;
export type CreateGoalSyncPayload =
    CreateResourceSyncPayload<GoalLike>;
export type UpdateGoalSyncPayload =
    UpdateResourceSyncPayload<GoalLike>;

export interface SubmitParsedFinancialEventRequest {
    parsedEvent: ParsedFinancialEvent;
    idempotencyKey?: string;
}

export type SyncOperation =
    | "create_financial_event"
    | "update_financial_event"
    | "delete_financial_event"
    | "create_account"
    | "update_account"
    | "delete_account"
    | "create_asset"
    | "update_asset"
    | "delete_asset"
    | "create_liability"
    | "update_liability"
    | "delete_liability"
    | "create_loan"
    | "update_loan"
    | "delete_loan"
    | "create_investment"
    | "update_investment"
    | "delete_investment"
    | "create_goal"
    | "update_goal"
    | "delete_goal"
    | "confirm_event"
    | "ignore_event"
    | "create_merchant"
    | "create_merchant_alias"
    | "delete_merchant_alias"
    | "update_merchant"
    | "update_transaction"
    | "create_category"
    | "create_budget"
    | "create_rule";

export type SyncQueueStatus =
    | "pending"
    | "uploading"
    | "synced"
    | "failed"
    | "retrying";

export interface SyncRequest<TPayload = unknown> {
    operation: SyncOperation;
    payload: TPayload;
    timestamp: string;
    deviceId: string;
    requestId: string;
}

export interface SyncQueueItem<
    TPayload = unknown,
> extends SyncRequest<TPayload> {
    id: string;
    status: SyncQueueStatus;
    attempts: number;
    lastError: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SyncAcknowledgement {
    requestId: string;
    accepted: boolean;
    synchronizedAt: string;
}

export type ImportResponse =
    ApiResponse<ImportResult>;
