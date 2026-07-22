import type {
  CachedBudget,
  CachedCategory,
  CachedFinancialRule,
  CachedMerchant,
  CategoryLike,
  CategoryReference,
  MerchantReference,
  MerchantLike,
} from "@finance/shared-types";

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
  month_start: string;
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
    month_start: row.month_start,
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

export class RemoteBudgetRepository {
  static async list() {
    const { data, error } = await supabase
      .from("budgets")
      .select(`
        *,
        category:categories(*)
      `)
      .order("month_start", {
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
      month_start?: string;
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
        category_id: budget.category_id,
        currency: "INR",
        month_start:
          budget.month_start ?? new Date().toISOString().slice(0, 7) + "-01",
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
