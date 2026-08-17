import { EventRepository } from "../repositories/EventRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";

import type { Merchant } from "../types";

interface UpdateTransactionInput {
    transactionId: string;

    eventId: string;

    merchant: Merchant | null;

    categoryId: string | null;

    accountId: string | null;

    amount: number;

    occurredAt: string;

    notes: string | null;

    // Optional so existing callers keep their behavior; "transfer"
    // legs are neither income nor expense per the accounting engine.
    transactionType?:
        | "expense"
        | "income"
        | "refund"
        | "transfer";
}

export class TransactionService {
    static async update({
        transactionId,
        eventId,
        merchant,
        categoryId,
        accountId,
        amount,
        occurredAt,
        notes,
        transactionType,
    }: UpdateTransactionInput) {
        await TransactionRepository.update(
            transactionId,
            {
                merchant_id:
                    merchant?.id ?? null,

                category_id:
                    categoryId,

                account_id:
                    accountId,

                amount,

                occurred_at:
                    occurredAt,

                notes,

                ...(transactionType
                    ? {
                          transaction_type:
                              transactionType,
                      }
                    : {}),
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
