import assert from "node:assert/strict";
import test from "node:test";

import { parseNotificationPayload } from "./index.ts";

const SBI_SPEND_MESSAGE =
    "Rs.47.00 spent on your SBI Credit Card ending with 0345 at THEBLOOMSCOCHINPREMI on 22-07-26 via UPI (Ref No. 656911848080). Trxn. not done by you? Report at https://sbicard.com/Dispute";

test("parses an SBI credit-card spend as an expense", () => {
    const parsed = parseNotificationPayload({
        id: "android-notification-key",
        packageName: "com.sbi.card",
        applicationName: "SBI Card",
        title: "Transaction alert",
        text: SBI_SPEND_MESSAGE,
        subText: null,
        postedAt: "2026-07-23T07:30:00.000Z",
    });

    assert.ok(parsed);
    assert.equal(parsed.amount, 47);
    assert.equal(parsed.currency, "INR");
    assert.equal(parsed.direction, "debit");
    assert.equal(parsed.merchantName, "THEBLOOMSCOCHINPREMI");
    assert.equal(parsed.reference, "656911848080");
    assert.deepEqual(parsed.accountHint, {
        accountType: "credit_card",
        last4: "0345",
        providerName: "SBI",
        rawLabel: "your SBI Credit Card ending with 0345",
    });

    const occurredAt = new Date(parsed.occurredAt);
    assert.equal(occurredAt.getFullYear(), 2026);
    assert.equal(occurredAt.getMonth(), 6);
    assert.equal(occurredAt.getDate(), 22);
});

test("does not treat the phrase credit card as incoming money", () => {
    const parsed = parseNotificationPayload({
        id: "charged-key",
        packageName: "com.example.bank",
        applicationName: "Example Bank",
        title: null,
        text: "INR 850 charged on your Example Credit Card XX 1234 at ACME STORE.",
        subText: null,
        postedAt: "2026-07-22T07:30:00.000Z",
    });

    assert.equal(parsed?.direction, "debit");
});

test("still recognizes an actual card credit", () => {
    const parsed = parseNotificationPayload({
        id: "credit-key",
        packageName: "com.example.bank",
        applicationName: "Example Bank",
        title: null,
        text: "INR 1,000 credited to your Example Credit Card ending 1234. Ref No 99887766.",
        subText: null,
        postedAt: "2026-07-22T07:30:00.000Z",
    });

    assert.equal(parsed?.direction, "credit");
    assert.equal(parsed?.reference, "99887766");
});

test("recognizes an incoming person-to-person payment", () => {
    const parsed = parseNotificationPayload({
        id: "incoming-key",
        packageName: "com.example.wallet",
        applicationName: "Example Wallet",
        title: null,
        text: "Anita paid you Rs.500 via UPI. Ref 12345678.",
        subText: null,
        postedAt: "2026-07-22T07:30:00.000Z",
    });

    assert.equal(parsed?.direction, "credit");
    assert.equal(parsed?.merchantName, "Anita");
});

test("falls back to notification metadata when date and reference are absent", () => {
    const postedAt = "2026-07-22T07:30:00.000Z";
    const parsed = parseNotificationPayload({
        id: "fallback-key",
        packageName: "com.example.bank",
        applicationName: "Example Bank",
        title: null,
        text: "Rs 75 spent at CORNER SHOP",
        subText: null,
        postedAt,
    });

    assert.equal(parsed?.occurredAt, postedAt);
    assert.equal(parsed?.reference, "fallback-key");
});
