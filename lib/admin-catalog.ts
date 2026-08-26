import type {
  Category,
  FitAdvice,
  Product,
  ProductColor,
  ProductVariant,
  SizeSystem,
} from '@/types'
import type { getD1Database } from '@/lib/cloudflare/d1'
import { isCatalogMediaKey } from '@/lib/admin-catalog-media'
import { slugify } from '@/lib/utils'

export type CatalogDatabase = NonNullable<Awaited<ReturnType<typeof getD1Database>>>
type CatalogStatement = ReturnType<CatalogDatabase['prepare']>

export interface AdminActor {
  id: string
  email: string
}

export interface AdminCategory extends Category {
  image_key: string | null
  size_system: SizeSystem
}

export interface AdminProduct extends Product {
  slug: string
  sku: string | null
  image_key: string | null
}

export interface CategoryInput {
  name: string
  description: string | null
  image_url: string | null
  size_system: SizeSystem
  sort_order: number
  is_active: boolean
}

export interface ProductColorInput {
  id: string | null
  ref: string
  name: string
  hex_code: string
  image_url: string | null
  sort_order: number
}

export interface ProductVariantInput {
  color_ref: string | null
  size: string | null
  sku: string | null
  stock_quantity: number | null
}

export interface ProductInput {
  name: string
  description: string | null
  category_id: string | null
  sku: string | null
  price_cents: number | null
  image_url: string | null
  additional_images: string[]
  sizes: string[]
  fit_advice: FitAdvice | null
  materials: string | null
  heel_height_cm: number | null
  model_note: string | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  colors: ProductColorInput[]
  variants: ProductVariantInput[]
}

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HEX_PATTERN = /^#[0-9A-F]{6}$/
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{0,59}$/
const COLOR_REF_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const SIZE_SYSTEMS = new Set<SizeSystem>(['eu_footwear', 'letter_clothing', 'none'])
const FIT_ADVICE = new Set<FitAdvice>(['true_to_size', 'size_up', 'size_down'])

export function isCatalogId(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function trimmedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length <= max ? text : null
}

function optionalText(value: unknown, max: number): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null }
  const text = trimmedString(value, max)
  if (text === null) return { ok: false, error: `Text must be ${max} characters or fewer.` }
  return { ok: true, value: text || null }
}

function imageUrl(value: unknown): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null }
  const text = trimmedString(value, 2048)
  if (!text) return { ok: false, error: 'Image URL is invalid.' }
  if (text.startsWith('/media/')) {
    const key = text.slice('/media/'.length)
    return isCatalogMediaKey(key)
      ? { ok: true, value: `/media/${key}` }
      : { ok: false, error: 'Image URL is invalid.' }
  }
  if (text.startsWith('/api/admin/media?')) {
    try {
      const url = new URL(text, 'https://catalog.invalid')
      const key = url.searchParams.get('key') ?? ''
      if (url.pathname === '/api/admin/media' && url.searchParams.size === 1 && isCatalogMediaKey(key)) {
        return { ok: true, value: `${url.pathname}?${url.searchParams.toString()}` }
      }
    } catch {
      // Fall through to the bounded validation error below.
    }
    return { ok: false, error: 'Image URL is invalid.' }
  }
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:') return { ok: false, error: 'Image URLs must use HTTPS.' }
    return { ok: true, value: url.toString() }
  } catch {
    return { ok: false, error: 'Image URL is invalid.' }
  }
}

function mediaKeyFromImageUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value, 'https://catalog.invalid')
    const key = url.pathname.startsWith('/media/')
      ? url.pathname.slice('/media/'.length)
      : url.pathname === '/api/admin/media'
        ? url.searchParams.get('key') ?? ''
        : ''
    return isCatalogMediaKey(key) ? key : null
  } catch {
    return null
  }
}

function sortOrder(value: unknown): ValidationResult<number> {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100_000) {
    return { ok: false, error: 'Sort order must be a whole number from 0 to 100000.' }
  }
  return { ok: true, value: value as number }
}

function booleanField(value: unknown, label: string): ValidationResult<boolean> {
  return typeof value === 'boolean'
    ? { ok: true, value }
    : { ok: false, error: `${label} must be true or false.` }
}

function normalizeSku(value: unknown): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null }
  if (typeof value !== 'string') return { ok: false, error: 'SKU is invalid.' }
  const sku = value.trim().toUpperCase()
  return SKU_PATTERN.test(sku)
    ? { ok: true, value: sku }
    : { ok: false, error: 'SKU may use letters, numbers, dots, dashes, slashes, and underscores.' }
}

