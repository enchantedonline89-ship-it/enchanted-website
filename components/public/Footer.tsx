import Link from "next/link"
import { InstagramLogo, WhatsappLogo } from "@phosphor-icons/react/ssr"
import Logo from "./Logo"
import { WHATSAPP_FLOAT_URL } from "@/lib/whatsapp"

const SHOP = [
  { href: "/#catalog", label: "Shop All" },
  { href: "/size-guide", label: "Size guide" },
  { href: "/orders", label: "Your orders" },
]

const HELP = [
  { href: "/track-order", label: "Track an order" },
  { href: "/shipping", label: "Shipping" },
  { href: "/returns", label: "Returns" },
  { href: "/contact", label: "Contact" },
]

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Logo size="lg" />
            <p className="t-body mt-5 max-w-[34ch] text-[0.9375rem]">
              Women&apos;s fashion for Lebanon. Place your order here, receive updates
              by email, and contact us on WhatsApp if you need help.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://www.instagram.com/enchanted.style_"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center border border-line text-ink-dim transition-colors hover:border-ink hover:text-ink"
                aria-label="Enchanted Style on Instagram"
              >
                <InstagramLogo size={19} weight="light" />
              </a>
              <a
                href={WHATSAPP_FLOAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center border border-line text-ink-dim transition-colors hover:border-ink hover:text-ink"
                aria-label="Message Enchanted Style on WhatsApp"
              >
                <WhatsappLogo size={19} weight="light" />
              </a>
            </div>
          </div>

          <nav aria-label="Shop">
            <h2 className="t-meta mb-5">Shop</h2>
            <ul className="flex flex-col gap-3">
              {SHOP.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-grow inline-flex min-h-11 items-center text-[0.9375rem] text-ink-dim hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Help">
            <h2 className="t-meta mb-5">Help</h2>
            <ul className="flex flex-col gap-3">
              {HELP.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-grow inline-flex min-h-11 items-center text-[0.9375rem] text-ink-dim hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="t-meta mb-5">Legal</h2>
            <ul className="flex flex-col gap-3">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-grow inline-flex min-h-11 items-center text-[0.9375rem] text-ink-dim hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-line pt-7 md:flex-row md:items-center md:justify-between">
          <p className="t-meta">&copy; {year} Enchanted Style</p>
          <p className="t-meta">Cash on delivery across Lebanon</p>
        </div>
      </div>
    </footer>
  )
}
