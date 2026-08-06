import type {
  CreateFinancialEventSyncPayload,
  ConfirmFinancialEventSyncPayload,
  CreateAccountSyncPayload,
  CreateAssetSyncPayload,
  CreateBudgetSyncPayload,
  CreateCategorySyncPayload,
  CreateFinancialRuleSyncPayload,
  CreateMerchantAliasSyncPayload,
  CreateMerchantSyncPayload,
  CreateGoalSyncPayload,
  CreateInvestmentSyncPayload,
  CreateLiabilitySyncPayload,
  CreateLoanSyncPayload,
  DeleteFinancialEventSyncPayload,
  DeleteResourceSyncPayload,
  IgnoreFinancialEventSyncPayload,
  SyncQueueItem,
  TransactionUpdates,
  UpdateTransactionSyncPayload,
  UpdateAccountSyncPayload,
  UpdateAssetSyncPayload,
  UpdateFinancialEventSyncPayload,
  UpdateGoalSyncPayload,
  UpdateInvestmentSyncPayload,
  UpdateLiabilitySyncPayload,
  UpdateLoanSyncPayload,
  UpdateMerchantSyncPayload,
} from "@finance/shared-api";
import type {
  ParsedAccountHint,
  AccountLike,
  AssetLike,
  BudgetLike,
  CachedAccount,
  CachedAsset,
  CachedBudget,
  CachedCategory,
  CachedFinancialEvent,
  CachedFinancialRule,
  CachedGoal,
  CachedInvestment,
  CachedLiability,
  CachedLoan,
  CachedMerchant,
  CachedMerchantAlias,
  CachedTransaction,
  CategoryLike,
  CurrencyLike,
  ExchangeRateLike,
  FinancialEventInput,
  FinancialRuleInput,
  GoalLike,
  InvestmentLike,
  Json,
  LiabilityLike,
  LoanLike,
  MerchantLike,
} from "@finance/shared-types";
import {
  matchAccountFromHint,
  matchMerchantFromRaw,
} from "@finance/finance-core";
import {
  getCurrentMonthStart,
  normalizeMerchantName,
} from "@finance/shared-utils";

import {
  AppMetadataRepository,
  initializeLocalDatabase,
  LocalAccountRepository,
  LocalAssetRepository,
  LocalBudgetRepository,
  LocalCategoryRepository,
  LocalEventRepository,
  LocalExchangeRateRepository,
  LocalGoalRepository,
  LocalInvestmentRepository,
  LocalLiabilityRepository,
  LocalLoanRepository,
  LocalCurrencyRepository,
  LocalMerchantAliasRepository,
  LocalMerchantRepository,
  LocalRuleRepository,
  LocalTransactionRepository,
  SyncQueueRepository,
} from "../repositories/LocalDatabaseRepository";
import { MobileRuleEngineService } from "./MobileRuleEngineService";
import type { ParsedNotificationResult } from "./NotificationService";

const ACCOUNT_TYPES = [
  "cash",
  "bank",
  "credit_card",
  "investment",
  "loan",
  "digital_wallet",
  "other",
] as const;

export interface OfflineSnapshot {
  accounts: CachedAccount[];
  assets: CachedAsset[];
  budgets: CachedBudget[];
  categories: CachedCategory[];
  currencies: CurrencyLike[];
  events: CachedFinancialEvent[];
  exchangeRates: ExchangeRateLike[];
  goals: CachedGoal[];
  investments: CachedInvestment[];
  liabilities: CachedLiability[];
  loans: CachedLoan[];
  merchantAliases: CachedMerchantAlias[];
  merchants: CachedMerchant[];
  rules: CachedFinancialRule[];
  transactions: CachedTransaction[];
  queue: SyncQueueItem[];
}

export interface PersistedFinancialEvent {
  event: CachedFinancialEvent;
  queueItem: SyncQueueItem<CreateFinancialEventSyncPayload>;
}

export interface UpdatedFinancialEvent {
  event: CachedFinancialEvent;
  queueItem: SyncQueueItem<UpdateFinancialEventSyncPayload>;
}

