import { calculateAccountBalance } from "@finance/finance-core";
import type {
  CachedAccount,
  CachedTransaction,
  Json,
} from "@finance/shared-types";

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);

  if (/[",\n\r]/.test(text)) {
    return '"' + text.replaceAll('"', '""') + '"';
  }

  return text;
}

function readMetadataString(metadata: Json | null | undefined, key: string) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return "";
  }

  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

// Expenses read as negative and money in as positive so a spreadsheet
// SUM over the Amount column reproduces the net figure.
function formatSignedAmount(transaction: CachedTransaction) {
  if (transaction.transaction_type === "expense") {
    return "-" + formatAmount(transaction.amount);
  }

  if (
    transaction.transaction_type === "income" ||
    transaction.transaction_type === "refund"
  ) {
    return formatAmount(transaction.amount);
  }

  return formatAmount(transaction.amount);
}

function formatNet(value: number) {
  return value >= 0 ? formatAmount(value) : "-" + formatAmount(Math.abs(value));
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  expense: "Expense",
  income: "Income",
  refund: "Refund",
  transfer: "Transfer",
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "Bank account",
  cash: "Cash",
  credit_card: "Credit card",
  digital_wallet: "Digital wallet",
  investment: "Investment account",
};

const SOURCE_LABELS: Record<string, string> = {
  android_notification: "Auto-captured",
  manual: "Manual entry",
};

