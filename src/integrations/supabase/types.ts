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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          broker_name: string | null
          created_at: string | null
          currency: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          broker_name?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          broker_name?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_summaries: {
        Row: {
          content: string
          created_at: string | null
          id: string
          target_id: string
          type: Database["public"]["Enums"]["ai_summary_type"]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          target_id: string
          type: Database["public"]["Enums"]["ai_summary_type"]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          target_id?: string
          type?: Database["public"]["Enums"]["ai_summary_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: Database["public"]["Enums"]["goal_category"] | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          image_url: string | null
          status: Database["public"]["Enums"]["goal_status"] | null
          target_metric: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["goal_category"] | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          image_url?: string | null
          status?: Database["public"]["Enums"]["goal_status"] | null
          target_metric?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["goal_category"] | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          image_url?: string | null
          status?: Database["public"]["Enums"]["goal_status"] | null
          target_metric?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          habit_id: string
          id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date: string
          habit_id: string
          id?: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          habit_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          exercised: boolean | null
          id: string
          image_url: string | null
          journaled: boolean | null
          meditated: boolean | null
          name: string | null
          schedule: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          exercised?: boolean | null
          id?: string
          image_url?: string | null
          journaled?: boolean | null
          meditated?: boolean | null
          name?: string | null
          schedule?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          exercised?: boolean | null
          id?: string
          image_url?: string | null
          journaled?: boolean | null
          meditated?: boolean | null
          name?: string | null
          schedule?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          logs: string | null
          raw_file_url: string | null
          source: Database["public"]["Enums"]["import_source"]
          status: Database["public"]["Enums"]["import_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          logs?: string | null
          raw_file_url?: string | null
          source: Database["public"]["Enums"]["import_source"]
          status?: Database["public"]["Enums"]["import_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          logs?: string | null
          raw_file_url?: string | null
          source?: Database["public"]["Enums"]["import_source"]
          status?: Database["public"]["Enums"]["import_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      strategies: {
        Row: {
          checklist: Json | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          markets: Json | null
          name: string
          timeframes: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          markets?: Json | null
          name: string
          timeframes?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          markets?: Json | null
          name?: string
          timeframes?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["tag_type"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          type?: Database["public"]["Enums"]["tag_type"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["tag_type"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_images: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          trade_id: string
          type: Database["public"]["Enums"]["trade_image_type"] | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          trade_id: string
          type?: Database["public"]["Enums"]["trade_image_type"] | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          trade_id?: string
          type?: Database["public"]["Enums"]["trade_image_type"] | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_images_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_tags: {
        Row: {
          created_at: string | null
          id: string
          tag_id: string
          trade_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_id: string
          trade_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_tags_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string | null
          closed_at: string | null
          confluence: string | null
          created_at: string | null
          custom_fields: Json | null
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_price: number
          execution_rating: number | null
          exit_price: number | null
          follow_plan: boolean | null
          holding_minutes: number | null
          id: string
          instrument: string
          market_condition: string | null
          notes: string | null
          opened_at: string
          position_size: number | null
          profit_loss_currency: number | null
          profit_loss_r: number | null
          reward_amount: number | null
          risk_amount: number | null
          session: string | null
          setup_type: string | null
          source: Database["public"]["Enums"]["trade_source"] | null
          stop_loss: number | null
          strategy_id: string | null
          take_profit: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          closed_at?: string | null
          confluence?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_price: number
          execution_rating?: number | null
          exit_price?: number | null
          follow_plan?: boolean | null
          holding_minutes?: number | null
          id?: string
          instrument: string
          market_condition?: string | null
          notes?: string | null
          opened_at: string
          position_size?: number | null
          profit_loss_currency?: number | null
          profit_loss_r?: number | null
          reward_amount?: number | null
          risk_amount?: number | null
          session?: string | null
          setup_type?: string | null
          source?: Database["public"]["Enums"]["trade_source"] | null
          stop_loss?: number | null
          strategy_id?: string | null
          take_profit?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          closed_at?: string | null
          confluence?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          direction?: Database["public"]["Enums"]["trade_direction"]
          entry_price?: number
          execution_rating?: number | null
          exit_price?: number | null
          follow_plan?: boolean | null
          holding_minutes?: number | null
          id?: string
          instrument?: string
          market_condition?: string | null
          notes?: string | null
          opened_at?: string
          position_size?: number | null
          profit_loss_currency?: number | null
          profit_loss_r?: number | null
          reward_amount?: number | null
          risk_amount?: number | null
          session?: string | null
          setup_type?: string | null
          source?: Database["public"]["Enums"]["trade_source"] | null
          stop_loss?: number | null
          strategy_id?: string | null
          take_profit?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          base_currency: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          base_currency?: string | null
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          base_currency?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          ai_summary: string | null
          created_at: string | null
          didnt_go_well: string | null
          focus_next_week: string | null
          id: string
          lessons: string | null
          updated_at: string | null
          user_id: string
          week_end_date: string
          week_start_date: string
          went_well: string | null
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string | null
          didnt_go_well?: string | null
          focus_next_week?: string | null
          id?: string
          lessons?: string | null
          updated_at?: string | null
          user_id: string
          week_end_date: string
          week_start_date: string
          went_well?: string | null
        }
        Update: {
          ai_summary?: string | null
          created_at?: string | null
          didnt_go_well?: string | null
          focus_next_week?: string | null
          id?: string
          lessons?: string | null
          updated_at?: string | null
          user_id?: string
          week_end_date?: string
          week_start_date?: string
          went_well?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ai_summary_type: "WEEKLY" | "TRADE"
      goal_category: "TRADING" | "HEALTH" | "PERSONAL" | "OTHER"
      goal_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
      import_source: "MT4" | "MT5" | "CTRADER" | "TRADINGVIEW" | "GENERIC"
      import_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
      subscription_plan: "FREE" | "PRO"
      subscription_status: "ACTIVE" | "TRIALING" | "CANCELED" | "PAST_DUE"
      tag_type: "EMOTION" | "CONDITION" | "OTHER"
      trade_direction: "LONG" | "SHORT"
      trade_image_type: "BEFORE" | "AFTER" | "OTHER"
      trade_source: "MANUAL" | "IMPORT"
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
      ai_summary_type: ["WEEKLY", "TRADE"],
      goal_category: ["TRADING", "HEALTH", "PERSONAL", "OTHER"],
      goal_status: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      import_source: ["MT4", "MT5", "CTRADER", "TRADINGVIEW", "GENERIC"],
      import_status: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      subscription_plan: ["FREE", "PRO"],
      subscription_status: ["ACTIVE", "TRIALING", "CANCELED", "PAST_DUE"],
      tag_type: ["EMOTION", "CONDITION", "OTHER"],
      trade_direction: ["LONG", "SHORT"],
      trade_image_type: ["BEFORE", "AFTER", "OTHER"],
      trade_source: ["MANUAL", "IMPORT"],
    },
  },
} as const