export interface ConfirmedFinancialEvent {
  event: CachedFinancialEvent;
  queueItem: SyncQueueItem<ConfirmFinancialEventSyncPayload>;
}

export interface IgnoredFinancialEvent {
  event: CachedFinancialEvent;
  queueItem: SyncQueueItem<IgnoreFinancialEventSyncPayload>;
}

const DEVICE_ID_KEY = "device_id";

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function formatUuid(hex: string, version: "4" | "5") {
  const characters = hex.padEnd(32, "0").slice(0, 32).split("");
  characters[12] = version;
  characters[16] = (8 + (Number.parseInt(characters[16], 16) % 4))
    .toString(16);
  const normalized = characters.join("");

  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20, 32),
  ].join("-");
}

function createRandomUuid() {
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  return formatUuid(hex, "4");
}

function hashToHex(value: string, seed: number) {
  let hash = 2166136261 ^ seed;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function createStableUuid(value: string) {
  const hex = [0, 1, 2, 3]
    .map((seed) => hashToHex(value, seed))
    .join("");

  return formatUuid(hex, "5");
}

function sanitizeIdSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
}

function getMetadataObject(metadata: Json | null | undefined) {
  return typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata)
    ? metadata
    : {};
}

function getMetadataString(
  metadata: Json | null | undefined,
  key: string
) {
  const value = getMetadataObject(metadata)[key];

  return typeof value === "string" && value.trim()
    ? value
    : null;
}

function getParsedAccountHint(metadata: Json | null | undefined) {
  const value = getMetadataObject(metadata).account_hint;

  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const hint = value as Partial<ParsedAccountHint>;
  const accountType = ACCOUNT_TYPES.includes(
    hint.accountType as (typeof ACCOUNT_TYPES)[number]
  )
    ? hint.accountType
    : null;

  return {
    accountType,
    last4: typeof hint.last4 === "string" ? hint.last4 : null,
    providerName:
      typeof hint.providerName === "string" ? hint.providerName : null,
    rawLabel: typeof hint.rawLabel === "string" ? hint.rawLabel : null,
  } satisfies ParsedAccountHint;
}

async function attachMatchedAccount(
  event: FinancialEventInput
): Promise<FinancialEventInput> {
  const metadata = getMetadataObject(event.metadata);
  const existingAccountId = getMetadataString(event.metadata, "account_id");

  if (existingAccountId) {
    return event;
  }

  const accountHint = getParsedAccountHint(event.metadata);
  const matchedAccount = matchAccountFromHint(
    accountHint,
    await LocalAccountRepository.list()
  );

  if (!matchedAccount) {
    return event;
  }

  return {
    ...event,
    metadata: {
      ...metadata,
      account_id: matchedAccount.id,
      account_match: {
        account_id: matchedAccount.id,
        matched_at: new Date().toISOString(),
        strategy: "notification_account_hint",
      },
    },
  };
}

async function attachMatchedMerchant(
  event: FinancialEventInput
): Promise<FinancialEventInput> {
  if (event.merchant_id) {
    return event;
  }

  const [merchants, aliases] = await Promise.all([
    LocalMerchantRepository.list(),
    LocalMerchantAliasRepository.list(),
  ]);
  const matchedMerchant = matchMerchantFromRaw(
    event.merchant_name_raw,
    merchants,
    aliases
  );

  if (!matchedMerchant) {
    return event;
  }

  return {
    ...event,
    merchant_id: matchedMerchant.id,
    metadata: {
      ...getMetadataObject(event.metadata),
      merchant_match: {
        matched_at: new Date().toISOString(),
        merchant_id: matchedMerchant.id,
        strategy: "merchant_name_match",
      },
    },
  };
}

function getStableLocalEventId(event: FinancialEventInput) {
  const source = getMetadataString(event.metadata, "source");
  const reference = getMetadataString(event.metadata, "reference");
  const packageName = getMetadataString(event.metadata, "packageName");

  if (!source || !reference) {
    return createRandomUuid();
  }

  return createStableUuid(
    `${sanitizeIdSegment(source)}:${sanitizeIdSegment(packageName ?? "unknown")}:${reference}`
  );
}

