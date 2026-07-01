import {
    buildDashboardData,
    type DashboardData,
} from "@finance/finance-core";

import { CategoryRepository } from "../repositories/CategoryRepository";
import { EventRepository } from "../repositories/EventRepository";
import { MerchantRepository } from "../repositories/MerchantRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";

type Transaction = Awaited<
    ReturnType<typeof TransactionRepository.list>
>[number];

export type { DashboardData };

export class DashboardService {
    static async getOverview(): Promise<DashboardData<Transaction>> {
        const [
            transactions,
            merchants,
            categories,
            pendingEvents,
        ] = await Promise.all([
            TransactionRepository.list(),
            MerchantRepository.list(),
            CategoryRepository.list(),
            EventRepository.pendingCount(),
        ]);

        return buildDashboardData(
            transactions,
            merchants,
            categories.length,
            pendingEvents
        );
    }
}
