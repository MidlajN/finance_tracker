// Shared ledger presentation for transaction types. Transfers are
// neither income nor expense — they render neutral, never red/green.
export function getTransactionPresentation(type: string): {
    amountClass: string;
    badgeVariant: "danger" | "default" | "success";
    label: string;
} {
    if (type === "transfer") {
        return {
            amountClass: "text-slate-600",
            badgeVariant: "default",
            label: "Transfer",
        };
    }

    if (type === "expense") {
        return {
            amountClass: "text-red-600",
            badgeVariant: "danger",
            label: "Expense",
        };
    }

    if (type === "refund") {
        return {
            amountClass: "text-green-600",
            badgeVariant: "success",
            label: "Refund",
        };
    }

    return {
        amountClass: "text-green-600",
        badgeVariant: "success",
        label: "Income",
    };
}
