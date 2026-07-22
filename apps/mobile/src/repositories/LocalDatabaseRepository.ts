import * as SQLite from "expo-sqlite";

import type {
  CachedBudget,
  CachedAccount,
  CachedAsset,
  CachedCategory,
  CachedFinancialEvent,
  CachedFinancialRule,
  CachedGoal,
  CachedInvestment,
  CachedLiability,
  CachedLoan,
  CachedMerchant,
  CachedTransaction,
  CurrencyLike,
  ExchangeRateLike,
  FinancialEventInput,
  Json,
} from "@finance/shared-types";
import type {
  SyncOperation,
  SyncQueueItem,
  SyncQueueStatus,
} from "@finance/shared-api";

const DATABASE_NAME = "finance-platform.db";
const SCHEMA_VERSION = "4";

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

async function ensureColumn(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string
) {
  const rows = await database.getAllAsync<{ name: string }>(
    `pragma table_info(${table});`
  );

  if (!rows.some((row) => row.name === column)) {
    await database.execAsync(
      `alter table ${table} add column ${definition};`
    );
  }
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
      account_id text,
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

    create index if not exists idx_cached_transactions_account
      on cached_transactions(account_id);

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

    create table if not exists cached_currencies (
      code text primary key not null,
      name text not null,
      symbol text not null,
      decimal_precision integer not null
    );

    create table if not exists cached_exchange_rates (
      id text primary key not null,
      base_currency text not null,
      quote_currency text not null,
      rate real not null,
      valid_on text not null,
      source text not null,
      created_at text not null
    );

    create index if not exists idx_cached_exchange_rates_pair_date
      on cached_exchange_rates(base_currency, quote_currency, valid_on);

    create table if not exists cached_accounts (
      id text primary key not null,
      name text not null,
      account_type text not null,
      currency text not null,
      opening_balance real not null,
      institution text,
      archived integer not null,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_accounts_archived_name
      on cached_accounts(archived, name);

    create table if not exists cached_assets (
      id text primary key not null,
      name text not null,
      asset_type text not null,
      currency text not null,
      quantity real not null,
      acquisition_value real not null,
      current_valuation real not null,
      acquisition_date text not null,
      notes text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_assets_name
      on cached_assets(name);

    create table if not exists cached_liabilities (
      id text primary key not null,
      name text not null,
      liability_type text not null,
      currency text not null,
      outstanding_balance real not null,
      original_amount real not null,
      interest_rate real not null,
      start_date text not null,
      end_date text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_liabilities_name
      on cached_liabilities(name);

    create table if not exists cached_loans (
      id text primary key not null,
      liability_id text not null,
      loan_type text not null,
      monthly_payment real not null,
      remaining_payments integer not null,
      interest_accrued real not null,
      liability text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_loans_liability
      on cached_loans(liability_id);

    create table if not exists cached_investments (
      id text primary key not null,
      symbol text not null,
      quantity real not null,
      average_purchase_price real not null,
      current_price real,
      currency text not null,
      exchange text,
      purchase_history text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_investments_symbol
      on cached_investments(symbol);

    create table if not exists cached_goals (
      id text primary key not null,
      name text not null,
      target_amount real not null,
      currency text not null,
      target_date text,
      status text not null,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_cached_goals_status_date
      on cached_goals(status, target_date);

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

  await ensureColumn(
    database,
    "cached_transactions",
    "account_id",
    "account_id text"
  );

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
        select
          cached_transactions.*,
          cached_financial_events.id as event_id_joined,
          cached_financial_events.amount as event_amount,
          cached_financial_events.confidence as event_confidence,
          cached_financial_events.currency as event_currency,
          cached_financial_events.direction as event_direction,
          cached_financial_events.merchant_id as event_merchant_id,
          cached_financial_events.merchant_name_raw as event_merchant_name_raw,
          cached_financial_events.metadata as event_metadata,
          cached_financial_events.notes as event_notes,
          cached_financial_events.occurred_at as event_occurred_at,
          cached_financial_events.status as event_status,
          cached_financial_events.source as event_source,
          cached_financial_events.created_at as event_created_at,
          cached_financial_events.updated_at as event_updated_at
        from cached_transactions
        left join cached_financial_events
          on cached_financial_events.id = cached_transactions.event_id
        order by cached_transactions.occurred_at desc;
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
          account_id,
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
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          event_id = excluded.event_id,
          account_id = excluded.account_id,
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
        transaction.account_id ?? null,
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

export class LocalCurrencyRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CurrencyLike>(
      `
        select *
        from cached_currencies
        order by code asc;
      `
    );

    return rows;
  }

  static async upsert(currency: CurrencyLike) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_currencies (
          code,
          name,
          symbol,
          decimal_precision
        )
        values (?, ?, ?, ?)
        on conflict(code) do update set
          name = excluded.name,
          symbol = excluded.symbol,
          decimal_precision = excluded.decimal_precision;
      `,
      [
        currency.code,
        currency.name,
        currency.symbol,
        currency.decimal_precision,
      ]
    );
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_currencies;");
  }
}

export class LocalExchangeRateRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedExchangeRateRow>(
      `
        select *
        from cached_exchange_rates
        order by valid_on desc;
      `
    );

    return rows.map(toExchangeRate);
  }

  static async upsert(rate: ExchangeRateLike) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_exchange_rates (
          id,
          base_currency,
          quote_currency,
          rate,
          valid_on,
          source,
          created_at
        )
        values (?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          base_currency = excluded.base_currency,
          quote_currency = excluded.quote_currency,
          rate = excluded.rate,
          valid_on = excluded.valid_on,
          source = excluded.source,
          created_at = excluded.created_at;
      `,
      [
        rate.id ?? createLocalId("rate"),
        rate.base_currency,
        rate.quote_currency,
        rate.rate,
        rate.valid_on,
        rate.source,
        rate.created_at ?? new Date().toISOString(),
      ]
    );
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_exchange_rates;");
  }
}

export class LocalAccountRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedAccountRow>(
      `
        select *
        from cached_accounts
        order by archived asc, name asc;
      `
    );

    return rows.map(toCachedAccount);
  }

  static async upsert(account: CachedAccount) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_accounts (
          id,
          name,
          account_type,
          currency,
          opening_balance,
          institution,
          archived,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          account_type = excluded.account_type,
          currency = excluded.currency,
          opening_balance = excluded.opening_balance,
          institution = excluded.institution,
          archived = excluded.archived,
          updated_at = excluded.updated_at;
      `,
      [
        account.id,
        account.name,
        account.account_type,
        account.currency,
        account.opening_balance,
        account.institution ?? null,
        account.archived ? 1 : 0,
        account.created_at,
        account.updated_at,
      ]
    );
  }

  static async delete(id: string) {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_accounts where id = ?;", [
      id,
    ]);
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_accounts;");
  }
}

export class LocalAssetRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedAssetRow>(
      `
        select *
        from cached_assets
        order by name asc;
      `
    );

    return rows.map(toCachedAsset);
  }

  static async upsert(asset: CachedAsset) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_assets (
          id,
          name,
          asset_type,
          currency,
          quantity,
          acquisition_value,
          current_valuation,
          acquisition_date,
          notes,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          asset_type = excluded.asset_type,
          currency = excluded.currency,
          quantity = excluded.quantity,
          acquisition_value = excluded.acquisition_value,
          current_valuation = excluded.current_valuation,
          acquisition_date = excluded.acquisition_date,
          notes = excluded.notes,
          updated_at = excluded.updated_at;
      `,
      [
        asset.id,
        asset.name,
        asset.asset_type,
        asset.currency,
        asset.quantity,
        asset.acquisition_value,
        asset.current_valuation,
        asset.acquisition_date,
        asset.notes ?? null,
        asset.created_at,
        asset.updated_at,
      ]
    );
  }

  static async delete(id: string) {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_assets where id = ?;", [id]);
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_assets;");
  }
}

