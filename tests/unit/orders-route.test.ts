// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const h = vi.hoisted(() => {
  const single = vi.fn()
  const select = vi.fn()
  const insert = vi.fn()
  const from = vi.fn()
  const getUser = vi.fn()
  // The catalog the server prices against.
  const catalog = { rows: [] as Array<Record<string, unknown>>, error: null as unknown }
  return { single, select, insert, from, getUser, catalog, mockMode: { value: true } }
})

vi.mock('@/lib/mock-data', () => ({
  isSupabaseMockMode: () => h.mockMode.value,
}))

// The real Supabase project no longer resolves, so the client is fully faked.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: h.getUser } }),
  createServiceClient: async () => ({ from: h.from }),
}))

// The route registers a module-level cleanup setInterval. Load it under fake
// timers so the interval never pins the test process open.
vi.useFakeTimers()
const { POST } = await import('@/app/api/orders/route')
vi.useRealTimers()

// ─── Helpers ──────────────────────────────────────────────────────────────────

let ipSeq = 0
/** A fresh IP per test so the module-level rate limiter cannot bleed across tests. */
function freshIp(): string {
  ipSeq += 1
  return `10.0.0.${ipSeq}`
}

function makeRequest(
  body: unknown,
  { ip = freshIp(), headers = {} }: { ip?: string | null; headers?: Record<string, string> } = {},
): NextRequest {
  const h2: Record<string, string> = { 'content-type': 'application/json', ...headers }
  if (ip !== null) h2['x-real-ip'] = ip
  return new Request('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: h2,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as unknown as NextRequest
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    full_name: 'Nour Khalil',
    user_email: 'nour@example.com',
    phone: '03 456 789',
    delivery_address: 'Hamra Street, Building 4, 2nd floor',
    area: 'beirut',
    city: null,
    order_notes: null,
    delivery_fee: 4,
    items: [
      { product_id: 'prod-stiletto', name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 2, price: 89.99 },
    ],
    subtotal: 179.98,
    total: 183.98,
    ...overrides,
  }
}

async function post(body: unknown, opts?: Parameters<typeof makeRequest>[1]) {
  const res = await POST(makeRequest(body, opts))
  return { status: res.status, json: (await res.json()) as { id?: string; error?: string } }
}

/** The object actually handed to supabase.insert(). */
function insertedRow(): Record<string, unknown> {
  expect(h.insert).toHaveBeenCalledTimes(1)
  return h.insert.mock.calls[0][0] as Record<string, unknown>
}

beforeEach(() => {
  h.single.mockResolvedValue({ data: { id: 'ord-real-1' }, error: null })
  h.select.mockImplementation(() => ({ single: h.single }))
  h.insert.mockImplementation(() => ({ select: h.select }))

  // Prices the server is expected to trust, deliberately different from the
  // prices the fixture body submits, so any test that passes proves the server
  // used ITS numbers and not the client's.
  h.catalog.rows = [
    { id: 'prod-stiletto', name: 'Velvet Gold-Strap Stiletto', price: 89.99, sizes: ['36', '37', '38'], is_active: true },
    { id: 'prod-clip', name: 'Crystal Hair Claw Clip', price: 29.99, sizes: null, is_active: true },
  ]
  h.catalog.error = null

  h.from.mockImplementation((table: string) =>
    table === 'products'
      ? { select: () => ({ in: async () => ({ data: h.catalog.rows, error: h.catalog.error }) }) }
      : { insert: h.insert },
  )
  h.getUser.mockResolvedValue({ data: { user: { id: 'session-user-id', email: 'nour@example.com' } }, error: null })
  h.mockMode.value = true
})

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('POST /api/orders — accepted orders', () => {
  it('accepts a well-formed Beirut order', async () => {
    const { status, json } = await post(validBody())
    expect(status).toBe(200)
    expect(json.id).toBeTruthy()
  })

  it('accepts a well-formed outside-Beirut order at the $4 fee', async () => {
    const { status } = await post(
      validBody({ area: 'outside', city: 'Jounieh', delivery_fee: 4, total: 183.98 }),
    )
    expect(status).toBe(200)
  })

  it('accepts an accessory line with size null', async () => {
    const { status } = await post(
      validBody({
        items: [
          { product_id: 'prod-clip', name: 'Crystal Hair Claw Clip', size: null, qty: 1, price: 29.99 },
        ],
        subtotal: 29.99,
        total: 33.99,
      }),
    )
    expect(status).toBe(200)
  })

  it('tolerates floating-point drift up to $0.01 on the total', async () => {
    const { status } = await post(validBody({ total: 183.985 }))
    expect(status).toBe(200)
  })
})

