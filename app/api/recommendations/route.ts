import { NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog'
import { getServerSession } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import { getRecommendationIds } from '@/lib/recommendations'
import { readBoundedJsonObject, RequestBodyTooLargeError } from '@/lib/request-body'

const EVENT_TYPES = new Set(['impression', 'click', 'add_to_cart'])
const PLACEMENTS = new Set(['pdp', 'cart'])
const ID = /^[A-Za-z0-9_-]{1,128}$/

function noStore(body: unknown, status = 200) {
  if (status === 204) {
    return new NextResponse(null, {
      status,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  }
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function GET(request: Request) {
  const sourceId = new URL(request.url).searchParams.get('source')?.trim() ?? ''
  if (!ID.test(sourceId)) return noStore({ products: [] })

  const catalog = await getCatalog()
  const source = catalog.products.find(product => product.id === sourceId)
  if (!source) return noStore({ products: [] })

  const db = catalog.source === 'live' ? await getD1Database() : null
  const ranked = db
    ? await getRecommendationIds(db, sourceId, 4).catch(() => ({ ids: [], heading: 'Complete the look' }))
    : { ids: [], heading: 'Complete the look' }
  const fallback = catalog.products
    .filter(product => product.id !== sourceId)
    .sort((left, right) => {
      const leftSame = left.category_id === source.category_id ? 1 : 0
      const rightSame = right.category_id === source.category_id ? 1 : 0
      return rightSame - leftSame || left.sort_order - right.sort_order
    })
  const ids = new Set(ranked.ids)
  const products = [
    ...ranked.ids.map(id => catalog.products.find(product => product.id === id)),
    ...fallback.filter(product => !ids.has(product.id)),
  ].filter((product): product is NonNullable<typeof product> => Boolean(product)).slice(0, 4)

  return noStore({ heading: ranked.ids.length ? ranked.heading : 'Complete the look', products })
}

export async function POST(request: Request) {
  if (request.headers.get('x-analytics-consent') !== 'granted') return noStore({}, 204)
  const db = await getD1Database()
  if (!db) return noStore({}, 204)

  let body: Record<string, unknown>
  try {
    body = await readBoundedJsonObject(request, 8192)
  } catch (error) {
    return noStore(
      { error: error instanceof RequestBodyTooLargeError ? 'Request body is too large.' : 'Invalid event.' },
      error instanceof RequestBodyTooLargeError ? 413 : 400,
    )
  }

  const anonymousId = typeof body.anonymous_id === 'string' ? body.anonymous_id : ''
  const events = Array.isArray(body.events) ? body.events.slice(0, 20) : []
  if (!ID.test(anonymousId) || !events.length) return noStore({ error: 'Invalid event.' }, 400)

  const valid = events.flatMap((value, fallbackPosition) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return []
    const event = value as Record<string, unknown>
    const eventType = typeof event.event_type === 'string' ? event.event_type : ''
    const placement = typeof event.placement === 'string' ? event.placement : ''
    const sourceProductId = typeof event.source_product_id === 'string' ? event.source_product_id : ''
    const recommendedProductId = typeof event.recommended_product_id === 'string' ? event.recommended_product_id : ''
    const position = Number.isInteger(event.position) && Number(event.position) >= 0
      ? Math.min(Number(event.position), 99)
      : fallbackPosition
    if (!EVENT_TYPES.has(eventType) || !PLACEMENTS.has(placement)
      || !ID.test(sourceProductId) || !ID.test(recommendedProductId)
      || sourceProductId === recommendedProductId) return []
    return [{ eventType, placement, sourceProductId, recommendedProductId, position }]
  })
  if (!valid.length) return noStore({ error: 'Invalid event.' }, 400)

  const session = await getServerSession()
  const anonymousHash = await digest(anonymousId)
  const now = new Date().toISOString()
  try {
    await db.batch(valid.map(event => db.prepare(
      `INSERT INTO recommendation_events
         (id, user_id, anonymous_id_hash, event_type, placement, algorithm_version,
          source_product_id, recommended_product_id, position, created_at)
       VALUES (?, ?, ?, ?, ?, 'hybrid-v1', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(), session?.user?.id ?? null, anonymousHash,
      event.eventType, event.placement, event.sourceProductId,
      event.recommendedProductId, event.position, now,
    )))
  } catch {
    return noStore({}, 204)
  }
  return noStore({}, 204)
}
