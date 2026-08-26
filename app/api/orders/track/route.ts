import { NextResponse } from 'next/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import { readBoundedJsonObject, RequestBodyTooLargeError } from '@/lib/request-body'

const ORDER_NUMBER = /^ES-\d{4}-\d{6}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

async function ipHash(request: Request): Promise<string> {
  const address = request.headers.get('cf-connecting-ip')?.trim() || 'unknown'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function isRateLimited(db: D1Database, request: Request): Promise<boolean> {
  const now = Date.now()
  const windowStart = now - 60_000
  const key = `track:${await ipHash(request)}`
  const row = await db.prepare(
    `INSERT INTO "rateLimit" (id, key, count, "lastRequest")
     VALUES (?, ?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN "lastRequest" < ? THEN 1 ELSE count + 1 END,
       "lastRequest" = CASE WHEN "lastRequest" < ? THEN excluded."lastRequest" ELSE "lastRequest" END
     RETURNING count`,
  ).bind(crypto.randomUUID(), key, now, windowStart, windowStart).first<{ count: number }>()
  return (row?.count ?? 1) > 10
}

export async function POST(request: Request) {
  const db = await getD1Database()
  if (!db) return noStore({ error: 'Tracking is temporarily unavailable.' }, 503)
  if (await isRateLimited(db, request)) {
    return noStore({ error: 'Too many tracking attempts. Please try again in a minute.' }, 429)
  }

  let body: Record<string, unknown>
  try {
    body = await readBoundedJsonObject(request, 4096)
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return noStore({ error: 'Request body is too large.' }, 413)
    }
    return noStore({ error: 'Enter a valid order number and email.' }, 400)
  }

  const orderNumber = typeof body.order_number === 'string'
    ? body.order_number.trim().toUpperCase()
    : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!ORDER_NUMBER.test(orderNumber) || email.length > 254 || !EMAIL.test(email)) {
    return noStore({ error: 'Enter a valid order number and email.' }, 400)
  }

  try {
    const order = await db.prepare(
      `SELECT order_number, status, created_at, updated_at
       FROM orders
       WHERE order_number = ? AND lower(user_email) = ?`,
    ).bind(orderNumber, email).first<{
      order_number: string
      status: string
      created_at: string
      updated_at: string
    }>()
    if (!order) {
      return noStore({ error: 'We could not find an order matching those details.' }, 404)
    }
    return noStore({ order })
  } catch (error) {
    console.error('Order tracking failed', error)
    return noStore({ error: 'Tracking is temporarily unavailable. Please try again.' }, 503)
  }
}
