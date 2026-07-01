import type {
    FinancialEventInput,
    ImportResult,
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

export interface SubmitParsedFinancialEventRequest {
    parsedEvent: ParsedFinancialEvent;
    idempotencyKey?: string;
}

export type SyncOperation =
    | "create_financial_event"
    | "update_financial_event"
    | "confirm_event"
    | "ignore_event"
    | "create_merchant"
    | "update_merchant"
    | "update_transaction"
    | "create_budget";

export interface SyncRequest<TPayload = unknown> {
    operation: SyncOperation;
    payload: TPayload;
    timestamp: string;
    deviceId: string;
    requestId: string;
}

export interface SyncAcknowledgement {
    requestId: string;
    accepted: boolean;
    synchronizedAt: string;
}

export type ImportResponse =
    ApiResponse<ImportResult>;
