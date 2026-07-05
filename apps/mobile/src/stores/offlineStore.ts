import type { SyncQueueItem } from "@finance/shared-api";
import type {
  CachedBudget,
  CachedCategory,
  CachedFinancialEvent,
  CachedFinancialRule,
  CachedMerchant,
  CachedTransaction,
  FinancialEventInput,
} from "@finance/shared-types";
import { create } from "zustand";

import { OfflineStorageService } from "../services/OfflineStorageService";
import type { ParsedNotificationResult } from "../services/NotificationService";

interface OfflineState {
  budgets: CachedBudget[];
  categories: CachedCategory[];
  error: string | null;
  events: CachedFinancialEvent[];
  initialized: boolean;
  merchants: CachedMerchant[];
  queue: SyncQueueItem[];
  rules: CachedFinancialRule[];
  transactions: CachedTransaction[];
  initialize: () => Promise<void>;
  createFinancialEvent: (
    event: FinancialEventInput,
    source: string
  ) => Promise<void>;
  deleteFinancialEvent: (eventId: string) => Promise<void>;
  persistParsedNotification: (
    result: ParsedNotificationResult
  ) => Promise<void>;
  refresh: () => Promise<void>;
  updateFinancialEvent: (
    eventId: string,
    updates: Partial<FinancialEventInput>
  ) => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  budgets: [],
  categories: [],
  error: null,
  events: [],
  initialized: false,
  merchants: [],
  queue: [],
  rules: [],
  transactions: [],

  async initialize() {
    if (get().initialized) {
      return;
    }

    await get().refresh();
  },

  async createFinancialEvent(event, source) {
    try {
      await OfflineStorageService.persistFinancialEvent(event, source);
      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to save Financial Event.",
      });
    }
  },

  async deleteFinancialEvent(eventId) {
    try {
      await OfflineStorageService.deleteFinancialEvent(eventId);
      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete Financial Event.",
      });
    }
  },

  async persistParsedNotification(result) {
    try {
      await OfflineStorageService.persistParsedNotification(result);
      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to persist notification.",
      });
    }
  },

  async refresh() {
    try {
      const snapshot = await OfflineStorageService.getSnapshot();

      set({
        budgets: snapshot.budgets,
        categories: snapshot.categories,
        error: null,
        events: snapshot.events,
        initialized: true,
        merchants: snapshot.merchants,
        queue: snapshot.queue,
        rules: snapshot.rules,
        transactions: snapshot.transactions,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to load offline data.",
        initialized: true,
      });
    }
  },

  async updateFinancialEvent(eventId, updates) {
    try {
      await OfflineStorageService.updateFinancialEvent(eventId, updates);
      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to update Financial Event.",
      });
    }
  },
}));
