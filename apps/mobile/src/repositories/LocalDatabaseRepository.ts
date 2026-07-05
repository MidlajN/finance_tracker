import * as SQLite from "expo-sqlite";

import type {
  CachedBudget,
  CachedCategory,
  CachedFinancialEvent,
  CachedFinancialRule,
  CachedMerchant,
  CachedTransaction,
  FinancialEventInput,
  Json,
} from "@finance/shared-types";
import type {
  SyncOperation,
  SyncQueueItem,
  SyncQueueStatus,
} from "@finance/shared-api";

const DATABASE_NAME = "finance-platform.db";
const SCHEMA_VERSION = "3";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getLocalDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

function serializeJson(value: Json | null | undefined) {
  return JSON.stringify(value ?? null);
}

function serializePersistenceJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function parseJson(value: string | null): Json | null {
  if (!value) {
    return null;
  }

  return JSON.parse(value) as Json;
}

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function initializeLocalDatabase() {
  const database = await getLocalDatabase();

  await database.execAsync(`
    create table if not exists app_metadata (
      key text primary key not null,
      value text not null,
      updated_at text not null
    );

    create table if not exists cached_financial_events (
      id text primary key not null,
      amount real not null,
      confidence real,
      currency text not null,
      direction text not null,
      merchant_id text,
      merchant_name_raw text,
      metadata text,
      notes text,
      occurred_at text not null,
      status text not null,
      source text not null,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_financial_events_status
      on cached_financial_events(status);

    create index if not exists idx_cached_financial_events_occurred_at
      on cached_financial_events(occurred_at);

    create table if not exists cached_transactions (
      id text primary key not null,
      event_id text not null,
      amount real not null,
      category_id text,
      currency text not null,
      merchant_id text,
      notes text,
      occurred_at text not null,
      transaction_type text not null,
      merchant text,
      category text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_transactions_occurred_at
      on cached_transactions(occurred_at);

    create table if not exists cached_categories (
      id text primary key not null,
      name text not null,
      icon text,
      color text,
      is_system integer not null,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_categories_name
      on cached_categories(name);

    create table if not exists cached_merchants (
      id text primary key not null,
      name text not null,
      normalized_name text,
      usage_count integer not null,
      category_id text,
      category text,
      last_seen_at text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_merchants_name
      on cached_merchants(name);

    create table if not exists cached_budgets (
      id text primary key not null,
      amount real not null,
      category_id text,
      currency text not null,
      month_start text not null,
      category text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_budgets_month
      on cached_budgets(month_start);

    create table if not exists cached_rules (
      id text primary key not null,
      name text not null,
      match_operator text not null,
      match_value text not null,
      merchant_id text,
      merchant text,
      category_id text,
      category text,
      auto_confirm integer not null,
      enabled integer not null,
      priority integer not null,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_rules_enabled_priority
      on cached_rules(enabled, priority);

    create table if not exists sync_queue (
      id text primary key not null,
      operation text not null,
      payload text not null,
      timestamp text not null,
      device_id text not null,
      request_id text not null,
      status text not null,
      attempts integer not null,
      last_error text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_sync_queue_status_created
      on sync_queue(status, created_at);

    create unique index if not exists idx_sync_queue_request_id
      on sync_queue(request_id);
  `);

  await database.runAsync(
    `
      insert into app_metadata (key, value, updated_at)
      values (?, ?, ?)
      on conflict(key) do update set
        value = excluded.value,
        updated_at = excluded.updated_at;
    `,
    ["schema_version", SCHEMA_VERSION, new Date().toISOString()]
  );
}

export class AppMetadataRepository {
  static async get(key: string) {
    const database = await getLocalDatabase();
    const row = await database.getFirstAsync<{ value: string }>(
      `
        select value
        from app_metadata
        where key = ?;
      `,
      [key]
    );

    return row?.value ?? null;
  }