// ─── Body shape ───────────────────────────────────────────────────────────────

describe('POST /api/orders — malformed bodies', () => {
  it('rejects a body that is not valid JSON', async () => {
    const { status, json } = await post('{ not json')
    expect(status).toBe(400)
    expect(json.error).toBe('Invalid JSON body')
  })

  it('rejects a JSON array body', async () => {
    const { status, json } = await post([1, 2, 3])
    expect(status).toBe(400)
    expect(json.error).toBe('Request body must be a JSON object')
  })

  it('returns only the first validation message, never the full error list', async () => {
    const { status, json } = await post({})
    expect(status).toBe(400)
    expect(typeof json.error).toBe('string')
    expect(Object.keys(json)).toEqual(['error'])
  })
})

// ─── Field validation ─────────────────────────────────────────────────────────

describe('POST /api/orders — field validation', () => {
  it.each([
    ['full_name missing', { full_name: undefined }],
    ['full_name one character', { full_name: 'N' }],
    ['full_name whitespace only', { full_name: '   ' }],
    ['full_name over 100 chars', { full_name: 'N'.repeat(101) }],
    ['full_name not a string', { full_name: 42 }],
    ['user_email without @', { user_email: 'nour.example.com' }],
    ['user_email not a string', { user_email: null }],
    ['phone too short', { phone: '03' }],
    ['phone over 30 chars', { phone: '0'.repeat(31) }],
    ['delivery_address too short', { delivery_address: 'St' }],
    ['delivery_address over 300 chars', { delivery_address: 'a'.repeat(301) }],
    ['area unknown', { area: 'tripoli' }],
    ['area missing', { area: undefined }],
    ['city over 100 chars', { city: 'c'.repeat(101) }],
    ['order_notes over 500 chars', { order_notes: 'n'.repeat(501) }],
    ['subtotal negative', { subtotal: -1, total: 2 }],
    ['subtotal not a number', { subtotal: 'free', total: 4 }],
    ['total not a number', { total: 'free' }],
  ])('rejects %s', async (_label, patch) => {
    const { status, json } = await post(validBody(patch))
    expect(status).toBe(400)
    expect(json.error).toBeTruthy()
    expect(json.id).toBeUndefined()
  })

  it('rejects a total that does not equal subtotal + delivery fee', async () => {
    const { status, json } = await post(validBody({ total: 5 }))
    expect(status).toBe(400)
    expect(json.error).toMatch(/total does not match/i)
  })

  it('accepts an optional city and notes when omitted entirely', async () => {
    const body = validBody()
    delete (body as Record<string, unknown>).city
    delete (body as Record<string, unknown>).order_notes
    const { status } = await post(body)
    expect(status).toBe(200)
  })
})

describe('POST /api/orders — item validation', () => {
  it.each([
    ['items not an array', { items: 'stiletto' }],
    ['items empty', { items: [], subtotal: 0, total: 4 }],
    [
      'items over 50 entries',
      {
        items: Array.from({ length: 51 }, () => ({ name: 'x', size: null, qty: 1, price: 1 })),
        subtotal: 51,
        total: 55,
      },
    ],
    ['item not an object', { items: [null] }],
    ['item name empty', { items: [{ name: '  ', size: null, qty: 1, price: 1 }] }],
    ['item name over 200 chars', { items: [{ name: 'x'.repeat(201), size: null, qty: 1, price: 1 }] }],
    ['item size not a string', { items: [{ name: 'x', size: 38, qty: 1, price: 1 }] }],
    ['item size over 20 chars', { items: [{ name: 'x', size: 's'.repeat(21), qty: 1, price: 1 }] }],
    ['item qty zero', { items: [{ name: 'x', size: null, qty: 0, price: 1 }] }],
    ['item qty negative', { items: [{ name: 'x', size: null, qty: -2, price: 1 }] }],
    ['item qty fractional', { items: [{ name: 'x', size: null, qty: 1.5, price: 1 }] }],
    ['item qty over 99', { items: [{ name: 'x', size: null, qty: 100, price: 1 }] }],
    ['item price negative', { items: [{ name: 'x', size: null, qty: 1, price: -5 }] }],
    ['item price over 10000', { items: [{ name: 'x', size: null, qty: 1, price: 10_001 }] }],
    ['item price not a number', { items: [{ name: 'x', size: null, qty: 1, price: 'free' }] }],
  ])('rejects %s', async (_label, patch) => {
    const { status } = await post(validBody(patch))
    expect(status).toBe(400)
  })
})

