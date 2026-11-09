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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          created_at: string | null
          id: string
          permissions: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permissions?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permissions?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_by: string | null
          created_at: string
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      campaign_products: {
        Row: {
          campaign_id: string
          discount_percentage: number | null
          id: string
          product_id: string
        }
        Insert: {
          campaign_id: string
          discount_percentage?: number | null
          id?: string
          product_id: string
        }
        Update: {
          campaign_id?: string
          discount_percentage?: number | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_products_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          active: boolean
          banner_image_url: string | null
          created_at: string | null
          discount_description: string | null
          end_date: string
          id: string
          max_discount: number | null
          min_order_amount: number | null
          rules_text: string | null
          start_date: string
          title: string
        }
        Insert: {
          active?: boolean
          banner_image_url?: string | null
          created_at?: string | null
          discount_description?: string | null
          end_date: string
          id?: string
          max_discount?: number | null
          min_order_amount?: number | null
          rules_text?: string | null
          start_date: string
          title: string
        }
        Update: {
          active?: boolean
          banner_image_url?: string | null
          created_at?: string | null
          discount_description?: string | null
          end_date?: string
          id?: string
          max_discount?: number | null
          min_order_amount?: number | null
          rules_text?: string | null
          start_date?: string
          title?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          selected_size: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          selected_size?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          selected_size?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_top: boolean
          name: string
          parent_id: string | null
          shipping_rate_per_kg: number | null
          shipping_rate_per_piece: number | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_top?: boolean
          name: string
          parent_id?: string | null
          shipping_rate_per_kg?: number | null
          shipping_rate_per_piece?: number | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_top?: boolean
          name?: string
          parent_id?: string | null
          shipping_rate_per_kg?: number | null
          shipping_rate_per_piece?: number | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean | null
          cart_item_ids: string[] | null
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order_amount: number | null
          note: string | null
          product_ids: string[] | null
          used_count: number | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          cart_item_ids?: string[] | null
          code: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          note?: string | null
          product_ids?: string[] | null
          used_count?: number | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          cart_item_ids?: string[] | null
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          note?: string | null
          product_ids?: string[] | null
          used_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      courier_cache: {
        Row: {
          created_at: string
          data: Json
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      domestic_shipping_rates: {
        Row: {
          charge_inside_dhaka: number | null
          charge_outside_dhaka: number | null
          id: string
          label: string
          max_weight_gm: number | null
          min_weight_gm: number | null
          sort_order: number | null
        }
        Insert: {
          charge_inside_dhaka?: number | null
          charge_outside_dhaka?: number | null
          id?: string
          label: string
          max_weight_gm?: number | null
          min_weight_gm?: number | null
          sort_order?: number | null
        }
        Update: {
          charge_inside_dhaka?: number | null
          charge_outside_dhaka?: number | null
          id?: string
          label?: string
          max_weight_gm?: number | null
          min_weight_gm?: number | null
          sort_order?: number | null
        }
        Relationships: []
      }
      email_events: {
        Row: {
          created_at: string | null
          email_to: string | null
          event_data: Json | null
          event_type: string
          id: string
          resend_id: string | null
          subject: string | null
          template_slug: string | null
        }
        Insert: {
          created_at?: string | null
          email_to?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          resend_id?: string | null
          subject?: string | null
          template_slug?: string | null
        }
        Update: {
          created_at?: string | null
          email_to?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          resend_id?: string | null
          subject?: string | null
          template_slug?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          description: string | null
          html_body: string
          id: string
          name: string
          slug: string
          subject: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          html_body?: string
          id?: string
          name: string
          slug: string
          subject?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          html_body?: string
          id?: string
          name?: string
          slug?: string
          subject?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          image_url: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          image_url?: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          image_url?: string
          sort_order?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number
          selected_size: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity?: number
          selected_size?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
          selected_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string | null
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_cargo_charge: number | null
          actual_weight_gm: number | null
          adjustment_status: string | null
          created_at: string
          customer_ip: string | null
          domestic_delivery_charge: number | null
          due_payment_method: string | null
          due_payment_proof_url: string | null
          due_payment_verified: boolean | null
          estimated_cargo_charge: number | null
          id: string
          notes: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_proof_url: string | null
          payment_type: string | null
          payment_verified: boolean | null
          phone: string | null
          shipping_address: string | null
          shipping_adjustment: number | null
          shipping_city: string | null
          shipping_postal_code: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
          wallet_amount_used: number | null
        }
        Insert: {
          actual_cargo_charge?: number | null
          actual_weight_gm?: number | null
          adjustment_status?: string | null
          created_at?: string
          customer_ip?: string | null
          domestic_delivery_charge?: number | null
          due_payment_method?: string | null
          due_payment_proof_url?: string | null
          due_payment_verified?: boolean | null
          estimated_cargo_charge?: number | null
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_type?: string | null
          payment_verified?: boolean | null
          phone?: string | null
          shipping_address?: string | null
          shipping_adjustment?: number | null
          shipping_city?: string | null
          shipping_postal_code?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
          wallet_amount_used?: number | null
        }
        Update: {
          actual_cargo_charge?: number | null
          actual_weight_gm?: number | null
          adjustment_status?: string | null
          created_at?: string
          customer_ip?: string | null
          domestic_delivery_charge?: number | null
          due_payment_method?: string | null
          due_payment_proof_url?: string | null
          due_payment_verified?: boolean | null
          estimated_cargo_charge?: number | null
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_type?: string | null
          payment_verified?: boolean | null
          phone?: string | null
          shipping_address?: string | null
          shipping_adjustment?: number | null
          shipping_city?: string | null
          shipping_postal_code?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
          wallet_amount_used?: number | null
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone: string
          purpose: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_code: string
          phone: string
          purpose: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          purpose?: string
          verified?: boolean
        }
        Relationships: []
      }
      page_contents: {
        Row: {
          content: Json
          id: string
          page_slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: string
          page_slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          page_slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      personal_discounts: {
        Row: {
          active: boolean | null
          created_at: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          note: string | null
          product_id: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          note?: string | null
          product_id: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          note?: string | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_deals: {
        Row: {
          active: boolean
          created_at: string | null
          deal_type: string
          discount_percentage: number
          end_date: string
          id: string
          label: string | null
          product_id: string
          start_date: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          deal_type?: string
          discount_percentage?: number
          end_date: string
          id?: string
          label?: string | null
          product_id: string
          start_date?: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          deal_type?: string
          discount_percentage?: number
          end_date?: string
          id?: string
          label?: string | null
          product_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_embeddings: {
        Row: {
          embedding: string | null
          id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          embedding?: string | null
          id?: string
          product_id: string
          updated_at?: string
        }
        Update: {
          embedding?: string | null
          id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          image_url: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          image_url: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          category_id: string | null
          created_at: string
          description: string | null
          emoji: string | null
          estimated_weight_gm: number | null
          id: string
          in_stock: boolean | null
          meta_description: string | null
          meta_title: string | null
          min_quantity: number | null
          original_price: number | null
          price: number
          rating: number | null
          reviews_count: number | null
          search_tags: string[] | null
          shipping_charge_type: string | null
          shipping_rate_override: number | null
          sizes: string[] | null
          slug: string
          sold_count: number | null
          specifications: Json | null
          stock: number | null
          title: string
          variants: Json | null
        }
        Insert: {
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          estimated_weight_gm?: number | null
          id?: string
          in_stock?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          min_quantity?: number | null
          original_price?: number | null
          price?: number
          rating?: number | null
          reviews_count?: number | null
          search_tags?: string[] | null
          shipping_charge_type?: string | null
          shipping_rate_override?: number | null
          sizes?: string[] | null
          slug: string
          sold_count?: number | null
          specifications?: Json | null
          stock?: number | null
          title: string
          variants?: Json | null
        }
        Update: {
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          estimated_weight_gm?: number | null
          id?: string
          in_stock?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          min_quantity?: number | null
          original_price?: number | null
          price?: number
          rating?: number | null
          reviews_count?: number | null
          search_tags?: string[] | null
          shipping_charge_type?: string | null
          shipping_rate_override?: number | null
          sizes?: string[] | null
          slug?: string
          sold_count?: number | null
          specifications?: Json | null
          stock?: number | null
          title?: string
          variants?: Json | null
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
          address: string | null
          avatar_url: string | null
          banned: boolean | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          banned?: boolean | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          banned?: boolean | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          images: string[] | null
          is_site_review: boolean | null
          product_id: string | null
          rating: number
          status: string
          user_id: string
          verified_purchase: boolean | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_site_review?: boolean | null
          product_id?: string | null
          rating: number
          status?: string
          user_id: string
          verified_purchase?: boolean | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_site_review?: boolean | null
          product_id?: string | null
          rating?: number
          status?: string
          user_id?: string
          verified_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          campaign_id: string
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          mode: string | null
          recipient_name: string | null
          recipient_phone: string
          recipient_user_id: string | null
          sent_by: string | null
          status: string
        }
        Insert: {
          campaign_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          mode?: string | null
          recipient_name?: string | null
          recipient_phone: string
          recipient_user_id?: string | null
          sent_by?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          mode?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          recipient_user_id?: string | null
          sent_by?: string | null
          status?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          slug: string | null
          title: string
          variables: string[] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          slug?: string | null
          title: string
          variables?: string[] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          slug?: string | null
          title?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_name: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_name: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tracking_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet: {
        Row: {
          balance: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          order_id: string | null
          reason: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          reason?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          reason?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_phone_available: {
        Args: { p_phone: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_products_by_embedding: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          product_id: string
          similarity: number
        }[]
      }
      search_products: {
        Args: { max_results?: number; search_term: string }
        Returns: {
          category: string
          category_id: string | null
          created_at: string
          description: string | null
          emoji: string | null
          estimated_weight_gm: number | null
          id: string
          in_stock: boolean | null
          meta_description: string | null
          meta_title: string | null
          min_quantity: number | null
          original_price: number | null
          price: number
          rating: number | null
          reviews_count: number | null
          search_tags: string[] | null
          shipping_charge_type: string | null
          shipping_rate_override: number | null
          sizes: string[] | null
          slug: string
          sold_count: number | null
          specifications: Json | null
          stock: number | null
          title: string
          variants: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      order_status:
        | "auto_saved"
        | "pending_payment"
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "in_transit"
        | "customs"
        | "delivered"
        | "cancelled"
        | "refunded"
        | "awaiting_weight"
        | "adjustment_due"
        | "received_at_warehouse"
        | "shipped_via_air"
        | "arrived_in_bd"
        | "at_bd_warehouse"
        | "pickup_requested"
        | "handed_to_steadfast"
        | "out_for_delivery"
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
      app_role: ["admin", "customer"],
      order_status: [
        "auto_saved",
        "pending_payment",
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "in_transit",
        "customs",
        "delivered",
        "cancelled",
        "refunded",
        "awaiting_weight",
        "adjustment_due",
        "received_at_warehouse",
        "shipped_via_air",
        "arrived_in_bd",
        "at_bd_warehouse",
        "pickup_requested",
        "handed_to_steadfast",
        "out_for_delivery",
      ],
    },
  },
} as const
