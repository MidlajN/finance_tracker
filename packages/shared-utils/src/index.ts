export function assert(
    condition: unknown,
    message: string
): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

export function formatCurrency(
    amount: number,
    currency = "INR",
    locale = "en-IN"
) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).format(amount);
}

export function normalizeMerchantName(name: string) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

export function normalizeCurrency(currency: string) {
    return currency.trim().toUpperCase();
}

export function isValidAmount(amount: number) {
    return Number.isFinite(amount) && amount > 0;
}

export function toIsoDate(value: Date) {
    return value.toISOString();
}

export function getCurrentMonthStart(
    now = new Date()
) {
    return `${now.getFullYear()}-${String(
        now.getMonth() + 1
    ).padStart(2, "0")}-01`;
}

export function getNextMonthStart(
    monthStart: string
) {
    const [year, month] = monthStart
        .split("-")
        .map(Number);

    const date = new Date(year, month, 1);

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-01`;
}

export function getCurrentMonth(now = new Date()) {
    return `${now.getFullYear()}-${String(
        now.getMonth() + 1
    ).padStart(2, "0")}`;
}

export function getCurrentYear(now = new Date()) {
    return now.getFullYear().toString();
}
