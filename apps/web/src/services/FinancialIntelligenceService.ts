import {
    buildFinancialIntelligenceOverview,
    type FinancialIntelligenceOverview,
} from "@finance/finance-core";

import { DEFAULT_CURRENCY } from "../utils/constants";
import { FinancialIntelligenceRepository } from "../repositories/FinancialIntelligenceRepository";
import { ProfileRepository } from "../repositories/ProfileRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";

import type {
    CachedAccount,
    CachedAsset,
    CachedGoal,
    CachedInvestment,
    CachedLiability,
    CachedLoan,
    CurrencyLike,
    ExchangeRateLike,
} from "@finance/shared-types";
import type {
    AccountInsert,
    AccountUpdate,
    AssetInsert,
    AssetUpdate,
    GoalInsert,
    GoalUpdate,
    InvestmentInsert,
    InvestmentUpdate,
    LiabilityInsert,
    LiabilityUpdate,
    LoanInsert,
    LoanUpdate,
} from "../repositories/FinancialIntelligenceRepository";

export interface FinancialIntelligenceData {
    baseCurrency: string;
    currencies: CurrencyLike[];
    exchangeRates: ExchangeRateLike[];
    accounts: CachedAccount[];
    assets: CachedAsset[];
    liabilities: CachedLiability[];
    loans: CachedLoan[];
    investments: CachedInvestment[];
    goals: CachedGoal[];
    overview: FinancialIntelligenceOverview;
}

function requirePositive(
    value: number | undefined,
    message: string
) {
    if (
        value === undefined ||
        Number.isNaN(value) ||
        value <= 0
    ) {
        throw new Error(message);
    }
}

function requireNonNegative(
    value: number | undefined,
    message: string
) {
    if (
        value === undefined ||
        Number.isNaN(value) ||
        value < 0
    ) {
        throw new Error(message);
    }
}

function requireName(
    value: string | undefined,
    message: string
) {
    if (!value?.trim()) {
        throw new Error(message);
    }
}

export class FinancialIntelligenceService {
    static async getData(): Promise<FinancialIntelligenceData> {
        const [
            profile,
            currencies,
            exchangeRates,
            accounts,
            assets,
            liabilities,
            loans,
            investments,
            goals,
            transactions,
        ] = await Promise.all([
            ProfileRepository.getCurrent(),
            FinancialIntelligenceRepository.listCurrencies(),
            FinancialIntelligenceRepository.listExchangeRates(),
            FinancialIntelligenceRepository.listAccounts(),
            FinancialIntelligenceRepository.listAssets(),
            FinancialIntelligenceRepository.listLiabilities(),
            FinancialIntelligenceRepository.listLoans(),
            FinancialIntelligenceRepository.listInvestments(),
            FinancialIntelligenceRepository.listGoals(),
            TransactionRepository.list(),
        ]);

        const baseCurrency =
            profile?.currency ?? DEFAULT_CURRENCY;
        const overview =
            buildFinancialIntelligenceOverview({
                accounts: accounts as CachedAccount[],
                assets: assets as CachedAsset[],
                liabilities:
                    liabilities as CachedLiability[],
                loans: loans as CachedLoan[],
                investments:
                    investments as CachedInvestment[],
                goals: goals as CachedGoal[],
                transactions,
                exchangeRates:
                    exchangeRates as ExchangeRateLike[],
                baseCurrency,
            });

        return {
            baseCurrency,
            currencies: currencies as CurrencyLike[],
            exchangeRates:
                exchangeRates as ExchangeRateLike[],
            accounts: accounts as CachedAccount[],
            assets: assets as CachedAsset[],
            liabilities:
                liabilities as CachedLiability[],
            loans: loans as CachedLoan[],
            investments:
                investments as CachedInvestment[],
            goals: goals as CachedGoal[],
            overview,
        };
    }

