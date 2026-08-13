import { cache } from "react"
import type { Category, Product } from "@/types"
import { isSupabaseMockMode, mockCategories, mockProducts } from "@/lib/mock-data"

export type CatalogSource = "live" | "mock" | "unavailable"

export interface CatalogResult {
  products: Product[]
  categories: Category[]
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
      ? { products: mockProducts, categories: mockCategories, source: "mock" }
      : { products: [], categories: [], source: "unavailable" }
  }

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const [{ data: dbProducts, error: productError }, { data: dbCategories, error: categoryError }] =
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
      ])

    if (productError || categoryError) throw productError ?? categoryError

    if (!dbProducts?.length && mockCatalogAllowed()) {
      return { products: mockProducts, categories: mockCategories, source: "mock" }
    }

    return {
      products: (dbProducts ?? []) as Product[],
      categories: (dbCategories ?? []) as Category[],
      source: "live",
    }
  } catch {
    return mockCatalogAllowed()
      ? { products: mockProducts, categories: mockCategories, source: "mock" }
      : { products: [], categories: [], source: "unavailable" }
  }
})