function toFinancialEventInput(
  event: CachedFinancialEvent
): FinancialEventInput {
  return {
    amount: event.amount,
    confidence: event.confidence,
    currency: event.currency,
    direction: event.direction,
    merchant_id: event.merchant_id,
    merchant_name_raw: event.merchant_name_raw,
    metadata: event.metadata,
    notes: event.notes,
    occurred_at: event.occurred_at,
    status: event.status,
  };
}

export class OfflineStorageService {
  static async initialize() {
    await initializeLocalDatabase();
    await this.getDeviceId();
  }

  static async getSnapshot(): Promise<OfflineSnapshot> {
    await this.initialize();

    const [
      events,
      transactions,
      categories,
      merchants,
      budgets,
      rules,
      currencies,
      exchangeRates,
      accounts,
      assets,
      liabilities,
      loans,
      investments,
      goals,
      queue,
      merchantAliases,
    ] = await Promise.all([
      LocalEventRepository.list(),
      LocalTransactionRepository.list(),
      LocalCategoryRepository.list(),
      LocalMerchantRepository.list(),
      LocalBudgetRepository.list(),
      LocalRuleRepository.list(),
      LocalCurrencyRepository.list(),
      LocalExchangeRateRepository.list(),
      LocalAccountRepository.list(),
      LocalAssetRepository.list(),
      LocalLiabilityRepository.list(),
      LocalLoanRepository.list(),
      LocalInvestmentRepository.list(),
      LocalGoalRepository.list(),
      SyncQueueRepository.listPending(),
      LocalMerchantAliasRepository.list(),
    ]);

    return {
      accounts,
      assets,
      budgets,
      categories,
      currencies,
      events,
      exchangeRates,
      goals,
      investments,
      liabilities,
      loans,
      merchantAliases,
      merchants,
      rules,
      transactions,
      queue,
    };
  }

  static async getDeviceId() {
    const existingDeviceId = await AppMetadataRepository.get(DEVICE_ID_KEY);

    if (existingDeviceId) {
      return existingDeviceId;
    }

    const deviceId = createLocalId("device");
    await AppMetadataRepository.set(DEVICE_ID_KEY, deviceId);

    return deviceId;
  }

  static async persistFinancialEvent(
    event: FinancialEventInput,
    source: string
  ): Promise<PersistedFinancialEvent> {
    await this.initialize();

    const eventWithMatchedAccount = await attachMatchedAccount(event);
    const result =
      await MobileRuleEngineService.applyLocalRulesToEventWithResult(
        eventWithMatchedAccount
      );
    // Merchant intelligence runs after rules so an explicit rule always
    // wins; the matcher only fills events that are still unlinked.
    const eventWithMatchedMerchant = await attachMatchedMerchant(
      result.event
    );
    const stableLocalEventId = getStableLocalEventId(
      eventWithMatchedMerchant
    );
    const cachedEvent = await LocalEventRepository.createPending(
      eventWithMatchedMerchant,
      source,
      stableLocalEventId
    );
    const deviceId = await this.getDeviceId();
    const payload: CreateFinancialEventSyncPayload = {
      event: toFinancialEventInput(cachedEvent),
      idempotencyKey: cachedEvent.id,
      localEventId: cachedEvent.id,
      source: cachedEvent.source,
    };
    const queueItem = await SyncQueueRepository.enqueue(
      "create_financial_event",
      payload,
      deviceId,
      `create_financial_event:${cachedEvent.id}`
    );

    return {
      event: cachedEvent,
      queueItem,
    };
  }

