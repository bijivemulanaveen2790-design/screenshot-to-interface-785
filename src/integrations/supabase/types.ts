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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_detections: {
        Row: {
          bbox: Json
          complaint_id: string
          confidence: number
          created_at: string
          id: string
          image_height: number | null
          image_id: string
          image_width: number | null
          label: Database["public"]["Enums"]["damage_type"]
          model_version: string | null
          raw_label: string
        }
        Insert: {
          bbox: Json
          complaint_id: string
          confidence: number
          created_at?: string
          id?: string
          image_height?: number | null
          image_id: string
          image_width?: number | null
          label: Database["public"]["Enums"]["damage_type"]
          model_version?: string | null
          raw_label: string
        }
        Update: {
          bbox?: Json
          complaint_id?: string
          confidence?: number
          created_at?: string
          id?: string
          image_height?: number | null
          image_id?: string
          image_width?: number | null
          label?: Database["public"]["Enums"]["damage_type"]
          model_version?: string | null
          raw_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_detections_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_detections_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "complaint_images"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_images: {
        Row: {
          complaint_id: string
          content_type: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["image_kind"]
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          complaint_id: string
          content_type: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["image_kind"]
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Update: {
          complaint_id?: string
          content_type?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["image_kind"]
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_images_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_updates: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          complaint_id: string
          created_at: string
          id: string
          is_internal: boolean
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body: string
          complaint_id: string
          created_at?: string
          id?: string
          is_internal?: boolean
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          complaint_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "complaint_updates_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          address: string | null
          ai_analyzed_at: string | null
          ai_confidence: number | null
          ai_damage_type: Database["public"]["Enums"]["damage_type"] | null
          ai_message: string | null
          ai_model_version: string | null
          ai_severity: Database["public"]["Enums"]["severity_level"] | null
          ai_severity_score: number | null
          ai_status: Database["public"]["Enums"]["ai_status"]
          assigned_team: string | null
          classification_reviewed_at: string | null
          classification_reviewed_by: string | null
          created_at: string
          damage_type: Database["public"]["Enums"]["damage_type"] | null
          description: string
          id: string
          is_demo: boolean
          latitude: number
          location_accuracy_m: number | null
          location_source: Database["public"]["Enums"]["location_source"]
          longitude: number
          reference: string
          resolution_note: string | null
          resolved_at: string | null
          road_name: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          status: Database["public"]["Enums"]["complaint_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          ai_analyzed_at?: string | null
          ai_confidence?: number | null
          ai_damage_type?: Database["public"]["Enums"]["damage_type"] | null
          ai_message?: string | null
          ai_model_version?: string | null
          ai_severity?: Database["public"]["Enums"]["severity_level"] | null
          ai_severity_score?: number | null
          ai_status?: Database["public"]["Enums"]["ai_status"]
          assigned_team?: string | null
          classification_reviewed_at?: string | null
          classification_reviewed_by?: string | null
          created_at?: string
          damage_type?: Database["public"]["Enums"]["damage_type"] | null
          description: string
          id?: string
          is_demo?: boolean
          latitude: number
          location_accuracy_m?: number | null
          location_source: Database["public"]["Enums"]["location_source"]
          longitude: number
          reference: string
          resolution_note?: string | null
          resolved_at?: string | null
          road_name?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          status?: Database["public"]["Enums"]["complaint_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          ai_analyzed_at?: string | null
          ai_confidence?: number | null
          ai_damage_type?: Database["public"]["Enums"]["damage_type"] | null
          ai_message?: string | null
          ai_model_version?: string | null
          ai_severity?: Database["public"]["Enums"]["severity_level"] | null
          ai_severity_score?: number | null
          ai_status?: Database["public"]["Enums"]["ai_status"]
          assigned_team?: string | null
          classification_reviewed_at?: string | null
          classification_reviewed_by?: string | null
          created_at?: string
          damage_type?: Database["public"]["Enums"]["damage_type"] | null
          description?: string
          id?: string
          is_demo?: boolean
          latitude?: number
          location_accuracy_m?: number | null
          location_source?: Database["public"]["Enums"]["location_source"]
          longitude?: number
          reference?: string
          resolution_note?: string | null
          resolved_at?: string | null
          road_name?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          status?: Database["public"]["Enums"]["complaint_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          complaint_id: string | null
          created_at: string
          id: string
          message: string
          read_at: string | null
          reference: string | null
          user_id: string
        }
        Insert: {
          complaint_id?: string | null
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          reference?: string | null
          user_id: string
        }
        Update: {
          complaint_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      repair_assignments: {
        Row: {
          assigned_by: string | null
          assigned_by_name: string | null
          complaint_id: string
          created_at: string
          id: string
          note: string | null
          team_name: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_by_name?: string | null
          complaint_id: string
          created_at?: string
          id?: string
          note?: string | null
          team_name: string
        }
        Update: {
          assigned_by?: string | null
          assigned_by_name?: string | null
          complaint_id?: string
          created_at?: string
          id?: string
          note?: string | null
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_assignments_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          complaint_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["complaint_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["complaint_status"]
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          complaint_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["complaint_status"] | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["complaint_status"]
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          complaint_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["complaint_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["complaint_status"]
        }
        Relationships: [
          {
            foreignKeyName: "status_history_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
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
      add_complaint_update: {
        Args: { _body: string; _complaint_id: string; _internal?: boolean }
        Returns: undefined
      }
      admin_list_staff: {
        Args: never
        Returns: {
          display_name: string
          email: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      admin_set_role: {
        Args: {
          _email: string
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      assign_repair_team: {
        Args: { _complaint_id: string; _note?: string; _team: string }
        Returns: undefined
      }
      can_view_complaint: { Args: { _complaint_id: string }; Returns: boolean }
      complaint_id_from_path: { Args: { _name: string }; Returns: string }
      generate_complaint_reference: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      owns_complaint: { Args: { _complaint_id: string }; Returns: boolean }
      review_classification: {
        Args: {
          _complaint_id: string
          _damage_type: Database["public"]["Enums"]["damage_type"]
          _severity: Database["public"]["Enums"]["severity_level"]
        }
        Returns: undefined
      }
      set_complaint_status: {
        Args: {
          _complaint_id: string
          _note?: string
          _status: Database["public"]["Enums"]["complaint_status"]
        }
        Returns: undefined
      }
      staff_name: { Args: { _uid: string }; Returns: string }
    }
    Enums: {
      ai_status: "pending" | "completed" | "unavailable" | "failed"
      app_role: "admin" | "inspector"
      complaint_status: "Reported" | "Under Review" | "In Progress" | "Resolved"
      damage_type:
        | "pothole"
        | "alligator_crack"
        | "longitudinal_crack"
        | "transverse_crack"
        | "rutting"
        | "patch_failure"
        | "other"
      image_kind: "report" | "after_repair"
      location_source: "gps" | "map" | "manual"
      severity_level: "Low" | "Medium" | "High" | "Critical"
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
      ai_status: ["pending", "completed", "unavailable", "failed"],
      app_role: ["admin", "inspector"],
      complaint_status: ["Reported", "Under Review", "In Progress", "Resolved"],
      damage_type: [
        "pothole",
        "alligator_crack",
        "longitudinal_crack",
        "transverse_crack",
        "rutting",
        "patch_failure",
        "other",
      ],
      image_kind: ["report", "after_repair"],
      location_source: ["gps", "map", "manual"],
      severity_level: ["Low", "Medium", "High", "Critical"],
    },
  },
} as const
