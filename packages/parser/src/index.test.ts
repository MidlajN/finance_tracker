import assert from "node:assert/strict";
import test from "node:test";

import {
    getNotificationSourceTrust,
    parseNotificationPayload,
} from "./index.ts";

const SBI_SPEND_MESSAGE =
    "Rs.47.00 spent on your SBI Credit Card ending with 0345 at THEBLOOMSCOCHINPREMI on 22-07-26 via UPI (Ref No. 656911848080). Trxn. not done by you? Report at https://sbicard.com/Dispute";

test("parses an SBI credit-card spend as an expense", () => {
    const parsed = parseNotificationPayload({
        captureId:
            "11111111-1111-1111-1111-111111111111",
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
    assert.equal(
        parsed.captureId,
        "11111111-1111-1111-1111-111111111111"
    );
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

test("rejects a pre-approved loan offer despite the word credited", () => {
    const parsed = parseNotificationPayload({
        id: "loan-spam-key",
        packageName: "com.example.messages",
        applicationName: "Messages",
        title: null,
        text: "Good news MUHAMMED, Pre-approved loan of upto Rs.10,00,000 is credited instantly when you avail on Flipkart. Avail now! http://u3.mnge.co/FLPKRT/RzG4ny5",
        subText: null,
        postedAt: "2026-07-22T07:30:00.000Z",
    });

    assert.equal(parsed, null);
});

test("rejects an offer where upto precedes the amount", () => {
    const parsed = parseNotificationPayload({
        id: "upto-offer-key",
        packageName: "com.example.messages",
        applicationName: "Messages",
        title: null,
        text: "Get instant credit of upto Rs.50,000 in your account today.",
        subText: null,
        postedAt: "2026-07-22T07:30:00.000Z",
    });

    assert.equal(parsed, null);
});

test("keeps a real alert with a dispute link, at lower confidence", () => {
    // com.sbi.card is not in the trusted set, so the unknown-source
    // penalty applies on top of the URL penalty.
    const parsed = parseNotificationPayload({
        id: "dispute-link-key",
        packageName: "com.sbi.card",
        applicationName: "SBI Card",
        title: "Transaction alert",
        text: SBI_SPEND_MESSAGE,
        subText: null,
        postedAt: "2026-07-23T07:30:00.000Z",
    });

    assert.ok(parsed);
    assert.equal(parsed.direction, "debit");
    assert.equal(parsed.confidence, 0.37);
});

test("keeps a scratch-card cashback credit, at low confidence", () => {
    const parsed = parseNotificationPayload({
        id: "cashback-key",
        packageName: "com.google.android.apps.nbu.paisa.user",
        applicationName: "Google Pay",
        title: "Rewards",
        text: "Congratulations! You won Rs.14. Credited to your bank.",
        subText: null,
        postedAt: "2026-07-22T07:30:00.000Z",
    });

    assert.ok(parsed);
    assert.equal(parsed.direction, "credit");
    assert.equal(parsed.confidence, 0.42);
});

test("keeps full base confidence when an account hint is present", () => {
    const parsed = parseNotificationPayload({
        id: "hint-confidence-key",
        packageName: "com.csam.icici.bank.imobile",
        applicationName: "iMobile",
        title: null,
        text: "INR 1,000 credited to your Example Credit Card ending 1234. Ref No 99887766.",
        subText: null,
        postedAt: "2026-07-22T07:30:00.000Z",
    });

    assert.equal(parsed?.confidence, 0.72);
});

test("penalizes a missing account hint", () => {
    const parsed = parseNotificationPayload({
        id: "no-hint-key",
        packageName: "com.phonepe.app",
        applicationName: "PhonePe",
        title: null,
        text: "Anita paid you Rs.500 via UPI. Ref 12345678.",
        subText: null,
        postedAt: "2026-07-22T07:30:00.000Z",
    });

    assert.equal(parsed?.confidence, 0.62);
});

test("rejects a credit-score payment reminder", () => {
    const parsed = parseNotificationPayload({
        id: "credit-score-key",
        packageName: "com.example.bank",
        applicationName: "Example Bank",
        title: null,
        text: "Keep a healthy credit score. Tap here to pay ₹2,450 before your due date.",
        subText: null,
        postedAt: "2026-07-22T07:30:00.000Z",
    });

    assert.equal(parsed, null);
});

test("rejects a future-tense autopay reminder", () => {
    const parsed = parseNotificationPayload({
        id: "autopay-key",
        packageName: "com.example.bank",
        applicationName: "Example Bank",
        title: null,
        text: "Reminder: Rs.2,450 will be debited from your account XX1234 on 05-08-26 towards your electricity bill.",
        subText: null,
        postedAt: "2026-07-22T07:30:00.000Z",
    });

    assert.equal(parsed, null);
});

test("parses an SBI UPI debit SMS without a currency marker", () => {
    const parsed = parseNotificationPayload({
        id: "sbi-upi-key",
        packageName: "com.google.android.apps.messaging",
        applicationName: "Messages",
        title: "AX-SBIINB",
        text: "Dear UPI user A/C X7160 debited by 50.00 on date 31Jul26 trf to AKHIL G BABU Refno 621270026223 If not u? call-1800111109 for other services-18001234-SBI",
        subText: null,
        postedAt: "2026-07-31T10:00:00.000Z",
    });

    assert.ok(parsed);
    assert.equal(parsed.amount, 50);
    assert.equal(parsed.direction, "debit");
    assert.equal(parsed.merchantName, "AKHIL G BABU");
    assert.equal(parsed.reference, "621270026223");
    assert.deepEqual(parsed.accountHint, {
        accountType: "bank",
        last4: "7160",
        providerName: null,
        rawLabel: "A/C X7160",
    });

    const occurredAt = new Date(parsed.occurredAt);
    assert.equal(occurredAt.getFullYear(), 2026);
    assert.equal(occurredAt.getMonth(), 6);
    assert.equal(occurredAt.getDate(), 31);
});

test("does not treat a bare number as an amount without a transaction verb", () => {
    const parsed = parseNotificationPayload({
        id: "bare-number-key",
        packageName: "com.example.messages",
        applicationName: "Messages",
        title: null,
        text: "Your OTP for login is 482910. Do not share it with anyone.",
        subText: null,
        postedAt: "2026-07-31T10:00:00.000Z",
    });

    assert.equal(parsed, null);
});

test("bare debit amount wins over a currency-marked balance", () => {
    const parsed = parseNotificationPayload({
        id: "balance-shadow-key",
        packageName: "com.example.messages",
        applicationName: "Messages",
        title: null,
        text: "A/C X7160 debited by 50.00 on 31-07-26 trf to AKHIL. Avl Bal Rs.5,000.00",
        subText: null,
        postedAt: "2026-07-31T10:00:00.000Z",
    });

    assert.equal(parsed?.amount, 50);
});

test("transaction amount wins over a trailing balance when both carry currency", () => {
    const parsed = parseNotificationPayload({
        id: "two-amount-key",
        packageName: "com.example.bank",
        applicationName: "Example Bank",
        title: null,
        text: "Rs.500 credited to your account ending 1234. Avl Bal Rs.10,000.",
        subText: null,
        postedAt: "2026-07-31T10:00:00.000Z",
    });

    assert.equal(parsed?.amount, 500);
});

test("drops an alert whose only amount is a balance", () => {
    const parsed = parseNotificationPayload({
        id: "balance-only-key",
        packageName: "com.example.bank",
        applicationName: "Example Bank",
        title: null,
        text: "Interest credited to your account. Avl Bal Rs.5,000.00",
        subText: null,
        postedAt: "2026-07-31T10:00:00.000Z",
    });

    assert.equal(parsed, null);
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

test("trusts known financial app packages", () => {
    assert.equal(
        getNotificationSourceTrust({
            packageName: "com.google.android.apps.nbu.paisa.user",
            title: "Payment sent",
        }),
        "trusted"
    );
    assert.equal(
        getNotificationSourceTrust({
            packageName: "com.phonepe.app",
            title: null,
        }),
        "trusted"
    );
});

test("marks unrecognized packages unknown, never blocked", () => {
    assert.equal(
        getNotificationSourceTrust({
            packageName: "com.idbi.mobilebanking",
            title: "Transaction alert",
        }),
        "unknown"
    );
});

test("blocks chat apps and empty packages", () => {
    assert.equal(
        getNotificationSourceTrust({
            packageName: "com.whatsapp",
            title: "Ramesh",
        }),
        "blocked"
    );
    assert.equal(
        getNotificationSourceTrust({ packageName: null, title: null }),
        "blocked"
    );
});

test("trusts SMS apps only with a DLT sender header", () => {
    assert.equal(
        getNotificationSourceTrust({
            packageName: "com.google.android.apps.messaging",
            title: "AX-SBIINB",
        }),
        "trusted"
    );
    assert.equal(
        getNotificationSourceTrust({
            packageName: "com.google.android.apps.messaging",
            title: "VM-HDFCBK-S",
        }),
        "trusted"
    );
    assert.equal(
        getNotificationSourceTrust({
            packageName: "com.google.android.apps.messaging",
            title: "Mom",
        }),
        "blocked"
    );
});

test("blocks promotional-route DLT senders", () => {
    assert.equal(
        getNotificationSourceTrust({
            packageName: "com.google.android.apps.messaging",
            title: "VM-FLPKRT-P",
        }),
        "blocked"
    );
});

test("parses an unknown bank app at reduced confidence", () => {
    const parsed = parseNotificationPayload({
        id: "unknown-bank-key",
        packageName: "com.idbi.mobilebanking",
        applicationName: "IDBI Bank",
        title: null,
        text: "INR 1,000 credited to your Example Credit Card ending 1234. Ref No 99887766.",
        subText: null,
        postedAt: "2026-07-31T10:00:00.000Z",
    });

    assert.equal(parsed?.confidence, 0.52);
});

test("drops blocked sources before parsing", () => {
    const parsed = parseNotificationPayload({
        id: "whatsapp-key",
        packageName: "com.whatsapp",
        applicationName: "WhatsApp",
        title: "Ramesh",
        text: "I paid you Rs.500 via UPI yesterday, check your account.",
        subText: null,
        postedAt: "2026-07-31T10:00:00.000Z",
    });

    assert.equal(parsed, null);
});
