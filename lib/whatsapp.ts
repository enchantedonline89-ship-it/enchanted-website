import { SITE_URL } from '@/components/seo/site'

export const WHATSAPP_PHONE = '96181492994'

/**
 * Absolute origin used when a message needs to carry a shareable link.
 * Kept in the library layer rather than imported from components/seo/site.ts,
 * and never derived from window.location, so server and client renders agree.
 * Each deployment provides NEXT_PUBLIC_SITE_URL at build time.
 */
const SITE_ORIGIN = SITE_URL

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
