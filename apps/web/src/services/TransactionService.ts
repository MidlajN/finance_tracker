import { EventRepository } from "../repositories/EventRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";

import type { Merchant } from "../types";

interface UpdateTransactionInput {
    transactionId: string;

    eventId: string;

    merchant: Merchant | null;

    categoryId: string | null;

    amount: number;

    occurredAt: string;

    notes: string | null;
}

export class TransactionService {
    static async update({
        transactionId,
        eventId,
        merchant,
        categoryId,
        amount,
        occurredAt,
        notes,
    }: UpdateTransactionInput) {
        await TransactionRepository.update(
            transactionId,
            {
                merchant_id:
                    merchant?.id ?? null,

                category_id:
                    categoryId,

                amount,

                occurred_at:
                    occurredAt,

                notes,
            }
        );

        await EventRepository.update(
            eventId,
            {
                merchant_id:
                    merchant?.id ?? null,

                merchant_name_raw:
                    merchant?.name ??
                    null,

                amount,

                occurred_at:
                    occurredAt,

                notes,
            }
        );
    }
}
