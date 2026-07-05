import type {
    FinancialEventInput,
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

const AMOUNT_PATTERN =
    /(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)|([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:₹|rs\.?|inr)/i;

const DEBIT_PATTERN =
    /\b(debited|debit|spent|paid|sent|purchase|withdrawn|charged)\b/i;

const CREDIT_PATTERN =
    /\b(credited|credit|received|refund|deposited|salary)\b/i;

function parseAmount(text: string) {
    const match = text.match(AMOUNT_PATTERN);

    if (!match) {
        return null;
    }

    const value = match[1] ?? match[2];
    const amount = Number(value.replaceAll(",", ""));

    return Number.isFinite(amount) && amount > 0
        ? amount
        : null;
}

function parseNotificationDirection(text: string) {
    if (DEBIT_PATTERN.test(text)) {
        return "debit" as const;
    }

    if (CREDIT_PATTERN.test(text)) {
        return "credit" as const;
    }

    return null;
}

function parseMerchantName(
    payload: RawNotificationPayload
) {
    const text =
        `${payload.title ?? ""} ${payload.text ?? ""}`.trim();

    const merchantMatch = text.match(
        /\b(?:to|at|from)\s+([A-Za-z0-9][A-Za-z0-9&().'\-\s]{1,48})/i
    );

    if (merchantMatch?.[1]) {
        return merchantMatch[1]
            .replace(/\b(on|using|via|ref|reference)\b.*$/i, "")
            .trim();
    }

    return payload.applicationName ??
        payload.packageName;
}

export function parseNotificationPayload(
    payload: RawNotificationPayload
): ParsedFinancialEvent | null {
    const rawText = [
        payload.title,
        payload.text,
        payload.subText,
    ]
        .filter(Boolean)
        .join(" ");

    const amount = parseAmount(rawText);
    const direction =
        parseNotificationDirection(rawText);

    if (!amount || !direction) {
        return null;
    }

    const occurredAt = new Date(
        payload.postedAt
    );

    if (
        Number.isNaN(occurredAt.getTime())
    ) {
        return null;
    }

    return {
        source: "android_notification",
        packageName: payload.packageName,
        merchantName:
            parseMerchantName(payload),
        amount,
        currency: "INR",
        direction,
        occurredAt:
            occurredAt.toISOString(),
        reference: payload.id,
        confidence: 0.72,
        rawPayload: JSON.stringify(payload),
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
            packageName: event.packageName,
            reference: event.reference ?? null,
            rawPayload: event.rawPayload,
        },
        notes: null,
        occurred_at: event.occurredAt,
        status: "pending",
    };
}
