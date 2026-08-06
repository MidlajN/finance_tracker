import type {
  CreateAccountSyncPayload,
  CreateAssetSyncPayload,
  CreateBudgetSyncPayload,
  CreateCategorySyncPayload,
  ConfirmFinancialEventSyncPayload,
  CreateFinancialEventSyncPayload,
  CreateGoalSyncPayload,
  CreateInvestmentSyncPayload,
  CreateLiabilitySyncPayload,
  CreateLoanSyncPayload,
  CreateFinancialRuleSyncPayload,
  CreateMerchantAliasSyncPayload,
  CreateMerchantSyncPayload,
  DeleteFinancialEventSyncPayload,
  DeleteResourceSyncPayload,
  IgnoreFinancialEventSyncPayload,
  SyncQueueItem,
  UpdateAccountSyncPayload,
  UpdateAssetSyncPayload,
  UpdateFinancialEventSyncPayload,
  UpdateGoalSyncPayload,
  UpdateTransactionSyncPayload,
  UpdateInvestmentSyncPayload,
  UpdateLiabilitySyncPayload,
  UpdateLoanSyncPayload,
  UpdateMerchantSyncPayload,
} from "@finance/shared-api";
import type { CachedMerchant } from "@finance/shared-types";

import {
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
import { RemoteEventRepository } from "../repositories/RemoteEventRepository";
import { RemoteFinancialIntelligenceRepository } from "../repositories/RemoteFinancialIntelligenceRepository";
import {
  RemoteBudgetRepository,
  RemoteCategoryRepository,
  RemoteFinancialRuleRepository,
  RemoteMerchantAliasRepository,
  RemoteMerchantRepository,
} from "../repositories/RemoteReferenceRepository";
import { RemoteTransactionRepository } from "../repositories/RemoteTransactionRepository";
import { supabase } from "../lib/supabase";
import { OfflineStorageService } from "./OfflineStorageService";

export interface SyncResult {
  failed: number;
  pulledBudgets: number;
  pulledAccounts: number;
  pulledAssets: number;
  pulledCategories: number;
  pulledCurrencies: number;
  pulledEvents: number;
  pulledExchangeRates: number;
  pulledGoals: number;
  pulledInvestments: number;
  pulledLiabilities: number;
  pulledLoans: number;
  pulledMerchants: number;
  pulledRules: number;
  pulledTransactions: number;
  synced: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCreateFinancialEventSyncPayload(
  payload: unknown
): payload is CreateFinancialEventSyncPayload {
  return (
    isObject(payload) &&
    typeof payload.localEventId === "string" &&
    typeof payload.source === "string" &&
    isObject(payload.event)
  );
}

function isUpdateFinancialEventSyncPayload(
  payload: unknown
): payload is UpdateFinancialEventSyncPayload {
  return (
    isObject(payload) &&
    typeof payload.eventId === "string" &&
    isObject(payload.updates)
  );
}

function isDeleteFinancialEventSyncPayload(
  payload: unknown
): payload is DeleteFinancialEventSyncPayload {
  return isObject(payload) && typeof payload.eventId === "string";
}

function isUpdateTransactionSyncPayload(
  payload: unknown
): payload is UpdateTransactionSyncPayload {
  return (
    isObject(payload) &&
    typeof payload.transactionId === "string" &&
    isObject(payload.updates)
  );
}

function isConfirmFinancialEventSyncPayload(
  payload: unknown
): payload is ConfirmFinancialEventSyncPayload {
  return isObject(payload) && typeof payload.eventId === "string";
}

function isIgnoreFinancialEventSyncPayload(
  payload: unknown
): payload is IgnoreFinancialEventSyncPayload {
  return isObject(payload) && typeof payload.eventId === "string";
}

function isCreateResourceSyncPayload<TPayload extends { localId: string }>(
  payload: unknown
): payload is TPayload {
  return (
    isObject(payload) &&
    typeof payload.localId === "string" &&
    isObject(payload.resource)
  );
}

function isUpdateResourceSyncPayload<TPayload extends { id: string }>(
  payload: unknown
): payload is TPayload {
  return (
    isObject(payload) &&
    typeof payload.id === "string" &&
    isObject(payload.updates)
  );
}

function isDeleteResourceSyncPayload(
  payload: unknown
): payload is DeleteResourceSyncPayload {
  return isObject(payload) && typeof payload.id === "string";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to synchronize queue item.";
}

export class SyncService {
  static subscribeToRemoteChanges(onChange: () => void) {
    const channel = supabase
      .channel("mobile-finance-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "financial_events",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchants",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budgets",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "financial_rules",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accounts",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assets",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "liabilities",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loans",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investments",
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goals",
        },
        onChange
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }

  static async synchronize(): Promise<SyncResult> {
    await OfflineStorageService.initialize();

    const queueItems = await SyncQueueRepository.listPending();
    let synced = 0;
    let failed = 0;

    for (const item of queueItems) {
      try {
        await this.processQueueItem(item);
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    const pullResult = await this.pullRemoteState();

    return {
      failed,
      pulledAccounts: pullResult.accounts,
      pulledAssets: pullResult.assets,
      pulledBudgets: pullResult.budgets,
      pulledCategories: pullResult.categories,
      pulledCurrencies: pullResult.currencies,
      pulledEvents: pullResult.events,
      pulledExchangeRates: pullResult.exchangeRates,
      pulledGoals: pullResult.goals,
      pulledInvestments: pullResult.investments,
      pulledLiabilities: pullResult.liabilities,
      pulledLoans: pullResult.loans,
      pulledMerchants: pullResult.merchants,
      pulledRules: pullResult.rules,
      pulledTransactions: pullResult.transactions,
      synced,
    };
  }

  static async pullRemoteState() {
    await OfflineStorageService.initialize();

    const pendingQueueItems = await SyncQueueRepository.listPending();
    const localMerchants = await LocalMerchantRepository.list();
    const pendingMerchantsById = new Map<string, CachedMerchant>();

    pendingQueueItems.forEach((item) => {
      if (
        item.operation === "create_merchant" &&
        isCreateResourceSyncPayload<CreateMerchantSyncPayload>(item.payload)
      ) {
        const payload = item.payload;
        const existing = localMerchants.find(
          (merchant) => merchant.id === payload.localId
        );
        const resource = payload.resource;

        pendingMerchantsById.set(
          payload.localId,
          existing ?? {
            ...resource,
            category: resource.category ?? null,
            category_id: resource.category_id ?? null,
            created_at: item.createdAt,
            id: payload.localId,
            last_seen_at: resource.last_seen_at ?? null,
            normalized_name: resource.normalized_name ?? null,
            updated_at: item.updatedAt,
            usage_count: resource.usage_count ?? 0,
          }
        );
      }

      if (
        item.operation === "update_merchant" &&
        isUpdateResourceSyncPayload<UpdateMerchantSyncPayload>(item.payload)
      ) {
        const payload = item.payload;
        const existing = localMerchants.find(
          (merchant) => merchant.id === payload.id
        );

        if (existing) {
          pendingMerchantsById.set(payload.id, {
            ...existing,
            ...payload.updates,
            id: payload.id,
            updated_at: item.updatedAt,
          });
        }
      }
    });

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
      merchantAliases,
    ] = await Promise.all([
      RemoteEventRepository.list(),
      RemoteTransactionRepository.list(),
      RemoteCategoryRepository.list(),
      RemoteMerchantRepository.list(),
      RemoteBudgetRepository.list(),
      RemoteFinancialRuleRepository.list(),
      RemoteFinancialIntelligenceRepository.listCurrencies(),
      RemoteFinancialIntelligenceRepository.listExchangeRates(),
      RemoteFinancialIntelligenceRepository.listAccounts(),
      RemoteFinancialIntelligenceRepository.listAssets(),
      RemoteFinancialIntelligenceRepository.listLiabilities(),
      RemoteFinancialIntelligenceRepository.listLoans(),
      RemoteFinancialIntelligenceRepository.listInvestments(),
      RemoteFinancialIntelligenceRepository.listGoals(),
      RemoteMerchantAliasRepository.list(),
    ]);

    pendingQueueItems.forEach((item) => {
      if (
        item.operation !== "update_merchant" ||
        !isUpdateResourceSyncPayload<UpdateMerchantSyncPayload>(item.payload)
      ) {
        return;
      }

      const payload = item.payload;
      if (pendingMerchantsById.has(payload.id)) return;

      const remoteMerchant = merchants.find(
        (merchant) => merchant.id === payload.id
      );
      if (!remoteMerchant) return;

      pendingMerchantsById.set(payload.id, {
        ...remoteMerchant,
        ...payload.updates,
        id: payload.id,
        updated_at: item.updatedAt,
      });
    });

    const pendingLocalMerchants = Array.from(pendingMerchantsById.values());

    await Promise.all([
      LocalTransactionRepository.clear(),
      LocalCategoryRepository.clear(),
      LocalMerchantRepository.clear(),
      LocalMerchantAliasRepository.clear(),
      LocalBudgetRepository.clear(),
      LocalRuleRepository.clear(),
      LocalCurrencyRepository.clear(),
      LocalExchangeRateRepository.clear(),
      LocalAccountRepository.clear(),
      LocalAssetRepository.clear(),
      LocalLiabilityRepository.clear(),
      LocalLoanRepository.clear(),
      LocalInvestmentRepository.clear(),
      LocalGoalRepository.clear(),
    ]);

    await Promise.all([
      ...events.map((event) => LocalEventRepository.upsert(event)),
      ...transactions.map((transaction) =>
        LocalTransactionRepository.upsert(transaction)
      ),
      ...categories.map((category) =>
        LocalCategoryRepository.upsert(category)
      ),
      ...merchants.map((merchant) =>
        LocalMerchantRepository.upsert(merchant)
      ),
      ...budgets.map((budget) => LocalBudgetRepository.upsert(budget)),
      ...rules.map((rule) => LocalRuleRepository.upsert(rule)),
      ...currencies.map((currency) =>
        LocalCurrencyRepository.upsert(currency)
      ),
      ...exchangeRates.map((rate) =>
        LocalExchangeRateRepository.upsert(rate)
      ),
      ...accounts.map((account) => LocalAccountRepository.upsert(account)),
      ...assets.map((asset) => LocalAssetRepository.upsert(asset)),
      ...liabilities.map((liability) =>
        LocalLiabilityRepository.upsert(liability)
      ),
      ...loans.map((loan) => LocalLoanRepository.upsert(loan)),
      ...investments.map((investment) =>
        LocalInvestmentRepository.upsert(investment)
      ),
      ...goals.map((goal) => LocalGoalRepository.upsert(goal)),
      ...merchantAliases.map((alias) =>
        LocalMerchantAliasRepository.upsert(alias)
      ),
    ]);

    await Promise.all(
      pendingLocalMerchants.map((merchant) =>
        LocalMerchantRepository.upsert(merchant)
      )
    );

    return {
      accounts: accounts.length,
      assets: assets.length,
      budgets: budgets.length,
      categories: categories.length,
      currencies: currencies.length,
      events: events.length,
      exchangeRates: exchangeRates.length,
      goals: goals.length,
      investments: investments.length,
      liabilities: liabilities.length,
      loans: loans.length,
      merchantAliases: merchantAliases.length,
      merchants: merchants.length,
      rules: rules.length,
      transactions: transactions.length,
    };
  }

  private static async processQueueItem(
    item: SyncQueueItem
  ) {
    await SyncQueueRepository.setStatus(item.id, "uploading");

    try {
      if (item.operation === "create_financial_event") {
        await this.processCreateFinancialEvent(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "update_financial_event") {
        await this.processUpdateFinancialEvent(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "delete_financial_event") {
        await this.processDeleteFinancialEvent(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "update_transaction") {
        await this.processUpdateTransaction(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "confirm_event") {
        await this.processConfirmFinancialEvent(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "ignore_event") {
        await this.processIgnoreFinancialEvent(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_account") {
        await this.processCreateAccount(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "update_account") {
        await this.processUpdateAccount(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "delete_account") {
        await this.processDeleteAccount(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_budget") {
        await this.processCreateBudget(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_category") {
        await this.processCreateCategory(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_merchant") {
        await this.processCreateMerchant(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "update_merchant") {
        await this.processUpdateMerchant(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_merchant_alias") {
        await this.processCreateMerchantAlias(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_rule") {
        await this.processCreateRule(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "delete_merchant_alias") {
        await this.processDeleteMerchantAlias(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_asset") {
        await this.processCreateAsset(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "update_asset") {
        await this.processUpdateAsset(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "delete_asset") {
        await this.processDeleteAsset(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_liability") {
        await this.processCreateLiability(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "update_liability") {
        await this.processUpdateLiability(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "delete_liability") {
        await this.processDeleteLiability(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_loan") {
        await this.processCreateLoan(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "update_loan") {
        await this.processUpdateLoan(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "delete_loan") {
        await this.processDeleteLoan(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_investment") {
        await this.processCreateInvestment(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "update_investment") {
        await this.processUpdateInvestment(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "delete_investment") {
        await this.processDeleteInvestment(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "create_goal") {
        await this.processCreateGoal(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "update_goal") {
        await this.processUpdateGoal(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      if (item.operation === "delete_goal") {
        await this.processDeleteGoal(item);
        await SyncQueueRepository.setStatus(item.id, "synced");
        return;
      }

      throw new Error(
        `Unsupported sync operation: ${item.operation}`
      );
    } catch (error) {
      const nextAttempts = item.attempts + 1;
      const status = nextAttempts >= 3 ? "failed" : "retrying";

      await SyncQueueRepository.setStatus(
        item.id,
        status,
        getErrorMessage(error)
      );

      throw error;
    }
  }

  private static async processCreateFinancialEvent(
    item: SyncQueueItem
  ) {
    if (!isCreateFinancialEventSyncPayload(item.payload)) {
      throw new Error("Invalid Financial Event sync payload.");
    }

    const typedItem: SyncQueueItem<CreateFinancialEventSyncPayload> = {
      ...item,
      payload: item.payload,
    };
    const event = await RemoteEventRepository.createFromSyncItem(
      typedItem
    );

    await LocalEventRepository.upsert(event);
  }

  private static async processUpdateFinancialEvent(
    item: SyncQueueItem
  ) {
    if (!isUpdateFinancialEventSyncPayload(item.payload)) {
      throw new Error("Invalid Financial Event update payload.");
    }

    const event = await RemoteEventRepository.update(
      item.payload.eventId,
      item.payload.updates
    );

    await LocalEventRepository.upsert(event);
  }

  private static async processDeleteFinancialEvent(
    item: SyncQueueItem
  ) {
    if (!isDeleteFinancialEventSyncPayload(item.payload)) {
      throw new Error("Invalid Financial Event delete payload.");
    }

    await RemoteEventRepository.delete(item.payload.eventId);
    await LocalEventRepository.delete(item.payload.eventId);
  }

  private static async processUpdateTransaction(
    item: SyncQueueItem
  ) {
    if (!isUpdateTransactionSyncPayload(item.payload)) {
      throw new Error("Invalid transaction update payload.");
    }

    const transaction = await RemoteTransactionRepository.update(
      item.payload.transactionId,
      item.payload.updates
    );

    await LocalTransactionRepository.upsert(transaction);
  }

  private static async processConfirmFinancialEvent(
    item: SyncQueueItem
  ) {
    if (!isConfirmFinancialEventSyncPayload(item.payload)) {
      throw new Error("Invalid Financial Event confirm payload.");
    }

    await RemoteEventRepository.confirm(item.payload.eventId);
  }

  private static async processIgnoreFinancialEvent(
    item: SyncQueueItem
  ) {
    if (!isIgnoreFinancialEventSyncPayload(item.payload)) {
      throw new Error("Invalid Financial Event ignore payload.");
    }

    const event = await RemoteEventRepository.ignore(item.payload.eventId);
    await LocalEventRepository.upsert(event);
  }

  private static async processCreateAccount(item: SyncQueueItem) {
    if (!isCreateResourceSyncPayload<CreateAccountSyncPayload>(item.payload)) {
      throw new Error("Invalid account create payload.");
    }

    const account = await RemoteFinancialIntelligenceRepository.createAccount(
      item.payload.localId,
      item.payload.resource
    );

    await LocalAccountRepository.upsert(account);
  }

  private static async processUpdateAccount(item: SyncQueueItem) {
    if (!isUpdateResourceSyncPayload<UpdateAccountSyncPayload>(item.payload)) {
      throw new Error("Invalid account update payload.");
    }

    const account = await RemoteFinancialIntelligenceRepository.updateAccount(
      item.payload.id,
      item.payload.updates
    );

    await LocalAccountRepository.upsert(account);
  }

  private static async processDeleteAccount(item: SyncQueueItem) {
    if (!isDeleteResourceSyncPayload(item.payload)) {
      throw new Error("Invalid account delete payload.");
    }

    await RemoteFinancialIntelligenceRepository.deleteAccount(item.payload.id);
    await LocalAccountRepository.delete(item.payload.id);
  }

  private static async processCreateBudget(item: SyncQueueItem) {
    if (!isCreateResourceSyncPayload<CreateBudgetSyncPayload>(item.payload)) {
      throw new Error("Invalid budget create payload.");
    }

    const budget = await RemoteBudgetRepository.create(
      item.payload.localId,
      item.payload.resource
    );

    await LocalBudgetRepository.upsert(budget);
  }

  private static async processCreateCategory(item: SyncQueueItem) {
    if (!isCreateResourceSyncPayload<CreateCategorySyncPayload>(item.payload)) {
      throw new Error("Invalid category create payload.");
    }

    const category = await RemoteCategoryRepository.create(
      item.payload.localId,
      item.payload.resource
    );

    await LocalCategoryRepository.upsert(category);
  }

  private static async processCreateMerchant(item: SyncQueueItem) {
    if (!isCreateResourceSyncPayload<CreateMerchantSyncPayload>(item.payload)) {
      throw new Error("Invalid merchant create payload.");
    }

    const merchant = await RemoteMerchantRepository.create(
      item.payload.localId,
      item.payload.resource
    );

    await LocalMerchantRepository.upsert(merchant);
  }

  private static async processUpdateMerchant(item: SyncQueueItem) {
    if (!isUpdateResourceSyncPayload<UpdateMerchantSyncPayload>(item.payload)) {
      throw new Error("Invalid merchant update payload.");
    }

    const merchant = await RemoteMerchantRepository.update(
      item.payload.id,
      item.payload.updates
    );

    await LocalMerchantRepository.upsert(merchant);
  }

  private static async processDeleteMerchantAlias(item: SyncQueueItem) {
    if (!isDeleteResourceSyncPayload(item.payload)) {
      throw new Error("Invalid merchant alias delete payload.");
    }

    await RemoteMerchantAliasRepository.delete(item.payload.id);
    await LocalMerchantAliasRepository.delete(item.payload.id);
  }

  private static async processCreateRule(item: SyncQueueItem) {
    if (
      !isCreateResourceSyncPayload<CreateFinancialRuleSyncPayload>(
        item.payload
      )
    ) {
      throw new Error("Invalid rule create payload.");
    }

    try {
      const rule = await RemoteFinancialRuleRepository.create(
        item.payload.localId,
        item.payload.resource
      );

      await LocalRuleRepository.upsert(rule);
    } catch (error) {
      // Another device may have already created this rule (unique
      // violation / duplicate id 23505) — treat as success.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        return;
      }

      throw error;
    }
  }

  private static async processCreateMerchantAlias(item: SyncQueueItem) {
    if (
      !isCreateResourceSyncPayload<CreateMerchantAliasSyncPayload>(
        item.payload
      )
    ) {
      throw new Error("Invalid merchant alias create payload.");
    }

    try {
      const alias = await RemoteMerchantAliasRepository.create(
        item.payload.localId,
        item.payload.resource.merchant_id,
        item.payload.resource.alias
      );

      await LocalMerchantAliasRepository.upsert(alias);
    } catch (error) {
      // The alias may already exist for this merchant (unique constraint
      // 23505); that means another device learned it first — success.
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        return;
      }

      throw error;
    }
  }

  private static async processCreateAsset(item: SyncQueueItem) {
    if (!isCreateResourceSyncPayload<CreateAssetSyncPayload>(item.payload)) {
      throw new Error("Invalid asset create payload.");
    }

    const asset = await RemoteFinancialIntelligenceRepository.createAsset(
      item.payload.localId,
      item.payload.resource
    );

    await LocalAssetRepository.upsert(asset);
  }

  private static async processUpdateAsset(item: SyncQueueItem) {
    if (!isUpdateResourceSyncPayload<UpdateAssetSyncPayload>(item.payload)) {
      throw new Error("Invalid asset update payload.");
    }

    const asset = await RemoteFinancialIntelligenceRepository.updateAsset(
      item.payload.id,
      item.payload.updates
    );

    await LocalAssetRepository.upsert(asset);
  }

  private static async processDeleteAsset(item: SyncQueueItem) {
    if (!isDeleteResourceSyncPayload(item.payload)) {
      throw new Error("Invalid asset delete payload.");
    }

    await RemoteFinancialIntelligenceRepository.deleteAsset(item.payload.id);
    await LocalAssetRepository.delete(item.payload.id);
  }

  private static async processCreateLiability(item: SyncQueueItem) {
    if (
      !isCreateResourceSyncPayload<CreateLiabilitySyncPayload>(item.payload)
    ) {
      throw new Error("Invalid liability create payload.");
    }

    const liability =
      await RemoteFinancialIntelligenceRepository.createLiability(
        item.payload.localId,
        item.payload.resource
      );

    await LocalLiabilityRepository.upsert(liability);
  }

  private static async processUpdateLiability(item: SyncQueueItem) {
    if (
      !isUpdateResourceSyncPayload<UpdateLiabilitySyncPayload>(item.payload)
    ) {
      throw new Error("Invalid liability update payload.");
    }

    const liability =
      await RemoteFinancialIntelligenceRepository.updateLiability(
        item.payload.id,
        item.payload.updates
      );

    await LocalLiabilityRepository.upsert(liability);
  }

  private static async processDeleteLiability(item: SyncQueueItem) {
    if (!isDeleteResourceSyncPayload(item.payload)) {
      throw new Error("Invalid liability delete payload.");
    }

    await RemoteFinancialIntelligenceRepository.deleteLiability(
      item.payload.id
    );
    await LocalLiabilityRepository.delete(item.payload.id);
  }

  private static async processCreateLoan(item: SyncQueueItem) {
    if (!isCreateResourceSyncPayload<CreateLoanSyncPayload>(item.payload)) {
      throw new Error("Invalid loan create payload.");
    }

    const loan = await RemoteFinancialIntelligenceRepository.createLoan(
      item.payload.localId,
      item.payload.resource
    );

    await LocalLoanRepository.upsert(loan);
  }

  private static async processUpdateLoan(item: SyncQueueItem) {
    if (!isUpdateResourceSyncPayload<UpdateLoanSyncPayload>(item.payload)) {
      throw new Error("Invalid loan update payload.");
    }

    const loan = await RemoteFinancialIntelligenceRepository.updateLoan(
      item.payload.id,
      item.payload.updates
    );

    await LocalLoanRepository.upsert(loan);
  }

  private static async processDeleteLoan(item: SyncQueueItem) {
    if (!isDeleteResourceSyncPayload(item.payload)) {
      throw new Error("Invalid loan delete payload.");
    }

    await RemoteFinancialIntelligenceRepository.deleteLoan(item.payload.id);
    await LocalLoanRepository.delete(item.payload.id);
  }

  private static async processCreateInvestment(item: SyncQueueItem) {
    if (
      !isCreateResourceSyncPayload<CreateInvestmentSyncPayload>(item.payload)
    ) {
      throw new Error("Invalid investment create payload.");
    }

    const investment =
      await RemoteFinancialIntelligenceRepository.createInvestment(
        item.payload.localId,
        item.payload.resource
      );

    await LocalInvestmentRepository.upsert(investment);
  }

  private static async processUpdateInvestment(item: SyncQueueItem) {
    if (
      !isUpdateResourceSyncPayload<UpdateInvestmentSyncPayload>(item.payload)
    ) {
      throw new Error("Invalid investment update payload.");
    }

    const investment =
      await RemoteFinancialIntelligenceRepository.updateInvestment(
        item.payload.id,
        item.payload.updates
      );

    await LocalInvestmentRepository.upsert(investment);
  }

  private static async processDeleteInvestment(item: SyncQueueItem) {
    if (!isDeleteResourceSyncPayload(item.payload)) {
      throw new Error("Invalid investment delete payload.");
    }

    await RemoteFinancialIntelligenceRepository.deleteInvestment(
      item.payload.id
    );
    await LocalInvestmentRepository.delete(item.payload.id);
  }

  private static async processCreateGoal(item: SyncQueueItem) {
    if (!isCreateResourceSyncPayload<CreateGoalSyncPayload>(item.payload)) {
      throw new Error("Invalid goal create payload.");
    }

    const goal = await RemoteFinancialIntelligenceRepository.createGoal(
      item.payload.localId,
      item.payload.resource
    );

    await LocalGoalRepository.upsert(goal);
  }

  private static async processUpdateGoal(item: SyncQueueItem) {
    if (!isUpdateResourceSyncPayload<UpdateGoalSyncPayload>(item.payload)) {
      throw new Error("Invalid goal update payload.");
    }

    const goal = await RemoteFinancialIntelligenceRepository.updateGoal(
      item.payload.id,
      item.payload.updates
    );

    await LocalGoalRepository.upsert(goal);
  }

  private static async processDeleteGoal(item: SyncQueueItem) {
    if (!isDeleteResourceSyncPayload(item.payload)) {
      throw new Error("Invalid goal delete payload.");
    }

    await RemoteFinancialIntelligenceRepository.deleteGoal(item.payload.id);
    await LocalGoalRepository.delete(item.payload.id);
  }
}
