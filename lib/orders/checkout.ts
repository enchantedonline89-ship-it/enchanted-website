export type SubmittedLine = {
  product_id: string
  variant_id: string | null
  size: string | null
  qty: number
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function checkoutIdempotencyKey(value: unknown): string | null {
  const key = text(value, 128)
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(key) ? key : null
}

export function parseSubmittedLines(value: unknown): SubmittedLine[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return null

  const lines = new Map<string, SubmittedLine>()
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) return null
    const item = raw as Record<string, unknown>
    const productId = text(item.product_id, 64)
    const variantId = text(item.variant_id, 64) || null
    const size = text(item.size, 30) || null
    const qty = Number(item.qty)
    if (!productId || !Number.isInteger(qty) || qty < 1 || qty > 20) return null

    const key = `${productId}\u0000${variantId ?? ''}\u0000${size ?? ''}`
    const existing = lines.get(key)
    const total = (existing?.qty ?? 0) + qty
    if (total > 20) return null
    lines.set(key, { product_id: productId, variant_id: variantId, size, qty: total })
  }

  return [...lines.values()]
}