  static async updateFinancialEvent(
    eventId: string,
    updates: Partial<FinancialEventInput>
  ): Promise<UpdatedFinancialEvent> {
    await this.initialize();

    const event = await LocalEventRepository.update(eventId, updates);
    const deviceId = await this.getDeviceId();
    const payload: UpdateFinancialEventSyncPayload = {
      eventId,
      updates,
    };
    const queueItem = await SyncQueueRepository.enqueue(
      "update_financial_event",
      payload,
      deviceId,
      `update_financial_event:${eventId}:${event.updated_at}`
    );

    return {
      event,
      queueItem,
    };
  }

  static async updateTransaction(
    transaction: CachedTransaction,
    updates: TransactionUpdates
  ) {
    await this.initialize();

    await LocalTransactionRepository.upsert(transaction);

    const deviceId = await this.getDeviceId();
    const payload: UpdateTransactionSyncPayload = {
      transactionId: transaction.id,
      updates,
    };

    // The request id must be unique per edit: a fixed key would collide
    // with the previous already-synced update and stay "synced", so later
    // edits would never be pushed (then reverted by the next pull).
    return SyncQueueRepository.enqueue(
      "update_transaction",
      payload,
      deviceId,
      `update_transaction:${transaction.id}:${transaction.updated_at}`
    );
  }

  static async deleteTransaction(
    transactionId: string,
    eventId: string
  ) {
    await this.initialize();

    // The server cascades the transaction when its event is deleted;
    // remove the local row immediately for instant UI.
    await LocalTransactionRepository.delete(transactionId);

    return this.deleteFinancialEvent(eventId);
  }

  static async deleteFinancialEvent(eventId: string) {
    await this.initialize();

    await LocalEventRepository.delete(eventId);

    const deviceId = await this.getDeviceId();
    const payload: DeleteFinancialEventSyncPayload = {
      eventId,
    };

    return SyncQueueRepository.enqueue(
      "delete_financial_event",
      payload,
      deviceId,
      `delete_financial_event:${eventId}`
    );
  }

  static persistParsedNotification(result: ParsedNotificationResult) {
    return this.persistFinancialEvent(
      result.financialEvent,
      result.event.source
    );
  }

  static async confirmFinancialEvent(
    eventId: string
  ): Promise<ConfirmedFinancialEvent> {
    await this.initialize();

    const event = await LocalEventRepository.update(eventId, {
      status: "confirmed",
    });
    const deviceId = await this.getDeviceId();
    const payload: ConfirmFinancialEventSyncPayload = {
      eventId,
    };
    const queueItem = await SyncQueueRepository.enqueue(
      "confirm_event",
      payload,
      deviceId,
      `confirm_event:${eventId}`
    );

    return {
      event,
      queueItem,
    };
  }

  static async ignoreFinancialEvent(
    eventId: string
  ): Promise<IgnoredFinancialEvent> {
    await this.initialize();

    const event = await LocalEventRepository.update(eventId, {
      status: "ignored",
    });
    const deviceId = await this.getDeviceId();
    const payload: IgnoreFinancialEventSyncPayload = {
      eventId,
    };
    const queueItem = await SyncQueueRepository.enqueue(
      "ignore_event",
      payload,
      deviceId,
      `ignore_event:${eventId}`
    );

    return {
      event,
      queueItem,
    };
  }

  static async persistAccount(resource: AccountLike) {
    const cached = toCachedAccount(resource);
    await LocalAccountRepository.upsert(cached);

    return enqueueResource<CreateAccountSyncPayload>(
      "create_account",
      {
        localId: cached.id,
        resource: cached,
      },
      `create_account:${cached.id}`
    );
  }

  static async persistBudget(resource: BudgetLike) {
    const cached = toCachedBudget(resource);
    await LocalBudgetRepository.upsert(cached);

    return enqueueResource<CreateBudgetSyncPayload>(
      "create_budget",
      {
        localId: cached.id,
        resource: cached,
      },
      `create_budget:${cached.id}`
    );
  }

  static async persistCategory(resource: CategoryLike) {
    const cached = toCachedCategory(resource);
    await LocalCategoryRepository.upsert(cached);

    return enqueueResource<CreateCategorySyncPayload>(
      "create_category",
      {
        localId: cached.id,
        resource: cached,
      },
      `create_category:${cached.id}`
    );
  }

