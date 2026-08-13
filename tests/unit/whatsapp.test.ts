import { describe, expect, it } from 'vitest'
import {
  WHATSAPP_FLOAT_URL,
  WHATSAPP_PHONE,
  buildOwnerNotificationURL,
  buildWhatsAppURL,
  type OrderPayload,
} from '@/lib/whatsapp'

/** The shop's WhatsApp number. Changing this silently breaks every order handoff. */
const SHOP_NUMBER = '96181351084'

/** wa.me/<recipient> — the number the message is actually addressed to. */
function recipientOf(url: string): string {
  return new URL(url).pathname.replace(/^\//, '')
}

/** The decoded ?text= payload. */
function textOf(url: string): string {
  const text = new URL(url).searchParams.get('text')
  if (text === null) throw new Error(`No ?text= param in ${url}`)
  return text
}

function makeOrder(overrides: Partial<OrderPayload> = {}): OrderPayload {
  return {
    full_name: 'Nour Khalil',
    user_email: 'nour@example.com',
    phone: '03 456 789',
    area: 'beirut',
    city: null,
    delivery_address: 'Hamra Street, Building 4',
    order_notes: null,
    items: [{ name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 2, price: 89.99 }],
    subtotal: 179.98,
    delivery_fee: 3,
    total: 182.98,
    ...overrides,
  }
}

// ─── The phone constant ───────────────────────────────────────────────────────

describe('WHATSAPP_PHONE', () => {
  it('is pinned to the shop number 96181351084', () => {
    expect(WHATSAPP_PHONE).toBe(SHOP_NUMBER)
  })

  it('backs the floating-button URL', () => {
    expect(WHATSAPP_FLOAT_URL).toBe(`https://wa.me/${SHOP_NUMBER}`)
    expect(recipientOf(WHATSAPP_FLOAT_URL)).toBe(SHOP_NUMBER)
  })

  it('backs the product enquiry URL', () => {
    expect(recipientOf(buildWhatsAppURL('Satin Slip Midi Dress'))).toBe(SHOP_NUMBER)
  })
})

// ─── buildWhatsAppURL ─────────────────────────────────────────────────────────

describe('buildWhatsAppURL', () => {
  it('embeds the product name in the prefilled message', () => {
    expect(textOf(buildWhatsAppURL('Satin Slip Midi Dress'))).toContain('Satin Slip Midi Dress')
  })

  it('encodes a product name containing & so it cannot split the query string', () => {
    const url = buildWhatsAppURL('Tops & Sets — #1 Pick')
    expect(url).toContain('%26')
    expect(url).toContain('%23')
    expect(new URL(url).searchParams.size).toBe(1)
    expect(textOf(url)).toContain('Tops & Sets — #1 Pick')
  })
})

// ─── buildOwnerNotificationURL ────────────────────────────────────────────────

describe('buildOwnerNotificationURL', () => {
  it('addresses the shop number, not the customer', () => {
    expect(recipientOf(buildOwnerNotificationURL(makeOrder()))).toBe(SHOP_NUMBER)
  })

  it('includes every field the shop needs to fulfil the order', () => {
    const text = textOf(buildOwnerNotificationURL(makeOrder()))
    expect(text).toContain('Nour Khalil')
    expect(text).toContain('nour@example.com')
    expect(text).toContain('03 456 789')
    expect(text).toContain('Hamra Street, Building 4')
    expect(text).toContain('Cash on Delivery')
  })

  it('formats item lines with size, quantity and line total', () => {
    const text = textOf(buildOwnerNotificationURL(makeOrder()))
    expect(text).toContain('Velvet Gold-Strap Stiletto, size 38, qty 2, $179.98')
  })

  it('omits the size segment for items with no size (accessories)', () => {
    const text = textOf(
      buildOwnerNotificationURL(
        makeOrder({ items: [{ name: 'Crystal Hair Claw Clip', size: null, qty: 1, price: 29.99 }] }),
      ),
    )
    expect(text).toContain('Crystal Hair Claw Clip, qty 1, $29.99')
    expect(text).not.toContain(', size')
  })

  it('renders money to exactly two decimals', () => {
    const text = textOf(
      buildOwnerNotificationURL(
        makeOrder({
          items: [{ name: 'Sale item', size: null, qty: 3, price: 10 }],
          subtotal: 30,
          delivery_fee: 4,
          total: 34,
          area: 'outside',
        }),
      ),
    )
    expect(text).toContain('Subtotal: $30.00')
    expect(text).toContain('🚚 Delivery: $4.00')
    expect(text).toContain('💰 TOTAL: $34.00')
  })

  it('labels a Beirut order as "Beirut"', () => {
    expect(textOf(buildOwnerNotificationURL(makeOrder({ area: 'beirut' })))).toContain(
      '📍 Area: Beirut',
    )
  })

  it('labels an outside order with the town when supplied', () => {
    const text = textOf(
      buildOwnerNotificationURL(makeOrder({ area: 'outside', city: 'Jounieh' })),
    )
    expect(text).toContain('📍 Area: Outside Beirut, Jounieh')
  })

  it('labels an outside order without a town as plain "Outside Beirut"', () => {
    const text = textOf(buildOwnerNotificationURL(makeOrder({ area: 'outside', city: null })))
    expect(text).toContain('📍 Area: Outside Beirut\n')
    expect(text).not.toContain('Outside Beirut,')
  })

  it('omits the notes line entirely when there are no notes', () => {
    expect(textOf(buildOwnerNotificationURL(makeOrder({ order_notes: null })))).not.toContain(
      '📝 Notes:',
    )
  })

  it('omits the notes line when notes are an empty string', () => {
    expect(textOf(buildOwnerNotificationURL(makeOrder({ order_notes: '' })))).not.toContain(
      '📝 Notes:',
    )
  })
})

// ─── Encoding ─────────────────────────────────────────────────────────────────

describe('buildOwnerNotificationURL — URL encoding', () => {
  it('percent-encodes spaces rather than emitting raw spaces', () => {
    const url = buildOwnerNotificationURL(makeOrder({ full_name: 'Nour Al Khalil' }))
    expect(url).toContain('%20')
    expect(url).not.toMatch(/\s/)
    expect(textOf(url)).toContain('Nour Al Khalil')
  })

  it('encodes newlines as %0A so the message keeps its line breaks', () => {
    const url = buildOwnerNotificationURL(
      makeOrder({ order_notes: 'Ring the bell twice.\nSecond floor.\nLeave with the concierge.' }),
    )
    expect(url).toContain('%0A')
    expect(textOf(url)).toContain('Ring the bell twice.\nSecond floor.\nLeave with the concierge.')
  })

  it('encodes & so an address cannot inject an extra query parameter', () => {
    const url = buildOwnerNotificationURL(
      makeOrder({ delivery_address: 'Corner of Hamra & Bliss, Bldg 4' }),
    )
    expect(url).toContain('%26')
    expect(new URL(url).searchParams.size).toBe(1)
    expect(textOf(url)).toContain('Corner of Hamra & Bliss, Bldg 4')
  })

  it('encodes # so notes cannot truncate the message into a URL fragment', () => {
    const url = buildOwnerNotificationURL(
      makeOrder({ order_notes: 'Apt #12, ask for #Nour' }),
    )
    expect(url).toContain('%23')
    expect(new URL(url).hash).toBe('')
    expect(textOf(url)).toContain('Apt #12, ask for #Nour')
  })

  it('encodes ? and = without breaking the query string', () => {
    const url = buildOwnerNotificationURL(
      makeOrder({ order_notes: 'Is size 38 ok? qty=2' }),
    )
    expect(new URL(url).searchParams.size).toBe(1)
    expect(textOf(url)).toContain('Is size 38 ok? qty=2')
  })

  it('encodes + so it does not decode back as a space', () => {
    const url = buildOwnerNotificationURL(makeOrder({ phone: '+961 3 456 789' }))
    expect(url).toContain('%2B')
    expect(textOf(url)).toContain('+961 3 456 789')
  })

  it('round-trips Arabic text as UTF-8 percent escapes', () => {
    const arabicName = 'نور خليل'
    const arabicAddress = 'شارع الحمرا، بناية ٤، الطابق الثاني'
    const arabicNotes = 'يرجى الاتصال قبل الوصول'
    const url = buildOwnerNotificationURL(
      makeOrder({
        full_name: arabicName,
        delivery_address: arabicAddress,
        order_notes: arabicNotes,
      }),
    )

    // No raw non-ASCII bytes survive in the URL string.
    expect(url).not.toContain(arabicName)
    expect(url).toContain('%D9%86') // UTF-8 for "ن"

    const text = textOf(url)
    expect(text).toContain(arabicName)
    expect(text).toContain(arabicAddress)
    expect(text).toContain(arabicNotes)
  })

  it('round-trips mixed Arabic, Latin and emoji in a single message', () => {
    const url = buildOwnerNotificationURL(
      makeOrder({
        full_name: 'نور Khalil 💫',
        items: [{ name: 'فستان ساتان — Satin Slip', size: 'M', qty: 1, price: 109.99 }],
      }),
    )
    const text = textOf(url)
    expect(text).toContain('نور Khalil 💫')
    expect(text).toContain('فستان ساتان — Satin Slip')
  })
})
