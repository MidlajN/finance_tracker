import {
    detectRecurringOverview,
    type RecurringActivity,
    type RecurringOverview,
} from "@finance/finance-core";

import { TransactionRepository } from "../repositories/TransactionRepository";

export type {
    RecurringActivity,
    RecurringOverview,
};

export class RecurringService {
    static async getOverview(): Promise<RecurringOverview> {
        const transactions =
            await TransactionRepository.list();

        return detectRecurringOverview(
            transactions
        );
    }
}
