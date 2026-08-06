import type {
    AccountType,
    FinancialEventInput,
    Json,
    ParsedAccountHint,
    ParsedFinancialEvent,
    RawNotificationPayload,
    TransactionLike,
} from "@finance/shared-types";

export interface BackupPayload {
    version: 1;
    exported_at: string;
    financial_events: FinancialEventInput[];
}

const CSV_HEADERS = [
    "merchant",
    "amount",
    "direction",
    "occurred_at",
    "currency",
    "notes",
];

export function splitCsvLine(line: string) {
    const values: string[] = [];
    let current = "";
    let quoted = false;

    for (
        let index = 0;
        index < line.length;
        index += 1
    ) {
        const character = line[index];
        const next = line[index + 1];

        if (
            character === '"' &&
            quoted &&
            next === '"'
        ) {
            current += '"';
            index += 1;
            continue;
        }

        if (character === '"') {
            quoted = !quoted;
            continue;
        }

        if (
            character === "," &&
            !quoted
        ) {
            values.push(current);
            current = "";
            continue;
        }

        current += character;
    }

    values.push(current);

    return values.map((value) =>
        value.trim()
    );
}

export function escapeCsv(
    value: string | number | null | undefined
) {
    const text =
        value === null ||
        value === undefined
            ? ""
            : value.toString();

    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
    ) {
        return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
}

export function getFinancialEventKey(event: {
    merchant_name_raw?: string | null;
    amount: number;
    direction: string;
    occurred_at: string;
}) {
    return [
        event.merchant_name_raw
            ?.trim()
            .toLowerCase() ?? "",
        event.amount.toFixed(2),
        event.direction,
        event.occurred_at.slice(0, 16),
    ].join("|");
}

function parseDirection(value: string) {
    if (value === "debit") {
        return "debit" as const;
    }

    if (value === "credit") {
        return "credit" as const;
    }

    return null;
}

export function parseFinancialEventsCsv(
    text: string
): FinancialEventInput[] {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length <= 1) {
        throw new Error("CSV file has no rows.");
    }

    const headers =
        splitCsvLine(lines[0]).map(
            (header) =>
                header.toLowerCase()
        );

    const missingHeaders =
        CSV_HEADERS.filter(
            (header) =>
                !headers.includes(header)
        );

    if (missingHeaders.length > 0) {
        throw new Error(
            "CSV file is missing required columns."
        );
    }

    return lines.slice(1).map((line, index) => {
        const values = splitCsvLine(line);
        const row = new Map<string, string>();

        headers.forEach((header, headerIndex) => {
            row.set(
                header,
                values[headerIndex] ?? ""
            );
        });

        const amount = Number(
            row.get("amount")
        );

        const direction =
            parseDirection(
                row.get("direction") ?? ""
            );

        const occurredAt = new Date(
            row.get("occurred_at") ?? ""
        );

        if (
            Number.isNaN(amount) ||
            amount <= 0
        ) {
            throw new Error(
                `Row ${index + 2}: invalid amount.`
            );
        }

        if (!direction) {
            throw new Error(
                `Row ${index + 2}: direction must be debit or credit.`
            );
        }

        if (
            Number.isNaN(
                occurredAt.getTime()
            )
        ) {
            throw new Error(
                `Row ${index + 2}: invalid date.`
            );
        }

        return {
            amount,
            confidence: 1,
            currency:
                row.get("currency") ||
                "INR",
            direction,
            merchant_id: null,
            merchant_name_raw:
                row.get("merchant") ||
                null,
            metadata: {
                source: "csv",
            },
            notes:
                row.get("notes") ||
                null,
            occurred_at:
                occurredAt.toISOString(),
            status: "pending",
        };
    });
}

export function transactionsToCsv<
    TTransaction extends TransactionLike,
>(transactions: TTransaction[]) {
    const headers = [
        "id",
        "merchant",
        "category",
        "amount",
        "currency",
        "transaction_type",
        "occurred_at",
        "notes",
    ];

    const rows = transactions.map(
        (transaction) => [
            transaction.id ?? "",
            transaction.merchant?.name ??
                "Unknown Merchant",
            transaction.category?.name ??
                "Uncategorized",
            transaction.amount,
            transaction.currency ?? "",
            transaction.transaction_type,
            transaction.occurred_at,
            transaction.notes ?? "",
        ]
    );

    return [headers, ...rows]
        .map((row) =>
            row.map(escapeCsv).join(",")
        )
        .join("\n");
}