export class LocalLiabilityRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedLiabilityRow>(
      `
        select *
        from cached_liabilities
        order by name asc;
      `
    );

    return rows.map(toCachedLiability);
  }

  static async upsert(liability: CachedLiability) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_liabilities (
          id,
          name,
          liability_type,
          currency,
          outstanding_balance,
          original_amount,
          interest_rate,
          start_date,
          end_date,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          liability_type = excluded.liability_type,
          currency = excluded.currency,
          outstanding_balance = excluded.outstanding_balance,
          original_amount = excluded.original_amount,
          interest_rate = excluded.interest_rate,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          updated_at = excluded.updated_at;
      `,
      [
        liability.id,
        liability.name,
        liability.liability_type,
        liability.currency,
        liability.outstanding_balance,
        liability.original_amount,
        liability.interest_rate,
        liability.start_date,
        liability.end_date ?? null,
        liability.created_at,
        liability.updated_at,
      ]
    );
  }

  static async delete(id: string) {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_liabilities where id = ?;", [
      id,
    ]);
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_liabilities;");
  }
}

export class LocalLoanRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedLoanRow>(
      `
        select *
        from cached_loans
        order by created_at desc;
      `
    );

    return rows.map(toCachedLoan);
  }

  static async upsert(loan: CachedLoan) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_loans (
          id,
          liability_id,
          loan_type,
          monthly_payment,
          remaining_payments,
          interest_accrued,
          liability,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          liability_id = excluded.liability_id,
          loan_type = excluded.loan_type,
          monthly_payment = excluded.monthly_payment,
          remaining_payments = excluded.remaining_payments,
          interest_accrued = excluded.interest_accrued,
          liability = excluded.liability,
          updated_at = excluded.updated_at;
      `,
      [
        loan.id,
        loan.liability_id,
        loan.loan_type,
        loan.monthly_payment,
        loan.remaining_payments,
        loan.interest_accrued,
        serializePersistenceJson(loan.liability),
        loan.created_at,
        loan.updated_at,
      ]
    );
  }

  static async delete(id: string) {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_loans where id = ?;", [id]);
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_loans;");
  }
}

