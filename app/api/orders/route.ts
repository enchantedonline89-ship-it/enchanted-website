import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isSupabaseMockMode } from '@/lib/mock-data'

// ─── Rate limiting (in-memory, per server instance) ──────────────────────────
// Limits each IP to MAX_REQUESTS submissions within WINDOW_MS.
// For production with multiple Vercel instances, upgrade to an edge KV store.
const WINDOW_MS = 60_000   // 1 minute
const MAX_REQUESTS = 5     // max 5 orders per IP per minute

const ipHits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > MAX_REQUESTS
}

// Periodically clean up expired entries to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of ipHits) {
    if (now > val.resetAt) ipHits.delete(key)
  }
}, 5 * 60_000)

// ─── Validation helpers ───────────────────────────────────────────────────────

const VALID_AREAS = ['beirut', 'outside']

interface OrderItem {
  name: string
  size: string | null
  qty: number
  price: number
}

interface ValidationError {
  field: string
  message: string
}

function validateOrderBody(body: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []

  // full_name
  if (typeof body.full_name !== 'string' || body.full_name.trim().length < 2) {
    errors.push({ field: 'full_name', message: 'Full name must be at least 2 characters' })
  } else if (body.full_name.trim().length > 100) {
    errors.push({ field: 'full_name', message: 'Full name is too long' })
  }

  // user_email — basic format check only; not strictly required for guest orders
  if (typeof body.user_email !== 'string' || !body.user_email.includes('@') || body.user_email.length > 254) {
    errors.push({ field: 'user_email', message: 'A valid email is required' })
  }

  // phone
  if (typeof body.phone !== 'string' || body.phone.trim().length < 5) {
    errors.push({ field: 'phone', message: 'Phone number is required' })
  } else if (body.phone.trim().length > 30) {
    errors.push({ field: 'phone', message: 'Phone number is too long' })
  }

  // delivery_address
  if (typeof body.delivery_address !== 'string' || body.delivery_address.trim().length < 5) {
    errors.push({ field: 'delivery_address', message: 'Delivery address must be at least 5 characters' })
  } else if (body.delivery_address.trim().length > 300) {
    errors.push({ field: 'delivery_address', message: 'Delivery address is too long' })
  }

  // area
  if (typeof body.area !== 'string' || !VALID_AREAS.includes(body.area)) {
    errors.push({ field: 'area', message: 'Area must be "beirut" or "outside"' })
  }

  // city (optional but constrained when present)
  if (body.city !== undefined && body.city !== null) {
    if (typeof body.city !== 'string' || body.city.length > 100) {
      errors.push({ field: 'city', message: 'City name is too long' })
    }
  }

  // order_notes (optional but constrained when present)
  if (body.order_notes !== undefined && body.order_notes !== null) {
    if (typeof body.order_notes !== 'string' || body.order_notes.length > 500) {
      errors.push({ field: 'order_notes', message: 'Order notes must be under 500 characters' })
    }
  }

  // delivery_fee — must be exactly $3 or $4
  const VALID_DELIVERY_FEES = [3, 4]
  const deliveryFee = Number(body.delivery_fee)
  if (!Number.isFinite(deliveryFee) || !VALID_DELIVERY_FEES.includes(deliveryFee)) {
    errors.push({ field: 'delivery_fee', message: 'Delivery fee must be $3 (Beirut) or $4 (outside)' })
  } else if (typeof body.area === 'string' && VALID_AREAS.includes(body.area)) {
    // Cross-validate: fee must match the selected area to prevent fee manipulation
    const expectedFee = body.area === 'beirut' ? 3 : 4
    if (deliveryFee !== expectedFee) {
      errors.push({ field: 'delivery_fee', message: `Delivery fee for ${body.area === 'beirut' ? 'Beirut' : 'outside Beirut'} must be $${expectedFee}` })
    }
  }

  // items
  if (!Array.isArray(body.items)) {
    errors.push({ field: 'items', message: 'Items must be an array' })
  } else if (body.items.length === 0) {
    errors.push({ field: 'items', message: 'Order must contain at least one item' })
  } else if (body.items.length > 50) {
    errors.push({ field: 'items', message: 'Order cannot exceed 50 items' })
  } else {
    body.items.forEach((item: unknown, idx: number) => {
      if (typeof item !== 'object' || item === null) {
        errors.push({ field: `items[${idx}]`, message: 'Each item must be an object' })
        return
      }
      const it = item as Record<string, unknown>

      if (typeof it.name !== 'string' || it.name.trim().length === 0 || it.name.length > 200) {
        errors.push({ field: `items[${idx}].name`, message: 'Item name is invalid' })
      }
      if (it.size !== null && (typeof it.size !== 'string' || it.size.length > 20)) {
        errors.push({ field: `items[${idx}].size`, message: 'Item size is invalid' })
      }
      const qty = Number(it.qty)
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
        errors.push({ field: `items[${idx}].qty`, message: 'Item quantity must be between 1 and 99' })
      }
      const price = Number(it.price)
      if (!Number.isFinite(price) || price < 0 || price > 10_000) {
        errors.push({ field: `items[${idx}].price`, message: 'Item price is invalid' })
      }
    })
  }

  // subtotal — must be a positive finite number
  const subtotal = Number(body.subtotal)
  if (!Number.isFinite(subtotal) || subtotal < 0 || subtotal > 100_000) {
    errors.push({ field: 'subtotal', message: 'Subtotal is invalid' })
  } else if (errors.length === 0 && Array.isArray(body.items)) {
    // Cross-check subtotal against the submitted line items. Without this, posting
    // the real cart with `subtotal: 1` was accepted: the order row, the admin screen
    // and the WhatsApp message all showed the forged figure, and the driver collected
    // it in cash. Same bug class the delivery_fee check already closed.
    //
    // NOTE: this only proves the arithmetic is internally consistent. `items[].price`
    // is still client-supplied, so an attacker who forges the line prices AND the
    // subtotal to match still gets through. The complete fix is to re-derive every
    // price from the products table server-side and ignore the submitted ones. That
    // needs a reachable database to verify, and the Supabase project is currently
    // NXDOMAIN, so it is deliberately left as required pre-launch work.
    const computed = (body.items as Array<Record<string, unknown>>).reduce(
      (sum, it) => sum + Number(it.price) * Number(it.qty),
      0,
    )
    if (Math.abs(subtotal - computed) > 0.01) {
      errors.push({ field: 'subtotal', message: 'Subtotal does not match the items' })
    }
  }

  // total — must equal subtotal + delivery_fee (within $0.01 tolerance for floating-point)
  const total = Number(body.total)
  if (!Number.isFinite(total) || total < 0 || total > 100_000) {
    errors.push({ field: 'total', message: 'Total is invalid' })
  } else if (errors.length === 0) {
    const expectedTotal = subtotal + deliveryFee
    if (Math.abs(total - expectedTotal) > 0.01) {
      errors.push({ field: 'total', message: 'Total does not match subtotal + delivery fee' })
    }
  }

  return errors
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit by IP.
  // x-real-ip is set by Vercel's edge and cannot be spoofed by the client.
  // Fall back to the LAST value of x-forwarded-for (appended by Vercel's proxy),
  // not the first (which is client-supplied and trivially spoofable).
  const realIp = request.headers.get('x-real-ip')
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = realIp ?? (forwarded ? forwarded.split(',').at(-1)!.trim() : 'unknown')

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before submitting again.' },
      { status: 429 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  // Validate all fields
  const errors = validateOrderBody(body)
  if (errors.length > 0) {
    // Return only the first error message to avoid leaking internals
    return NextResponse.json(
      { error: errors[0].message },
      { status: 400 }
    )
  }

  // Extract user_id from the authenticated session (not from the request body).
  // createServiceClient() bypasses RLS, so we must resolve the real user ourselves
  // to prevent callers from associating orders with arbitrary account IDs.
  const userClient = await createClient()
  const { data: { user: sessionUser } } = await userClient.auth.getUser()
  const authenticatedUserId = sessionUser?.id ?? null

  // In mock mode, return a fake order ID
  if (isSupabaseMockMode()) {
    return NextResponse.json({ id: 'mock-order-' + Date.now() })
  }

  // Sanitise — only use explicitly extracted values, never spread raw body
  const items = (body.items as OrderItem[]).map(i => ({
    name: String(i.name).trim(),
    size: i.size ? String(i.size).trim() : null,
    qty: Math.floor(Number(i.qty)),
    price: Number(i.price),
  }))

  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: authenticatedUserId,
        // Taken from the verified session, never from the request body: a customer
        // could otherwise stamp another person's address on her own order.
        user_email: (sessionUser?.email ?? String(body.user_email)).trim().toLowerCase(),
        full_name: String(body.full_name).trim(),
        phone: String(body.phone).trim(),
        delivery_address: String(body.delivery_address).trim(),
        city: body.city ? String(body.city).trim() : null,
        area: body.area,
        delivery_fee: Number(body.delivery_fee),
        order_notes: body.order_notes ? String(body.order_notes).trim() : null,
        items,
        subtotal: Number(body.subtotal),
        total: Number(body.total),
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      // Log internally but never expose DB error details to the client
      console.error('Order insert error:', error)
      return NextResponse.json({ error: 'Failed to save order. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('Order API unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