  static async persistFinancialRule(resource: FinancialRuleInput) {
    const matchValue = resource.match_value?.trim() ?? "";

    if (!matchValue) {
      throw new Error("A rule needs a merchant name to match on.");
    }

    if (!resource.merchant_id && !resource.category_id) {
      throw new Error(
        "A rule needs a merchant or a category to apply."
      );
    }

    const cached = toCachedFinancialRule({
      ...resource,
      match_value: matchValue,
    });
    await LocalRuleRepository.upsert(cached);

    const queueItem = await enqueueResource<CreateFinancialRuleSyncPayload>(
      "create_rule",
      {
        localId: cached.id,
        resource: cached,
      },
      `create_rule:${cached.id}`
    );

    return {
      queueItem,
      rule: cached,
    };
  }

  static async persistMerchant(resource: MerchantLike) {
    const cached = toCachedMerchant(resource);
    await LocalMerchantRepository.upsert(cached);

    const queueItem = await enqueueResource<CreateMerchantSyncPayload>(
      "create_merchant",
      {
        localId: cached.id,
        resource: cached,
      },
      `create_merchant:${cached.id}`
    );

    return {
      merchant: cached,
      queueItem,
    };
  }

  /**
   * Stage 6 learning loop: store the raw captured name as an alias of the
   * merchant the user linked, so future captures auto-match. No-ops when
   * the alias adds nothing (blank, equals the canonical name, or already
   * known).
   */
  static async learnMerchantAlias(merchantId: string, rawName: string) {
    await this.initialize();

    const alias = rawName.trim();

    if (!alias) {
      return null;
    }

    const normalizedAlias = normalizeMerchantName(alias);
    const [merchants, aliases] = await Promise.all([
      LocalMerchantRepository.list(),
      LocalMerchantAliasRepository.list(),
    ]);
    const merchant = merchants.find((item) => item.id === merchantId);

    if (!merchant) {
      return null;
    }

    const normalizedName = normalizeMerchantName(
      merchant.normalized_name ?? merchant.name
    );

    if (normalizedName === normalizedAlias) {
      return null;
    }

    const exists = aliases.some(
      (item) =>
        item.merchant_id === merchantId &&
        normalizeMerchantName(item.alias) === normalizedAlias
    );

    if (exists) {
      return null;
    }

    const cached: CachedMerchantAlias = {
      alias,
      id: createRandomUuid(),
      merchant_id: merchantId,
    };

    await LocalMerchantAliasRepository.upsert(cached);

    return enqueueResource<CreateMerchantAliasSyncPayload>(
      "create_merchant_alias",
      {
        localId: cached.id,
        resource: {
          alias: cached.alias,
          merchant_id: cached.merchant_id,
        },
      },
      `create_merchant_alias:${cached.id}`
    );
  }

  static async deleteMerchantAlias(id: string) {
    await this.initialize();
    await LocalMerchantAliasRepository.delete(id);

    const deviceId = await this.getDeviceId();

    return SyncQueueRepository.enqueue(
      "delete_merchant_alias",
      {
        id,
      },
      deviceId,
      `delete_merchant_alias:${id}`
    );
  }

  static async updateMerchant(id: string, updates: Partial<MerchantLike>) {
    const cached = await updateLocalResource(
      LocalMerchantRepository,
      id,
      updates
    );

    return enqueueResource<UpdateMerchantSyncPayload>(
      "update_merchant",
      {
        id,
        updates,
      },
      `update_merchant:${id}:${cached.updated_at}`
    );
  }

  static async updateAccount(id: string, updates: Partial<AccountLike>) {
    const cached = await updateLocalResource(
      LocalAccountRepository,
      id,
      updates
    );

    return enqueueResource<UpdateAccountSyncPayload>(
      "update_account",
      {
        id,
        updates,
      },
      `update_account:${id}:${cached.updated_at}`
    );
  }

  static async deleteAccount(id: string) {
    await LocalAccountRepository.delete(id);

    return enqueueDelete("delete_account", id);
  }

