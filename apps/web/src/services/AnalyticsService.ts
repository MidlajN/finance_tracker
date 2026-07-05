import {
    buildFinancialAnalytics,
    type FinancialAnalytics,
} from "@finance/finance-core";

import { TransactionRepository } from "../repositories/TransactionRepository";

export type { FinancialAnalytics };

export class AnalyticsService {
    static async getAnalytics(): Promise<FinancialAnalytics> {
        const transactions =
            await TransactionRepository.list();

        return buildFinancialAnalytics(
            transactions
        );
    }
}