export function buildBackupPayload(
    events: FinancialEventInput[],
    exportedAt = new Date().toISOString()
): BackupPayload {
    return {
        version: 1,
        exported_at: exportedAt,
        financial_events: events,
    };
}

export function serializeBackupPayload(
    payload: BackupPayload
) {
    return JSON.stringify(payload, null, 2);
}

export function parseBackupPayload(
    text: string
): BackupPayload {
    const parsed = JSON.parse(text) as {
        version?: unknown;
        financial_events?: unknown;
        exported_at?: unknown;
    };

    if (
        parsed.version !== 1 ||
        !Array.isArray(
            parsed.financial_events
        )
    ) {
        throw new Error(
            "Backup file is invalid."
        );
    }

    return {
        version: 1,
        exported_at:
            typeof parsed.exported_at ===
            "string"
                ? parsed.exported_at
                : new Date().toISOString(),
        financial_events:
            parsed.financial_events as FinancialEventInput[],
    };
}

// Known financial apps whose notifications we parse directly.
const TRUSTED_FINANCIAL_PACKAGES = new Set([
    // UPI / wallets
    "com.google.android.apps.nbu.paisa.user", // Google Pay
    "com.phonepe.app",
    "net.one97.paytm",
    "in.org.npci.upiapp", // BHIM
    "com.dreamplug.androidapp", // CRED
    "in.amazon.mShop.android.shopping", // Amazon Pay
    "com.mobikwik_new",
    "com.freecharge.android",
    // Banks
    "com.sbi.lotusintouch", // SBI YONO
    "com.snapwork.hdfc",
    "com.csam.icici.bank.imobile",
    "com.axis.mobile",
    "com.msf.kbank.mobile", // Kotak
    "com.baroda.mconnectplus",
    "com.canarabank.mobility",
    "com.fss.pnbpsp",
    "com.fss.unbipsp", // Union Bank
]);

// SMS apps are conduits: trust them only when the sender header looks
// like a DLT-registered ID ("AX-SBIINB", "VM-HDFCBK-S").
const SMS_APP_PACKAGES = new Set([
    "com.google.android.apps.messaging",
    "com.samsung.android.messaging",
    "com.android.mms",
    "com.oneplus.mms",
    "com.miui.smsextra",
]);

// Never a bank alert. Chat/social apps: money mentions are
// conversation. Expense trackers: their notifications mirror
// transactions we already captured — parsing them double-counts.
const BLOCKED_PACKAGES = new Set([
    // Chat / social
    "com.whatsapp",
    "com.whatsapp.w4b",
    "org.telegram.messenger",
    "com.instagram.android",
    "com.facebook.katana",
    "com.facebook.orca",
    // Expense trackers / PFM apps
    "com.daamitt.walnut.app", // axio (Walnut)
    "com.whizdm.moneyview.loans", // Moneyview
    "com.smartspends", // ET Money
    "in.indwealth", // INDmoney
]);

// DLT header shape; the optional route suffix marks P = promotional.
const DLT_SENDER_PATTERN =
    /^[a-z]{2}-[a-z0-9]{4,9}(?:-([a-z]))?$/i;

export type NotificationSourceTrust =
    | "blocked"
    | "trusted"
    | "unknown";

// The trusted set cannot enumerate every bank app, so an unrecognized
// package is "unknown" (parsed at reduced confidence), not dropped —
// only sources that are never bank alerts are blocked outright.
export function getNotificationSourceTrust({
    packageName,
    title,
}: {
    packageName?: string | null;
    title?: string | null;
}): NotificationSourceTrust {
    const pkg = packageName?.trim().toLowerCase() ?? "";

    if (!pkg || BLOCKED_PACKAGES.has(pkg)) {
        return "blocked";
    }

    if (TRUSTED_FINANCIAL_PACKAGES.has(pkg)) {
        return "trusted";
    }

    if (SMS_APP_PACKAGES.has(pkg)) {
        const senderMatch = title
            ?.trim()
            .match(DLT_SENDER_PATTERN);

        return senderMatch &&
            senderMatch[1]?.toLowerCase() !== "p"
            ? "trusted"
            : "blocked";
    }

    return "unknown";
}

