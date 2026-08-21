// ============================================================
// ENCHANTED STYLE — TypeScript Type Definitions
// ============================================================

export type SizeSystem = 'eu_footwear' | 'letter_clothing' | 'none'

/** Set once per category. Decides which size chart the product page offers. */
export interface Category {
  id: string
  name: string
  slug: string
  size_system?: SizeSystem
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FitAdvice = 'true_to_size' | 'size_up' | 'size_down'

export interface ProductColor {
  id: string
  product_id: string
  name: string
  hex_code: string
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  color_id: string | null
  sku: string | null
  size: string | null
  /** Null means the shop is not tracking a finite quantity for this variant. */
  stock_quantity: number | null
  in_stock: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  category_id: string | null
  name: string
  description: string | null
  price: number | null
  /** Effective storefront price after an active promotion is applied. */
  original_price?: number | null
  discount_percent?: number | null
  promotion_name?: string | null
  image_url: string | null
  additional_images: string[] | null
  sizes: string[] | null
  /**
   * Product detail fields. All nullable on purpose: a field the owner leaves
   * empty renders as nothing rather than as an unverified claim. fit_advice in
   * particular has no default, because defaulting it would make every untouched
   * product assert a fit nobody checked.
   */
  fit_advice?: FitAdvice | null
  materials?: string | null
  heel_height_cm?: number | null
  model_note?: string | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  // Joined
  category?: Category | null
  colors?: ProductColor[]
  variants?: ProductVariant[]
  /** True when variant rows exist, including when every row is inactive. */
  inventory_tracked?: boolean
}

export type SiteTheme = 'default' | 'christmas' | 'ramadan'

export interface SiteSettings {
  id: 'storefront'
  active_theme: SiteTheme
  updated_at: string
}

export interface AdminLog {
  id: string
  admin_email: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entity_type: 'product' | 'category' | 'promotion' | 'site_setting'
  entity_id: string | null
  entity_name: string | null
  changes: {
    before: Record<string, unknown> | null
    after: Record<string, unknown> | null
  } | null
  created_at: string
}

// Form types for create / edit
export interface ProductFormData {
  name: string
  description: string
  category_id: string
  price: string
  image_url: string
  additional_images: string[]
  sizes: string[]
  is_featured: boolean
  is_active: boolean
  sort_order: number
}

export interface CategoryFormData {
  name: string
  description: string
  image_url: string
  sort_order: number
  is_active: boolean
}

// Order types
export interface OrderItem {
  name: string
  size: string | null
  qty: number
  price: number
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  user_email: string
  full_name: string
  phone: string
  delivery_address: string
  city: string | null
  area: 'beirut' | 'outside'
  delivery_fee: number
  order_notes: string | null
  items: OrderItem[]
  subtotal: number
  total: number
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  created_at: string
  updated_at: string
}

// Dashboard stats
export interface DashboardStats {
  total_products: number
  active_products: number
  featured_products: number
  total_categories: number
  total_logs: number
}

// Order analytics — from the order_analytics materialized view
export interface OrderAnalytics {
  id: number
  total_orders: number
  valid_orders: number
  total_revenue: number
  avg_order_value: number
  orders_today: number
  orders_this_month: number
  revenue_this_month: number
  orders_this_week: number
  revenue_this_week: number
  revenue_last_30_days: number
  pipeline_value: number
  completion_rate: number
  pending_count: number
  confirmed_count: number
  delivered_count: number
  cancelled_count: number
  beirut_count: number
  outside_count: number
  top_products: Array<{ name: string; qty: number; revenue: number }> | null
  top_cities: Array<{ city: string; count: number }> | null
  daily_volume: Array<{ date: string; count: number; revenue: number }> | null
}
