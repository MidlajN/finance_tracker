import {
    buildFinancialReport,
    getDefaultReportPeriod,
    type FinancialReport,
    type ReportPeriod,
} from "@finance/finance-core";

import { TransactionRepository } from "../repositories/TransactionRepository";

type Transaction = Awaited<
    ReturnType<typeof TransactionRepository.list>
>[number];

export type {
    FinancialReport,
    ReportPeriod,
};

export class ReportService {
    static getDefaultPeriod() {
        return getDefaultReportPeriod();
    }

    static async getReport(
        period: ReportPeriod,
        value: string
    ): Promise<FinancialReport<Transaction>> {
        const transactions =
            await TransactionRepository.list();

        return buildFinancialReport(
            transactions,
            period,
            value
        );
    }
}
