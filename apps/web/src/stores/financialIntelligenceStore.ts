import { create } from "zustand";

import {
    FinancialIntelligenceService,
    type AccountInsert,
    type AccountUpdate,
    type AssetInsert,
    type AssetUpdate,
    type FinancialIntelligenceData,
    type GoalInsert,
    type GoalUpdate,
    type InvestmentInsert,
    type InvestmentUpdate,
    type LiabilityInsert,
    type LiabilityUpdate,
    type LoanInsert,
    type LoanUpdate,
} from "../services/FinancialIntelligenceService";

type Resource =
    | "account"
    | "asset"
    | "liability"
    | "loan"
    | "investment"
    | "goal";

interface FinancialIntelligenceState {
    loading: boolean;

    error: string | null;

    data: FinancialIntelligenceData | null;

    refresh: () => Promise<void>;

    createAccount: (
        payload: AccountInsert
    ) => Promise<void>;

    updateAccount: (
        id: string,
        updates: AccountUpdate
    ) => Promise<void>;

    deleteAccount: (id: string) => Promise<void>;

    createAsset: (
        payload: AssetInsert
    ) => Promise<void>;

    updateAsset: (
        id: string,
        updates: AssetUpdate
    ) => Promise<void>;

    deleteAsset: (id: string) => Promise<void>;

    createLiability: (
        payload: LiabilityInsert
    ) => Promise<void>;

    updateLiability: (
        id: string,
        updates: LiabilityUpdate
    ) => Promise<void>;

    deleteLiability: (id: string) => Promise<void>;

    createLoan: (
        payload: LoanInsert
    ) => Promise<void>;

    updateLoan: (
        id: string,
        updates: LoanUpdate
    ) => Promise<void>;

    deleteLoan: (id: string) => Promise<void>;

    createInvestment: (
        payload: InvestmentInsert
    ) => Promise<void>;

    updateInvestment: (
        id: string,
        updates: InvestmentUpdate
    ) => Promise<void>;

    deleteInvestment: (id: string) => Promise<void>;

    createGoal: (
        payload: GoalInsert
    ) => Promise<void>;

    updateGoal: (
        id: string,
        updates: GoalUpdate
    ) => Promise<void>;

    deleteGoal: (id: string) => Promise<void>;

    clearError: () => void;
}

async function refreshData(
    set: (
        partial: Partial<FinancialIntelligenceState>
    ) => void
) {
    const data =
        await FinancialIntelligenceService.getData();

    set({
        data,
        loading: false,
    });
}

function getFailureMessage(
    error: unknown,
    resource: Resource,
    action: string
) {
    return error instanceof Error
        ? error.message
        : `Failed to ${action} ${resource}.`;
}

export const useFinancialIntelligenceStore =
    create<FinancialIntelligenceState>((set, get) => ({
        loading: false,

        error: null,

        data: null,

        async refresh() {
            if (get().loading) {
                return;
            }

            set({
                loading: true,
                error: null,
            });

            try {
                await refreshData(set);
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load financial intelligence.",
                });
            }
        },

        async createAccount(payload) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.createAccount(
                        payload
                    ),
                "account",
                "create"
            );
        },

        async updateAccount(id, updates) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.updateAccount(
                        id,
                        updates
                    ),
                "account",
                "update"
            );
        },

        async deleteAccount(id) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.deleteAccount(
                        id
                    ),
                "account",
                "delete"
            );
        },

        async createAsset(payload) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.createAsset(
                        payload
                    ),
                "asset",
                "create"
            );
        },

        async updateAsset(id, updates) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.updateAsset(
                        id,
                        updates
                    ),
                "asset",
                "update"
            );
        },

        async deleteAsset(id) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.deleteAsset(
                        id
                    ),
                "asset",
                "delete"
            );
        },

        async createLiability(payload) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.createLiability(
                        payload
                    ),
                "liability",
                "create"
            );
        },

        async updateLiability(id, updates) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.updateLiability(
                        id,
                        updates
                    ),
                "liability",
                "update"
            );
        },

        async deleteLiability(id) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.deleteLiability(
                        id
                    ),
                "liability",
                "delete"
            );
        },

        async createLoan(payload) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.createLoan(
                        payload
                    ),
                "loan",
                "create"
            );
        },

        async updateLoan(id, updates) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.updateLoan(
                        id,
                        updates
                    ),
                "loan",
                "update"
            );
        },

        async deleteLoan(id) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.deleteLoan(
                        id
                    ),
                "loan",
                "delete"
            );
        },

        async createInvestment(payload) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.createInvestment(
                        payload
                    ),
                "investment",
                "create"
            );
        },

        async updateInvestment(id, updates) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.updateInvestment(
                        id,
                        updates
                    ),
                "investment",
                "update"
            );
        },

        async deleteInvestment(id) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.deleteInvestment(
                        id
                    ),
                "investment",
                "delete"
            );
        },

        async createGoal(payload) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.createGoal(
                        payload
                    ),
                "goal",
                "create"
            );
        },

        async updateGoal(id, updates) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.updateGoal(
                        id,
                        updates
                    ),
                "goal",
                "update"
            );
        },

        async deleteGoal(id) {
            await mutate(
                set,
                () =>
                    FinancialIntelligenceService.deleteGoal(
                        id
                    ),
                "goal",
                "delete"
            );
        },

        clearError() {
            set({
                error: null,
            });
        },
    }));

async function mutate(
    set: (
        partial: Partial<FinancialIntelligenceState>
    ) => void,
    action: () => Promise<unknown>,
    resource: Resource,
    verb: string
) {
    set({
        loading: true,
        error: null,
    });

    try {
        await action();
        await refreshData(set);
    } catch (error) {
        const message = getFailureMessage(
            error,
            resource,
            verb
        );

        set({
            loading: false,
            error: message,
        });

        throw new Error(message, {
            cause: error,
        });
    }
}