export class LocalInvestmentRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedInvestmentRow>(
      `
        select *
        from cached_investments
        order by symbol asc;
      `
    );

    return rows.map(toCachedInvestment);
  }

  static async upsert(investment: CachedInvestment) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_investments (
          id,
          symbol,
          quantity,
          average_purchase_price,
          current_price,
          currency,
          exchange,
          purchase_history,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          symbol = excluded.symbol,
          quantity = excluded.quantity,
          average_purchase_price = excluded.average_purchase_price,
          current_price = excluded.current_price,
          currency = excluded.currency,
          exchange = excluded.exchange,
          purchase_history = excluded.purchase_history,
          updated_at = excluded.updated_at;
      `,
      [
        investment.id,
        investment.symbol,
        investment.quantity,
        investment.average_purchase_price,
        investment.current_price ?? null,
        investment.currency,
        investment.exchange ?? null,
        serializeJson(investment.purchase_history),
        investment.created_at,
        investment.updated_at,
      ]
    );
  }

  static async delete(id: string) {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_investments where id = ?;", [
      id,
    ]);
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_investments;");
  }
}

export class LocalGoalRepository {
  static async list() {
    const database = await getLocalDatabase();
    const rows = await database.getAllAsync<CachedGoalRow>(
      `
        select *
        from cached_goals
        order by status asc, target_date asc;
      `
    );

    return rows.map(toCachedGoal);
  }

  static async upsert(goal: CachedGoal) {
    const database = await getLocalDatabase();

    await database.runAsync(
      `
        insert into cached_goals (
          id,
          name,
          target_amount,
          currency,
          target_date,
          status,
          created_at,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          target_amount = excluded.target_amount,
          currency = excluded.currency,
          target_date = excluded.target_date,
          status = excluded.status,
          updated_at = excluded.updated_at;
      `,
      [
        goal.id,
        goal.name,
        goal.target_amount,
        goal.currency,
        goal.target_date ?? null,
        goal.status,
        goal.created_at,
        goal.updated_at,
      ]
    );
  }

  static async delete(id: string) {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_goals where id = ?;", [id]);
  }

  static async clear() {
    const database = await getLocalDatabase();

    await database.runAsync("delete from cached_goals;");
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
  account_id: string | null;
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
  event_id_joined: string | null;
  event_amount: number | null;
  event_confidence: number | null;
  event_currency: string | null;
  event_direction: CachedFinancialEvent["direction"] | null;
  event_merchant_id: string | null;
  event_merchant_name_raw: string | null;
  event_metadata: string | null;
  event_notes: string | null;
  event_occurred_at: string | null;
  event_status: CachedFinancialEvent["status"] | null;
  event_source: string | null;
  event_created_at: string | null;
  event_updated_at: string | null;
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

interface CachedExchangeRateRow {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  valid_on: string;
  source: string;
  created_at: string;
}

interface CachedAccountRow {
  id: string;
  name: string;
  account_type: CachedAccount["account_type"];
  currency: string;
  opening_balance: number;
  institution: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
}

interface CachedAssetRow {
  id: string;
  name: string;
  asset_type: CachedAsset["asset_type"];
  currency: string;
  quantity: number;
  acquisition_value: number;
  current_valuation: number;
  acquisition_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CachedLiabilityRow {
  id: string;
  name: string;
  liability_type: CachedLiability["liability_type"];
  currency: string;
  outstanding_balance: number;
  original_amount: number;
  interest_rate: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

interface CachedLoanRow {
  id: string;
  liability_id: string;
  loan_type: CachedLoan["loan_type"];
  monthly_payment: number;
  remaining_payments: number;
  interest_accrued: number;
  liability: string | null;
  created_at: string;
  updated_at: string;
}

interface CachedInvestmentRow {
  id: string;
  symbol: string;
  quantity: number;
  average_purchase_price: number;
  current_price: number | null;
  currency: string;
  exchange: string | null;
  purchase_history: string | null;
  created_at: string;
  updated_at: string;
}

interface CachedGoalRow {
  id: string;
  name: string;
  target_amount: number;
  currency: string;
  target_date: string | null;
  status: CachedGoal["status"];
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
  const event: CachedFinancialEvent | null =
    row.event_id_joined &&
    row.event_amount !== null &&
    row.event_currency &&
    row.event_direction &&
    row.event_occurred_at &&
    row.event_status &&
    row.event_source &&
    row.event_created_at &&
    row.event_updated_at
      ? {
          id: row.event_id_joined,
          amount: row.event_amount,
          confidence: row.event_confidence ?? undefined,
          currency: row.event_currency,
          direction: row.event_direction,
          merchant_id: row.event_merchant_id,
          merchant_name_raw: row.event_merchant_name_raw,
          metadata: parseJson(row.event_metadata),
          notes: row.event_notes,
          occurred_at: row.event_occurred_at,
          status: row.event_status,
          source: row.event_source,
          created_at: row.event_created_at,
          updated_at: row.event_updated_at,
        }
      : null;

  return {
    id: row.id,
    event_id: row.event_id,
    account_id: row.account_id,
    amount: row.amount,
    category_id: row.category_id,
    currency: row.currency,
    merchant_id: row.merchant_id,
    notes: row.notes,
    occurred_at: row.occurred_at,
    transaction_type: row.transaction_type,
    event,
    merchant: parseJson(row.merchant) as CachedTransaction["merchant"],
    category: parseJson(row.category) as CachedTransaction["category"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toExchangeRate(row: CachedExchangeRateRow): ExchangeRateLike {
  return {
    id: row.id,
    base_currency: row.base_currency,
    quote_currency: row.quote_currency,
    rate: row.rate,
    valid_on: row.valid_on,
    source: row.source,
    created_at: row.created_at,
  };
}

function toCachedAccount(row: CachedAccountRow): CachedAccount {
  return {
    id: row.id,
    name: row.name,
    account_type: row.account_type,
    currency: row.currency,
    opening_balance: row.opening_balance,
    institution: row.institution,
    archived: Boolean(row.archived),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedAsset(row: CachedAssetRow): CachedAsset {
  return {
    id: row.id,
    name: row.name,
    asset_type: row.asset_type,
    currency: row.currency,
    quantity: row.quantity,
    acquisition_value: row.acquisition_value,
    current_valuation: row.current_valuation,
    acquisition_date: row.acquisition_date,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedLiability(row: CachedLiabilityRow): CachedLiability {
  return {
    id: row.id,
    name: row.name,
    liability_type: row.liability_type,
    currency: row.currency,
    outstanding_balance: row.outstanding_balance,
    original_amount: row.original_amount,
    interest_rate: row.interest_rate,
    start_date: row.start_date,
    end_date: row.end_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedLoan(row: CachedLoanRow): CachedLoan {
  return {
    id: row.id,
    liability_id: row.liability_id,
    loan_type: row.loan_type,
    monthly_payment: row.monthly_payment,
    remaining_payments: row.remaining_payments,
    interest_accrued: row.interest_accrued,
    liability: parseJson(row.liability) as CachedLoan["liability"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedInvestment(row: CachedInvestmentRow): CachedInvestment {
  return {
    id: row.id,
    symbol: row.symbol,
    quantity: row.quantity,
    average_purchase_price: row.average_purchase_price,
    current_price: row.current_price,
    currency: row.currency,
    exchange: row.exchange,
    purchase_history: parseJson(row.purchase_history) ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedGoal(row: CachedGoalRow): CachedGoal {
  return {
    id: row.id,
    name: row.name,
    target_amount: row.target_amount,
    currency: row.currency,
    target_date: row.target_date,
    status: row.status,
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