function normalizePrice(value: unknown): ValidationResult<number | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null }
  const text = typeof value === 'number' ? value.toString() : typeof value === 'string' ? value.trim() : ''
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(text)) {
    return { ok: false, error: 'Price must be non-negative with no more than two decimal places.' }
  }
  const [whole, fraction = ''] = text.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents)
    ? { ok: true, value: cents }
    : { ok: false, error: 'Price is too large.' }
}

export function validateCategoryInput(input: unknown): ValidationResult<CategoryInput> {
  if (!isRecord(input)) return { ok: false, error: 'Category body must be an object.' }

  const name = trimmedString(input.name, 100)
  if (!name || name.length < 2) return { ok: false, error: 'Category name must be 2 to 100 characters.' }
  const description = optionalText(input.description, 1000)
  if (!description.ok) return description
  const image = imageUrl(input.image_url)
  if (!image.ok) return image
  if (typeof input.size_system !== 'string' || !SIZE_SYSTEMS.has(input.size_system as SizeSystem)) {
    return { ok: false, error: 'Choose a valid size system.' }
  }
  const order = sortOrder(input.sort_order)
  if (!order.ok) return order
  const active = booleanField(input.is_active, 'Active')
  if (!active.ok) return active

  return {
    ok: true,
    value: {
      name,
      description: description.value,
      image_url: image.value,
      size_system: input.size_system as SizeSystem,
      sort_order: order.value,
      is_active: active.value,
    },
  }
}

