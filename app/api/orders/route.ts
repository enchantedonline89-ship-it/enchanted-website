import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import { getCloudflareEnv } from '@/lib/cloudflare/env'
import { enqueueEmail } from '@/lib/email/queue'

type SubmittedLine = {
  product_id: string
  variant_id: string | null
  size: string | null
  qty: number
}

type CatalogRow = {
  id: string
  name: string
  price_cents: number | null
  sizes_json: string
  category_id: string | null
  is_active: number
  variant_id: string | null
  sku: string | null
  variant_size: string | null
  stock_quantity: number | null
  variant_active: number | null
  color_name: string | null
  color_hex: string | null
  inventory_tracked: number
}

type PromotionRow = {
  name: string
  scope: 'sitewide' | 'category'
  category_id: string | null
  discount_basis_points: number
}

type DeliveryDetails = {
  recipientName: string
  phoneE164: string
  governorate: string
  city: string
  area: string
  street: string
  building: string | null
  floor: string | null
  landmark: string | null
  deliveryNotes: string | null
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function nullableText(value: unknown, max: number): string | null {
  const normalized = text(value, max)
  return normalized || null
}

function normalizeLebanesePhone(value: unknown): string | null {
  let raw = text(value, 30).replace(/[\s().-]/g, '')
  if (raw.startsWith('00')) raw = `+${raw.slice(2)}`
  if (raw.startsWith('961')) raw = `+${raw}`
  if (raw.startsWith('0')) raw = `+961${raw.slice(1)}`
  return /^\+961\d{7,8}$/.test(raw) ? raw : null
}

function parseSubmittedLines(value: unknown): SubmittedLine[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return null
  const lines: SubmittedLine[] = []
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) return null
    const item = raw as Record<string, unknown>
    const productId = text(item.product_id, 64)
    const variantId = nullableText(item.variant_id, 64)
    const size = nullableText(item.size, 30)
    const qty = Number(item.qty)
    if (!productId || !Number.isInteger(qty) || qty < 1 || qty > 20) return null
    lines.push({ product_id: productId, variant_id: variantId, size, qty })
  }
  return lines
}

function orderNumber(): string {
  const now = new Date()
  const yy = String(now.getUTCFullYear()).slice(-2)
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const random = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return `ES-${yy}${mm}-${String(random).padStart(6, '0')}`
}

async function randomHash(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  return Boolean(origin && origin === request.nextUrl.origin)
}