// ─── Delivery fee / area cross-validation ─────────────────────────────────────

describe('POST /api/orders — flat delivery fee', () => {
  it('accepts $4 for Beirut', async () => {
    const { status } = await post(validBody({ area: 'beirut', delivery_fee: 4, total: 183.98 }))
    expect(status).toBe(200)
  })

  it('accepts $4 for outside', async () => {
    const { status } = await post(
      validBody({ area: 'outside', city: 'Jounieh', delivery_fee: 4, total: 183.98 }),
    )
    expect(status).toBe(200)
  })

  it('rejects a $3 fee on an outside-Beirut order', async () => {
    const { status, json } = await post(
      validBody({ area: 'outside', city: 'Jounieh', delivery_fee: 3, total: 182.98 }),
    )
    expect(status).toBe(400)
    expect(json.error).toMatch(/must be \$4/)
  })

  it('rejects a $3 fee on a Beirut order', async () => {
    const { status, json } = await post(
      validBody({ area: 'beirut', delivery_fee: 3, total: 182.98 }),
    )
    expect(status).toBe(400)
    expect(json.error).toMatch(/must be \$4/)
  })

  it.each([0, 1, 2, 3, 5, 2.99, -3, Number.NaN, Infinity])(
    'rejects an off-menu delivery fee of %s',
    async fee => {
      const { status } = await post(validBody({ delivery_fee: fee, total: 179.98 + (fee || 0) }))
      expect(status).toBe(400)
    },
  )

  it('rejects a delivery fee supplied as a string instead of $4', async () => {
    const { status } = await post(validBody({ delivery_fee: '0', total: 179.98 }))
    expect(status).toBe(400)
  })
})

// ─── user_id comes from the session, never the body ───────────────────────────