  static async persistAsset(resource: AssetLike) {
    const cached = toCachedAsset(resource);
    await LocalAssetRepository.upsert(cached);

    return enqueueResource<CreateAssetSyncPayload>(
      "create_asset",
      {
        localId: cached.id,
        resource: cached,
      },
      `create_asset:${cached.id}`
    );
  }

  static async updateAsset(id: string, updates: Partial<AssetLike>) {
    const cached = await updateLocalResource(
      LocalAssetRepository,
      id,
      updates
    );

    return enqueueResource<UpdateAssetSyncPayload>(
      "update_asset",
      {
        id,
        updates,
      },
      `update_asset:${id}:${cached.updated_at}`
    );
  }

  static async deleteAsset(id: string) {
    await LocalAssetRepository.delete(id);

    return enqueueDelete("delete_asset", id);
  }

  static async persistLiability(resource: LiabilityLike) {
    const cached = toCachedLiability(resource);
    await LocalLiabilityRepository.upsert(cached);

    return enqueueResource<CreateLiabilitySyncPayload>(
      "create_liability",
      {
        localId: cached.id,
        resource: cached,
      },
      `create_liability:${cached.id}`
    );
  }

  static async updateLiability(
    id: string,
    updates: Partial<LiabilityLike>
  ) {
    const cached = await updateLocalResource(
      LocalLiabilityRepository,
      id,
      updates
    );

    return enqueueResource<UpdateLiabilitySyncPayload>(
      "update_liability",
      {
        id,
        updates,
      },
      `update_liability:${id}:${cached.updated_at}`
    );
  }

  static async deleteLiability(id: string) {
    await LocalLiabilityRepository.delete(id);

    return enqueueDelete("delete_liability", id);
  }

  static async persistLoan(resource: LoanLike) {
    const cached = toCachedLoan(resource);
    await LocalLoanRepository.upsert(cached);

    return enqueueResource<CreateLoanSyncPayload>(
      "create_loan",
      {
        localId: cached.id,
        resource: cached,
      },
      `create_loan:${cached.id}`
    );
  }

  static async updateLoan(id: string, updates: Partial<LoanLike>) {
    const cached = await updateLocalResource(LocalLoanRepository, id, updates);

    return enqueueResource<UpdateLoanSyncPayload>(
      "update_loan",
      {
        id,
        updates,
      },
      `update_loan:${id}:${cached.updated_at}`
    );
  }

  static async deleteLoan(id: string) {
    await LocalLoanRepository.delete(id);

    return enqueueDelete("delete_loan", id);
  }

  static async persistInvestment(resource: InvestmentLike) {
    const cached = toCachedInvestment(resource);
    await LocalInvestmentRepository.upsert(cached);

    return enqueueResource<CreateInvestmentSyncPayload>(
      "create_investment",
      {
        localId: cached.id,
        resource: cached,
      },
      `create_investment:${cached.id}`
    );
  }

  static async updateInvestment(
    id: string,
    updates: Partial<InvestmentLike>
  ) {
    const cached = await updateLocalResource(
      LocalInvestmentRepository,
      id,
      updates
    );

    return enqueueResource<UpdateInvestmentSyncPayload>(
      "update_investment",
      {
        id,
        updates,
      },
      `update_investment:${id}:${cached.updated_at}`
    );
  }

  static async deleteInvestment(id: string) {
    await LocalInvestmentRepository.delete(id);

    return enqueueDelete("delete_investment", id);
  }

  static async persistGoal(resource: GoalLike) {
    const cached = toCachedGoal(resource);
    await LocalGoalRepository.upsert(cached);

    return enqueueResource<CreateGoalSyncPayload>(
      "create_goal",
      {
        localId: cached.id,
        resource: cached,
      },
      `create_goal:${cached.id}`
    );
  }

