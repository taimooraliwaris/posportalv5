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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
        app_security: {
          Row: {
            id: string
            passcode: string
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            passcode?: string
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            passcode?: string
            created_at?: string
            updated_at?: string
          }
          Relationships: []
        },
      product_categories: {
        Row: {
          id: string
          slug: string
          name_en: string
          name_ur: string | null
          icon: string | null
          color: string | null
          spec_schema: Json
          parser_rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name_en: string
          name_ur?: string | null
          icon?: string | null
          color?: string | null
          spec_schema?: Json
          parser_rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name_en?: string
          name_ur?: string | null
          icon?: string | null
          color?: string | null
          spec_schema?: Json
          parser_rules?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_models: {
        Row: {
          id: string
          code: string
          item_code_prefix: string | null
          brand: string | null
          engine_cc: number | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          item_code_prefix?: string | null
          brand?: string | null
          engine_cc?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          item_code_prefix?: string | null
          brand?: string | null
          engine_cc?: number | null
          created_at?: string
        }
        Relationships: []
      }
      product_vehicle_models: {
        Row: {
          product_id: string
          model_id: string
          is_primary: boolean
        }
        Insert: {
          product_id: string
          model_id: string
          is_primary?: boolean
        }
        Update: {
          product_id?: string
          model_id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_vehicle_models_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_vehicle_models_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          }
        ]
      }
      cash_moves: {
        Row: {
          amount: number
          cashier: string
          created_at: string
          id: string
          move_type: string
          reason: string
        }
        Insert: {
          amount?: number
          cashier?: string
          created_at?: string
          id: string
          move_type?: string
          reason?: string
        }
        Update: {
          amount?: number
          cashier?: string
          created_at?: string
          id?: string
          move_type?: string
          reason?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          tone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          tone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          location: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string
          id: string
          location?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          cashier: string
          created_at: string
          customer_id: string | null
          id: string
          lines: Json
          note: string
          note_tags: string[]
          number: string
          order_date: string
          order_time: string
          payments: Json
          pricelist_id: string
          receipt: string
          status: string
          updated_at: string
        }
        Insert: {
          cashier?: string
          created_at?: string
          customer_id?: string | null
          id: string
          lines?: Json
          note?: string
          note_tags?: string[]
          number: string
          order_date?: string
          order_time?: string
          payments?: Json
          pricelist_id?: string
          receipt: string
          status?: string
          updated_at?: string
        }
        Update: {
          cashier?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          lines?: Json
          note?: string
          note_tags?: string[]
          number?: string
          order_date?: string
          order_time?: string
          payments?: Json
          pricelist_id?: string
          receipt?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricelists: {
        Row: {
          applies_to: string
          created_at: string
          customer_count: number
          customer_tag: string | null
          end_date: string | null
          id: string
          name: string
          product_count: number
          rule_type: string
          rules: Json
          start_date: string | null
          updated_at: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          customer_count?: number
          customer_tag?: string | null
          end_date?: string | null
          id: string
          name: string
          product_count?: number
          rule_type?: string
          rules?: Json
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          customer_count?: number
          customer_tag?: string | null
          end_date?: string | null
          id?: string
          name?: string
          product_count?: number
          rule_type?: string
          rules?: Json
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          category_id: string
          item_code: string | null
          name_en: string
          name_ur: string | null
          brand: string | null
          cost_price: number
          sale_price: number
          stock_qty: number
          ctn_qty: number | null
          foc_threshold: number | null
          foc_qty: number | null
          qrc_runs: number | null
          specs: Json
          vehicle_model_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          item_code?: string | null
          name_en: string
          name_ur?: string | null
          brand?: string | null
          cost_price?: number
          sale_price?: number
          stock_qty?: number
          ctn_qty?: number | null
          foc_threshold?: number | null
          foc_qty?: number | null
          qrc_runs?: number | null
          specs?: Json
          vehicle_model_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          item_code?: string | null
          name_en?: string
          name_ur?: string | null
          brand?: string | null
          cost_price?: number
          sale_price?: number
          stock_qty?: number
          ctn_qty?: number | null
          foc_threshold?: number | null
          foc_qty?: number | null
          qrc_runs?: number | null
          specs?: Json
          vehicle_model_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string
          id: string
          lines: Json
          number: string
          order_date: string
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lines?: Json
          number: string
          order_date?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lines?: Json
          number?: string
          order_date?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      return_records: {
        Row: {
          created_at: string
          difference: number
          id: string
          kind: string
          lines: Json
          method: string
          number: string
          original_number: string
          original_order_id: string
          processed_by: string
          refund_amount: number
          replacements: Json
          return_date: string
          return_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          difference?: number
          id: string
          kind?: string
          lines?: Json
          method?: string
          number: string
          original_number?: string
          original_order_id?: string
          processed_by?: string
          refund_amount?: number
          replacements?: Json
          return_date?: string
          return_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          difference?: number
          id?: string
          kind?: string
          lines?: Json
          method?: string
          number?: string
          original_number?: string
          original_order_id?: string
          processed_by?: string
          refund_amount?: number
          replacements?: Json
          return_date?: string
          return_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          actor: string
          attempt: number
          created_at: string
          detail: string
          id: string
          kind: string
          location: string
        }
        Insert: {
          actor?: string
          attempt?: number
          created_at?: string
          detail?: string
          id?: string
          kind: string
          location?: string
        }
        Update: {
          actor?: string
          attempt?: number
          created_at?: string
          detail?: string
          id?: string
          kind?: string
          location?: string
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          actor: string | null
          created_at: string
          from_qty: number
          id: string
          product_id: string
          reason: string
          to_qty: number
          updated_at: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          from_qty: number
          id?: string
          product_id: string
          reason?: string
          to_qty: number
          updated_at?: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          from_qty?: number
          id?: string
          product_id?: string
          reason?: string
          to_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          active: boolean
          cost: number
          created_at: string
          description: string
          history: Json
          on_hand: number
          product_id: string
          reorder_point: number
          reserved: number
          sku: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          cost?: number
          created_at?: string
          description?: string
          history?: Json
          on_hand?: number
          product_id: string
          reorder_point?: number
          reserved?: number
          sku?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          cost?: number
          created_at?: string
          description?: string
          history?: Json
          on_hand?: number
          product_id?: string
          reorder_point?: number
          reserved?: number
          sku?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address: string
          brand: string
          cashier: string
          created_at: string
          currency: string
          email: string
          id: string
          logo_name: string
          name: string
          network: string
          phone: string
          receipt_footer: string
          tagline: string
          updated_at: string
        }
        Insert: {
          address?: string
          brand: string
          cashier?: string
          created_at?: string
          currency?: string
          email?: string
          id?: string
          logo_name?: string
          name: string
          network?: string
          phone?: string
          receipt_footer?: string
          tagline?: string
          updated_at?: string
        }
        Update: {
          address?: string
          brand?: string
          cashier?: string
          created_at?: string
          currency?: string
          email?: string
          id?: string
          logo_name?: string
          name?: string
          network?: string
          phone?: string
          receipt_footer?: string
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact: string
          created_at: string
          id: string
          name: string
          open_balance: number
          phone: string
          product_ids: string[]
          updated_at: string
        }
        Insert: {
          contact?: string
          created_at?: string
          id: string
          name: string
          open_balance?: number
          phone?: string
          product_ids?: string[]
          updated_at?: string
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          name?: string
          open_balance?: number
          phone?: string
          product_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          applies_to: string
          created_at: string
          id: string
          name: string
          percentage: number
          updated_at: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          id: string
          name: string
          percentage?: number
          updated_at?: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          id?: string
          name?: string
          percentage?: number
          updated_at?: string
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
      v_products: {
        Row: {
          id: string
          category_id: string
          category_slug: string
          category_name: string
          item_code: string | null
          name_en: string
          name_ur: string | null
          brand: string | null
          cost_price: number
          sale_price: number
          stock_qty: number
          ctn_qty: number | null
          foc_threshold: number | null
          foc_qty: number | null
          qrc_runs: number | null
          specs: Json
          vehicle_model_id: string | null
          primary_model_code: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "Cashier" | "Manager" | "Admin"
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
      app_role: ["Cashier", "Manager", "Admin"],
    },
  },
} as const
