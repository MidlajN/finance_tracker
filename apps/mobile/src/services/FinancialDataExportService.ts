import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type {
  CachedAccount,
  CachedTransaction,
} from "@finance/shared-types";

import { createFinancialReportCsv } from "./financialReportCsv";

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
    const file = new File(Paths.cache, "finance-export-" + date + ".csv");
    file.create({ overwrite: true });
    file.write(createFinancialReportCsv(transactions, accounts));

    await Sharing.shareAsync(file.uri, {
      dialogTitle: "Export financial data",
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });

    return file.name;
  }
}