    static async createAccount(payload: AccountInsert) {
        requireName(payload.name, "Account name is required.");
        requireNonNegative(
            payload.opening_balance,
            "Opening balance cannot be negative."
        );

        return FinancialIntelligenceRepository.createAccount(
            payload
        );
    }

    static async updateAccount(
        id: string,
        updates: AccountUpdate
    ) {
        if ("name" in updates) {
            requireName(
                updates.name,
                "Account name is required."
            );
        }

        return FinancialIntelligenceRepository.updateAccount(
            id,
            updates
        );
    }

    static deleteAccount(id: string) {
        return FinancialIntelligenceRepository.deleteAccount(
            id
        );
    }

    static async createAsset(payload: AssetInsert) {
        requireName(payload.name, "Asset name is required.");
        requirePositive(
            payload.current_valuation,
            "Current valuation must be greater than zero."
        );

        return FinancialIntelligenceRepository.createAsset(
            payload
        );
    }

    static updateAsset(
        id: string,
        updates: AssetUpdate
    ) {
        return FinancialIntelligenceRepository.updateAsset(
            id,
            updates
        );
    }

    static deleteAsset(id: string) {
        return FinancialIntelligenceRepository.deleteAsset(
            id
        );
    }

    static async createLiability(
        payload: LiabilityInsert
    ) {
        requireName(
            payload.name,
            "Liability name is required."
        );
        requirePositive(
            payload.outstanding_balance,
            "Outstanding balance must be greater than zero."
        );

        return FinancialIntelligenceRepository.createLiability(
            payload
        );
    }

    static updateLiability(
        id: string,
        updates: LiabilityUpdate
    ) {
        return FinancialIntelligenceRepository.updateLiability(
            id,
            updates
        );
    }

    static deleteLiability(id: string) {
        return FinancialIntelligenceRepository.deleteLiability(
            id
        );
    }

    static async createLoan(payload: LoanInsert) {
        requirePositive(
            payload.monthly_payment,
            "Monthly payment must be greater than zero."
        );

        return FinancialIntelligenceRepository.createLoan(
            payload
        );
    }

    static updateLoan(
        id: string,
        updates: LoanUpdate
    ) {
        return FinancialIntelligenceRepository.updateLoan(
            id,
            updates
        );
    }

    static deleteLoan(id: string) {
        return FinancialIntelligenceRepository.deleteLoan(
            id
        );
    }

    static async createInvestment(
        payload: InvestmentInsert
    ) {
        requireName(
            payload.symbol,
            "Investment symbol is required."
        );
        requirePositive(
            payload.quantity,
            "Quantity must be greater than zero."
        );

        return FinancialIntelligenceRepository.createInvestment(
            payload
        );
    }

    static updateInvestment(
        id: string,
        updates: InvestmentUpdate
    ) {
        return FinancialIntelligenceRepository.updateInvestment(
            id,
            updates
        );
    }

    static deleteInvestment(id: string) {
        return FinancialIntelligenceRepository.deleteInvestment(
            id
        );
    }

    static async createGoal(payload: GoalInsert) {
        requireName(payload.name, "Goal name is required.");
        requirePositive(
            payload.target_amount,
            "Target amount must be greater than zero."
        );

        return FinancialIntelligenceRepository.createGoal(
            payload
        );
    }

    static updateGoal(
        id: string,
        updates: GoalUpdate
    ) {
        return FinancialIntelligenceRepository.updateGoal(
            id,
            updates
        );
    }

    static deleteGoal(id: string) {
        return FinancialIntelligenceRepository.deleteGoal(
            id
        );
    }
}

export type {
    AccountInsert,
    AccountUpdate,
    AssetInsert,
    AssetUpdate,
    LiabilityInsert,
    LiabilityUpdate,
    LoanInsert,
    LoanUpdate,
    InvestmentInsert,
    InvestmentUpdate,
    GoalInsert,
    GoalUpdate,
};