  static async set(key: string, value: string) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into app_metadata (key, value, updated_at)
        values (?, ?, ?)
        on conflict(key) do update set
          value = excluded.value,
          updated_at = excluded.updated_at;
      `,
      [key, value, new Date().toISOString()]
    );
  }
}

export class LocalEventRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedFinancialEventRow>(
      `
        select *
        from cached_financial_events
        order by occurred_at desc;
      `
    );

    return rows.map(toCachedFinancialEvent);
  }

  static async upsert(event: CachedFinancialEvent) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_financial_events (
          id,
          amount,
          confidence,
          currency,
          direction,
          merchant_id,
          merchant_name_raw,
          metadata,
          notes,
          occurred_at,
          status,
          source,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          amount = excluded.amount,
          confidence = excluded.confidence,
          currency = excluded.currency,
          direction = excluded.direction,
          merchant_id = excluded.merchant_id,
          merchant_name_raw = excluded.merchant_name_raw,
          metadata = excluded.metadata,
          notes = excluded.notes,
          occurred_at = excluded.occurred_at,
          status = excluded.status,
          source = excluded.source,
          updated_at = excluded.updated_at;
      `,
      [
        event.id,
        event.amount,
        event.confidence ?? null,
        event.currency ?? "INR",
        event.direction,
        event.merchant_id ?? null,
        event.merchant_name_raw ?? null,
        serializeJson(event.metadata),
        event.notes ?? null,
        event.occurred_at,
        event.status ?? "pending",
        event.source,
        event.created_at,
        event.updated_at,
      ]
    );
  }

  static async update(
    id: string,
    updates: Partial<FinancialEventInput>
  ) {
    const existing = (await this.list()).find((event) => event.id === id);

    if (!existing) {
      throw new Error("Financial Event not found.");
    }

    const updatedEvent: CachedFinancialEvent = {
      ...existing,
      ...updates,
      id: existing.id,
      currency: updates.currency ?? existing.currency ?? "INR",
      status: updates.status ?? existing.status ?? "pending",
      updated_at: new Date().toISOString(),
    };

    await this.upsert(updatedEvent);

    return updatedEvent;
  }

  static async delete(id: string) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        delete from cached_financial_events
        where id = ?;
      `,
      [id]
    );
  }

  static async createPending(
    event: FinancialEventInput,
    source: string,
    id = createLocalId("event")
  ) {
    const now = new Date().toISOString();
    const cachedEvent: CachedFinancialEvent = {
      ...event,
      id,
      currency: event.currency ?? "INR",
      status: event.status ?? "pending",
      source,
      created_at: now,
      updated_at: now,
    };

    await this.upsert(cachedEvent);

    return cachedEvent;
  }
}

export class LocalTransactionRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedTransactionRow>(
      `
        select *
        from cached_transactions
        order by occurred_at desc;
      `
    );

    return rows.map(toCachedTransaction);
  }

  static async upsert(transaction: CachedTransaction) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_transactions (
          id,
          event_id,
          amount,
          category_id,
          currency,
          merchant_id,
          notes,
          occurred_at,
          transaction_type,
          merchant,
          category,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          event_id = excluded.event_id,
          amount = excluded.amount,
          category_id = excluded.category_id,
          currency = excluded.currency,
          merchant_id = excluded.merchant_id,
          notes = excluded.notes,
          occurred_at = excluded.occurred_at,
          transaction_type = excluded.transaction_type,
          merchant = excluded.merchant,
          category = excluded.category,
          updated_at = excluded.updated_at;
      `,
      [
        transaction.id,
        transaction.event_id,
        transaction.amount,
        transaction.category_id ?? null,
        transaction.currency ?? "INR",
        transaction.merchant_id ?? null,
        transaction.notes ?? null,
        transaction.occurred_at,
        transaction.transaction_type,
        serializePersistenceJson(transaction.merchant),
        serializePersistenceJson(transaction.category),
        transaction.created_at,
        transaction.updated_at,
      ]
    );
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_transactions;");
  }
}

export class LocalCategoryRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedCategoryRow>(
      `
        select *
        from cached_categories
        order by name asc;
      `
    );

    return rows.map(toCachedCategory);
  }

  static async upsert(category: CachedCategory) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_categories (
          id,
          name,
          icon,
          color,
          is_system,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          icon = excluded.icon,
          color = excluded.color,
          is_system = excluded.is_system,
          updated_at = excluded.updated_at;
      `,
      [
        category.id,
        category.name ?? "Uncategorized",
        category.icon ?? null,
        category.color ?? null,
        category.is_system ? 1 : 0,
        category.created_at,
        category.updated_at,
      ]
    );
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_categories;");
  }
}

export class LocalMerchantRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedMerchantRow>(
      `
        select *
        from cached_merchants
        order by usage_count desc, name asc;
      `
    );

    return rows.map(toCachedMerchant);
  }

  static async upsert(merchant: CachedMerchant) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_merchants (
          id,
          name,
          normalized_name,
          usage_count,
          category_id,
          category,
          last_seen_at,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          normalized_name = excluded.normalized_name,
          usage_count = excluded.usage_count,
          category_id = excluded.category_id,
          category = excluded.category,
          last_seen_at = excluded.last_seen_at,
          updated_at = excluded.updated_at;
      `,
      [
        merchant.id,
        merchant.name,
        merchant.normalized_name ?? null,
        merchant.usage_count ?? 0,
        merchant.category_id ?? null,
        serializePersistenceJson(merchant.category),
        merchant.last_seen_at ?? null,
        merchant.created_at,
        merchant.updated_at,
      ]
    );
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_merchants;");
  }
}

