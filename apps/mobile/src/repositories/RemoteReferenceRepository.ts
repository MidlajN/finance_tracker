import type {
  BudgetPeriod,
  CachedBudget,
  CachedCategory,
  CachedFinancialRule,
  CachedMerchant,
  CachedMerchantAlias,
  CategoryLike,
  CategoryReference,
  MerchantReference,
  MerchantLike,
} from "@finance/shared-types";
import { getCurrentMonthStart } from "@finance/shared-utils";

import { supabase } from "../lib/supabase";

interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface MerchantRow {
  id: string;
  name: string;
  normalized_name: string | null;
  usage_count: number | null;
  category_id: string | null;
  category?: CategoryReference | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BudgetRow {
  id: string;
  amount: number;
  category_id: string | null;
  currency: string;
  period: BudgetPeriod;
  auto_renew: boolean;
  starts_on: string;
  ends_on: string | null;
  category?: CategoryReference | null;
  created_at: string;
  updated_at: string;
}

interface RuleRow {
  id: string;
  name: string;
  match_operator: string;
  match_value: string;
  merchant_id: string | null;
  merchant?: MerchantReference | null;
  category_id: string | null;
  category?: CategoryReference | null;
  auto_confirm: boolean;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

function toCachedCategory(row: CategoryRow): CachedCategory {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    is_system: row.is_system,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedMerchant(row: MerchantRow): CachedMerchant {
  return {
    id: row.id,
    name: row.name,
    normalized_name: row.normalized_name,
    usage_count: row.usage_count ?? 0,
    category_id: row.category_id,
    category: row.category ?? null,
    last_seen_at: row.last_seen_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedBudget(row: BudgetRow): CachedBudget {
  return {
    id: row.id,
    amount: row.amount,
    category_id: row.category_id,
    currency: row.currency,
    period: row.period,
    auto_renew: row.auto_renew,
    starts_on: row.starts_on,
    ends_on: row.ends_on,
    category: row.category ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toCachedRule(row: RuleRow): CachedFinancialRule {
  return {
    id: row.id,
    name: row.name,
    match_operator: row.match_operator,
    match_value: row.match_value,
    merchant_id: row.merchant_id,
    merchant: row.merchant ?? null,
    category_id: row.category_id,
    category: row.category ?? null,
    auto_confirm: row.auto_confirm,
    enabled: row.enabled,
    priority: row.priority,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  return user.id;
}

export class RemoteCategoryRepository {
  static async list() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return ((data ?? []) as CategoryRow[]).map(toCachedCategory);
  }

  static async create(localId: string, category: CategoryLike) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        color: category.color ?? null,
        icon: category.icon ?? null,
        id: localId,
        is_system: false,
        name: category.name,
        user_id: userId,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return toCachedCategory(data as CategoryRow);
  }
}

export class RemoteMerchantRepository {
  static async list() {
    const { data, error } = await supabase
      .from("merchants")
      .select(`
        *,
        category:categories(*)
      `)
      .order("usage_count", {
        ascending: false,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return ((data ?? []) as MerchantRow[]).map(toCachedMerchant);
  }

  static async create(localId: string, merchant: MerchantLike) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("merchants")
      .insert({
        category_id: merchant.category_id ?? null,
        id: localId,
        name: merchant.name,
        normalized_name:
          merchant.normalized_name ?? merchant.name.trim().toLowerCase(),
        user_id: userId,
      })
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (error) {
      throw error;
    }

    return toCachedMerchant(data as MerchantRow);
  }

  static async update(id: string, updates: Partial<MerchantLike>) {
    const { data, error } = await supabase
      .from("merchants")
      .update({
        ...(updates.category_id !== undefined
          ? { category_id: updates.category_id }
          : {}),
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.normalized_name !== undefined
          ? { normalized_name: updates.normalized_name }
          : {}),
      })
      .eq("id", id)
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (error) {
      throw error;
    }

    return toCachedMerchant(data as MerchantRow);
  }
}

interface MerchantAliasRow {
  id: string;
  merchant_id: string;
  alias: string;
}

export class RemoteMerchantAliasRepository {
  static async list(): Promise<CachedMerchantAlias[]> {
    const { data, error } = await supabase
      .from("merchant_aliases")
      .select("*")
      .order("alias", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return ((data ?? []) as MerchantAliasRow[]).map((row) => ({
      id: row.id,
      merchant_id: row.merchant_id,
      alias: row.alias,
    }));
  }

  static async create(localId: string, merchantId: string, alias: string) {
    const { data, error } = await supabase
      .from("merchant_aliases")
      .insert({
        alias,
        id: localId,
        merchant_id: merchantId,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const row = data as MerchantAliasRow;

    return {
      id: row.id,
      merchant_id: row.merchant_id,
      alias: row.alias,
    } satisfies CachedMerchantAlias;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from("merchant_aliases")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  }
}

export class RemoteBudgetRepository {
  static async list() {
    const { data, error } = await supabase
      .from("budgets")
      .select(`
        *,
        category:categories(*)
      `)
      .order("starts_on", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return ((data ?? []) as BudgetRow[]).map(toCachedBudget);
  }

  static async create(
    localId: string,
    budget: {
      amount: number;
      category_id: string | null;
      period?: BudgetPeriod;
      auto_renew?: boolean;
      starts_on?: string;
      ends_on?: string | null;
    }
  ) {
    if (!budget.category_id) {
      throw new Error("Choose a category before saving a budget.");
    }

    const userId = await getUserId();
    const { data, error } = await supabase
      .from("budgets")
      .insert({
        id: localId,
        amount: budget.amount,
        auto_renew: budget.auto_renew ?? true,
        category_id: budget.category_id,
        currency: "INR",
        ends_on: budget.ends_on ?? null,
        period: budget.period ?? "monthly",
        starts_on: budget.starts_on ?? getCurrentMonthStart(),
        user_id: userId,
      })
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (error) {
      throw error;
    }

    return toCachedBudget(data as BudgetRow);
  }
}

export class RemoteFinancialRuleRepository {
  static async create(localId: string, rule: CachedFinancialRule) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from("financial_rules")
      .insert({
        auto_confirm: rule.auto_confirm,
        category_id: rule.category_id ?? null,
        enabled: rule.enabled,
        id: localId,
        match_operator: rule.match_operator,
        match_value: rule.match_value,
        merchant_id: rule.merchant_id ?? null,
        name: rule.name,
        priority: rule.priority,
        user_id: userId,
      })
      .select(`
        *,
        merchant:merchants(*),
        category:categories(*)
      `)
      .single();

    if (error) {
      throw error;
    }

    return toCachedRule(data as RuleRow);
  }

  static async list() {
    const { data, error } = await supabase
      .from("financial_rules")
      .select(`
        *,
        merchant:merchants(*),
        category:categories(*)
      `)
      .order("priority", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return ((data ?? []) as RuleRow[]).map(toCachedRule);
  }
}
