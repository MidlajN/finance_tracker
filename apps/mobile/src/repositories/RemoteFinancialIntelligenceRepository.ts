import type {
  AccountLike,
  AssetLike,
  CachedAccount,
  CachedAsset,
  CachedGoal,
  CachedInvestment,
  CachedLiability,
  CachedLoan,
  CurrencyLike,
  ExchangeRateLike,
  GoalLike,
  InvestmentLike,
  LiabilityLike,
  LoanLike,
} from "@finance/shared-types";

import { supabase } from "../lib/supabase";

type OwnedResource =
  | AccountLike
  | AssetLike
  | LiabilityLike
  | LoanLike
  | InvestmentLike
  | GoalLike;

async function getUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  return user.id;
}

async function listTable<TResource>(
  table: string,
  orderColumn: string,
  select = "*"
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order(orderColumn);

  if (error) {
    throw error;
  }

  return (data ?? []) as TResource[];
}

async function createOwned<TResource>(
  table: string,
  resource: OwnedResource,
  id?: string
) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from(table)
    .insert({
      ...(id ? { id } : {}),
      ...toWritableResource(resource),
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as TResource;
}

async function updateOwned<TResource>(
  table: string,
  id: string,
  updates: Partial<OwnedResource>
) {
  const { data, error } = await supabase
    .from(table)
    .update(toWritableResource(updates))
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as TResource;
}

function toWritableResource<TResource extends Partial<OwnedResource>>(
  resource: TResource
) {
  const writable = { ...resource } as TResource & {
    liability?: unknown;
  };

  delete writable.liability;

  return writable;
}

async function deleteOwned(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export class RemoteFinancialIntelligenceRepository {
  static listCurrencies() {
    return listTable<CurrencyLike>("currencies", "code");
  }

  static async listExchangeRates() {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .order("valid_on", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as ExchangeRateLike[];
  }

  static listAccounts() {
    return listTable<CachedAccount>("accounts", "name");
  }

  static createAccount(localId: string, resource: AccountLike) {
    return createOwned<CachedAccount>("accounts", resource, localId);
  }

  static updateAccount(id: string, updates: Partial<AccountLike>) {
    return updateOwned<CachedAccount>("accounts", id, updates);
  }

  static deleteAccount(id: string) {
    return deleteOwned("accounts", id);
  }

  static listAssets() {
    return listTable<CachedAsset>("assets", "name");
  }

  static createAsset(localId: string, resource: AssetLike) {
    return createOwned<CachedAsset>("assets", resource, localId);
  }

  static updateAsset(id: string, updates: Partial<AssetLike>) {
    return updateOwned<CachedAsset>("assets", id, updates);
  }

  static deleteAsset(id: string) {
    return deleteOwned("assets", id);
  }

  static listLiabilities() {
    return listTable<CachedLiability>("liabilities", "name");
  }

  static createLiability(localId: string, resource: LiabilityLike) {
    return createOwned<CachedLiability>("liabilities", resource, localId);
  }

  static updateLiability(id: string, updates: Partial<LiabilityLike>) {
    return updateOwned<CachedLiability>("liabilities", id, updates);
  }

  static deleteLiability(id: string) {
    return deleteOwned("liabilities", id);
  }

  static async listLoans() {
    const { data, error } = await supabase
      .from("loans")
      .select("*, liability:liabilities(*)")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return (data ?? []) as CachedLoan[];
  }

  static createLoan(localId: string, resource: LoanLike) {
    return createOwned<CachedLoan>("loans", resource, localId);
  }

  static updateLoan(id: string, updates: Partial<LoanLike>) {
    return updateOwned<CachedLoan>("loans", id, updates);
  }

  static deleteLoan(id: string) {
    return deleteOwned("loans", id);
  }

  static listInvestments() {
    return listTable<CachedInvestment>("investments", "symbol");
  }

  static createInvestment(localId: string, resource: InvestmentLike) {
    return createOwned<CachedInvestment>("investments", resource, localId);
  }

  static updateInvestment(id: string, updates: Partial<InvestmentLike>) {
    return updateOwned<CachedInvestment>("investments", id, updates);
  }

  static deleteInvestment(id: string) {
    return deleteOwned("investments", id);
  }

  static listGoals() {
    return listTable<CachedGoal>("goals", "target_date");
  }

  static createGoal(localId: string, resource: GoalLike) {
    return createOwned<CachedGoal>("goals", resource, localId);
  }

  static updateGoal(id: string, updates: Partial<GoalLike>) {
    return updateOwned<CachedGoal>("goals", id, updates);
  }

  static deleteGoal(id: string) {
    return deleteOwned("goals", id);
  }
}
