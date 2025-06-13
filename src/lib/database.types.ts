export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      event_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          event_type: string
          id: string
          org_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          event_type: string
          id?: string
          org_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          event_type?: string
          id?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          accent_color: string | null
          access_uuid: string
          ads_image_url: string | null
          ads_text: string | null
          ads_url: string | null
          archived: boolean | null
          created_at: string | null
          event_date: string | null
          hole_count: number | null
          id: string
          logo_url: string | null
          organization_id: string | null
          published: boolean | null
          settings_json: Json | null
          short_code: string
          show_on_main_leaderboard: boolean | null
          time_filters: Json | null
          title: string
        }
        Insert: {
          accent_color?: string | null
          access_uuid: string
          ads_image_url?: string | null
          ads_text?: string | null
          ads_url?: string | null
          archived?: boolean | null
          created_at?: string | null
          event_date?: string | null
          hole_count?: number | null
          id?: string
          logo_url?: string | null
          organization_id?: string | null
          published?: boolean | null
          settings_json?: Json | null
          short_code: string
          show_on_main_leaderboard?: boolean | null
          time_filters?: Json | null
          title: string
        }
        Update: {
          accent_color?: string | null
          access_uuid?: string
          ads_image_url?: string | null
          ads_text?: string | null
          ads_url?: string | null
          archived?: boolean | null
          created_at?: string | null
          event_date?: string | null
          hole_count?: number | null
          id?: string
          logo_url?: string | null
          organization_id?: string | null
          published?: boolean | null
          settings_json?: Json | null
          short_code?: string
          show_on_main_leaderboard?: boolean | null
          time_filters?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshot: {
        Row: {
          created_at: string
          event_id: string
          id: string
          scores: Json
          time_filter: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          scores: Json
          time_filter?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          scores?: Json
          time_filter?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshot_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ads_image_url: string | null
          billing_email: string | null
          color_palette: Json | null
          created_at: string | null
          current_period_end: string | null
          id: string
          leaderboard_rotation_interval: number | null
          logo_url: string | null
          name: string
          org_leaderboard_codes: Json
          owner_id: string | null
          payment_up_to_date: boolean
          settings_json: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          ads_image_url?: string | null
          billing_email?: string | null
          color_palette?: Json | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          leaderboard_rotation_interval?: number | null
          logo_url?: string | null
          name: string
          org_leaderboard_codes?: Json
          owner_id?: string | null
          payment_up_to_date?: boolean
          settings_json?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          ads_image_url?: string | null
          billing_email?: string | null
          color_palette?: Json | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          leaderboard_rotation_interval?: number | null
          logo_url?: string | null
          name?: string
          org_leaderboard_codes?: Json
          owner_id?: string | null
          payment_up_to_date?: boolean
          settings_json?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scorecard: {
        Row: {
          created_at: string | null
          event_id: string | null
          game_id: string | null
          hole_in_ones: number | null
          hole_number: number | null
          id: string
          name: string
          player_id: string | null
          published: boolean | null
          score: number
          tiebreaker_rank: number | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          game_id?: string | null
          hole_in_ones?: number | null
          hole_number?: number | null
          id?: string
          name: string
          player_id?: string | null
          published?: boolean | null
          score: number
          tiebreaker_rank?: number | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          game_id?: string | null
          hole_in_ones?: number | null
          hole_number?: number | null
          id?: string
          name?: string
          player_id?: string | null
          published?: boolean | null
          score?: number
          tiebreaker_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scorecard_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
