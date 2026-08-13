import type { ReactNode } from "react"
import Navbar from "./Navbar"
import Footer from "./Footer"
import CartDrawer from "./CartDrawer"
import WhatsAppFloat from "./WhatsAppFloat"

/**
 * Shared frame for the reading surfaces: policies, guides, contact, orders.
 * Mode is Read, so the job is comprehension. Measure is capped, headings carry
 * themselves, and the page keeps the same navigation and cart as the storefront.
 */
export default function PageShell({
  title,
  standfirst,
  meta,
  children,
  wide = false,
}: {
  title: string
  standfirst?: string
  meta?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <>
      <Navbar />

      <main id="main" className="pt-[68px]">
        <header className="border-b border-line px-5 py-16 lg:px-10 lg:py-24">
          <div className={`mx-auto ${wide ? "max-w-[1440px]" : "max-w-3xl"}`}>
            <h1 className="t-section max-w-[20ch] text-ink">{title}</h1>
            {standfirst && <p className="t-body mt-5">{standfirst}</p>}
            {meta && <p className="t-meta mt-7">{meta}</p>}
          </div>
        </header>

        <div className="px-5 py-16 lg:px-10 lg:py-20">
          <div className={`mx-auto ${wide ? "max-w-[1440px]" : "max-w-3xl"} prose-paper`}>
            {children}
          </div>
        </div>
      </main>

      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
    </>
  )
}
