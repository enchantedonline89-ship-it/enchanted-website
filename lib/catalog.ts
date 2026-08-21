import { cache } from "react"
import type { Category, Product, ProductColor, ProductVariant } from "@/types"
import { getD1Database } from "@/lib/cloudflare/d1"
import { applyPromotions, type Promotion } from "@/lib/promotions"

export type CatalogSource = "live" | "unavailable"

export interface CatalogResult {
  products: Product[]
  categories: Category[]
  promotions: Promotion[]
  source: CatalogSource
}

const PRODUCTS_QUERY = `
  SELECT
    p.id,
    p.category_id,
    p.name,
    p.description,
    p.price_cents,
    p.image_url,
    p.additional_images_json,
    p.sizes_json,
    p.fit_advice,
    p.materials,
    p.heel_height_cm,
    p.model_note,
    p.is_featured,
    p.is_active,
    p.sort_order,
    p.created_at,
    p.updated_at,
    EXISTS (
      SELECT 1 FROM product_variants AS inventory_variant
      WHERE inventory_variant.product_id = p.id
    ) AS inventory_tracked,
    c.id AS category_row_id,
    c.name AS category_name,
    c.slug AS category_slug,
    c.size_system AS category_size_system,
    c.description AS category_description,
    c.image_url AS category_image_url,
    c.sort_order AS category_sort_order,
    c.is_active AS category_is_active,
    c.created_at AS category_created_at,
    c.updated_at AS category_updated_at
  FROM products AS p
  LEFT JOIN categories AS c ON c.id = p.category_id
  WHERE p.is_active = ?
  ORDER BY p.sort_order ASC, p.created_at DESC
`

const CATEGORIES_QUERY = `
  SELECT
    id,
    name,
    slug,
    size_system,
    description,
    image_url,
    sort_order,
    is_active,
    created_at,
    updated_at
  FROM categories
  WHERE is_active = ?
  ORDER BY sort_order ASC, created_at DESC
`

const PROMOTIONS_QUERY = `
  SELECT
    p.id,
    p.name,
    p.description,
    p.campaign_type,
    p.scope,
    p.category_id,
    p.discount_basis_points,
    p.starts_at,
    p.ends_at,
    p.is_active,
    p.created_at,
    p.updated_at,
    c.id AS category_row_id,
    c.name AS category_name
  FROM promotions AS p
  LEFT JOIN categories AS c ON c.id = p.category_id
  WHERE p.is_active = ?
    AND p.starts_at <= ?
    AND (p.ends_at IS NULL OR p.ends_at > ?)
  ORDER BY p.starts_at DESC, p.name ASC
`

const COLORS_QUERY = `
  SELECT
    color.id,
    color.product_id,
    color.name,
    color.hex_code,
    color.image_url,
    color.sort_order,
    color.is_active,
    color.created_at,
    color.updated_at
  FROM product_colors AS color
  INNER JOIN products AS product ON product.id = color.product_id
  WHERE color.is_active = ? AND product.is_active = ?
  ORDER BY color.product_id ASC, color.sort_order ASC, color.created_at ASC
`

const VARIANTS_QUERY = `
  SELECT
    variant.id,
    variant.product_id,
    variant.color_id,
    variant.sku,
    variant.size,
    variant.stock_quantity,
    variant.is_active,
    variant.created_at,
    variant.updated_at
  FROM product_variants AS variant
  INNER JOIN products AS product ON product.id = variant.product_id
  LEFT JOIN product_colors AS color
    ON color.id = variant.color_id AND color.product_id = variant.product_id
  WHERE variant.is_active = ?
    AND product.is_active = ?
    AND (variant.color_id IS NULL OR color.is_active = ?)
  ORDER BY variant.product_id ASC, variant.color_id ASC, variant.size ASC
`

function unavailableCatalog(): CatalogResult {
  return {
    products: [],
    categories: [],
    promotions: [],
    source: "unavailable",
  }
}