export function validateProductInput(input: unknown): ValidationResult<ProductInput> {
  if (!isRecord(input)) return { ok: false, error: 'Product body must be an object.' }

  const name = trimmedString(input.name, 180)
  if (!name || name.length < 2) return { ok: false, error: 'Product name must be 2 to 180 characters.' }
  const description = optionalText(input.description, 5000)
  if (!description.ok) return description
  const materials = optionalText(input.materials, 500)
  if (!materials.ok) return materials
  const modelNote = optionalText(input.model_note, 500)
  if (!modelNote.ok) return modelNote
  const cover = imageUrl(input.image_url)
  if (!cover.ok) return cover
  const sku = normalizeSku(input.sku)
  if (!sku.ok) return sku
  const price = normalizePrice(input.price)
  if (!price.ok) return price
  const order = sortOrder(input.sort_order)
  if (!order.ok) return order
  const featured = booleanField(input.is_featured, 'Featured')
  if (!featured.ok) return featured
  const active = booleanField(input.is_active, 'Active')
  if (!active.ok) return active

  let categoryId: string | null = null
  if (input.category_id !== undefined && input.category_id !== null && input.category_id !== '') {
    if (typeof input.category_id !== 'string' || !isCatalogId(input.category_id)) {
      return { ok: false, error: 'Category ID is invalid.' }
    }
    categoryId = input.category_id
  }

  let fitAdvice: FitAdvice | null = null
  if (input.fit_advice !== undefined && input.fit_advice !== null && input.fit_advice !== '') {
    if (typeof input.fit_advice !== 'string' || !FIT_ADVICE.has(input.fit_advice as FitAdvice)) {
      return { ok: false, error: 'Fit advice is invalid.' }
    }
    fitAdvice = input.fit_advice as FitAdvice
  }

  let heelHeight: number | null = null
  if (input.heel_height_cm !== undefined && input.heel_height_cm !== null && input.heel_height_cm !== '') {
    const parsed = typeof input.heel_height_cm === 'number'
      ? input.heel_height_cm
      : Number(input.heel_height_cm)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      return { ok: false, error: 'Heel height must be between 0 and 100 cm.' }
    }
    heelHeight = Math.round(parsed * 10) / 10
  }

  if (!Array.isArray(input.additional_images) || input.additional_images.length > 8) {
    return { ok: false, error: 'Use no more than 8 additional images.' }
  }
  const additionalImages: string[] = []
  for (const item of input.additional_images) {
    const parsed = imageUrl(item)
    if (!parsed.ok || !parsed.value) return { ok: false, error: 'An additional image URL is invalid.' }
    if (!additionalImages.includes(parsed.value)) additionalImages.push(parsed.value)
  }

  if (!Array.isArray(input.sizes) || input.sizes.length > 40) {
    return { ok: false, error: 'Use no more than 40 sizes.' }
  }
  const sizes: string[] = []
  for (const item of input.sizes) {
    const size = trimmedString(item, 20)
    if (!size) return { ok: false, error: 'Every size must be 1 to 20 characters.' }
    if (!sizes.includes(size)) sizes.push(size)
  }

  if (!Array.isArray(input.colors) || input.colors.length > 12) {
    return { ok: false, error: 'Use no more than 12 colors.' }
  }
  const colors: ProductColorInput[] = []
  const refs = new Set<string>()
  const colorNames = new Set<string>()
  const colorHexes = new Set<string>()
  for (const item of input.colors) {
    if (!isRecord(item)) return { ok: false, error: 'Color entry is invalid.' }
    if (typeof item.ref !== 'string' || !COLOR_REF_PATTERN.test(item.ref)) {
      return { ok: false, error: 'Color reference is invalid.' }
    }
    if (refs.has(item.ref)) return { ok: false, error: 'Color references must be unique.' }
    refs.add(item.ref)
    const colorName = trimmedString(item.name, 60)
    if (!colorName) return { ok: false, error: 'Every color needs a name.' }
    const nameKey = colorName.toLocaleLowerCase('en-US')
    if (colorNames.has(nameKey)) return { ok: false, error: 'Color names must be unique.' }
    colorNames.add(nameKey)
    if (typeof item.hex_code !== 'string') return { ok: false, error: 'Color hex code is invalid.' }
    const hex = item.hex_code.trim().toUpperCase()
    if (!HEX_PATTERN.test(hex)) return { ok: false, error: 'Color hex code must use #RRGGBB.' }
    if (colorHexes.has(hex)) return { ok: false, error: 'Color hex codes must be unique.' }
    colorHexes.add(hex)
    const colorImage = imageUrl(item.image_url)
    if (!colorImage.ok) return { ok: false, error: `Image for ${colorName} is invalid.` }
    const colorOrder = sortOrder(item.sort_order)
    if (!colorOrder.ok) return { ok: false, error: `Sort order for ${colorName} is invalid.` }
    let id: string | null = null
    if (item.id !== undefined && item.id !== null && item.id !== '') {
      if (typeof item.id !== 'string' || !isCatalogId(item.id)) {
        return { ok: false, error: `Color ID for ${colorName} is invalid.` }
      }
      id = item.id
    }
    colors.push({
      id,
      ref: item.ref,
      name: colorName,
      hex_code: hex,
      image_url: colorImage.value,
      sort_order: colorOrder.value,
    })
  }

  if (!Array.isArray(input.variants) || input.variants.length > 500) {
    return { ok: false, error: 'Use no more than 500 stock variants.' }
  }
  const variants: ProductVariantInput[] = []
  const optionKeys = new Set<string>()
  const variantSkus = new Set<string>()
  for (const item of input.variants) {
    if (!isRecord(item)) return { ok: false, error: 'Stock variant is invalid.' }
    let colorRef: string | null = null
    if (item.color_ref !== undefined && item.color_ref !== null && item.color_ref !== '') {
      if (typeof item.color_ref !== 'string' || !refs.has(item.color_ref)) {
        return { ok: false, error: 'Stock variant references an unknown color.' }
      }
      colorRef = item.color_ref
    }
    let size: string | null = null
    if (item.size !== undefined && item.size !== null && item.size !== '') {
      if (typeof item.size !== 'string' || !sizes.includes(item.size)) {
        return { ok: false, error: 'Stock variant references an unknown size.' }
      }
      size = item.size
    }
    const optionKey = `${colorRef ?? ''}\u0000${size ?? ''}`
    if (optionKeys.has(optionKey)) return { ok: false, error: 'Each color and size stock option must be unique.' }
    optionKeys.add(optionKey)
    const variantSku = normalizeSku(item.sku)
    if (!variantSku.ok) return variantSku
    if (variantSku.value && variantSkus.has(variantSku.value)) {
      return { ok: false, error: 'Variant SKUs must be unique.' }
    }
    if (variantSku.value) variantSkus.add(variantSku.value)
    let stock: number | null = null
    if (item.stock_quantity !== undefined && item.stock_quantity !== null && item.stock_quantity !== '') {
      if (!Number.isInteger(item.stock_quantity) || (item.stock_quantity as number) < 0 || (item.stock_quantity as number) > 1_000_000) {
        return { ok: false, error: 'Stock must be a whole number from 0 to 1000000.' }
      }
      stock = item.stock_quantity as number
    }
    variants.push({ color_ref: colorRef, size, sku: variantSku.value, stock_quantity: stock })
  }

  if (active.value) {
    if (price.value === null) return { ok: false, error: 'Add a price before making this product active.' }
    if (!categoryId) return { ok: false, error: 'Choose a category before making this product active.' }
    if (!cover.value) return { ok: false, error: 'Add a cover photo before making this product active.' }
    if (!variants.some((variant) => variant.stock_quantity === null || variant.stock_quantity > 0)) {
      return { ok: false, error: 'Add at least one in-stock option before making this product active.' }
    }
  }

  return {
    ok: true,
    value: {
      name,
      description: description.value,
      category_id: categoryId,
      sku: sku.value,
      price_cents: price.value,
      image_url: cover.value,
      additional_images: additionalImages,
      sizes,
      fit_advice: fitAdvice,
      materials: materials.value,
      heel_height_cm: heelHeight,
      model_note: modelNote.value,
      is_featured: featured.value,
      is_active: active.value,
      sort_order: order.value,
      colors,
      variants,
    },
  }
}

