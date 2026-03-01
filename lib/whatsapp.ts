// ============================================================
// ENCHANTED STYLE — WhatsApp Integration
// ============================================================

export const WHATSAPP_PHONE = '96181351084'

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

/** Build a WhatsApp cart order URL with all items pre-filled */
export function buildCartOrderURL(items: Array<{
  product: { name: string; price: number | null }
  selectedSize: string | null
  quantity: number
}>): string {
  const lines = items.map(({ product, selectedSize, quantity }) => {
    const price = product.price != null ? `$${(product.price * quantity).toFixed(2)}` : 'Price TBD'
    const size = selectedSize ? ` — Size ${selectedSize}` : ''
    return `• ${product.name}${size} × ${quantity} — ${price}`
  })

  const total = items.reduce((sum, { product, quantity }) => {
    return sum + (product.price ?? 0) * quantity
  }, 0)

  const message = [
    "Hi! I'd like to place an order from Enchanted Style 💫",
    '',
    'Items:',
    ...lines,
    '',
    `Total: $${total.toFixed(2)}`,
    '',
    'Please confirm availability!',
  ].join('\n')

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}

// ─── Owner Notification ───────────────────────────────────────

/** Build a WhatsApp URL for the shop owner with full order details */
export function buildOwnerNotificationURL(order: OrderPayload): string {
  const areaLabel = order.area === 'beirut'
    ? 'Beirut'
    : `Outside Beirut${order.city ? ` — ${order.city}` : ''}`

  const itemLines = order.items.map(i => {
    const size = i.size ? ` — Size ${i.size}` : ''
    return `• ${i.name}${size} × ${i.qty} — $${(i.price * i.qty).toFixed(2)}`
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

// ─── Customer Confirmation ────────────────────────────────────

/** Build a WhatsApp URL to send a confirmation message to the customer */
export function buildCustomerConfirmationURL(phone: string, name: string, total: number): string {
  const msg = `Hi ${name}! 🌸 Your Enchanted Style order has been received.\n\nTotal: $${total.toFixed(2)} (Cash on Delivery)\n\nWe'll contact you shortly to confirm delivery. Thank you for shopping with us! 💫`
  // Strip non-digits, ensure international Lebanon format (961 prefix)
  const cleaned = phone.replace(/\D/g, '')
  const intl = cleaned.startsWith('961') ? cleaned : `961${cleaned.replace(/^0/, '')}`
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`
}