type DatabaseRow = Record<string, unknown>

function rowRecord(value: unknown): DatabaseRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Invalid D1 row")
  }
  return value as DatabaseRow
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("Invalid D1 string")
  }
  return value
}

function nullableString(value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== "string") throw new TypeError("Invalid D1 string")
  return value
}

function requiredNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError("Invalid D1 number")
  }
  return value
}

function nullableNumber(value: unknown): number | null {
  if (value === null) return null
  return requiredNumber(value)
}

function nullableStock(value: unknown): number | null {
  const stock = nullableNumber(value)
  if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
    throw new TypeError("Invalid D1 stock quantity")
  }
  return stock
}

function sqliteBoolean(value: unknown): boolean {
  if (value !== 0 && value !== 1) throw new TypeError("Invalid D1 boolean")
  return value === 1
}

function stringArrayJson(value: unknown): string[] {
  const parsed: unknown = JSON.parse(requiredString(value))
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new TypeError("Invalid D1 JSON string array")
  }
  return parsed
}

function normalizeCategory(value: unknown, prefix = ""): Category {
  const row = rowRecord(value)
  return {
    id: requiredString(row[`${prefix}id`]),
    name: requiredString(row[`${prefix}name`]),
    slug: requiredString(row[`${prefix}slug`]),
    size_system: requiredString(row[`${prefix}size_system`]) as Category["size_system"],
    description: nullableString(row[`${prefix}description`]),
    image_url: nullableString(row[`${prefix}image_url`]),
    sort_order: requiredNumber(row[`${prefix}sort_order`]),
    is_active: sqliteBoolean(row[`${prefix}is_active`]),
    created_at: requiredString(row[`${prefix}created_at`]),
    updated_at: requiredString(row[`${prefix}updated_at`]),
  }
}

function normalizeProduct(
  value: unknown,
  colors: ProductColor[],
  variants: ProductVariant[],
): Product {
  const row = rowRecord(value)
  const category = row.category_row_id === null
    ? null
    : normalizeCategory({
        category_id: row.category_row_id,
        category_name: row.category_name,
        category_slug: row.category_slug,
        category_size_system: row.category_size_system,
        category_description: row.category_description,
        category_image_url: row.category_image_url,
        category_sort_order: row.category_sort_order,
        category_is_active: row.category_is_active,
        category_created_at: row.category_created_at,
        category_updated_at: row.category_updated_at,
      }, "category_")

  const priceCents = nullableNumber(row.price_cents)
  return {
    id: requiredString(row.id),
    category_id: nullableString(row.category_id),
    name: requiredString(row.name),
    description: nullableString(row.description),
    price: priceCents === null ? null : priceCents / 100,
    image_url: nullableString(row.image_url),
    additional_images: stringArrayJson(row.additional_images_json),
    sizes: stringArrayJson(row.sizes_json),
    fit_advice: nullableString(row.fit_advice) as Product["fit_advice"],
    materials: nullableString(row.materials),
    heel_height_cm: nullableNumber(row.heel_height_cm),
    model_note: nullableString(row.model_note),
    is_featured: sqliteBoolean(row.is_featured),
    is_active: sqliteBoolean(row.is_active),
    sort_order: requiredNumber(row.sort_order),
    created_at: requiredString(row.created_at),
    updated_at: requiredString(row.updated_at),
    category,
    colors,
    variants,
    inventory_tracked: sqliteBoolean(row.inventory_tracked),
  }
}

function normalizeColor(value: unknown): ProductColor {
  const row = rowRecord(value)
  const hexCode = requiredString(row.hex_code)
  if (!/^#[0-9a-f]{6}$/i.test(hexCode)) {
    throw new TypeError("Invalid D1 color hex code")
  }

  return {
    id: requiredString(row.id),
    product_id: requiredString(row.product_id),
    name: requiredString(row.name),
    hex_code: hexCode.toUpperCase(),
    image_url: nullableString(row.image_url),
    sort_order: requiredNumber(row.sort_order),
    is_active: sqliteBoolean(row.is_active),
    created_at: requiredString(row.created_at),
    updated_at: requiredString(row.updated_at),
  }
}