const AMOUNT_PATTERN =
    /(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)|([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:₹|rs\.?|inr)/i;

// Bank SMS often omit the currency marker ("debited by 50.00"); accept
// a bare number only when glued to a transaction verb.
const VERB_AMOUNT_PATTERN =
    /\b(?:debited|credited)\s+(?:by|with|for)\s+([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i;

// An amount preceded by balance/limit wording is account state, not the
// transaction ("Avl Bal Rs.5,000") — never book it as the amount.
const BALANCE_CONTEXT_PATTERN =
    /\b(?:bal|balance|limit)\b\s*(?:is|:|-|\.)?\s*$/i;

const DEBIT_PATTERN =
    /\b(debited|debit|spent|paid|sent|purchase|withdrawn|charged)\b/i;

const CREDIT_PATTERN =
    /\b(credited|credit(?!\s+(?:card|limit|score)\b)|received|refund|deposited|salary)\b/i;

const INCOMING_PAYMENT_PATTERN =
    /\b(?:paid|sent)\s+you\b|\byou\s+(?:received|got)\b/i;

// Pure offer language — never appears in an alert for a completed
// transaction, so matching it rejects the notification outright.
const PROMO_REJECT_PATTERN =
    /\b(?:pre-?approved|avail\s+now|apply\s+now)\b/i;

// Autopay/mandate reminders describe a future movement; the bank sends
// a separate alert when the money actually moves.
const FUTURE_TENSE_PATTERN =
    /\bwill\s+be\s+(?:debited|credited)\b/i;

// Bill/dues reminders ask for a payment that has not happened yet;
// completed-transaction alerts never use this phrasing.
const BILL_REMINDER_PATTERN =
    /\b(?:due\s+date\s+alert|due\s+for\s+payment|is\s+due|pay\s+immediately|pay\s+your\s+bill|overdue|if\s+already\s+paid)\b/i;

// Words that also appear in genuine credits (e.g. scratch-card
// cashback), so they only lower confidence instead of rejecting.
const PROMO_HINT_PATTERN =
    /\b(?:congratulations?|offer|win|won)\b/i;

const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/i;

// Link shorteners hide the destination — a phishing signal no matter
// what wording surrounds them.
const URL_SHORTENER_PATTERN =
    /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|rb\.gy|cutt\.ly|is\.gd|tiny\.cc|rebrand\.ly)\/\S+/i;

// Fraud-disclaimer boilerplate ("Trxn. not done by you? Report at ...")
// only appears in alerts for completed transactions — promos never
// invite you to dispute a charge. Its presence is positive evidence,
// and it explains a bank's report URL, so that URL is not penalized.
const FRAUD_DISCLAIMER_PATTERN =
    /\b(?:not\s+(?:you|done\s+by\s+you)|dispute|unauthori[sz]ed|fraud|report\s+(?:at|to|this))\b/i;

// A source whose own name declares a financial identity (card issuer,
// bank, UPI wallet). The name is self-declared — any app can call
// itself "X Bank" — so this only softens the unknown-source penalty;
// it never grants the trusted tier and never bypasses blocked sources.
const FINANCIAL_SOURCE_NAME_PATTERN =
    /\b(?:bank(?:ing)?|cards?|credit|debit|pay(?:ments?)?|upi|wallet|finan(?:ce|cial)|money|nbfc|insurance)\b/i;

const FINANCIAL_PACKAGE_TOKENS = [
    "bank",
    "card",
    "upi",
    "wallet",
    "financ",
    "pay",
];

const APPROXIMATE_AMOUNT_PATTERN =
    /\b(?:upto|up\s+to)\s*$/i;

const BASE_CONFIDENCE = 0.72;

const CONFIDENCE_FLOOR = 0.2;

const CONFIDENCE_CEILING = 0.95;

function parseAmount(text: string) {
    // The verb-anchored amount is the transaction by definition; prefer
    // it so a currency-marked balance can never shadow a bare amount.
    const verbMatch = text.match(VERB_AMOUNT_PATTERN);

    if (verbMatch?.index !== undefined) {
        const amount = Number(
            verbMatch[1].replaceAll(",", "")
        );

        if (Number.isFinite(amount) && amount > 0) {
            return { amount, index: verbMatch.index };
        }
    }

    const currencyPattern = new RegExp(
        AMOUNT_PATTERN.source,
        "gi"
    );
    let match: RegExpExecArray | null;

    while ((match = currencyPattern.exec(text)) !== null) {
        const value = match[1] ?? match[2];
        const amount = Number(value.replaceAll(",", ""));

        if (!Number.isFinite(amount) || amount <= 0) {
            continue;
        }

        if (
            BALANCE_CONTEXT_PATTERN.test(
                text.slice(
                    Math.max(0, match.index - 24),
                    match.index
                )
            )
        ) {
            continue;
        }

        return { amount, index: match.index };
    }

    return null;
}

function isPromotionalNotification(
    text: string,
    amountIndex: number
) {
    if (PROMO_REJECT_PATTERN.test(text)) {
        return true;
    }

    if (FUTURE_TENSE_PATTERN.test(text)) {
        return true;
    }

    if (BILL_REMINDER_PATTERN.test(text)) {
        return true;
    }

    // "loan of upto Rs.10,00,000" — offers approximate the amount,
    // real transaction alerts state it exactly.
    return APPROXIMATE_AMOUNT_PATTERN.test(
        text.slice(0, amountIndex)
    );
}

// True when the app's label or package id reads as a financial
// institution ("SBI CARDS AND PAYMENT SERVICES", com.idbi.mobilebanking).
function sourceLooksFinancial(payload: {
    applicationName?: string | null;
    packageName?: string | null;
}) {
    if (
        payload.applicationName &&
        FINANCIAL_SOURCE_NAME_PATTERN.test(
            payload.applicationName
        )
    ) {
        return true;
    }

    const pkg =
        payload.packageName?.toLowerCase() ?? "";

    return FINANCIAL_PACKAGE_TOKENS.some((token) =>
        pkg.includes(token)
    );
}

function scoreConfidence(
    text: string,
    accountHint: ParsedAccountHint | null,
    sourceTrust: NotificationSourceTrust,
    financialSource: boolean,
    hasParsedReference: boolean
) {
    let confidence = BASE_CONFIDENCE;

    if (sourceTrust === "unknown") {
        // A financial-sounding name softens the penalty but can never
        // equal package-verified trust — names are self-declared.
        confidence -= financialSource ? 0.05 : 0.2;
    }

    if (PROMO_HINT_PATTERN.test(text)) {
        confidence -= 0.2;
    }

    if (URL_SHORTENER_PATTERN.test(text)) {
        confidence -= 0.25;
    } else if (
        URL_PATTERN.test(text) &&
        !FRAUD_DISCLAIMER_PATTERN.test(text)
    ) {
        confidence -= 0.15;
    }

    if (!accountHint) {
        confidence -= 0.1;
    }

    // Structured evidence promos lack: fraud-disclaimer boilerplate
    // and a transaction reference each mark a genuine completed alert.
    if (FRAUD_DISCLAIMER_PATTERN.test(text)) {
        confidence += 0.05;
    }

    if (hasParsedReference) {
        confidence += 0.08;
    }

    return Math.min(
        CONFIDENCE_CEILING,
        Math.max(
            CONFIDENCE_FLOOR,
            Math.round(confidence * 100) / 100
        )
    );
}

function parseNotificationDirection(text: string) {
    if (INCOMING_PAYMENT_PATTERN.test(text)) {
        return "credit" as const;
    }

    if (DEBIT_PATTERN.test(text)) {
        return "debit" as const;
    }

    if (CREDIT_PATTERN.test(text)) {
        return "credit" as const;
    }

    return null;
}

function parseTransactionReference(text: string) {
    const match = text.match(
        /\b(?:ref(?:erence)?|txn|trxn)(?:\s*(?:no|number))?\.?\s*[:#-]?\s*([a-z0-9][a-z0-9-]{5,})\b/i
    );

    return match?.[1] ?? null;
}

function parseOccurredAt(
    text: string,
    postedAt: string
) {
    const postedDate = new Date(postedAt);

    if (Number.isNaN(postedDate.getTime())) {
        return null;
    }

    const numericMatch = text.match(
        /\b(?:on|dated?)(?:\s+date)?\s+(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/i
    );
    const monthNameMatch = numericMatch
        ? null
        : text.match(
              /\b(?:on|dated?)(?:\s+date)?\s+(\d{1,2})[-\s]?([A-Za-z]{3,9})[-\s]?(\d{2}|\d{4})\b/i
          );
    const match = numericMatch ?? monthNameMatch;

    if (!match) {
        return postedDate;
    }

    const day = Number(match[1]);
    const month = numericMatch
        ? Number(match[2])
        : parseMonthName(match[2]);

    if (month === null) {
        return postedDate;
    }

    const parsedYear = Number(match[3]);
    const year = parsedYear < 100
        ? 2000 + parsedYear
        : parsedYear;
    const occurredAt = new Date(
        year,
        month - 1,
        day,
        postedDate.getHours(),
        postedDate.getMinutes(),
        postedDate.getSeconds(),
        postedDate.getMilliseconds()
    );

    if (
        occurredAt.getFullYear() !== year ||
        occurredAt.getMonth() !== month - 1 ||
        occurredAt.getDate() !== day
    ) {
        return postedDate;
    }

    return occurredAt;
}

const MONTH_NAMES = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
];

function parseMonthName(value: string) {
    const index = MONTH_NAMES.indexOf(
        value.slice(0, 3).toLowerCase()
    );

    return index === -1 ? null : index + 1;
}

function cleanAccountProvider(value: string) {
    return value
        .replace(
            /^.*\b(?:on|for|from|to|with|using)\s+(?:your|my)?\s*/i,
            ""
        )
        .replace(/\b(on|for|from|to|your|my|the)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function buildAccountHint(
    accountType: AccountType,
    match: RegExpMatchArray
): ParsedAccountHint | null {
    const providerName = cleanAccountProvider(match[1] ?? "");
    const last4 = match[2]?.trim() ?? null;

    if (!providerName && !last4) {
        return null;
    }

    return {
        accountType,
        last4,
        providerName: providerName || null,
        rawLabel: match[0].trim(),
    };
}

function parseAccountHint(text: string): ParsedAccountHint | null {
    const creditCardMatch = text.match(
        /\b(?:your|my)\s+([A-Za-z][A-Za-z0-9&.'\-\s]{0,31}?)\s+credit\s+card\b[^0-9]{0,80}(\d{4})\b/i
    );

    if (creditCardMatch) {
        return buildAccountHint(
            "credit_card",
            creditCardMatch
        );
    }

    const debitCardMatch = text.match(
        /\b(?:your|my)\s+([A-Za-z][A-Za-z0-9&.'\-\s]{0,31}?)\s+debit\s+card\b[^0-9]{0,80}(\d{4})\b/i
    );

    if (debitCardMatch) {
        return buildAccountHint("bank", debitCardMatch);
    }

    const accountMatch = text.match(
        /\b(?:your|my)\s+([A-Za-z][A-Za-z0-9&.'\-\s]{0,31}?)\s+(?:bank\s+)?(?:account|acct|a\/c)\b[^0-9]{0,80}(\d{4})\b/i
    );

    if (accountMatch) {
        return buildAccountHint("bank", accountMatch);
    }

    // "A/C X7160" — bank SMS style without a your/my prefix, digits
    // optionally masked by x/*.
    const bareAccountMatch = text.match(
        /\b(?:a\/c|acct|account)\.?\s*(?:no\.?\s*)?[x*]*(\d{4,})\b/i
    );

    if (bareAccountMatch?.[1]) {
        return {
            accountType: "bank",
            last4: bareAccountMatch[1].slice(-4),
            providerName: null,
            rawLabel: bareAccountMatch[0].trim(),
        };
    }

    const walletMatch = text.match(
        /\b(?:from|to|via)\s+(?:your|my)?\s*([A-Za-z][A-Za-z0-9&.'\-\s]{1,32}?)\s+wallet\b/i
    );

    if (walletMatch?.[1]) {
        const providerName = cleanAccountProvider(walletMatch[1]);

        return {
            accountType: "digital_wallet",
            last4: null,
            providerName: providerName || null,
            rawLabel: walletMatch[0].trim(),
        };
    }

    const last4Match = text.match(
        /\b(?:ending(?:\s+with)?|xx|x{2,})\s*(\d{4})\b/i
    );

    if (last4Match?.[1]) {
        return {
            accountType: null,
            last4: last4Match[1],
            providerName: null,
            rawLabel: last4Match[0].trim(),
        };
    }

    return null;
}

function parseMerchantName(
    payload: RawNotificationPayload
) {
    const candidates = [
        payload.text,
        payload.title,
        `${payload.title ?? ""} ${payload.text ?? ""}`,
    ]
        .filter(
            (value): value is string =>
                typeof value === "string" &&
                value.trim().length > 0
        )
        .map((value) => value.trim());

    for (const candidate of candidates) {
        const incomingMatch = candidate.match(
            /^\s*([A-Za-z0-9][A-Za-z0-9&().'\-\s]{1,48}?)\s+(?:has\s+|have\s+|just\s+)?(?:paid|sent)\s+you\b/i
        );

        if (incomingMatch?.[1]) {
            return incomingMatch[1].trim();
        }
    }

    for (const candidate of candidates) {
        const merchantMatch = candidate.match(
            /\b(?:to|at|from)\s+([A-Za-z0-9][A-Za-z0-9&().'\-\s]{1,48})/i
        );

        if (merchantMatch?.[1]) {
            return merchantMatch[1]
                .replace(
                    /\b(on|using|via|refno|ref|reference|trxn|txn|transaction|report|if)\b.*$/i,
                    ""
                )
                .trim();
        }
    }

    return payload.applicationName ??
        payload.packageName;
}

export type NotificationParseFailure =
    | "blocked_source"
    | "invalid_date"
    | "missing_amount"
    | "missing_direction"
    | "promotional";

export interface NotificationParseResult {
    event: ParsedFinancialEvent | null;
    failure: NotificationParseFailure | null;
    sourceTrust: NotificationSourceTrust;
}

export function parseNotificationPayload(
    payload: RawNotificationPayload
): ParsedFinancialEvent | null {
    return explainNotificationParse(payload).event;
}

export function explainNotificationParse(
    payload: RawNotificationPayload
): NotificationParseResult {
    const sourceTrust = getNotificationSourceTrust({
        packageName: payload.packageName,
        title: payload.title,
    });

    if (sourceTrust === "blocked") {
        return {
            event: null,
            failure: "blocked_source",
            sourceTrust,
        };
    }

    const rawText = [
        payload.title,
        payload.text,
        payload.subText,
    ]
        .filter(Boolean)
        .join(" ");

    const parsedAmount = parseAmount(rawText);
    const direction =
        parseNotificationDirection(rawText);

    if (!parsedAmount || !direction) {
        return {
            event: null,
            failure: parsedAmount
                ? "missing_direction"
                : "missing_amount",
            sourceTrust,
        };
    }

    if (
        isPromotionalNotification(
            rawText,
            parsedAmount.index
        )
    ) {
        return {
            event: null,
            failure: "promotional",
            sourceTrust,
        };
    }

    const occurredAt = parseOccurredAt(
        rawText,
        payload.postedAt
    );

    if (!occurredAt) {
        return {
            event: null,
            failure: "invalid_date",
            sourceTrust,
        };
    }

    const accountHint = parseAccountHint(rawText);
    const parsedReference =
        parseTransactionReference(rawText);

    const event: ParsedFinancialEvent = {
        source: "android_notification",
        captureId: payload.captureId ?? null,
        packageName: payload.packageName,
        merchantName:
            parseMerchantName(payload),
        amount: parsedAmount.amount,
        currency: "INR",
        direction,
        occurredAt:
            occurredAt.toISOString(),
        reference: parsedReference ?? payload.id,
        accountHint,
        confidence: scoreConfidence(
            rawText,
            accountHint,
            sourceTrust,
            sourceLooksFinancial(payload),
            parsedReference !== null
        ),
        rawPayload: JSON.stringify(payload),
    };

    return {
        event,
        failure: null,
        sourceTrust,
    };
}

function toAccountHintMetadata(
    hint: ParsedAccountHint | null | undefined
): Json | null {
    if (!hint) {
        return null;
    }

    return {
        accountType: hint.accountType ?? null,
        last4: hint.last4 ?? null,
        providerName: hint.providerName ?? null,
        rawLabel: hint.rawLabel ?? null,
    };
}

export function parsedNotificationToEventInput(
    event: ParsedFinancialEvent
): FinancialEventInput {
    return {
        amount: event.amount,
        confidence: event.confidence,
        currency: event.currency,
        direction: event.direction,
        merchant_id: null,
        merchant_name_raw:
            event.merchantName,
        metadata: {
            source: event.source,
            capture_id: event.captureId ?? null,
            packageName: event.packageName,
            reference: event.reference ?? null,
            account_hint: toAccountHintMetadata(
                event.accountHint
            ),
            rawPayload: event.rawPayload,
        },
        notes: null,
        occurred_at: event.occurredAt,
        status: "pending",
    };
}
