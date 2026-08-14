// ============================================================
// ENCHANTED STYLE — WhatsApp Integration
// ============================================================

export const WHATSAPP_PHONE = '96181492994'

/**
 * Absolute origin used when a message needs to carry a shareable link.
 * Kept as a literal rather than imported from components/seo/site.ts: lib must
 * not depend on the component layer, and it must never be derived from
 * window.location, which renders differently on the server and the client and
 * produced a hydration mismatch on every product page.
 * Update alongside SITE_URL when the custom domain goes live.
 */
const SITE_ORIGIN = 'https://enchanted-website-xi.vercel.app'

// ─── Order Payload ────────────────────────────────────────────

export interface OrderPayload {
  full_name: string
  user_email: string
  phone: string
  area: 'beirut' | 'outside'
  city?: string | null
  delivery_address: string
  order_notes?: string | null
  items: Array<{ name: string; size: string | null; qty: number; price: number }>
  subtotal: number
  delivery_fee: number
  total: number
}

/** Build a WhatsApp URL with product pre-fill message */
export function buildWhatsAppURL(productName: string): string {
  const message = `Hi! I'm interested in ${productName} from Enchanted Style 💫`
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}

/** Direct WhatsApp link (for floating button) */
export const WHATSAPP_FLOAT_URL = `https://wa.me/${WHATSAPP_PHONE}`

/**
 * Enquiry from a product page. Carries the size and the shareable URL when we
 * have them, so the owner can answer without a round trip asking which piece.
 */
export function buildProductEnquiryURL(
  productName: string,
  size?: string | null,
  path?: string,
): string {
  const lines = [
    `Hi! I have a question about ${productName}${size ? `, size ${size}` : ''}.`,
  ]
  if (path) {
    // A fixed base, never window.location. Branching on `typeof window` here
    // made the server render the deployed origin and the client render
    // localhost, which is a hydration mismatch on every product page.
    lines.push(`${SITE_ORIGIN}${path}`)
  }
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(lines.join('\n'))}`
}

// ─── Owner Notification ───────────────────────────────────────

/** Build a WhatsApp URL for the shop owner with full order details */
export function buildOwnerNotificationURL(order: OrderPayload): string {
  const areaLabel = order.area === 'beirut'
    ? 'Beirut'
    : `Outside Beirut${order.city ? `, ${order.city}` : ''}`

  const itemLines = order.items.map(i => {
    const size = i.size ? `, size ${i.size}` : ''
    return `${i.name}${size}, qty ${i.qty}, $${(i.price * i.qty).toFixed(2)}`
  })

  const parts = [
    'Hi! New order from Enchanted Style 🌸',
    '',
    `👤 Name: ${order.full_name}`,
    `📧 Email: ${order.user_email}`,
    `📞 Phone: ${order.phone}`,
    `📍 Area: ${areaLabel}`,
    `🏠 Address: ${order.delivery_address}`,
    ...(order.order_notes ? [`📝 Notes: ${order.order_notes}`] : []),
    '',
    'Items:',
    ...itemLines,
    '',
    `Subtotal: $${order.subtotal.toFixed(2)}`,
    `🚚 Delivery: $${order.delivery_fee.toFixed(2)}`,
    `💰 TOTAL: $${order.total.toFixed(2)}`,
    '💳 Payment: Cash on Delivery',
  ]

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(parts.join('\n'))}`
}
