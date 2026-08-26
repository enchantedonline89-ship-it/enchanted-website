import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import { createProduct, listAdminCategories, validateProductInput } from '@/lib/admin-catalog'
import { catalogActor, catalogTraceId } from '@/lib/admin-catalog-route'
import { parseProductCsv } from '@/lib/product-csv'

const MAX_CSV_BYTES = 256_000

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request)
  if (!authorization.ok) return authorization.error
  if (Number(request.headers.get('content-length') ?? 0) > MAX_CSV_BYTES) {
    return NextResponse.json({ error: 'Keep CSV files under 256 KB.' }, { status: 413 })
  }

  const text = await request.text()
  if (!text || new TextEncoder().encode(text).byteLength > MAX_CSV_BYTES) {
    return NextResponse.json({ error: 'Keep CSV files under 256 KB.' }, { status: 413 })
  }

  let rows
  try {
    rows = parseProductCsv(text)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The CSV is invalid.' }, { status: 400 })
  }

  const categories = await listAdminCategories(authorization.db)
  const categoryByName = new Map(categories.flatMap((category) => [
    [category.name.toLowerCase(), category.id] as const,
    [category.slug.toLowerCase(), category.id] as const,
  ]))
  const errors: Array<{ row: number; error: string }> = []
  let imported = 0

  for (const [index, row] of rows.entries()) {
    const sizes = row.sizes ? row.sizes.split('|').map((value) => value.trim()).filter(Boolean) : []
    const stocks = row.stock ? row.stock.split('|').map((value) => value.trim()) : []
    if (stocks.length > 1 && stocks.length !== sizes.length) {
      errors.push({ row: index + 2, error: 'Stock values must match the pipe-separated sizes.' })
      continue
    }
    const category = row.category ? categoryByName.get(row.category.toLowerCase()) : null
    if (row.category && !category) {
      errors.push({ row: index + 2, error: `Category “${row.category}” does not exist.` })
      continue
    }
    const optionSizes: Array<string | null> = sizes.length ? sizes : [null]
    const variants = optionSizes.map((size, optionIndex) => {
      const rawStock = stocks.length > 1 ? stocks[optionIndex] : stocks[0]
      return {
        color_ref: null,
        size,
        sku: null,
        stock_quantity: rawStock ? Number(rawStock) : 0,
      }
    })
    const parsed = validateProductInput({
      name: row.name,
      description: row.description ?? '',
      category_id: category ?? null,
      sku: row.sku ?? '',
      price: row.price ?? '',
      image_url: row.image_url ?? '',
      additional_images: [],
      sizes,
      fit_advice: '',
      materials: '',
      heel_height_cm: '',
      model_note: '',
      is_featured: false,
      is_active: false,
      sort_order: index,
      colors: [],
      variants,
    })
    if (!parsed.ok) {
      errors.push({ row: index + 2, error: parsed.error })
      continue
    }
    try {
      await createProduct(
        authorization.db,
        parsed.value,
        catalogActor(authorization.user),
        catalogTraceId(request),
      )
      imported += 1
    } catch {
      errors.push({ row: index + 2, error: 'The name or SKU is already in use.' })
    }
  }

  if (imported) revalidatePath('/', 'layout')
  return NextResponse.json({ imported, errors }, { status: imported ? 201 : 400 })
}
