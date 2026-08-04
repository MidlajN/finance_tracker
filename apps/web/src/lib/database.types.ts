export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          amount: number
          auto_renew: boolean
          category_id: string
          created_at: string
          currency: string
          ends_on: string | null
          id: string
          period: string
          starts_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          auto_renew?: boolean
          category_id: string
          created_at?: string
          currency?: string
          ends_on?: string | null
          id?: string
          period?: string
          starts_on: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_renew?: boolean
          category_id?: string
          created_at?: string
          currency?: string
          ends_on?: string | null
          id?: string
          period?: string
          starts_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_type: string
          archived: boolean
          created_at: string
          currency: string
          id: string
          institution: string | null
          name: string
          opening_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          archived?: boolean
          created_at?: string
          currency: string
          id?: string
          institution?: string | null
          name: string
          opening_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          archived?: boolean
          created_at?: string
          currency?: string
          id?: string
          institution?: string | null
          name?: string
          opening_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          acquisition_date: string
          acquisition_value: number
          asset_type: string
          created_at: string
          currency: string
          current_valuation: number
          id: string
          name: string
          notes: string | null
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acquisition_date: string
          acquisition_value: number
          asset_type: string
          created_at?: string
          currency: string
          current_valuation: number
          id?: string
          name: string
          notes?: string | null
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acquisition_date?: string
          acquisition_value?: number
          asset_type?: string
          created_at?: string
          currency?: string
          current_valuation?: number
          id?: string
          name?: string
          notes?: string | null
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          decimal_precision: number
          name: string
          symbol: string
        }
        Insert: {
          code: string
          decimal_precision: number
          name: string
          symbol: string
        }
        Update: {
          code?: string
          decimal_precision?: number
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          quote_currency: string
          rate: number
          source: string
          valid_on: string
        }
        Insert: {
          base_currency: string
          created_at?: string
          id?: string
          quote_currency: string
          rate: number
          source: string
          valid_on: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          quote_currency?: string
          rate?: number
          source?: string
          valid_on?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          name: string
          status?: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          average_purchase_price: number
          created_at: string
          currency: string
          current_price: number | null
          exchange: string | null
          id: string
          purchase_history: Json
          quantity: number
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_purchase_price: number
          created_at?: string
          currency: string
          current_price?: number | null
          exchange?: string | null
          id?: string
          purchase_history?: Json
          quantity: number
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_purchase_price?: number
          created_at?: string
          currency?: string
          current_price?: number | null
          exchange?: string | null
          id?: string
          purchase_history?: Json
          quantity?: number
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      liabilities: {
        Row: {
          created_at: string
          currency: string
          end_date: string | null
          id: string
          interest_rate: number
          liability_type: string
          name: string
          original_amount: number
          outstanding_balance: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          end_date?: string | null
          id?: string
          interest_rate?: number
          liability_type: string
          name: string
          original_amount: number
          outstanding_balance: number
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          interest_rate?: number
          liability_type?: string
          name?: string
          original_amount?: number
          outstanding_balance?: number
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          created_at: string
          id: string
          interest_accrued: number
          liability_id: string
          loan_type: string
          monthly_payment: number
          remaining_payments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_accrued?: number
          liability_id: string
          loan_type: string
          monthly_payment: number
          remaining_payments: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_accrued?: number
          liability_id?: string
          loan_type?: string
          monthly_payment?: number
          remaining_payments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: true
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      valuations: {
        Row: {
          created_at: string
          currency: string
          id: string
          resource_id: string
          resource_type: string
          source: string
          user_id: string
          value: number
          valued_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          resource_id: string
          resource_type: string
          source: string
          user_id: string
          value: number
          valued_at: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          resource_id?: string
          resource_type?: string
          source?: string
          user_id?: string
          value?: number
          valued_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      event_sources: {
        Row: {
          confidence: number
          created_at: string
          event_id: string
          id: string
          metadata: Json
          parser_version: string | null
          payload: Json
          received_at: string
          source_application: string | null
          source_type: Database["public"]["Enums"]["source_type"]
        }
        Insert: {
          confidence?: number
          created_at?: string
          event_id: string
          id?: string
          metadata?: Json
          parser_version?: string | null
          payload: Json
          received_at?: string
          source_application?: string | null
          source_type: Database["public"]["Enums"]["source_type"]
        }
        Update: {
          confidence?: number
          created_at?: string
          event_id?: string
          id?: string
          metadata?: Json
          parser_version?: string | null
          payload?: Json
          received_at?: string
          source_application?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
        }
        Relationships: [
          {
            foreignKeyName: "event_sources_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "financial_events"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_events: {
        Row: {
          amount: number
          confidence: number
          created_at: string
          currency: string
          direction: Database["public"]["Enums"]["event_direction"]
          id: string
          merchant_id: string | null
          merchant_name_raw: string | null
          metadata: Json
          notes: string | null
          occurred_at: string
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          confidence?: number
          created_at?: string
          currency?: string
          direction: Database["public"]["Enums"]["event_direction"]
          id?: string
          merchant_id?: string | null
          merchant_name_raw?: string | null
          metadata?: Json
          notes?: string | null
          occurred_at: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          confidence?: number
          created_at?: string
          currency?: string
          direction?: Database["public"]["Enums"]["event_direction"]
          id?: string
          merchant_id?: string | null
          merchant_name_raw?: string | null
          metadata?: Json
          notes?: string | null
          occurred_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_events_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_rules: {
        Row: {
          auto_confirm: boolean
          category_id: string | null
          created_at: string
          enabled: boolean
          id: string
          match_operator: string
          match_value: string
          merchant_id: string | null
          name: string
          priority: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_confirm?: boolean
          category_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          match_operator: string
          match_value: string
          merchant_id?: string | null
          name: string
          priority?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_confirm?: boolean
          category_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          match_operator?: string
          match_value?: string
          merchant_id?: string | null
          name?: string
          priority?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_rules_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_aliases: {
        Row: {
          alias: string
          id: string
          merchant_id: string
        }
        Insert: {
          alias: string
          id?: string
          merchant_id: string
        }
        Update: {
          alias?: string
          id?: string
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_aliases_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          last_seen_at: string | null
          name: string
          normalized_name: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name: string
          normalized_name: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          normalized_name?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      merge_history: {
        Row: {
          created_at: string
          id: string
          source_event_id: string
          target_event_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_event_id: string
          target_event_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_event_id?: string
          target_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merge_history_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "financial_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merge_history_target_event_id_fkey"
            columns: ["target_event_id"]
            isOneToOne: false
            referencedRelation: "financial_events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          full_name: string | null
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          full_name?: string | null
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          full_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          event_id: string
          id: string
          merchant_id: string | null
          notes: string | null
          occurred_at: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          event_id: string
          id?: string
          merchant_id?: string | null
          notes?: string | null
          occurred_at: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          merchant_id?: string | null
          notes?: string | null
          occurred_at?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "financial_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_financial_event: {
        Args: { p_event_id: string }
        Returns: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          event_id: string
          id: string
          merchant_id: string | null
          notes: string | null
          occurred_at: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_merchants: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          category_id: string
          created_at: string
          id: string
          last_seen_at: string
          name: string
          normalized_name: string
          updated_at: string
          usage_count: number
          user_id: string
        }[]
      }
    }
    Enums: {
      event_direction: "debit" | "credit"
      event_status: "pending" | "confirmed" | "ignored" | "merged"
      source_type:
        | "notification"
        | "sms"
        | "clipboard"
        | "share"
        | "ocr"
        | "manual"
      transaction_type: "expense" | "income" | "transfer" | "refund"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_direction: ["debit", "credit"],
      event_status: ["pending", "confirmed", "ignored", "merged"],
      source_type: [
        "notification",
        "sms",
        "clipboard",
        "share",
        "ocr",
        "manual",
      ],
      transaction_type: ["expense", "income", "transfer", "refund"],
    },
  },
} as const
