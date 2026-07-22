import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

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

export function createTransactionCsv(
  transactions: CachedTransaction[],
  accounts: CachedAccount[]
) {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const columns = [
    "Date",
    "Time",
    "Type",
    "Amount",
    "Currency",
    "Merchant",
    "Category",
    "Account",
    "Institution",
    "Notes",
    "Reference",
    "Source",
  ];
  const rows = transactions
    .slice()
    .sort(
      (first, second) =>
        new Date(second.occurred_at).getTime() -
        new Date(first.occurred_at).getTime()
    )
    .map((transaction) => {
      const occurredAt = new Date(transaction.occurred_at);
      const account = transaction.account_id
        ? accountsById.get(transaction.account_id)
        : null;
      const metadata = transaction.event?.metadata;

      return [
        occurredAt.toLocaleDateString("en-CA"),
        occurredAt.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        transaction.transaction_type,
        transaction.amount.toFixed(2),
        transaction.currency ?? transaction.event?.currency ?? "INR",
        transaction.merchant?.name ??
          transaction.event?.merchant_name_raw ??
          "",
        transaction.category?.name ?? "",
        account?.name ?? "",
        account?.institution ?? "",
        transaction.notes ?? transaction.event?.notes ?? "",
        readMetadataString(metadata, "reference"),
        transaction.event?.source ?? "",
      ];
    });

  return (
    "\uFEFF" +
    [columns, ...rows]
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\r\n")
  );
}

export class FinancialDataExportService {
  static async exportTransactions(
    transactions: CachedTransaction[],
    accounts: CachedAccount[]
  ) {
    if (transactions.length === 0) {
      throw new Error("There are no confirmed transactions to export yet.");
    }

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("File sharing is not available on this device.");
    }

    const date = new Date().toISOString().slice(0, 10);
    const file = new File(
      Paths.cache,
      "finance-transactions-" + date + ".csv"
    );
    file.create({ overwrite: true });
    file.write(createTransactionCsv(transactions, accounts));

    await Sharing.shareAsync(file.uri, {
      dialogTitle: "Export financial data",
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });

    return file.name;
  }
}
