import type {
  SyncQueueItem,
  TransactionUpdates,
} from "@finance/shared-api";
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
  CachedMerchantAlias,
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
  merchantAliases: CachedMerchantAlias[];
  merchants: CachedMerchant[];
  queue: SyncQueueItem[];
  rules: CachedFinancialRule[];
  transactions: CachedTransaction[];
  initialize: () => Promise<void>;
  createFinancialEvent: (
    event: FinancialEventInput,
    source: string,
    options?: { confirm?: boolean }
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
  deleteTransaction: (
    transactionId: string,
    eventId: string
  ) => Promise<void>;
  updateTransaction: (
    transactionId: string,
    updates: TransactionUpdates
  ) => Promise<void>;
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
  assignEventMerchant: (
    eventId: string,
    merchantId: string | null,
    rawName?: string | null
  ) => Promise<void>;
  createMerchantForEvent: (
    eventId: string,
    name: string,
    rawName?: string | null
  ) => Promise<void>;
  addMerchantAlias: (
    merchantId: string,
    alias: string
  ) => Promise<boolean>;
  deleteMerchantAlias: (id: string) => Promise<void>;
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
  merchantAliases: [],
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

  async createFinancialEvent(event, source, options) {
    try {
      const persisted = await OfflineStorageService.persistFinancialEvent(
        event,
        source
      );

      // Manual entries carry no parser uncertainty — the review gate
      // exists for captured notifications, so skip it when asked.
      if (options?.confirm && persisted.event.status === "pending") {
        await OfflineStorageService.confirmFinancialEvent(
          persisted.event.id
        );
      }

      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to save Financial Event.",
      });
      throw error;
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

  async updateTransaction(transactionId, updates) {
    try {
      const current = get().transactions.find(
        (transaction) => transaction.id === transactionId
      );

      if (!current) {
        throw new Error("Transaction not found.");
      }

      const category = updates.category_id
        ? get().categories.find(
            (candidate) => candidate.id === updates.category_id
          ) ?? null
        : null;
      const next: CachedTransaction = {
        ...current,
        account_id:
          updates.account_id !== undefined
            ? updates.account_id
            : current.account_id,
        amount: updates.amount ?? current.amount,
        category_id:
          updates.category_id !== undefined
            ? updates.category_id
            : current.category_id,
        category:
          updates.category_id !== undefined
            ? category
              ? {
                  color: category.color,
                  icon: category.icon,
                  id: category.id,
                  name: category.name,
                }
              : null
            : current.category,
        notes: updates.notes !== undefined ? updates.notes : current.notes,
        occurred_at: updates.occurred_at ?? current.occurred_at,
        transaction_type:
          (updates.transaction_type as CachedTransaction["transaction_type"]) ??
          current.transaction_type,
        updated_at: new Date().toISOString(),
      };

      await OfflineStorageService.updateTransaction(next, updates);
      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to update the transaction.",
      });
      throw error;
    }
  },

  async deleteTransaction(transactionId, eventId) {
    try {
      await OfflineStorageService.deleteTransaction(transactionId, eventId);
      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete the transaction.",
      });
      throw error;
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
        merchantAliases: snapshot.merchantAliases,
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

  async addMerchantAlias(merchantId, alias) {
    try {
      const result = await OfflineStorageService.learnMerchantAlias(
        merchantId,
        alias
      );

      await get().refresh();

      return result !== null;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to add the alias.",
      });
      throw error;
    }
  },

  async deleteMerchantAlias(id) {
    try {
      await OfflineStorageService.deleteMerchantAlias(id);
      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove the alias.",
      });
      throw error;
    }
  },

  async createMerchantForEvent(eventId, name, rawName) {
    try {
      const { merchant } = await OfflineStorageService.persistMerchant({
        name,
      });

      await OfflineStorageService.updateFinancialEvent(eventId, {
        merchant_id: merchant.id,
      });

      if (rawName) {
        await OfflineStorageService.learnMerchantAlias(
          merchant.id,
          rawName
        );
      }

      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the merchant.",
      });
      throw error;
    }
  },

  async assignEventMerchant(eventId, merchantId, rawName) {
    try {
      await OfflineStorageService.updateFinancialEvent(eventId, {
        merchant_id: merchantId,
      });

      if (merchantId && rawName) {
        await OfflineStorageService.learnMerchantAlias(merchantId, rawName);
      }

      await get().refresh();
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Unable to update the merchant.",
      });
      throw error;
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
