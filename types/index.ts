// ============================================================
// ENCHANTED STYLE — TypeScript Type Definitions
// ============================================================

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
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
  image_url: string | null
  additional_images: string[] | null
  sizes: string[] | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  // Joined
  category?: Category | null
}

export interface AdminLog {
  id: string
  admin_email: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entity_type: 'product' | 'category'
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
}

// Dashboard stats
export interface DashboardStats {
  total_products: number
  active_products: number
  featured_products: number
  total_categories: number
  total_logs: number
}
