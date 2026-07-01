import {
    ArrowDownRight,
    ArrowUpRight,
    Calendar,
} from "lucide-react";

import { cn } from "../../utils/helpers";
import { Badge } from "../../components/common/Badge";
import type { Transaction } from "../../types";

interface TransactionCardProps {
    transaction: Transaction;

    selected?: boolean;

    onClick?: (
        transaction: Transaction
    ) => void;
}

export function TransactionCard({
    transaction,
    selected = false,
    onClick,
}: TransactionCardProps) {
    const isExpense =
        transaction.transaction_type ===
        "expense";

    return (
        <button
            type="button"
            onClick={() =>
                onClick?.(transaction)
            }
            className={cn(
                "w-full",
                "rounded-2xl",
                "border",
                "bg-white",
                "p-5",
                "text-left",
                "transition-all",
                "duration-200",
                "hover:border-blue-300",
                "hover:shadow-md",
                "focus:outline-none",
                "focus:ring-2",
                "focus:ring-blue-500",
                selected
                    ? "border-blue-500 ring-2 ring-blue-100"
                    : "border-slate-200"
            )}
        >
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-semibold text-slate-900">
                        {transaction.merchant?.name ??
                            "Unknown Merchant"}
                    </h3>

                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <Calendar size={14} />

                        {new Date(
                            transaction.occurred_at
                        ).toLocaleDateString()}
                    </div>
                </div>

                {transaction.category && (
                    <Badge>
                        {transaction.category.name}
                    </Badge>
                )}
            </div>

            <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isExpense ? (
                        <ArrowUpRight
                            size={18}
                            className="text-red-500"
                        />
                    ) : (
                        <ArrowDownRight
                            size={18}
                            className="text-green-500"
                        />
                    )}

                    <span
                        className={cn(
                            "text-2xl font-bold",
                            isExpense
                                ? "text-red-600"
                                : "text-green-600"
                        )}
                    >
                        ₹
                        {transaction.amount.toLocaleString(
                            "en-IN",
                            {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            }
                        )}
                    </span>
                </div>

                <span className="text-sm text-slate-400">
                    {transaction.transaction_type}
                </span>
            </div>
        </button>
    );
}