interface CategoryRow {
  id: string
  name: string
  slug: string
  size_system: SizeSystem
  description: string | null
  image_key: string | null
  image_url: string | null
  sort_order: number
  is_active: number
  created_at: string
  updated_at: string
}

interface ProductRow {
  id: string
  category_id: string | null
  slug: string
  sku: string | null
  name: string
  description: string | null
  price_cents: number | null
  image_key: string | null
  image_url: string | null
  additional_images_json: string
  sizes_json: string
  fit_advice: FitAdvice | null
  materials: string | null
  heel_height_cm: number | null
  model_note: string | null
  is_featured: number
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string
  category_name?: string | null
  category_slug?: string | null
}

interface ColorRow {
  id: string
  product_id: string
  name: string
  hex_code: string
  image_url: string | null
  sort_order: number
  is_active: number
  created_at: string
  updated_at: string
}

interface VariantRow {
  id: string
  product_id: string
  color_id: string | null
  sku: string | null
  size: string | null
  stock_quantity: number | null
  is_active: number
  created_at: string
  updated_at: string
}

function parseStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : []
  } catch {
    return []
  }
}

function mapCategory(row: CategoryRow): AdminCategory {
  return { ...row, is_active: row.is_active === 1 }
}

function mapProduct(row: ProductRow): AdminProduct {
  return {
    id: row.id,
    category_id: row.category_id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    description: row.description,
    price: row.price_cents === null ? null : row.price_cents / 100,
    image_key: row.image_key,
    image_url: row.image_url,
    additional_images: parseStringArray(row.additional_images_json),
    sizes: parseStringArray(row.sizes_json),
    fit_advice: row.fit_advice,
    materials: row.materials,
    heel_height_cm: row.heel_height_cm,
    model_note: row.model_note,
    is_featured: row.is_featured === 1,
    is_active: row.is_active === 1,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category: row.category_id && row.category_name
      ? {
          id: row.category_id,
          name: row.category_name,
          slug: row.category_slug ?? '',
          description: null,
          image_url: null,
          sort_order: 0,
          is_active: true,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }
      : null,
  }
}

function mapColor(row: ColorRow): ProductColor {
  return { ...row, is_active: row.is_active === 1 }
}

function mapVariant(row: VariantRow): ProductVariant {
  return {
    ...row,
    is_active: row.is_active === 1,
    in_stock: row.is_active === 1 && (row.stock_quantity === null || row.stock_quantity > 0),
  }
}

export async function listAdminCategories(
  db: CatalogDatabase,
  options: { activeOnly?: boolean } = {},
): Promise<AdminCategory[]> {
  const where = options.activeOnly ? 'WHERE is_active = 1' : ''
  const result = await db.prepare(`
    SELECT id, name, slug, size_system, description, image_key, image_url,
           sort_order, is_active, created_at, updated_at
    FROM categories ${where}
    ORDER BY sort_order ASC, created_at DESC
  `).all<CategoryRow>()
  return (result.results ?? []).map(mapCategory)
}

