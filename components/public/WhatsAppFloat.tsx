import { WhatsappLogo } from "@phosphor-icons/react/ssr"
import { WHATSAPP_FLOAT_URL } from "@/lib/whatsapp"

/**
 * Ordering happens here, so the button stays reachable. It does not pulse:
 * a permanent animation on a permanent control is noise, not an affordance.
 */
export default function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP_FLOAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message Enchanted Style on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center bg-ink text-paper transition-transform duration-200 hover:scale-[1.04] active:scale-[0.98] lg:bottom-8 lg:right-8"
    >
      <WhatsappLogo size={26} weight="fill" />
    </a>
  )
}