describe('POST /api/orders — user_id is taken from the session, never the request body', () => {
  beforeEach(() => {
    h.mockMode.value = false // exercise the real insert path
  })

  it('writes the session user id, ignoring a user_id supplied by the caller', async () => {
    const { status } = await post(validBody({ user_id: 'attacker-controlled-id' }))

    expect(status).toBe(200)
    expect(insertedRow().user_id).toBe('session-user-id')
    expect(insertedRow().user_id).not.toBe('attacker-controlled-id')
  })

  it('rejects the request when there is no verified session', async () => {
    h.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { status, json } = await post(validBody({ user_id: 'someone-elses-id' }))

    expect(status).toBe(401)
    expect(json.error).toMatch(/sign in/i)
    expect(h.insert).not.toHaveBeenCalled()
  })

  it('never spreads unlisted body fields into the insert', async () => {
    await post(
      validBody({
        user_id: 'attacker-controlled-id',
        status: 'delivered',
        id: 'forced-primary-key',
        created_at: '1999-01-01T00:00:00.000Z',
        is_admin: true,
      }),
    )

    const row = insertedRow()
    expect(row.status).toBe('pending')
    expect(row).not.toHaveProperty('id')
    expect(row).not.toHaveProperty('is_admin')
    expect(row).not.toHaveProperty('created_at')
    expect(Object.keys(row).sort()).toEqual(
      [
        'area',
        'city',
        'delivery_address',
        'delivery_fee',
        'full_name',
        'items',
        'order_notes',
        'phone',
        'status',
        'subtotal',
        'total',
        'user_email',
        'user_id',
      ].sort(),
    )
  })

  it('normalises the stored email and trims free-text fields', async () => {
    await post(
      validBody({
        user_email: '  NOUR@Example.COM  ',
        full_name: '  Nour Khalil  ',
        delivery_address: '  Hamra Street, Building 4  ',
      }),
    )

    const row = insertedRow()
    expect(row.user_email).toBe('nour@example.com')
    expect(row.full_name).toBe('Nour Khalil')
    expect(row.delivery_address).toBe('Hamra Street, Building 4')
  })

  it('rebuilds every item from the catalog, dropping unlisted fields', async () => {
    await post(
      validBody({
        items: [
          { product_id: 'prod-stiletto', name: '  NOT THE REAL NAME  ', size: '  38  ', qty: 2, price: 1, secret: 'x' },
        ],
      }),
    )

    // Name and price come from the catalog; only size and qty survive from the
    // request, and the stray `secret` field never reaches the row.
    expect(insertedRow().items).toEqual([
      { product_id: 'prod-stiletto', name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 2, price: 89.99 },
    ])
  })

  it('returns a generic 500 and leaks no DB detail when the insert fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.single.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "orders_pkey"' },
    })

    const { status, json } = await post(validBody())

    expect(status).toBe(500)
    expect(json.error).toBe('Failed to save order. Please try again.')
    expect(json.error).not.toMatch(/constraint|pkey|duplicate/i)
    consoleError.mockRestore()
  })

  it('returns a generic 500 when the Supabase client throws (project unreachable)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.from.mockImplementation((table: string) => {
      if (table === 'products') {
        return { select: () => ({ in: async () => ({ data: h.catalog.rows, error: null }) }) }
      }
      throw new Error('getaddrinfo ENOTFOUND xyz.supabase.co')
    })

    const { status, json } = await post(validBody())

    expect(status).toBe(500)
    expect(json.error).toBe('An unexpected error occurred. Please try again.')
    expect(json.error).not.toMatch(/ENOTFOUND|supabase/i)
    consoleError.mockRestore()
  })

  it('does not touch the database when validation fails', async () => {
    await post(validBody({ area: 'beirut', delivery_fee: 3, total: 182.98 }))
    expect(h.from).not.toHaveBeenCalled()
    expect(h.insert).not.toHaveBeenCalled()
  })
})

// ─── Subtotal vs line items ───────────────────────────────────────────────────