export async function getAdminCategory(db: CatalogDatabase, id: string): Promise<AdminCategory | null> {
  if (!isCatalogId(id)) return null
  const row = await db.prepare(`
    SELECT id, name, slug, size_system, description, image_key, image_url,
           sort_order, is_active, created_at, updated_at
    FROM categories WHERE id = ? LIMIT 1
  `).bind(id).first<CategoryRow>()
  return row ? mapCategory(row) : null
}

const PRODUCT_SELECT = `
  SELECT p.id, p.category_id, p.slug, p.sku, p.name, p.description,
         p.price_cents, p.image_key, p.image_url, p.additional_images_json,
         p.sizes_json, p.fit_advice, p.materials, p.heel_height_cm,
         p.model_note, p.is_featured, p.is_active, p.sort_order,
         p.created_at, p.updated_at, c.name AS category_name,
         c.slug AS category_slug
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`

export async function listAdminProducts(db: CatalogDatabase): Promise<AdminProduct[]> {
  const result = await db.prepare(`${PRODUCT_SELECT}
    ORDER BY p.sort_order ASC, p.created_at DESC
  `).all<ProductRow>()
  return (result.results ?? []).map(mapProduct)
}

export async function getAdminProduct(db: CatalogDatabase, id: string): Promise<AdminProduct | null> {
  if (!isCatalogId(id)) return null
  const row = await db.prepare(`${PRODUCT_SELECT} WHERE p.id = ? LIMIT 1`).bind(id).first<ProductRow>()
  if (!row) return null
  const [colorsResult, variantsResult] = await Promise.all([
    db.prepare(`
      SELECT id, product_id, name, hex_code, image_url, sort_order, is_active,
             created_at, updated_at
      FROM product_colors WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC
    `).bind(id).all<ColorRow>(),
    db.prepare(`
      SELECT id, product_id, color_id, sku, size, stock_quantity, is_active,
             created_at, updated_at
      FROM product_variants WHERE product_id = ? ORDER BY size ASC, created_at ASC
    `).bind(id).all<VariantRow>(),
  ])
  return {
    ...mapProduct(row),
    colors: (colorsResult.results ?? []).map(mapColor),
    variants: (variantsResult.results ?? []).map(mapVariant),
    inventory_tracked: (variantsResult.results ?? []).some(variant => variant.is_active === 1),
  }
}

function requestId(value?: string | null): string {
  const safe = value?.trim().slice(0, 120)
  return safe || crypto.randomUUID()
}

function auditStatement(
  db: CatalogDatabase,
  actor: AdminActor,
  action: string,
  entityType: 'category' | 'product',
  entityId: string,
  entityName: string,
  changes: unknown,
  traceId?: string | null,
): CatalogStatement {
  return db.prepare(`
    INSERT INTO admin_audit_logs (
      id, admin_user_id, admin_email, action, entity_type, entity_id,
      entity_name, changes_json, request_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    actor.id,
    actor.email,
    action,
    entityType,
    entityId,
    entityName,
    JSON.stringify(changes),
    requestId(traceId),
  )
}

export class CatalogMutationError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'CONFLICT' | 'CATEGORY_NOT_FOUND') {
    super(code)
    this.name = 'CatalogMutationError'
  }
}

function isConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /unique|constraint/i.test(message)
}

export async function createCategory(
  db: CatalogDatabase,
  input: CategoryInput,
  actor: AdminActor,
  traceId?: string | null,
): Promise<AdminCategory> {
  const id = crypto.randomUUID()
  const slug = slugify(input.name)
  const snapshot = { id, slug, ...input }
  try {
    await db.batch([
      db.prepare(`
        INSERT INTO categories (
          id, name, slug, size_system, description, image_key, image_url, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, input.name, slug, input.size_system, input.description,
        mediaKeyFromImageUrl(input.image_url), input.image_url, input.sort_order, input.is_active ? 1 : 0,
      ),
      auditStatement(db, actor, 'CREATE', 'category', id, input.name, { before: null, after: snapshot }, traceId),
    ])
  } catch (error) {
    if (isConstraintError(error)) throw new CatalogMutationError('CONFLICT')
    throw error
  }
  const created = await getAdminCategory(db, id)
  if (!created) throw new Error('Created category could not be read back.')
  return created
}

