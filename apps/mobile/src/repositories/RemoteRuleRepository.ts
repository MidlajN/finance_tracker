import type { FinancialRule } from "@finance/shared-types";

import { supabase } from "../lib/supabase";

export class RemoteRuleRepository {
  static async enabled() {
    const { data, error } = await supabase
      .from("financial_rules")
      .select(`
        *,
        merchant:merchants(*),
        category:categories(*)
      `)
      .eq("enabled", true)
      .order("priority", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as FinancialRule[];
  }
}
