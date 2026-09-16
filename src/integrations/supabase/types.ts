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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          detail: Json | null
          entity: string | null
          id: string
          job_id: string | null
          request_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json | null
          entity?: string | null
          id?: string
          job_id?: string | null
          request_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json | null
          entity?: string | null
          id?: string
          job_id?: string | null
          request_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_panels: {
        Row: {
          builtin: boolean
          created_at: string
          description: string | null
          enabled: boolean
          icon: string | null
          id: string
          key: string
          label: string
          parent_key: string | null
          settings: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          builtin?: boolean
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          key: string
          label: string
          parent_key?: string | null
          settings?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          builtin?: boolean
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          key?: string
          label?: string
          parent_key?: string | null
          settings?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      feedback_events: {
        Row: {
          created_at: string
          id: string
          job_id: string | null
          kind: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id?: string | null
          kind: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          user_id?: string | null
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          kind: string
          prompt: string | null
          result_summary: string | null
          service_key: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          kind: string
          prompt?: string | null
          result_summary?: string | null
          service_key?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          kind?: string
          prompt?: string | null
          result_summary?: string | null
          service_key?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      hn_service_health: {
        Row: {
          checked_at: string
          error: string | null
          id: string
          latency_ms: number | null
          ok: boolean
          service_key: string
        }
        Insert: {
          checked_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok: boolean
          service_key: string
        }
        Update: {
          checked_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok?: boolean
          service_key?: string
        }
        Relationships: []
      }
      hn_services: {
        Row: {
          capabilities: string[]
          created_at: string
          enabled: boolean
          id: string
          key: string
          name: string
          priority: number
          url: string
        }
        Insert: {
          capabilities?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          name: string
          priority?: number
          url: string
        }
        Update: {
          capabilities?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          priority?: number
          url?: string
        }
        Relationships: []
      }
      knowledge_items: {
        Row: {
          created_at: string
          embedding: Json | null
          id: string
          intent: string
          ok: boolean
          prompt: string | null
          prompt_template: string | null
          rating: number | null
          result_summary: string | null
          service_key: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          embedding?: Json | null
          id?: string
          intent: string
          ok?: boolean
          prompt?: string | null
          prompt_template?: string | null
          rating?: number | null
          result_summary?: string | null
          service_key?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          embedding?: Json | null
          id?: string
          intent?: string
          ok?: boolean
          prompt?: string | null
          prompt_template?: string | null
          rating?: number | null
          result_summary?: string | null
          service_key?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      model_policies: {
        Row: {
          id: string
          intent: string
          prompt_template: string | null
          service_key: string
          success_rate: number
          updated_at: string
          uses: number
          weight: number
        }
        Insert: {
          id?: string
          intent: string
          prompt_template?: string | null
          service_key: string
          success_rate?: number
          updated_at?: string
          uses?: number
          weight?: number
        }
        Update: {
          id?: string
          intent?: string
          prompt_template?: string | null
          service_key?: string
          success_rate?: number
          updated_at?: string
          uses?: number
          weight?: number
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          created_at: string
          display_name: string | null
          id: string
          last_seen_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          created_at?: string
          display_name?: string | null
          id: string
          last_seen_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          archived: boolean
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          tags: string[]
          title: string
          usage_count: number
        }
        Insert: {
          archived?: boolean
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          tags?: string[]
          title: string
          usage_count?: number
        }
        Update: {
          archived?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          tags?: string[]
          title?: string
          usage_count?: number
        }
        Relationships: []
      }
      usage_quotas: {
        Row: {
          id: string
          limit_count: number
          period: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          id?: string
          limit_count: number
          period: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          id?: string
          limit_count?: number
          period?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_ownership: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "editor" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "admin", "editor", "user"],
    },
  },
} as const
