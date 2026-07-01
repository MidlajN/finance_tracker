import {
    buildBudgetOverview,
    getCurrentMonthStart,
    validateBudget,
    type BudgetOverview as CoreBudgetOverview,
    type BudgetProgress as CoreBudgetProgress,
} from "@finance/finance-core";

import { BudgetRepository } from "../repositories/BudgetRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";

import type { Database } from "../lib/database.types";

type Budget = Awaited<
    ReturnType<typeof BudgetRepository.list>
>[number];

type BudgetInput = Omit<
    Database["public"]["Tables"]["budgets"]["Insert"],
    "user_id"
>;

type BudgetUpdate =
    Database["public"]["Tables"]["budgets"]["Update"];

export type BudgetOverview =
    CoreBudgetOverview<Budget>;

export type BudgetProgress =
    CoreBudgetProgress<Budget>;

export class BudgetService {
    static getCurrentMonthStart() {
        return getCurrentMonthStart();
    }

    static async getOverview(
        monthStart = getCurrentMonthStart()
    ): Promise<BudgetOverview> {
        const [
            budgets,
            transactions,
        ] = await Promise.all([
            BudgetRepository.listForMonth(
                monthStart
            ),
            TransactionRepository.list(),
        ]);

        return buildBudgetOverview(
            budgets,
            transactions,
            monthStart
        );
    }

    static async create(
        budget: BudgetInput
    ) {
        validateBudget(budget);

        return BudgetRepository.create(budget);
    }

    static async update(
        id: string,
        updates: BudgetUpdate
    ) {
        validateBudget(updates);

        return BudgetRepository.update(
            id,
            updates
        );
    }

    static async delete(id: string) {
        await BudgetRepository.delete(id);
    }
}
