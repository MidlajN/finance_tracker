import type {
  CachedTransaction,
  CachedFinancialEvent,
  CategoryReference,
  MerchantReference,
} from "@finance/shared-types";

import { supabase } from "../lib/supabase";

interface RemoteTransactionRow {
  id: string;
  event_id: string;
  account_id: string | null;
  amount: number;
  category_id: string | null;
  currency: string;
  merchant_id: string | null;
  notes: string | null;
  occurred_at: string;
  transaction_type: CachedTransaction["transaction_type"];
  event?: CachedFinancialEvent | null;
  merchant?: MerchantReference | null;
  category?: CategoryReference | null;
  created_at: string;
  updated_at: string;
}

function toCachedTransaction(
  row: RemoteTransactionRow
): CachedTransaction {
  return {
    id: row.id,
    event_id: row.event_id,
    account_id: row.account_id,
    amount: row.amount,
    category_id: row.category_id,
    currency: row.currency,
    merchant_id: row.merchant_id,
    notes: row.notes,
    occurred_at: row.occurred_at,
    transaction_type: row.transaction_type,
    event: row.event ?? null,
    merchant: row.merchant ?? null,
    category: row.category ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class RemoteTransactionRepository {
  static async list() {
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        event:financial_events(*),
        merchant:merchants(*),
        category:categories(*)
      `)
      .order("occurred_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return ((data ?? []) as RemoteTransactionRow[]).map(
      toCachedTransaction
    );
  }
}