export async function updateCategory(
  db: CatalogDatabase,
  id: string,
  input: CategoryInput,
  actor: AdminActor,
  traceId?: string | null,
): Promise<AdminCategory> {
  const before = await getAdminCategory(db, id)
  if (!before) throw new CatalogMutationError('NOT_FOUND')
  const after = { ...before, ...input, slug: before.slug }
  try {
    await db.batch([
      db.prepare(`
        UPDATE categories
        SET name = ?, size_system = ?, description = ?, image_key = ?, image_url = ?, sort_order = ?,
            is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        input.name, input.size_system, input.description, mediaKeyFromImageUrl(input.image_url), input.image_url,
        input.sort_order, input.is_active ? 1 : 0, id,
      ),
      auditStatement(db, actor, 'UPDATE', 'category', id, input.name, { before, after }, traceId),
    ])
  } catch (error) {
    if (isConstraintError(error)) throw new CatalogMutationError('CONFLICT')
    throw error
  }
  const updated = await getAdminCategory(db, id)
  if (!updated) throw new CatalogMutationError('NOT_FOUND')
  return updated
}

export async function deactivateCategory(
  db: CatalogDatabase,
  id: string,
  actor: AdminActor,
  traceId?: string | null,
): Promise<void> {
  const before = await getAdminCategory(db, id)
  if (!before) throw new CatalogMutationError('NOT_FOUND')
  await db.batch([
    db.prepare(`
      UPDATE categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(id),
    auditStatement(
      db, actor, 'DEACTIVATE', 'category', id, before.name,
      { before, after: { ...before, is_active: false } }, traceId,
    ),
  ])
}

async function assertCategoryExists(db: CatalogDatabase, categoryId: string | null): Promise<void> {
  if (!categoryId) return
  const row = await db.prepare('SELECT id FROM categories WHERE id = ? LIMIT 1').bind(categoryId).first<{ id: string }>()
  if (!row) throw new CatalogMutationError('CATEGORY_NOT_FOUND')
}

async function existingOptions(db: CatalogDatabase, productId: string) {
  const [colors, variants] = await Promise.all([
    db.prepare('SELECT id, name, hex_code FROM product_colors WHERE product_id = ?')
      .bind(productId).all<{ id: string; name: string; hex_code: string }>(),
    db.prepare('SELECT id, color_id, size FROM product_variants WHERE product_id = ?')
      .bind(productId).all<{ id: string; color_id: string | null; size: string | null }>(),
  ])
  return { colors: colors.results ?? [], variants: variants.results ?? [] }
}

function productOptionStatements(
  db: CatalogDatabase,
  productId: string,
  input: ProductInput,
  existing: Awaited<ReturnType<typeof existingOptions>>,
): CatalogStatement[] {
  const statements: CatalogStatement[] = [
    db.prepare('UPDATE product_variants SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?').bind(productId),
    db.prepare('UPDATE product_colors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?').bind(productId),
  ]
  const existingColorIds = new Set(existing.colors.map(color => color.id))
  const colorByIdentity = new Map<string, string>()
  for (const color of existing.colors) {
    colorByIdentity.set(`name:${color.name.toLocaleLowerCase('en-US')}`, color.id)
    colorByIdentity.set(`hex:${color.hex_code.toUpperCase()}`, color.id)
  }
  const colorIds = new Map<string, string>()
  for (const color of input.colors) {
    const id = color.id && existingColorIds.has(color.id)
      ? color.id
      : colorByIdentity.get(`name:${color.name.toLocaleLowerCase('en-US')}`)
        ?? colorByIdentity.get(`hex:${color.hex_code}`)
        ?? crypto.randomUUID()
    colorIds.set(color.ref, id)
    statements.push(db.prepare(`
      INSERT INTO product_colors (
        id, product_id, name, hex_code, image_key, image_url, sort_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        hex_code = excluded.hex_code,
        image_key = excluded.image_key,
        image_url = excluded.image_url,
        sort_order = excluded.sort_order,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE product_colors.product_id = excluded.product_id
    `).bind(
      id, productId, color.name, color.hex_code,
      mediaKeyFromImageUrl(color.image_url), color.image_url, color.sort_order,
    ))
  }

  const variantsByOption = new Map(
    existing.variants.map(variant => [`${variant.color_id ?? ''}\u0000${variant.size ?? ''}`, variant.id]),
  )
  for (const variant of input.variants) {
    const colorId = variant.color_ref ? colorIds.get(variant.color_ref) ?? null : null
    const key = `${colorId ?? ''}\u0000${variant.size ?? ''}`
    const id = variantsByOption.get(key) ?? crypto.randomUUID()
    statements.push(db.prepare(`
      INSERT INTO product_variants (
        id, product_id, color_id, sku, size, stock_quantity, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        color_id = excluded.color_id,
        sku = excluded.sku,
        size = excluded.size,
        stock_quantity = excluded.stock_quantity,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE product_variants.product_id = excluded.product_id
    `).bind(id, productId, colorId, variant.sku, variant.size, variant.stock_quantity))
  }
  return statements
}

function productSnapshot(id: string, slug: string, input: ProductInput) {
  return {
    id,
    slug,
    ...input,
    price: input.price_cents === null ? null : input.price_cents / 100,
  }
}

export async function createProduct(
  db: CatalogDatabase,
  input: ProductInput,
  actor: AdminActor,
  traceId?: string | null,
): Promise<AdminProduct> {
  await assertCategoryExists(db, input.category_id)
  const id = crypto.randomUUID()
  const slug = slugify(input.name)
  const statements: CatalogStatement[] = [
    db.prepare(`
      INSERT INTO products (
        id, category_id, slug, sku, name, description, price_cents, image_key, image_url,
        additional_images_json, sizes_json, fit_advice, materials, heel_height_cm,
        model_note, is_featured, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, input.category_id, slug, input.sku, input.name, input.description,
      input.price_cents, mediaKeyFromImageUrl(input.image_url), input.image_url, JSON.stringify(input.additional_images),
      JSON.stringify(input.sizes), input.fit_advice, input.materials,
      input.heel_height_cm, input.model_note, input.is_featured ? 1 : 0,
      input.is_active ? 1 : 0, input.sort_order,
    ),
    ...productOptionStatements(db, id, input, { colors: [], variants: [] }),
    auditStatement(
      db, actor, 'CREATE', 'product', id, input.name,
      { before: null, after: productSnapshot(id, slug, input) }, traceId,
    ),
  ]
  try {
    await db.batch(statements)
  } catch (error) {
    if (isConstraintError(error)) throw new CatalogMutationError('CONFLICT')
    throw error
  }
  const created = await getAdminProduct(db, id)
  if (!created) throw new Error('Created product could not be read back.')
  return created
}

export async function updateProduct(
  db: CatalogDatabase,
  id: string,
  input: ProductInput,
  actor: AdminActor,
  traceId?: string | null,
): Promise<AdminProduct> {
  const before = await getAdminProduct(db, id)
  if (!before) throw new CatalogMutationError('NOT_FOUND')
  await assertCategoryExists(db, input.category_id)
  const existing = await existingOptions(db, id)
  const statements: CatalogStatement[] = [
    db.prepare(`
      UPDATE products SET
        category_id = ?, sku = ?, name = ?, description = ?, price_cents = ?,
        image_key = ?, image_url = ?, additional_images_json = ?, sizes_json = ?, fit_advice = ?,
        materials = ?, heel_height_cm = ?, model_note = ?, is_featured = ?,
        is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      input.category_id, input.sku, input.name, input.description, input.price_cents,
      mediaKeyFromImageUrl(input.image_url), input.image_url, JSON.stringify(input.additional_images), JSON.stringify(input.sizes),
      input.fit_advice, input.materials, input.heel_height_cm, input.model_note,
      input.is_featured ? 1 : 0, input.is_active ? 1 : 0, input.sort_order, id,
    ),
    ...productOptionStatements(db, id, input, existing),
    auditStatement(
      db, actor, 'UPDATE', 'product', id, input.name,
      { before, after: productSnapshot(id, before.slug, input) }, traceId,
    ),
  ]
  try {
    await db.batch(statements)
  } catch (error) {
    if (isConstraintError(error)) throw new CatalogMutationError('CONFLICT')
    throw error
  }
  const updated = await getAdminProduct(db, id)
  if (!updated) throw new CatalogMutationError('NOT_FOUND')
  return updated
}

export async function deactivateProduct(
  db: CatalogDatabase,
  id: string,
  actor: AdminActor,
  traceId?: string | null,
): Promise<void> {
  const before = await getAdminProduct(db, id)
  if (!before) throw new CatalogMutationError('NOT_FOUND')
  await db.batch([
    db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id),
    auditStatement(
      db, actor, 'DEACTIVATE', 'product', id, before.name,
      { before, after: { ...before, is_active: false } }, traceId,
    ),
  ])
}
