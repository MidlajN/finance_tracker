import type { SyncQueueItem } from "@finance/shared-api";
import type {
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
  CachedTransaction,
  CategoryLike,
  CurrencyLike,
  ExchangeRateLike,
  FinancialEventInput,
  GoalLike,
  InvestmentLike,
  LiabilityLike,
  LoanLike,
  MerchantLike,
} from "@finance/shared-types";
import { create } from "zustand";

import {
  type PersistedFinancialEvent,
  OfflineStorageService,
} from "../services/OfflineStorageService";
import type { ParsedNotificationResult } from "../services/NotificationService";

interface OfflineState {
  accounts: CachedAccount[];
  assets: CachedAsset[];
  budgets: CachedBudget[];
  categories: CachedCategory[];
  currencies: CurrencyLike[];
  error: string | null;
  events: CachedFinancialEvent[];
  exchangeRates: ExchangeRateLike[];
  goals: CachedGoal[];
  initialized: boolean;
  investments: CachedInvestment[];
  liabilities: CachedLiability[];
  loans: CachedLoan[];
  merchants: CachedMerchant[];
  queue: SyncQueueItem[];
  rules: CachedFinancialRule[];
  transactions: CachedTransaction[];
  initialize: () => Promise<void>;
  createFinancialEvent: (
    event: FinancialEventInput,
    source: string
  ) => Promise<void>;
  confirmFinancialEvent: (eventId: string) => Promise<void>;
  createAccount: (account: AccountLike) => Promise<void>;
  createBudget: (budget: BudgetLike) => Promise<void>;
  createCategory: (category: CategoryLike) => Promise<void>;
  createAsset: (asset: AssetLike) => Promise<void>;
  createLiability: (liability: LiabilityLike) => Promise<void>;
  createLoan: (loan: LoanLike) => Promise<void>;
  createInvestment: (investment: InvestmentLike) => Promise<void>;
  createGoal: (goal: GoalLike) => Promise<void>;
  createMerchant: (merchant: MerchantLike) => Promise<void>;
  deleteFinancialEvent: (eventId: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  ignoreFinancialEvent: (eventId: string) => Promise<void>;
  persistParsedNotification: (
    result: ParsedNotificationResult
  ) => Promise<PersistedFinancialEvent | null>;
  refresh: () => Promise<void>;
  updateFinancialEvent: (
    eventId: string,
    updates: Partial<FinancialEventInput>
  ) => Promise<void>;
  updateAccount: (id: string, updates: Partial<AccountLike>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<AssetLike>) => Promise<void>;
  updateLiability: (
    id: string,
    updates: Partial<LiabilityLike>
  ) => Promise<void>;
  updateLoan: (id: string, updates: Partial<LoanLike>) => Promise<void>;
  updateInvestment: (
    id: string,
    updates: Partial<InvestmentLike>
  ) => Promise<void>;
  updateGoal: (id: string, updates: Partial<GoalLike>) => Promise<void>;
  updateMerchant: (id: string, updates: Partial<MerchantLike>) => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  accounts: [],
  assets: [],
  budgets: [],
  categories: [],
  currencies: [],
  error: null,
  events: [],
  exchangeRates: [],
  goals: [],
  initialized: false,
  investments: [],
  liabilities: [],
  loans: [],
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

  async confirmFinancialEvent(eventId) {
    try {
      await OfflineStorageService.confirmFinancialEvent(eventId);
      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to confirm Financial Event.",
      });
      throw error;
    }
  },

  async ignoreFinancialEvent(eventId) {
    try {
      await OfflineStorageService.ignoreFinancialEvent(eventId);
      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to ignore Financial Event.",
      });
      throw error;
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

  async createAccount(account) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.persistAccount(account)
    );
  },

  async createBudget(budget) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.persistBudget(budget)
    );
  },

  async createCategory(category) {
    try {
      await OfflineStorageService.persistCategory(category);
      await get().refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create category.";
      set({ error: message });
      throw error;
    }
  },

  async createAsset(asset) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.persistAsset(asset)
    );
  },

  async createLiability(liability) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.persistLiability(liability)
    );
  },

  async createLoan(loan) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.persistLoan(loan)
    );
  },

  async createInvestment(investment) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.persistInvestment(investment)
    );
  },

  async createGoal(goal) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.persistGoal(goal)
    );
  },

  async createMerchant(merchant) {
    try {
      await OfflineStorageService.persistMerchant(merchant);
      await get().refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create merchant.";
      set({ error: message });
      throw error;
    }
  },

  async deleteAccount(id) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.deleteAccount(id)
    );
  },

  async deleteAsset(id) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.deleteAsset(id)
    );
  },

  async deleteLiability(id) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.deleteLiability(id)
    );
  },

  async deleteLoan(id) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.deleteLoan(id)
    );
  },

  async deleteInvestment(id) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.deleteInvestment(id)
    );
  },

  async deleteGoal(id) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.deleteGoal(id)
    );
  },

  async persistParsedNotification(result) {
    try {
      const persisted =
        await OfflineStorageService.persistParsedNotification(result);
      await get().refresh();

      return persisted;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to persist notification.",
      });

      return null;
    }
  },

  async refresh() {
    try {
      const snapshot = await OfflineStorageService.getSnapshot();

      set({
        accounts: snapshot.accounts,
        assets: snapshot.assets,
        budgets: snapshot.budgets,
        categories: snapshot.categories,
        currencies: snapshot.currencies,
        error: null,
        events: snapshot.events,
        exchangeRates: snapshot.exchangeRates,
        goals: snapshot.goals,
        initialized: true,
        investments: snapshot.investments,
        liabilities: snapshot.liabilities,
        loans: snapshot.loans,
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

  async updateAccount(id, updates) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.updateAccount(id, updates)
    );
  },

  async updateAsset(id, updates) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.updateAsset(id, updates)
    );
  },

  async updateLiability(id, updates) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.updateLiability(id, updates)
    );
  },

  async updateLoan(id, updates) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.updateLoan(id, updates)
    );
  },

  async updateInvestment(id, updates) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.updateInvestment(id, updates)
    );
  },

  async updateGoal(id, updates) {
    await mutateOffline(set, get, () =>
      OfflineStorageService.updateGoal(id, updates)
    );
  },

  async updateMerchant(id, updates) {
    try {
      await OfflineStorageService.updateMerchant(id, updates);
      await get().refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update merchant.";
      set({ error: message });
      throw error;
    }
  },
}));

async function mutateOffline(
  set: (partial: Partial<OfflineState>) => void,
  get: () => OfflineState,
  action: () => Promise<unknown>
) {
  try {
    await action();
    await get().refresh();
  } catch (error) {
    set({
      error:
        error instanceof Error
          ? error.message
          : "Unable to save offline changes.",
    });
  }
}
