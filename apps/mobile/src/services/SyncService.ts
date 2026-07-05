import type {
  CreateFinancialEventSyncPayload,
  DeleteFinancialEventSyncPayload,
  SyncQueueItem,
  UpdateFinancialEventSyncPayload,
} from "@finance/shared-api";

import {
  LocalBudgetRepository,
  LocalCategoryRepository,
  LocalEventRepository,
  LocalMerchantRepository,
  LocalRuleRepository,
  LocalTransactionRepository,
  SyncQueueRepository,
} from "../repositories/LocalDatabaseRepository";
import { RemoteEventRepository } from "../repositories/RemoteEventRepository";
import {
  RemoteBudgetRepository,
  RemoteCategoryRepository,
  RemoteFinancialRuleRepository,
  RemoteMerchantRepository,
} from "../repositories/RemoteReferenceRepository";
import { RemoteTransactionRepository } from "../repositories/RemoteTransactionRepository";
import { supabase } from "../lib/supabase";
import { OfflineStorageService } from "./OfflineStorageService";

export interface SyncResult {
  failed: number;
  pulledBudgets: number;
  pulledCategories: number;
  pulledEvents: number;
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
      pulledBudgets: pullResult.budgets,
      pulledCategories: pullResult.categories,
      pulledEvents: pullResult.events,
      pulledMerchants: pullResult.merchants,
      pulledRules: pullResult.rules,
      pulledTransactions: pullResult.transactions,
      synced,
    };
  }

  static async pullRemoteState() {
    await OfflineStorageService.initialize();

    const [
      events,
      transactions,
      categories,
      merchants,
      budgets,
      rules,
    ] = await Promise.all([
      RemoteEventRepository.list(),
      RemoteTransactionRepository.list(),
      RemoteCategoryRepository.list(),
      RemoteMerchantRepository.list(),
      RemoteBudgetRepository.list(),
      RemoteFinancialRuleRepository.list(),
    ]);

    await Promise.all([
      LocalTransactionRepository.clear(),
      LocalCategoryRepository.clear(),
      LocalMerchantRepository.clear(),
      LocalBudgetRepository.clear(),
      LocalRuleRepository.clear(),
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
    ]);

    return {
      budgets: budgets.length,
      categories: categories.length,
      events: events.length,
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
}
