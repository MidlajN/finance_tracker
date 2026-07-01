import {
    ArrowDownRight,
    ArrowUpRight,
    Calendar,
    CircleDollarSign,
    Clock,
    Receipt,
    StickyNote,
    Tag,
} from "lucide-react";

import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Surface } from "../../components/common/Surface";

import type { Transaction } from "../../types";

interface TransactionDetailsProps {
    transaction: Transaction | null;

    onEdit?: (
        transaction: Transaction
    ) => void;
}

export function TransactionDetails({
    transaction,
    onEdit,
}: TransactionDetailsProps) {
    if (!transaction) {
        return (
            <Surface className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                    <CircleDollarSign
                        size={56}
                        className="mx-auto text-slate-300"
                    />

                    <h2 className="mt-6 text-xl font-semibold text-slate-900">
                        Select a Transaction
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        Select a transaction from the left
                        to view its details.
                    </p>
                </div>
            </Surface>
        );
    }

    const isExpense =
        transaction.transaction_type ===
        "expense";

    return (
        <Surface className="flex h-full flex-col">
            <div className="border-b border-slate-200 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {transaction.merchant?.name ??
                                "Unknown Merchant"}
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Confirmed Transaction
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge
                            variant={
                                isExpense
                                    ? "danger"
                                    : "success"
                            }
                        >
                            {transaction.transaction_type}
                        </Badge>

                        {onEdit && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                    onEdit(
                                        transaction
                                    )
                                }
                            >
                                Edit
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto p-6">

                {/* Amount */}

                <section>
                    <div className="flex items-center gap-3">
                        {isExpense ? (
                            <ArrowUpRight className="text-red-500" />
                        ) : (
                            <ArrowDownRight className="text-green-500" />
                        )}

                        <div>
                            <p className="text-sm text-slate-500">
                                Amount
                            </p>

                            <h1 className="text-4xl font-bold tracking-tight">
                                ₹
                                {transaction.amount.toLocaleString(
                                    "en-IN",
                                    {
                                        minimumFractionDigits: 2,
                                    }
                                )}
                            </h1>
                        </div>
                    </div>
                </section>

                {/* Merchant */}

                <section className="space-y-5">

                    <div className="flex items-center gap-3">
                        <Receipt
                            size={18}
                            className="text-slate-400"
                        />

                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                                Merchant
                            </p>

                            <p className="font-medium">
                                {transaction.merchant?.name ??
                                    "Unknown Merchant"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Tag
                            size={18}
                            className="text-slate-400"
                        />

                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                                Category
                            </p>

                            <p className="font-medium">
                                {transaction.category
                                    ?.name ??
                                    "Uncategorized"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Calendar
                            size={18}
                            className="text-slate-400"
                        />

                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                                Date
                            </p>

                            <p className="font-medium">
                                {new Date(
                                    transaction.occurred_at
                                ).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Clock
                            size={18}
                            className="text-slate-400"
                        />

                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                                Time
                            </p>

                            <p className="font-medium">
                                {new Date(
                                    transaction.occurred_at
                                ).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>

                </section>

                {/* Notes */}

                {transaction.notes && (
                    <section>

                        <div className="mb-3 flex items-center gap-2">
                            <StickyNote
                                size={18}
                                className="text-slate-400"
                            />

                            <h3 className="font-semibold">
                                Notes
                            </h3>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                            {transaction.notes}
                        </div>

                    </section>
                )}

                {/* Linked Event */}

                <section>

                    <div className="mb-3 flex items-center gap-2">
                        <Receipt
                            size={18}
                            className="text-slate-400"
                        />

                        <h3 className="font-semibold">
                            Source Event
                        </h3>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                            Event ID
                        </p>

                        <p className="mt-2 break-all font-mono text-sm">
                            {transaction.event_id}
                        </p>
                    </div>

                </section>

            </div>
        </Surface>
    );
}
