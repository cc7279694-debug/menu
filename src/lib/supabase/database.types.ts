export type Json =
  | boolean
  | number
  | string
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null } & Timestamps;
        Insert: { id: string; display_name?: string | null };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      categories: {
        Row: { id: string; user_id: string; name: string; sort_order: number } & Timestamps;
        Insert: { id?: string; user_id: string; name: string; sort_order?: number };
        Update: { name?: string; sort_order?: number };
        Relationships: [];
      };
      tags: {
        Row: { id: string; user_id: string; name: string } & Timestamps;
        Insert: { id?: string; user_id: string; name: string };
        Update: { name?: string };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          title: string;
          description: string | null;
          cover_path: string | null;
          base_servings: number;
          prep_minutes: number | null;
          cook_minutes: number | null;
          personal_notes: string | null;
          is_favorite: boolean;
          deleted_at: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          title: string;
          description?: string | null;
          cover_path?: string | null;
          base_servings: number;
          prep_minutes?: number | null;
          cook_minutes?: number | null;
          personal_notes?: string | null;
          is_favorite?: boolean;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
        Relationships: [];
      };
      recipe_tags: {
        Row: { user_id: string; recipe_id: string; tag_id: string } & Pick<Timestamps, "created_at">;
        Insert: { user_id: string; recipe_id: string; tag_id: string };
        Update: never;
        Relationships: [];
      };
      ingredients: {
        Row: { id: string; user_id: string; display_name: string; normalized_name: string; default_aisle: string | null } & Timestamps;
        Insert: { id?: string; user_id: string; display_name: string; normalized_name: string; default_aisle?: string | null };
        Update: { display_name?: string; normalized_name?: string; default_aisle?: string | null };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: { id: string; user_id: string; recipe_id: string; ingredient_id: string; quantity: number | null; quantity_text: string | null; unit: string | null; preparation_note: string | null; group_type: string; sort_order: number } & Timestamps;
        Insert: { id: string; user_id: string; recipe_id: string; ingredient_id: string; quantity?: number | null; quantity_text?: string | null; unit?: string | null; preparation_note?: string | null; group_type?: string; sort_order: number };
        Update: Partial<Database["public"]["Tables"]["recipe_ingredients"]["Insert"]>;
        Relationships: [];
      };
      recipe_steps: {
        Row: { id: string; user_id: string; recipe_id: string; instruction: string; image_path: string | null; timer_seconds: number | null; heat_level: string | null; sort_order: number } & Timestamps;
        Insert: { id: string; user_id: string; recipe_id: string; instruction: string; image_path?: string | null; timer_seconds?: number | null; heat_level?: string | null; sort_order: number };
        Update: Partial<Database["public"]["Tables"]["recipe_steps"]["Insert"]>;
        Relationships: [];
      };
      recipe_preparations: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          recipe_ingredient_id: string | null;
          instruction: string;
          lead_time_minutes: number | null;
          timing_text: string | null;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id: string;
          user_id: string;
          recipe_id: string;
          recipe_ingredient_id?: string | null;
          instruction: string;
          lead_time_minutes?: number | null;
          timing_text?: string | null;
          sort_order: number;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_preparations"]["Insert"]>;
        Relationships: [];
      };
      recipe_import_jobs: {
        Row: {
          id: string;
          user_id: string;
          source_type: string;
          ai_provider: string;
          source_url: string | null;
          source_title: string | null;
          source_author: string | null;
          source_platform: string | null;
          source_text: string | null;
          image_paths: Json;
          status: string;
          draft: Json | null;
          warnings: Json;
          error_code: string | null;
          recipe_id: string | null;
          expires_at: string;
        } & Timestamps;
        Insert: {
          id?: string;
          user_id: string;
          source_type: string;
          ai_provider?: string;
          source_url?: string | null;
          source_title?: string | null;
          source_author?: string | null;
          source_platform?: string | null;
          source_text?: string | null;
          image_paths?: Json;
          status?: string;
          draft?: Json | null;
          warnings?: Json;
          error_code?: string | null;
          recipe_id?: string | null;
          expires_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_import_jobs"]["Insert"]>;
        Relationships: [];
      };
      recipe_sources: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          source_type: string;
          source_url: string | null;
          source_title: string | null;
          source_author: string | null;
          source_platform: string | null;
        } & Pick<Timestamps, "created_at">;
        Insert: {
          id?: string;
          user_id: string;
          recipe_id: string;
          source_type: string;
          source_url?: string | null;
          source_title?: string | null;
          source_author?: string | null;
          source_platform?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["recipe_sources"]["Insert"]>;
        Relationships: [];
      };
      shopping_lists: {
        Row: { id: string; user_id: string; name: string; is_active: boolean } & Timestamps;
        Insert: { id?: string; user_id: string; name?: string; is_active?: boolean };
        Update: { name?: string; is_active?: boolean };
        Relationships: [];
      };
      shopping_list_sources: {
        Row: {
          id: string;
          user_id: string;
          shopping_list_id: string;
          recipe_id: string | null;
          recipe_title_snapshot: string;
          selected_servings: number;
        } & Pick<Timestamps, "created_at">;
        Insert: {
          id: string;
          user_id: string;
          shopping_list_id: string;
          recipe_id?: string | null;
          recipe_title_snapshot: string;
          selected_servings: number;
        };
        Update: {
          recipe_id?: string | null;
          recipe_title_snapshot?: string;
          selected_servings?: number;
        };
        Relationships: [];
      };
      shopping_list_items: {
        Row: {
          id: string;
          user_id: string;
          shopping_list_id: string;
          ingredient_id: string | null;
          name_snapshot: string;
          quantity: number | null;
          quantity_text: string | null;
          unit: string | null;
          aisle: string | null;
          is_checked: boolean;
          is_manual: boolean;
          sort_order: number;
        } & Timestamps;
        Insert: {
          id: string;
          user_id: string;
          shopping_list_id: string;
          ingredient_id?: string | null;
          name_snapshot: string;
          quantity?: number | null;
          quantity_text?: string | null;
          unit?: string | null;
          aisle?: string | null;
          is_checked?: boolean;
          is_manual?: boolean;
          sort_order: number;
        };
        Update: {
          ingredient_id?: string | null;
          name_snapshot?: string;
          quantity?: number | null;
          quantity_text?: string | null;
          unit?: string | null;
          aisle?: string | null;
          is_checked?: boolean;
          is_manual?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      shopping_list_item_sources: {
        Row: {
          id: string;
          user_id: string;
          shopping_list_id: string;
          shopping_list_item_id: string;
          shopping_list_source_id: string;
          recipe_ingredient_id: string | null;
          quantity_contribution: number | null;
          quantity_text_contribution: string | null;
          unit_snapshot: string | null;
        } & Pick<Timestamps, "created_at">;
        Insert: {
          id: string;
          user_id: string;
          shopping_list_id: string;
          shopping_list_item_id: string;
          shopping_list_source_id: string;
          recipe_ingredient_id?: string | null;
          quantity_contribution?: number | null;
          quantity_text_contribution?: string | null;
          unit_snapshot?: string | null;
        };
        Update: {
          recipe_ingredient_id?: string | null;
          quantity_contribution?: number | null;
          quantity_text_contribution?: string | null;
          unit_snapshot?: string | null;
        };
        Relationships: [];
      };
      step_ingredients: {
        Row: { user_id: string; recipe_id: string; step_id: string; recipe_ingredient_id: string; quantity_override: number | null; quantity_text_override: string | null; note: string | null } & Pick<Timestamps, "created_at">;
        Insert: { user_id: string; recipe_id: string; step_id: string; recipe_ingredient_id: string; quantity_override?: number | null; quantity_text_override?: string | null; note?: string | null };
        Update: Partial<Database["public"]["Tables"]["step_ingredients"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      replace_active_shopping_list: { Args: { p_payload: Json }; Returns: string };
      reorder_shopping_items: { Args: { p_shopping_list_id: string; p_item_ids: string[] }; Returns: undefined };
      save_recipe: { Args: { p_payload: Json }; Returns: string };
      search_recipe_summaries: {
        Args: { p_query?: string | null; p_category_id?: string | null; p_tag_id?: string | null; p_favorite_only?: boolean; p_deleted_only?: boolean; p_limit?: number; p_offset?: number };
        Returns: Array<{
          recipe_id: string;
          title: string;
          description: string | null;
          cover_path: string | null;
          base_servings: number;
          prep_minutes: number | null;
          cook_minutes: number | null;
          is_favorite: boolean;
          category_id: string | null;
          category_name: string | null;
          tags: Json;
          preparation_count: number;
          max_lead_time_minutes: number | null;
          updated_at: string;
          total_count: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
