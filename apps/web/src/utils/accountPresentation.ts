import { getAccountClass } from "@finance/finance-core";

export interface AccountBalanceDisplay {
    // Magnitude to render; the label carries the meaning of the sign.
    amount: number;
    label: string;
    owed: boolean;
}

// Liability accounts keep the engine's signed convention (negative =
// owed) but present debt as a positive "outstanding" figure with
// liability wording. Asset accounts are untouched.
export function getAccountBalanceDisplay(
    accountType: string | null | undefined,
    balance: number
): AccountBalanceDisplay {
    if (getAccountClass(accountType) === "liability") {
        if (balance < 0) {
            return {
                amount: -balance,
                label: "Outstanding",
                owed: true,
            };
        }

        if (balance > 0) {
            return {
                amount: balance,
                label: "In credit",
                owed: false,
            };
        }

        return {
            amount: 0,
            label: "All settled",
            owed: false,
        };
    }

    return {
        amount: balance,
        label: "Current balance",
        owed: false,
    };
}

// Room left on a limit-bearing liability account. Null when no limit
// is set or the account is not a liability.
export function getAvailableCredit(
    account: {
        account_type?: string | null;
        credit_limit?: number | null;
    },
    balance: number
): number | null {
    if (
        getAccountClass(account.account_type) !==
            "liability" ||
        typeof account.credit_limit !== "number" ||
        account.credit_limit <= 0
    ) {
        return null;
    }

    const outstanding = balance < 0 ? -balance : 0;

    return Math.max(
        account.credit_limit - outstanding,
        0
    );
}