export class LocalBudgetRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedBudgetRow>(
      `
        select *
        from cached_budgets
        order by month_start desc;
      `
    );

    return rows.map(toCachedBudget);
  }

  static async upsert(budget: CachedBudget) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_budgets (
          id,
          amount,
          category_id,
          currency,
          month_start,
          category,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          amount = excluded.amount,
          category_id = excluded.category_id,
          currency = excluded.currency,
          month_start = excluded.month_start,
          category = excluded.category,
          updated_at = excluded.updated_at;
      `,
      [
        budget.id,
        budget.amount,
        budget.category_id,
        budget.currency,
        budget.month_start ?? new Date().toISOString().slice(0, 7) + "-01",
        serializePersistenceJson(budget.category),
        budget.created_at,
        budget.updated_at,
      ]
    );
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_budgets;");
  }
}

export class LocalRuleRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedFinancialRuleRow>(
      `
        select *
        from cached_rules
        order by priority asc, created_at asc;
      `
    );

    return rows.map(toCachedFinancialRule);
  }

  static async upsert(rule: CachedFinancialRule) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_rules (
          id,
          name,
          match_operator,
          match_value,
          merchant_id,
          merchant,
          category_id,
          category,
          auto_confirm,
          enabled,
          priority,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          match_operator = excluded.match_operator,
          match_value = excluded.match_value,
          merchant_id = excluded.merchant_id,
          merchant = excluded.merchant,
          category_id = excluded.category_id,
          category = excluded.category,
          auto_confirm = excluded.auto_confirm,
          enabled = excluded.enabled,
          priority = excluded.priority,
          updated_at = excluded.updated_at;
      `,
      [
        rule.id,
        rule.name,
        rule.match_operator,
        rule.match_value,
        rule.merchant_id ?? null,
        serializePersistenceJson(rule.merchant),
        rule.category_id ?? null,
        serializePersistenceJson(rule.category),
        rule.auto_confirm ? 1 : 0,
        rule.enabled ? 1 : 0,
        rule.priority,
        rule.created_at,
        rule.updated_at,
      ]
    );
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_rules;");
  }
}