describe('prices are derived server-side, never taken from the client', () => {
  /**
   * REGRESSION GUARD — app/api/orders/route.ts.
   * The client is trusted for WHAT and HOW MANY, never for HOW MUCH. Line prices
   * are re-read from the products table and the submitted ones are discarded, so
   * a forged price cannot reach the order row, the admin screen, the WhatsApp
   * message, or the amount the driver collects in cash.
   */

  beforeEach(() => {
    h.mockMode.value = false // exercise the real pricing + insert path
  })

  it('CLOSED: ignores a forged line price and stores the catalog price', async () => {
    const { status } = await post(
      validBody({
        // A $89.99 stiletto submitted as $1.
        items: [
          { product_id: 'prod-stiletto', name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 1, price: 1 },
        ],
        subtotal: 1,
        delivery_fee: 4,
        total: 5,
      }),
      { ip: freshIp() },
    )

    expect(status).toBe(200)
    const row = insertedRow()
    expect((row.items as Array<{ price: number }>)[0].price).toBe(89.99)
    expect(row.subtotal).toBe(89.99)
    expect(row.total).toBe(93.99)
  })

  it('ignores a forged subtotal and total entirely', async () => {
    const { status } = await post(
      validBody({ subtotal: 1, total: 5 }),
      { ip: freshIp() },
    )
    expect(status).toBe(200)
    // Fixture is 2 x $89.99 to Beirut.
    expect(insertedRow().subtotal).toBe(179.98)
    expect(insertedRow().total).toBe(183.98)
  })

  it('takes the product name from the catalog, not the request', async () => {
    await post(
      validBody({
        items: [
          { product_id: 'prod-clip', name: 'FREE GIFT', size: null, qty: 1, price: 0 },
        ],
      }),
      { ip: freshIp() },
    )
    const items = insertedRow().items as Array<{ name: string; price: number }>
    expect(items[0].name).toBe('Crystal Hair Claw Clip')
    expect(items[0].price).toBe(29.99)
  })

  it('rejects a size that is not currently offered by the product', async () => {
    const { status, json } = await post(
      validBody({
        items: [
          { product_id: 'prod-stiletto', name: 'Velvet Gold-Strap Stiletto', size: '999', qty: 1, price: 89.99 },
        ],
      }),
    )

    expect(status).toBe(409)
    expect(json.error).toMatch(/selected sizes/i)
    expect(h.insert).not.toHaveBeenCalled()
  })

  it('rejects a size on a product that does not use sizes', async () => {
    const { status, json } = await post(
      validBody({
        items: [
          { product_id: 'prod-clip', name: 'Crystal Hair Claw Clip', size: 'one-size', qty: 1, price: 29.99 },
        ],
      }),
    )

    expect(status).toBe(409)
    expect(json.error).toMatch(/does not use a size/i)
  })

  it('rejects a catalog product without an orderable price', async () => {
    h.catalog.rows[0].price = null
    const { status, json } = await post(validBody())
    expect(status).toBe(409)
    expect(json.error).toMatch(/not available to order online/i)
  })

  it('rejects an unknown product rather than pricing it at zero', async () => {
    const { status } = await post(
      validBody({
        items: [
          { product_id: 'prod-does-not-exist', name: 'Ghost', size: '38', qty: 1, price: 5 },
        ],
      }),
      { ip: freshIp() },
    )
    expect(status).toBe(409)
  })

  it('rejects a withdrawn product', async () => {
    h.catalog.rows = [
      { id: 'prod-stiletto', name: 'Velvet Gold-Strap Stiletto', price: 89.99, is_active: false },
    ]
    const { status } = await post(validBody(), { ip: freshIp() })
    expect(status).toBe(409)
  })

  it('fails closed when the catalog cannot be read', async () => {
    h.catalog.error = { message: 'unreachable' }
    const { status } = await post(validBody(), { ip: freshIp() })
    expect(status).toBe(503)
  })

  it('rejects an item with no product reference at all', async () => {
    const { status } = await post(
      validBody({ items: [{ name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 1, price: 89.99 }] }),
      { ip: freshIp() },
    )
    expect(status).toBe(400)
  })
})

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('POST /api/orders — rate limiting', () => {
  it('allows 5 orders per IP per minute and blocks the 6th', async () => {
    const ip = freshIp()
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      statuses.push((await post(validBody(), { ip })).status)
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
    expect(statuses[5]).toBe(429)
  })

  it('returns a retry hint, not a validation error, when limited', async () => {
    const ip = freshIp()
    for (let i = 0; i < 5; i++) await post(validBody(), { ip })
    const { status, json } = await post(validBody(), { ip })
    expect(status).toBe(429)
    expect(json.error).toMatch(/too many requests/i)
  })

  it('rate-limits before parsing the body, so junk payloads cannot bypass it', async () => {
    const ip = freshIp()
    for (let i = 0; i < 5; i++) await post(validBody(), { ip })
    const { status } = await post('{ not json', { ip })
    expect(status).toBe(429)
  })

  it('counts each IP independently', async () => {
    const busy = freshIp()
    for (let i = 0; i < 6; i++) await post(validBody(), { ip: busy })

    const { status } = await post(validBody(), { ip: freshIp() })
    expect(status).toBe(200)
  })

  it('uses the LAST x-forwarded-for hop, so a spoofed client prefix cannot evade the limit', async () => {
    const proxyIp = `172.16.0.${++ipSeq}`
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      statuses.push(
        (
          await post(validBody(), {
            ip: null, // no x-real-ip, force the x-forwarded-for path
            headers: { 'x-forwarded-for': `1.2.3.${i}, ${proxyIp}` },
          })
        ).status,
      )
    }
    expect(statuses[5]).toBe(429)
  })

  it('prefers x-real-ip over a client-supplied x-forwarded-for', async () => {
    const realIp = freshIp()
    for (let i = 0; i < 6; i++) {
      await post(validBody(), { ip: realIp, headers: { 'x-forwarded-for': `9.9.9.${i}` } })
    }
    const { status } = await post(validBody(), {
      ip: realIp,
      headers: { 'x-forwarded-for': '9.9.9.99' },
    })
    expect(status).toBe(429)
  })
})