async function deliveryDetails(
  db: D1Database,
  userId: string,
  body: Record<string, unknown>,
): Promise<DeliveryDetails | null> {
  const addressId = nullableText(body.address_id, 64)
  if (addressId) {
    const address = await db.prepare(
      `SELECT recipient_name, phone_e164, governorate, city, area, street,
              building, floor, landmark, delivery_notes
       FROM addresses
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    ).bind(addressId, userId).first<{
      recipient_name: string
      phone_e164: string
      governorate: string
      city: string
      area: string
      street: string
      building: string | null
      floor: string | null
      landmark: string | null
      delivery_notes: string | null
    }>()
    if (!address) return null
    return {
      recipientName: address.recipient_name,
      phoneE164: address.phone_e164,
      governorate: address.governorate,
      city: address.city,
      area: address.area,
      street: address.street,
      building: address.building,
      floor: address.floor,
      landmark: address.landmark,
      deliveryNotes: address.delivery_notes,
    }
  }

  const recipientName = text(body.recipient_name ?? body.full_name, 100)
  const phoneE164 = normalizeLebanesePhone(body.phone_e164 ?? body.phone)
  const oldArea = text(body.area, 120)
  const city = text(body.city, 100) || (oldArea === 'beirut' ? 'Beirut' : '')
  const governorate = text(body.governorate, 80) || (oldArea === 'beirut' ? 'Beirut' : city)
  const area = oldArea === 'beirut' ? 'Beirut' : text(body.delivery_area ?? body.area, 120)
  const street = text(body.street ?? body.delivery_address, 200)
  if (
    recipientName.length < 2 ||
    !phoneE164 ||
    governorate.length < 2 ||
    city.length < 2 ||
    area.length < 2 ||
    street.length < 2
  ) return null

  return {
    recipientName,
    phoneE164,
    governorate,
    city,
    area,
    street,
    building: nullableText(body.building, 100),
    floor: nullableText(body.floor, 40),
    landmark: nullableText(body.landmark, 160),
    deliveryNotes: nullableText(body.delivery_notes, 500),
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error()
    body = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Enter valid order details.' }, { status: 400 })
  }

  const submitted = parseSubmittedLines(body.items)
  if (!submitted) {
    return NextResponse.json({ error: 'Your cart is empty or invalid.' }, { status: 400 })
  }

  try {
    const [auth, db, env] = await Promise.all([getAuth(), getD1Database(), getCloudflareEnv()])
    if (!db || !env) throw new Error('bindings-unavailable')
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to place an order.' }, { status: 401 })
    }

    const address = await deliveryDetails(db, session.user.id, body)
    if (!address) {
      return NextResponse.json(
        { error: 'Choose a valid saved Lebanese address or complete every delivery field.' },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()
    const [catalogResults, promotions, settings] = await Promise.all([
      db.batch<CatalogRow>(submitted.map((line) => db.prepare(
        `SELECT p.id, p.name, p.price_cents, p.sizes_json, p.category_id, p.is_active,
                v.id AS variant_id, v.sku, v.size AS variant_size,
                v.stock_quantity, v.is_active AS variant_active,
                c.name AS color_name, c.hex_code,
                EXISTS(SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id) AS inventory_tracked
         FROM products p
         LEFT JOIN product_variants v ON v.id = ? AND v.product_id = p.id
         LEFT JOIN product_colors c ON c.id = v.color_id
         WHERE p.id = ?`,
      ).bind(line.variant_id, line.product_id))),
      db.prepare(
        `SELECT name, scope, category_id, discount_basis_points
         FROM promotions
         WHERE is_active = 1 AND campaign_type = 'discount'
           AND starts_at <= ? AND (ends_at IS NULL OR ends_at > ?)`,
      ).bind(now, now).all<PromotionRow>(),
      db.prepare(
        `SELECT delivery_fee_cents, cash_on_delivery
         FROM site_settings WHERE id = 'storefront'`,
      ).first<{ delivery_fee_cents: number; cash_on_delivery: number }>(),
    ])

    if (!settings || settings.cash_on_delivery !== 1) {
      return NextResponse.json({ error: 'Checkout is temporarily unavailable.' }, { status: 503 })
    }

    const priced = submitted.map((line, index) => {
      const product = catalogResults[index]?.results[0]
      if (!product || product.is_active !== 1 || product.price_cents == null) {
        throw new Error('PRODUCT_UNAVAILABLE')
      }
      const sizes = JSON.parse(product.sizes_json || '[]') as unknown
      const allowedSizes = Array.isArray(sizes) ? sizes.map(String) : []
      if (allowedSizes.length && (!line.size || !allowedSizes.includes(line.size))) {
        throw new Error('SIZE_UNAVAILABLE')
      }
      if (product.inventory_tracked === 1) {
        if (
          !line.variant_id ||
          !product.variant_id ||
          product.variant_active !== 1 ||
          (product.variant_size ?? null) !== line.size ||
          (product.stock_quantity !== null && product.stock_quantity < line.qty)
        ) throw new Error('VARIANT_UNAVAILABLE')
      } else if (line.variant_id) {
        throw new Error('VARIANT_UNAVAILABLE')
      }

      const applicable = promotions.results.filter((promotion) =>
        promotion.scope === 'sitewide' || promotion.category_id === product.category_id,
      )
      const promotion = applicable.sort(
        (a, b) => b.discount_basis_points - a.discount_basis_points,
      )[0]
      const discountBasisPoints = promotion?.discount_basis_points ?? 0
      const unitPriceCents = Math.round(product.price_cents * (10_000 - discountBasisPoints) / 10_000)
      return {
        ...line,
        productName: product.name,
        sku: product.sku,
        colorName: product.color_name,
        colorHex: product.color_hex,
        unitPriceCents,
        discountCents: product.price_cents - unitPriceCents,
        lineTotalCents: unitPriceCents * line.qty,
        promotionName: promotion?.name ?? null,
      }
    })

    const subtotalCents = priced.reduce((sum, line) => sum + line.lineTotalCents, 0)
    const discountCents = priced.reduce((sum, line) => sum + line.discountCents * line.qty, 0)
    const totalCents = subtotalCents + settings.delivery_fee_cents
    const orderNotes = nullableText(body.order_notes, 500)

    let createdNumber = ''
    let createdId = ''
    for (let attempt = 0; attempt < 3; attempt += 1) {
      createdNumber = orderNumber()
      createdId = crypto.randomUUID()
      const trackingTokenHash = await randomHash()
      const outboxId = crypto.randomUUID()
      const statements: D1PreparedStatement[] = [
        db.prepare(
          `INSERT INTO orders (
             id, order_number, tracking_token_hash, user_id, status, user_email,
             recipient_name, phone_e164, country_code, governorate, city, area,
             street, building, floor, landmark, delivery_notes, order_notes,
             currency, subtotal_cents, discount_cents, delivery_fee_cents, total_cents,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, 'LB', ?, ?, ?, ?, ?, ?, ?, ?, ?,
                     'USD', ?, ?, ?, ?, ?, ?)`,
        ).bind(
          createdId, createdNumber, trackingTokenHash, session.user.id,
          session.user.email.toLowerCase(), address.recipientName, address.phoneE164,
          address.governorate, address.city, address.area, address.street,
          address.building, address.floor, address.landmark, address.deliveryNotes,
          orderNotes, subtotalCents, discountCents, settings.delivery_fee_cents,
          totalCents, now, now,
        ),
        ...priced.map((line) => db.prepare(
          `INSERT INTO order_items (
             id, order_id, product_id, variant_id, product_name, sku, size,
             color_name, color_hex, quantity, unit_price_cents, discount_cents,
             line_total_cents, promotion_name, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(), createdId, line.product_id, line.variant_id,
          line.productName, line.sku, line.size, line.colorName, line.colorHex,
          line.qty, line.unitPriceCents, line.discountCents * line.qty,
          line.lineTotalCents, line.promotionName, now,
        )),
        db.prepare(
          `INSERT INTO order_status_history
             (id, order_id, previous_status, status, actor_user_id, public_note, created_at)
           VALUES (?, ?, NULL, 'pending', ?, 'Order received and awaiting confirmation.', ?)`,
        ).bind(crypto.randomUUID(), createdId, session.user.id, now),
        db.prepare(
          `INSERT INTO notification_outbox
             (id, idempotency_key, order_id, channel, template, recipient, payload_json,
              status, available_at, created_at, updated_at)
           VALUES (?, ?, ?, 'email', 'order-received', ?, ?, 'pending', ?, ?, ?)`,
        ).bind(
          outboxId, `order-received:${createdId}`, createdId, session.user.email.toLowerCase(),
          JSON.stringify({ orderNumber: createdNumber, totalCents, whatsapp: '+96181492994' }),
          now, now, now,
        ),
        db.prepare(
          `INSERT INTO customer_profiles (user_id, default_phone_e164, created_at, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             default_phone_e164 = excluded.default_phone_e164,
             updated_at = excluded.updated_at`,
        ).bind(session.user.id, address.phoneE164, now, now),
      ]

      try {
        await db.batch(statements)
        await enqueueEmail(env, {
          idempotencyKey: `order-received:${createdId}`,
          template: 'order-received',
          recipient: session.user.email.toLowerCase(),
          payload: {
            orderNumber: createdNumber,
            totalCents,
            whatsapp: '+96181492994',
          },
        }).then(
          () => db.prepare(
            `UPDATE notification_outbox SET status = 'queued', updated_at = ?
             WHERE idempotency_key = ?`,
          ).bind(new Date().toISOString(), `order-received:${createdId}`).run(),
          (error) => console.error('Order email enqueue failed', error),
        )
        break
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('order_number') && message.includes('UNIQUE') && attempt < 2) continue
        if (message.includes('VARIANT_UNAVAILABLE')) {
          return NextResponse.json(
            { error: 'An item just sold out. Review your cart and try again.' },
            { status: 409 },
          )
        }
        throw error
      }
    }

    return NextResponse.json({
      id: createdId,
      order_number: createdNumber,
      status: 'pending',
      items: priced.map((line) => ({
        product_id: line.product_id,
        name: line.productName,
        size: line.size,
        color_name: line.colorName,
        qty: line.qty,
        price: line.unitPriceCents / 100,
      })),
      subtotal: subtotalCents / 100,
      delivery_fee: settings.delivery_fee_cents / 100,
      total: totalCents / 100,
      whatsapp: '+96181492994',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (['PRODUCT_UNAVAILABLE', 'SIZE_UNAVAILABLE', 'VARIANT_UNAVAILABLE'].includes(message)) {
      return NextResponse.json(
        { error: 'One of those items is no longer available. Refresh and try again.' },
        { status: 409 },
      )
    }
    console.error('Order creation failed', error)
    return NextResponse.json({ error: 'We could not place the order. Please try again.' }, { status: 503 })
  }
}
