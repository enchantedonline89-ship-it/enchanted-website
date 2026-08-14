import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isSupabaseMockMode } from '@/lib/mock-data'

const ORDER_NUMBER = /^ES-\d{4}-\d{6}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 10
const attempts = new Map<string, { count: number; resetAt: number }>()

function clientIp(request: Request) {
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',').at(-1)?.trim() || 'unknown'
}

function isRateLimited(request: Request) {
  const now = Date.now()
  if (attempts.size > 5_000) {
    for (const [key, value] of attempts) {
      if (value.resetAt <= now) attempts.delete(key)
    }
  }
  const key = clientIp(request)
  const current = attempts.get(key)
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > MAX_ATTEMPTS
}

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

/**
 * Privacy-safe public tracking lookup.
 *
 * An order number alone is enumerable, so the checkout email is also required.
 * The response intentionally omits the name, address, phone, items and amount,
 * and a mismatch gets the same answer as a missing order.
 */
export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return noStore({ error: 'Too many tracking attempts. Please try again in a minute.' }, 429)
  }

  let body: { order_number?: unknown; email?: unknown }
  try {
    body = await request.json()
  } catch {
    return noStore({ error: 'Enter a valid order number and email.' }, 400)
  }

  const orderNumber = typeof body.order_number === 'string'
    ? body.order_number.trim().toUpperCase()
    : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!ORDER_NUMBER.test(orderNumber) || email.length > 254 || !EMAIL.test(email)) {
    return noStore({ error: 'Enter a valid order number and email.' }, 400)
  }

  if (isSupabaseMockMode()) {
    if (orderNumber === 'ES-2608-001001' && email === 'demo@enchanted.style') {
      return noStore({
        order: {
          order_number: orderNumber,
          status: 'confirmed',
          created_at: '2026-08-14T09:30:00.000Z',
          updated_at: '2026-08-14T10:15:00.000Z',
        },
      })
    }
    return noStore({ error: 'We could not find an order matching those details.' }, 404)
  }

  try {
    const service = await createServiceClient()
    const { data, error } = await service
      .from('orders')
      .select('order_number,status,created_at,updated_at')
      .match({ order_number: orderNumber, user_email: email })
      .maybeSingle()

    if (error) {
      console.error('Order tracking lookup error:', error)
      return noStore({ error: 'Tracking is temporarily unavailable. Please try again.' }, 503)
    }
    if (!data) {
      return noStore({ error: 'We could not find an order matching those details.' }, 404)
    }

    return noStore({ order: data })
  } catch (error) {
    console.error('Order tracking unexpected error:', error)
    return noStore({ error: 'Tracking is temporarily unavailable. Please try again.' }, 503)
  }
}
