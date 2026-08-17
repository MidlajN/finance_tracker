import assert from "node:assert/strict";
import test from "node:test";

import type { TransactionLike } from "@finance/shared-types";

import {
    calculateAccountBalance,
    deriveTransactionType,
    getAccountClass,
    getExpenseTotal,
    getIncomeTotal,
    getTransactionEffect,
    isExpenseLike,
    isIncomeLike,
} from "./index.ts";

function transaction(
    overrides: Partial<TransactionLike> &
        Pick<TransactionLike, "transaction_type" | "amount">
): TransactionLike {
    return {
        occurred_at: "2026-08-01T10:00:00.000Z",
        ...overrides,
    };
}

test("effect table: income", () => {
    const effect = getTransactionEffect(
        transaction({ amount: 100, transaction_type: "income" })
    );

    assert.deepEqual(effect, {
        balanceDelta: 100,
        expense: 0,
        income: 100,
    });
});

test("effect table: expense", () => {
    const effect = getTransactionEffect(
        transaction({ amount: 100, transaction_type: "expense" })
    );

    assert.deepEqual(effect, {
        balanceDelta: -100,
        expense: 100,
        income: 0,
    });
});

test("effect table: refund reduces expense, never counts as income", () => {
    const effect = getTransactionEffect(
        transaction({ amount: 100, transaction_type: "refund" })
    );

    assert.deepEqual(effect, {
        balanceDelta: 100,
        expense: -100,
        income: 0,
    });
});

test("effect table: transfer legs follow the event direction and touch no report", () => {
    const inbound = getTransactionEffect(
        transaction({
            amount: 100,
            event: { direction: "credit" },
            transaction_type: "transfer",
        })
    );
    const outbound = getTransactionEffect(
        transaction({
            amount: 100,
            event: { direction: "debit" },
            transaction_type: "transfer",
        })
    );
    const inert = getTransactionEffect(
        transaction({ amount: 100, transaction_type: "transfer" })
    );

    assert.deepEqual(inbound, {
        balanceDelta: 100,
        expense: 0,
        income: 0,
    });
    assert.deepEqual(outbound, {
        balanceDelta: -100,
        expense: 0,
        income: 0,
    });
    assert.deepEqual(inert, {
        balanceDelta: 0,
        expense: 0,
        income: 0,
    });
});

test("invariant: a transfer relocates value, net position unchanged", () => {
    const bankLeg = getTransactionEffect(
        transaction({
            amount: 5000,
            event: { direction: "debit" },
            transaction_type: "transfer",
        })
    );
    const cardLeg = getTransactionEffect(
        transaction({
            amount: 5000,
            event: { direction: "credit" },
            transaction_type: "transfer",
        })
    );

    assert.equal(bankLeg.balanceDelta + cardLeg.balanceDelta, 0);
    assert.equal(bankLeg.income + cardLeg.income, 0);
    assert.equal(bankLeg.expense + cardLeg.expense, 0);
});

test("income and expense totals exclude transfers and net refunds", () => {
    const transactions = [
        transaction({ amount: 1000, transaction_type: "income" }),
        transaction({ amount: 400, transaction_type: "expense" }),
        transaction({ amount: 150, transaction_type: "refund" }),
        transaction({
            amount: 5000,
            event: { direction: "debit" },
            transaction_type: "transfer",
        }),
        transaction({
            amount: 5000,
            event: { direction: "credit" },
            transaction_type: "transfer",
        }),
    ];

    assert.equal(getIncomeTotal(transactions), 1000);
    assert.equal(getExpenseTotal(transactions), 250);
});

