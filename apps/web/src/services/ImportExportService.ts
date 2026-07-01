import {
    buildBackupPayload,
    getFinancialEventKey,
    parseBackupPayload,
    parseFinancialEventsCsv,
    serializeBackupPayload,
    transactionsToCsv,
} from "@finance/parser";

import { EventRepository } from "../repositories/EventRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { EventService } from "./EventService";

import type {
    FinancialEventInput,
    ImportResult,
} from "@finance/shared-types";

type FinancialEvent = Awaited<
    ReturnType<typeof EventRepository.list>
>[number];

export type { ImportResult };

function toEventInput(
    event: FinancialEvent
): FinancialEventInput {
    return {
        amount: event.amount,
        confidence: event.confidence,
        currency: event.currency,
        direction: event.direction,
        merchant_id: event.merchant_id,
        merchant_name_raw:
            event.merchant_name_raw,
        metadata: event.metadata,
        notes: event.notes,
        occurred_at: event.occurred_at,
        status: "pending",
    };
}

async function importEvents(
    rows: FinancialEventInput[],
    failureLabel: "import" | "restore"
) {
    const existingEvents =
        await EventRepository.list();

    const existingKeys = new Set(
        existingEvents.map(getFinancialEventKey)
    );

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
        const key = getFinancialEventKey(row);

        if (existingKeys.has(key)) {
            skipped += 1;
            continue;
        }

        try {
            await EventService.create(row);
            existingKeys.add(key);
            imported += 1;
        } catch {
            errors.push(
                `Could not ${failureLabel} ${row.merchant_name_raw ?? "Unknown Merchant"} on ${row.occurred_at}.`
            );
        }
    }

    return {
        imported,
        skipped,
        errors,
    };
}

export class ImportExportService {
    static async importCsv(
        text: string
    ): Promise<ImportResult> {
        const rows =
            parseFinancialEventsCsv(text);

        return importEvents(rows, "import");
    }

    static async exportTransactionsCsv() {
        const transactions =
            await TransactionRepository.list();

        return transactionsToCsv(
            transactions
        );
    }

    static async exportBackupJson() {
        const events =
            await EventRepository.list();

        return serializeBackupPayload(
            buildBackupPayload(
                events.map(toEventInput)
            )
        );
    }

    static async restoreBackupJson(
        text: string
    ): Promise<ImportResult> {
        const parsed =
            parseBackupPayload(text);

        return importEvents(
            parsed.financial_events,
            "restore"
        );
    }
}