function normalizeVariant(value: unknown): ProductVariant {
  const row = rowRecord(value)
  const stockQuantity = nullableStock(row.stock_quantity)
  return {
    id: requiredString(row.id),
    product_id: requiredString(row.product_id),
    color_id: nullableString(row.color_id),
    sku: nullableString(row.sku),
    size: nullableString(row.size),
    stock_quantity: stockQuantity,
    in_stock: stockQuantity === null || stockQuantity > 0,
    is_active: sqliteBoolean(row.is_active),
    created_at: requiredString(row.created_at),
    updated_at: requiredString(row.updated_at),
  }
}

function groupByProduct<T extends { product_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const row of rows) {
    const group = grouped.get(row.product_id) ?? []
    group.push(row)
    grouped.set(row.product_id, group)
  }
  return grouped
}

function normalizePromotion(value: unknown): Promotion {
  const row = rowRecord(value)
  const basisPoints = nullableNumber(row.discount_basis_points)
  return {
    id: requiredString(row.id),
    name: requiredString(row.name),
    description: nullableString(row.description),
    campaign_type: requiredString(row.campaign_type) as Promotion["campaign_type"],
    scope: requiredString(row.scope) as Promotion["scope"],
    category_id: nullableString(row.category_id),
    discount_percent: basisPoints === null ? null : basisPoints / 100,
    starts_at: requiredString(row.starts_at),
    ends_at: nullableString(row.ends_at),
    is_active: sqliteBoolean(row.is_active),
    created_at: requiredString(row.created_at),
    updated_at: requiredString(row.updated_at),
    category: row.category_row_id === null
      ? null
      : {
          id: requiredString(row.category_row_id),
          name: requiredString(row.category_name),
        },
  }
}

/**
 * One request-scoped catalog read shared by metadata and page rendering.
 * A missing binding, failed query, or malformed row fails closed rather than
 * substituting merchandise that was not read from the production database.
 */
export const getCatalog = cache(async (): Promise<CatalogResult> => {
  const database = await getD1Database()
  if (!database) return unavailableCatalog()

  try {
    const now = new Date().toISOString()
    const [
      productResult,
      categoryResult,
      promotionResult,
      colorResult,
      variantResult,
    ] = await database.batch([
      database.prepare(PRODUCTS_QUERY).bind(1),
      database.prepare(CATEGORIES_QUERY).bind(1),
      database.prepare(PROMOTIONS_QUERY).bind(1, now, now),
      database.prepare(COLORS_QUERY).bind(1, 1),
      database.prepare(VARIANTS_QUERY).bind(1, 1, 1),
    ])

    if (
      !productResult.success ||
      !categoryResult.success ||
      !promotionResult.success ||
      !colorResult.success ||
      !variantResult.success
    ) {
      return unavailableCatalog()
    }

    const colors = colorResult.results.map(normalizeColor)
    const variants = variantResult.results.map(normalizeVariant)
    const colorsByProduct = groupByProduct(colors)
    const variantsByProduct = groupByProduct(variants)
    const products = productResult.results.map((row: unknown) => {
      const record = rowRecord(row)
      const productId = requiredString(record.id)
      return normalizeProduct(
        record,
        colorsByProduct.get(productId) ?? [],
        variantsByProduct.get(productId) ?? [],
      )
    })
    const categories = categoryResult.results.map((row: unknown) => normalizeCategory(row))
    const promotions = promotionResult.results.map(normalizePromotion)

    return {
      products: applyPromotions(products, promotions),
      categories,
      promotions,
      source: "live",
    }
  } catch {
    return unavailableCatalog()
  }
})