test("credit card lifecycle: spend raises debt, payment clears it, reports untouched", () => {
    const card = {
        archived: false,
        id: "card-1",
        account_type: "credit_card" as const,
        currency: "INR",
        name: "SBI Card",
        opening_balance: 0,
    };
    const bank = {
        archived: false,
        id: "bank-1",
        account_type: "bank" as const,
        currency: "INR",
        name: "Salary Account",
        opening_balance: 10000,
    };
    const transactions = [
        // Two swipes on the card.
        transaction({
            account_id: "card-1",
            amount: 3000,
            transaction_type: "expense",
        }),
        transaction({
            account_id: "card-1",
            amount: 2000,
            transaction_type: "expense",
        }),
        // Bill payment: one observed leg per account.
        transaction({
            account_id: "bank-1",
            amount: 5000,
            event: { direction: "debit" },
            transaction_type: "transfer",
        }),
        transaction({
            account_id: "card-1",
            amount: 5000,
            event: { direction: "credit" },
            transaction_type: "transfer",
        }),
    ];

    // Card owed 5000 after swipes, back to zero after payment.
    assert.equal(calculateAccountBalance(card, transactions), 0);
    // Bank paid the bill.
    assert.equal(calculateAccountBalance(bank, transactions), 5000);
    // The payment is neither income nor expense; only the swipes count.
    assert.equal(getIncomeTotal(transactions), 0);
    assert.equal(getExpenseTotal(transactions), 5000);
});

test("account classes derive from account type", () => {
    assert.equal(getAccountClass("credit_card"), "liability");
    assert.equal(getAccountClass("loan"), "liability");
    assert.equal(getAccountClass("bnpl"), "liability");
    assert.equal(getAccountClass("bank"), "asset");
    assert.equal(getAccountClass("cash"), "asset");
    assert.equal(getAccountClass(null), "asset");
    assert.equal(getAccountClass(undefined), "asset");
});

test("classification rule: the full decision table", () => {
    // Plain movements on asset (or unmatched) accounts.
    assert.equal(
        deriveTransactionType({ accountClass: "asset", direction: "debit" }),
        "expense"
    );
    assert.equal(
        deriveTransactionType({ accountClass: "asset", direction: "credit" }),
        "income"
    );
    assert.equal(
        deriveTransactionType({ accountClass: null, direction: "credit" }),
        "income"
    );

    // Card swipe: debit on the liability account is spending.
    assert.equal(
        deriveTransactionType({
            accountClass: "liability",
            direction: "debit",
        }),
        "expense"
    );

    // Bill payment landing on the card: transfer, never income.
    assert.equal(
        deriveTransactionType({
            accountClass: "liability",
            direction: "credit",
        }),
        "transfer"
    );

    // Refund wording wins over the liability rule.
    assert.equal(
        deriveTransactionType({
            accountClass: "liability",
            direction: "credit",
            intent: "refund",
        }),
        "refund"
    );
    assert.equal(
        deriveTransactionType({
            accountClass: "asset",
            direction: "credit",
            intent: "refund",
        }),
        "refund"
    );

    // Paying leg of a card bill from the bank (or unmatched account).
    assert.equal(
        deriveTransactionType({
            accountClass: "asset",
            direction: "debit",
            intent: "liability_payment",
        }),
        "transfer"
    );
    assert.equal(
        deriveTransactionType({
            accountClass: null,
            direction: "debit",
            intent: "liability_payment",
        }),
        "transfer"
    );

    // "Card bill" wording while spending FROM the card is just spend.
    assert.equal(
        deriveTransactionType({
            accountClass: "liability",
            direction: "debit",
            intent: "liability_payment",
        }),
        "expense"
    );
});

test("predicates classify refunds as expense-like, transfers as neither", () => {
    const refund = transaction({
        amount: 10,
        transaction_type: "refund",
    });
    const transfer = transaction({
        amount: 10,
        event: { direction: "credit" },
        transaction_type: "transfer",
    });

    assert.equal(isExpenseLike(refund), true);
    assert.equal(isIncomeLike(refund), false);
    assert.equal(isExpenseLike(transfer), false);
    assert.equal(isIncomeLike(transfer), false);
});
