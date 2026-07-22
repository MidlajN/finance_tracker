import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";

type Tables = Database["public"]["Tables"];
type AccountInsert = Omit<Tables["accounts"]["Insert"], "user_id">;
type AccountUpdate = Tables["accounts"]["Update"];
type AssetInsert = Omit<Tables["assets"]["Insert"], "user_id">;
type AssetUpdate = Tables["assets"]["Update"];
type LiabilityInsert = Omit<Tables["liabilities"]["Insert"], "user_id">;
type LiabilityUpdate = Tables["liabilities"]["Update"];
type LoanInsert = Omit<Tables["loans"]["Insert"], "user_id">;
type LoanUpdate = Tables["loans"]["Update"];
type InvestmentInsert = Omit<Tables["investments"]["Insert"], "user_id">;
type InvestmentUpdate = Tables["investments"]["Update"];
type GoalInsert = Omit<Tables["goals"]["Insert"], "user_id">;
type GoalUpdate = Tables["goals"]["Update"];

async function getUserId() {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated.");
    }

    return user.id;
}

export class FinancialIntelligenceRepository {
    static async listCurrencies() {
        const { data, error } = await supabase
            .from("currencies")
            .select("*")
            .order("code");

        if (error) {
            throw error;
        }

        return data;
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

        return data;
    }

    static async listAccounts() {
        const { data, error } = await supabase
            .from("accounts")
            .select("*")
            .order("archived")
            .order("name");

        if (error) {
            throw error;
        }

        return data;
    }

    static async createAccount(payload: AccountInsert) {
        const userId = await getUserId();
        const { data, error } = await supabase
            .from("accounts")
            .insert({
                ...payload,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async updateAccount(
        id: string,
        updates: AccountUpdate
    ) {
        const { data, error } = await supabase
            .from("accounts")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async deleteAccount(id: string) {
        const { error } = await supabase
            .from("accounts")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }

    static async listAssets() {
        const { data, error } = await supabase
            .from("assets")
            .select("*")
            .order("name");

        if (error) {
            throw error;
        }

        return data;
    }

    static async createAsset(payload: AssetInsert) {
        const userId = await getUserId();
        const { data, error } = await supabase
            .from("assets")
            .insert({
                ...payload,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async updateAsset(
        id: string,
        updates: AssetUpdate
    ) {
        const { data, error } = await supabase
            .from("assets")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async deleteAsset(id: string) {
        const { error } = await supabase
            .from("assets")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }

    static async listLiabilities() {
        const { data, error } = await supabase
            .from("liabilities")
            .select("*")
            .order("name");

        if (error) {
            throw error;
        }

        return data;
    }

    static async createLiability(
        payload: LiabilityInsert
    ) {
        const userId = await getUserId();
        const { data, error } = await supabase
            .from("liabilities")
            .insert({
                ...payload,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async updateLiability(
        id: string,
        updates: LiabilityUpdate
    ) {
        const { data, error } = await supabase
            .from("liabilities")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async deleteLiability(id: string) {
        const { error } = await supabase
            .from("liabilities")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
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

        return data;
    }

    static async createLoan(payload: LoanInsert) {
        const userId = await getUserId();
        const { data, error } = await supabase
            .from("loans")
            .insert({
                ...payload,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async updateLoan(
        id: string,
        updates: LoanUpdate
    ) {
        const { data, error } = await supabase
            .from("loans")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async deleteLoan(id: string) {
        const { error } = await supabase
            .from("loans")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }

    static async listInvestments() {
        const { data, error } = await supabase
            .from("investments")
            .select("*")
            .order("symbol");

        if (error) {
            throw error;
        }

        return data;
    }

    static async createInvestment(
        payload: InvestmentInsert
    ) {
        const userId = await getUserId();
        const { data, error } = await supabase
            .from("investments")
            .insert({
                ...payload,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async updateInvestment(
        id: string,
        updates: InvestmentUpdate
    ) {
        const { data, error } = await supabase
            .from("investments")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async deleteInvestment(id: string) {
        const { error } = await supabase
            .from("investments")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }

    static async listGoals() {
        const { data, error } = await supabase
            .from("goals")
            .select("*")
            .order("status")
            .order("target_date", {
                ascending: true,
                nullsFirst: false,
            });

        if (error) {
            throw error;
        }

        return data;
    }

    static async createGoal(payload: GoalInsert) {
        const userId = await getUserId();
        const { data, error } = await supabase
            .from("goals")
            .insert({
                ...payload,
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async updateGoal(
        id: string,
        updates: GoalUpdate
    ) {
        const { data, error } = await supabase
            .from("goals")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    static async deleteGoal(id: string) {
        const { error } = await supabase
            .from("goals")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }
    }
}

export type {
    AccountInsert,
    AccountUpdate,
    AssetInsert,
    AssetUpdate,
    LiabilityInsert,
    LiabilityUpdate,
    LoanInsert,
    LoanUpdate,
    InvestmentInsert,
    InvestmentUpdate,
    GoalInsert,
    GoalUpdate,
};