  static async updateGoal(id: string, updates: Partial<GoalLike>) {
    const cached = await updateLocalResource(LocalGoalRepository, id, updates);

    return enqueueResource<UpdateGoalSyncPayload>(
      "update_goal",
      {
        id,
        updates,
      },
      `update_goal:${id}:${cached.updated_at}`
    );
  }

  static async deleteGoal(id: string) {
    await LocalGoalRepository.delete(id);

    return enqueueDelete("delete_goal", id);
  }
}

function withTimestamps<TResource extends { id?: string }>(
  resource: TResource
) {
  const now = new Date().toISOString();

  return {
    ...resource,
    id: resource.id ?? createRandomUuid(),
    created_at: now,
    updated_at: now,
  };
}

function toCachedAccount(resource: AccountLike): CachedAccount {
  return withTimestamps({
    ...resource,
    archived: resource.archived ?? false,
  });
}

function toCachedBudget(resource: BudgetLike): CachedBudget {
  return {
    ...withTimestamps(resource),
    auto_renew: resource.auto_renew ?? true,
    currency: "INR",
    ends_on: resource.ends_on ?? null,
    period: resource.period ?? "monthly",
    starts_on: resource.starts_on ?? getCurrentMonthStart(),
  };
}

function toCachedCategory(resource: CategoryLike): CachedCategory {
  return withTimestamps({
    ...resource,
    is_system: false,
  });
}

function toCachedFinancialRule(
  resource: FinancialRuleInput
): CachedFinancialRule {
  return {
    ...withTimestamps({}),
    auto_confirm: resource.auto_confirm ?? false,
    category: null,
    category_id: resource.category_id ?? null,
    enabled: resource.enabled ?? true,
    match_operator: resource.match_operator ?? "equals",
    match_value: resource.match_value ?? "",
    merchant: null,
    merchant_id: resource.merchant_id ?? null,
    name: resource.name ?? resource.match_value ?? "Untitled rule",
    priority: resource.priority ?? 100,
  };
}

function toCachedMerchant(resource: MerchantLike): CachedMerchant {
  return withTimestamps({
    ...resource,
    category: resource.category ?? null,
    category_id: resource.category_id ?? null,
    last_seen_at: resource.last_seen_at ?? null,
    normalized_name:
      resource.normalized_name ?? normalizeMerchantName(resource.name),
    usage_count: resource.usage_count ?? 0,
  });
}

function toCachedAsset(resource: AssetLike): CachedAsset {
  return withTimestamps(resource);
}

function toCachedLiability(resource: LiabilityLike): CachedLiability {
  return withTimestamps(resource);
}

function toCachedLoan(resource: LoanLike): CachedLoan {
  return withTimestamps(resource);
}

function toCachedInvestment(resource: InvestmentLike): CachedInvestment {
  return withTimestamps({
    ...resource,
    purchase_history: resource.purchase_history ?? [],
  });
}

function toCachedGoal(resource: GoalLike): CachedGoal {
  return withTimestamps(resource);
}

async function updateLocalResource<
  TResource extends { id: string; updated_at: string },
>(
  repository: {
    list: () => Promise<TResource[]>;
    upsert: (resource: TResource) => Promise<void>;
  },
  id: string,
  updates: Partial<TResource>
) {
  const existing = (await repository.list()).find((resource) => resource.id === id);

  if (!existing) {
    throw new Error("Resource not found.");
  }

  const updated = {
    ...existing,
    ...updates,
    id,
    updated_at: new Date().toISOString(),
  };

  await repository.upsert(updated);

  return updated;
}

async function enqueueResource<TPayload>(
  operation: SyncQueueItem<TPayload>["operation"],
  payload: TPayload,
  requestId: string
) {
  await OfflineStorageService.initialize();
  const deviceId = await OfflineStorageService.getDeviceId();

  return SyncQueueRepository.enqueue(operation, payload, deviceId, requestId);
}

function enqueueDelete(operation: SyncQueueItem<DeleteResourceSyncPayload>["operation"], id: string) {
  return enqueueResource<DeleteResourceSyncPayload>(
    operation,
    {
      id,
    },
    `${operation}:${id}`
  );
}