function titleCaseFallback(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function isMoneyIn(transaction: CachedTransaction) {
  return (
    transaction.transaction_type === "income" ||
    transaction.transaction_type === "refund"
  );
}

function isMoneyOut(transaction: CachedTransaction) {
  return transaction.transaction_type === "expense";
}

export function createFinancialReportCsv(
  transactions: CachedTransaction[],
  accounts: CachedAccount[],
  exportedAt = new Date()
) {
  const sorted = transactions
    .slice()
    .sort(
      (first, second) =>
        new Date(second.occurred_at).getTime() -
        new Date(first.occurred_at).getTime()
    );
  const oldest = sorted[sorted.length - 1];
  const newest = sorted[0];
  const accountsById = new Map(
    accounts.map((account) => [account.id, account])
  );

  const totalIn = sorted
    .filter(isMoneyIn)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const totalOut = sorted
    .filter(isMoneyOut)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const transferCount = sorted.filter(
    (transaction) => transaction.transaction_type === "transfer"
  ).length;

  const lines: string[][] = [];

  function pushSection(title: string) {
    lines.push([]);
    lines.push([title]);
  }

  // ---- Header ----
  lines.push(["FinAce financial export"]);
  lines.push([
    "Exported on",
    exportedAt.toLocaleDateString("en-CA") +
      " " +
      exportedAt.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
  ]);
  lines.push([
    "Period",
    new Date(oldest.occurred_at).toLocaleDateString("en-CA") +
      " to " +
      new Date(newest.occurred_at).toLocaleDateString("en-CA"),
  ]);
  lines.push(["Amounts", "INR unless a row states another currency"]);

  // ---- Summary ----
  pushSection("SUMMARY");
  lines.push(["Money in", formatAmount(totalIn)]);
  lines.push(["Money out", formatAmount(totalOut)]);
  lines.push(["Net", formatNet(totalIn - totalOut)]);
  lines.push(["Transactions", String(sorted.length)]);

  if (transferCount > 0) {
    lines.push(["Transfers between accounts", String(transferCount)]);
  }

  lines.push(["Accounts", String(accounts.length)]);

  // ---- Accounts ----
  pushSection("ACCOUNTS");
  lines.push([
    "Account",
    "Type",
    "Institution",
    "Opening balance",
    "Money in",
    "Money out",
    "Current balance",
  ]);
  accounts.forEach((account) => {
    const accountTransactions = sorted.filter(
      (transaction) => transaction.account_id === account.id
    );
    const moneyIn = accountTransactions
      .filter(isMoneyIn)
      .reduce((total, transaction) => total + transaction.amount, 0);
    const moneyOut = accountTransactions
      .filter(isMoneyOut)
      .reduce((total, transaction) => total + transaction.amount, 0);

    lines.push([
      account.name,
      ACCOUNT_TYPE_LABELS[account.account_type] ??
        titleCaseFallback(account.account_type),
      account.institution ?? "",
      formatAmount(account.opening_balance),
      formatAmount(moneyIn),
      formatAmount(moneyOut),
      formatAmount(calculateAccountBalance(account, sorted)),
    ]);
  });

  // ---- Monthly activity ----
  const monthly = new Map<
    string,
    { label: string; moneyIn: number; moneyOut: number }
  >();

  sorted.forEach((transaction) => {
    const occurredAt = new Date(transaction.occurred_at);
    const key =
      occurredAt.getFullYear() +
      "-" +
      String(occurredAt.getMonth() + 1).padStart(2, "0");
    const bucket = monthly.get(key) ?? {
      label: occurredAt.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
      moneyIn: 0,
      moneyOut: 0,
    };

    if (isMoneyIn(transaction)) {
      bucket.moneyIn += transaction.amount;
    } else if (isMoneyOut(transaction)) {
      bucket.moneyOut += transaction.amount;
    }

    monthly.set(key, bucket);
  });

  pushSection("MONTHLY ACTIVITY");
  lines.push(["Month", "Money in", "Money out", "Net"]);
  Array.from(monthly.entries())
    .sort(([first], [second]) => second.localeCompare(first))
    .forEach(([, bucket]) => {
      lines.push([
        bucket.label,
        formatAmount(bucket.moneyIn),
        formatAmount(bucket.moneyOut),
        formatNet(bucket.moneyIn - bucket.moneyOut),
      ]);
    });

  // ---- Spending by category ----
  const byCategory = new Map<string, { count: number; total: number }>();

  sorted.filter(isMoneyOut).forEach((transaction) => {
    const name = transaction.category?.name ?? "Uncategorized";
    const bucket = byCategory.get(name) ?? { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += transaction.amount;
    byCategory.set(name, bucket);
  });

  if (byCategory.size > 0) {
    pushSection("SPENDING BY CATEGORY");
    lines.push(["Category", "Transactions", "Amount", "Share of spend"]);
    Array.from(byCategory.entries())
      .sort(([, first], [, second]) => second.total - first.total)
      .forEach(([name, bucket]) => {
        const share =
          totalOut > 0 ? (bucket.total / totalOut) * 100 : 0;

        lines.push([
          name,
          String(bucket.count),
          formatAmount(bucket.total),
          share.toFixed(1) + "%",
        ]);
      });
  }

  // ---- Transactions ----
  pushSection("TRANSACTIONS (newest first)");
  lines.push([
    "Date",
    "Time",
    "Type",
    "Amount",
    "Currency",
    "Merchant",
    "Category",
    "Account",
    "Notes",
    "Reference",
    "Source",
  ]);
  sorted.forEach((transaction) => {
    const occurredAt = new Date(transaction.occurred_at);
    const account = transaction.account_id
      ? accountsById.get(transaction.account_id)
      : null;
    const source = transaction.event?.source ?? "";

    lines.push([
      occurredAt.toLocaleDateString("en-CA"),
      occurredAt.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      TRANSACTION_TYPE_LABELS[transaction.transaction_type] ??
        titleCaseFallback(transaction.transaction_type),
      formatSignedAmount(transaction),
      transaction.currency ?? transaction.event?.currency ?? "INR",
      transaction.merchant?.name ??
        transaction.event?.merchant_name_raw ??
        "",
      transaction.category?.name ?? "",
      account?.name ?? "",
      transaction.notes ?? transaction.event?.notes ?? "",
      readMetadataString(transaction.event?.metadata, "reference"),
      SOURCE_LABELS[source] ?? titleCaseFallback(source),
    ]);
  });

  return (
    "\uFEFF" +
    lines.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")
  );
}

