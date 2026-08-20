import { cache } from "react"
import type { Category, Product } from "@/types"
import { isSupabaseMockMode, mockCategories, mockProducts } from "@/lib/mock-data"
import { applyPromotions, type Promotion } from "@/lib/promotions"

export type CatalogSource = "live" | "mock" | "unavailable"

export interface CatalogResult {
  products: Product[]
  categories: Category[]
  promotions: Promotion[]
  source: CatalogSource
}

function mockCatalogAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_MOCK_CATALOG === "true"
}

/**
 * One request-scoped catalog read shared by metadata and page rendering.
 * Production never substitutes demo merchandise for a failed or empty live
 * catalog unless ENABLE_MOCK_CATALOG was deliberately set for a preview.
 */
export const getCatalog = cache(async (): Promise<CatalogResult> => {
  if (isSupabaseMockMode()) {
    return mockCatalogAllowed()
      ? { products: mockProducts, categories: mockCategories, promotions: [], source: "mock" }
      : { products: [], categories: [], promotions: [], source: "unavailable" }
  }

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const now = new Date().toISOString()
    const [
      { data: dbProducts, error: productError },
      { data: dbCategories, error: categoryError },
      { data: dbPromotions, error: promotionError },
    ] =
      await Promise.all([
        supabase
          .from("products")
          .select("*, category:categories(id, name, slug, size_system)")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("promotions")
          .select("id, name, description, campaign_type, scope, category_id, discount_percent, starts_at, ends_at, is_active")
          .eq("is_active", true)
          .lte("starts_at", now)
          .or(`ends_at.is.null,ends_at.gt.${now}`),
      ])

    if (productError || categoryError) throw productError ?? categoryError

    if (!dbProducts?.length && mockCatalogAllowed()) {
      return { products: mockProducts, categories: mockCategories, promotions: [], source: "mock" }
    }

    // A missing migration or transient promotion read must never take the whole
    // catalog down. Falling back to base prices is the safe failure mode.
    //
    // PostgREST returns an embedded relation as an array even when the foreign
    // key guarantees at most one row, so `category` arrives as `[{id,name}]`.
    // Normalise it here rather than casting, so the rest of the app can rely on
    // the single-object shape the Promotion type declares.
    const promotions: Promotion[] = promotionError
      ? []
      : ((dbPromotions ?? []) as unknown[]).map((row) => {
          const r = row as Record<string, unknown>
          const embedded = r.category
          const category = Array.isArray(embedded) ? embedded[0] : embedded
          return {
            ...(r as Omit<Promotion, "category">),
            category: (category as Promotion["category"]) ?? null,
          }
        })

    return {
      products: applyPromotions((dbProducts ?? []) as Product[], promotions),
      categories: (dbCategories ?? []) as Category[],
      promotions,
      source: "live",
    }
  } catch {
    return mockCatalogAllowed()
      ? { products: mockProducts, categories: mockCategories, promotions: [], source: "mock" }
      : { products: [], categories: [], promotions: [], source: "unavailable" }
  }
})