export class SyncQueueRepository {
  static async enqueue<TPayload>(
    operation: SyncOperation,
    payload: TPayload,
    deviceId: string,
    requestId = createLocalId("request")
  ) {
    const now = new Date().toISOString();
    const item: SyncQueueItem<TPayload> = {
      id: createLocalId("sync"),
      operation,
      payload,
      timestamp: now,
      deviceId,
      requestId,
      status: "pending",
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };

    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into sync_queue (
          id,
          operation,
          payload,
          timestamp,
          device_id,
          request_id,
          status,
          attempts,
          last_error,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(request_id) do update set
          operation = excluded.operation,
          payload = excluded.payload,
          timestamp = excluded.timestamp,
          device_id = excluded.device_id,
          status = case
            when sync_queue.status = 'synced' then sync_queue.status
            else 'pending'
          end,
          last_error = null,
          updated_at = excluded.updated_at;
      `,
      [
        item.id,
        item.operation,
        serializeJson(payload as Json),
        item.timestamp,
        item.deviceId,
        item.requestId,
        item.status,
        item.attempts,
        item.lastError,
        item.createdAt,
        item.updatedAt,
      ]
    );

    const row = await database.getFirstAsync<SyncQueueRow>(
      `
        select *
        from sync_queue
        where request_id = ?;
      `,
      [requestId]
    );

    return row ? toSyncQueueItem<TPayload>(row) : item;
  }

  static async listPending() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<SyncQueueRow>(
      `
        select *
        from sync_queue
        where status in ('pending', 'failed', 'retrying')
        order by created_at asc;
      `
    );

    return rows.map((row) => toSyncQueueItem(row));
  }

  static async setStatus(
    id: string,
    status: SyncQueueStatus,
    lastError: string | null = null
  ) {
    const database = await getLocalDatabase();
    const attemptIncrement = status === "uploading" ? 1 : 0;

    await database.runAsync(
      `
        update sync_queue
        set
          status = ?,
          last_error = ?,
          attempts = attempts + ?,
          updated_at = ?
        where id = ?;
      `,
      [
        status,
        lastError,
        attemptIncrement,
        new Date().toISOString(),
        id,
      ]
    );
  }
}

interface CachedFinancialEventRow {
  id: string;
  amount: number;
  confidence: number | null;
  currency: string;
  direction: CachedFinancialEvent["direction"];
  merchant_id: string | null;
  merchant_name_raw: string | null;
  metadata: string | null;
  notes: string | null;
  occurred_at: string;
  status: CachedFinancialEvent["status"];
  source: string;
  created_at: string;
  updated_at: string;
}

interface CachedTransactionRow {
  id: string;
  event_id: string;
  amount: number;
  category_id: string | null;
  currency: string;
  merchant_id: string | null;
  notes: string | null;
  occurred_at: string;
  transaction_type: CachedTransaction["transaction_type"];
  merchant: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

interface CachedCategoryRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_system: number;
  created_at: string;
  updated_at: string;
}

interface CachedMerchantRow {
  id: string;
  name: string;
  normalized_name: string | null;
  usage_count: number;
  category_id: string | null;
  category: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CachedBudgetRow {
  id: string;
  amount: number;
  category_id: string | null;
  currency: string;
  month_start: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

interface CachedFinancialRuleRow {
  id: string;
  name: string;
  match_operator: string;
  match_value: string;
  merchant_id: string | null;
  merchant: string | null;
  category_id: string | null;
  category: string | null;
  auto_confirm: number;
  enabled: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface SyncQueueRow {
  id: string;
  operation: SyncOperation;
  payload: string;
  timestamp: string;
  device_id: string;
  request_id: string;
  status: SyncQueueStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function toCachedFinancialEvent(
  row: CachedFinancialEventRow
): CachedFinancialEvent {
  return {
    id: row.id,
    amount: row.amount,
    confidence: row.confidence ?? undefined,
    currency: row.currency,
    direction: row.direction,
    merchant_id: row.merchant_id,
    merchant_name_raw: row.merchant_name_raw,
    metadata: parseJson(row.metadata),
    notes: row.notes,
    occurred_at: row.occurred_at,
    status: row.status,
    source: row.source,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedTransaction(
  row: CachedTransactionRow
): CachedTransaction {
  return {
    id: row.id,
    event_id: row.event_id,
    amount: row.amount,
    category_id: row.category_id,
    currency: row.currency,
    merchant_id: row.merchant_id,
    notes: row.notes,
    occurred_at: row.occurred_at,
    transaction_type: row.transaction_type,
    merchant: parseJson(row.merchant) as CachedTransaction["merchant"],
    category: parseJson(row.category) as CachedTransaction["category"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedCategory(row: CachedCategoryRow): CachedCategory {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    is_system: Boolean(row.is_system),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedMerchant(row: CachedMerchantRow): CachedMerchant {
  return {
    id: row.id,
    name: row.name,
    normalized_name: row.normalized_name,
    usage_count: row.usage_count,
    category_id: row.category_id,
    category: parseJson(row.category) as CachedMerchant["category"],
    last_seen_at: row.last_seen_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedBudget(row: CachedBudgetRow): CachedBudget {
  return {
    id: row.id,
    amount: row.amount,
    category_id: row.category_id,
    currency: row.currency,
    month_start: row.month_start,
    category: parseJson(row.category) as CachedBudget["category"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedFinancialRule(
  row: CachedFinancialRuleRow
): CachedFinancialRule {
  return {
    id: row.id,
    name: row.name,
    match_operator: row.match_operator,
    match_value: row.match_value,
    merchant_id: row.merchant_id,
    merchant: parseJson(row.merchant) as CachedFinancialRule["merchant"],
    category_id: row.category_id,
    category: parseJson(row.category) as CachedFinancialRule["category"],
    auto_confirm: Boolean(row.auto_confirm),
    enabled: Boolean(row.enabled),
    priority: row.priority,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toSyncQueueItem<TPayload = unknown>(
  row: SyncQueueRow
): SyncQueueItem<TPayload> {
  return {
    id: row.id,
    operation: row.operation,
    payload: parseJson(row.payload) as TPayload,
    timestamp: row.timestamp,
    deviceId: row.device_id,
    requestId: row.request_id,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
