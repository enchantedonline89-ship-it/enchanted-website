"use client"

import Link from "next/link"
import { X } from "@phosphor-icons/react/ssr"
import { useOverlay } from "@/lib/use-overlay"
import type { SizeSystem } from "@/types"

/**
 * The size chart as an overlay rather than a page navigation.
 *
 * Navigating to /size-guide would lose the size the customer had already picked,
 * because chip state is local. This shows ONLY the chart matching the category,
 * never both tables, so nobody reads a clothing row for a shoe.
 */

const FOOTWEAR: Array<[string, string, string]> = [
  ["36", "3", "5.5"],
  ["37", "4", "6.5"],
  ["38", "5", "7.5"],
  ["39", "6", "8.5"],
  ["40", "7", "9.5"],
  ["41", "8", "10.5"],
]

const CLOTHING: Array<[string, string, string, string]> = [
  ["XS", "82-84", "62-64", "88-90"],
  ["S", "86-88", "66-68", "92-94"],
  ["M", "90-92", "70-72", "96-98"],
  ["L", "94-96", "74-76", "100-102"],
  ["XL", "98-100", "78-80", "104-106"],
]

export default function SizeGuideSheet({
  open,
  onClose,
  system,
}: {
  open: boolean
  onClose: () => void
  system: SizeSystem
}) {
  const dialogRef = useOverlay<HTMLDivElement>(open, onClose)

  if (!open || system === "none") return null

  return (
    <div className="fixed inset-0 z-[92] flex items-end justify-center sm:items-center">
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/45"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto border border-line bg-paper-raised"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-paper-raised px-5 py-4">
          <h2 id="size-guide-title" className="t-meta text-ink">
            {system === "eu_footwear" ? "Footwear sizes" : "Clothing sizes"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-ink"
            aria-label="Close"
          >
            <X size={19} weight="light" />
          </button>
        </div>

        <div className="prose-paper px-5 py-6">
          {system === "eu_footwear" ? (
            <table>
              <thead>
                <tr>
                  <th>EU</th>
                  <th>UK</th>
                  <th>US women&apos;s</th>
                </tr>
              </thead>
              <tbody>
                {FOOTWEAR.map(([eu, uk, us]) => (
                  <tr key={eu}>
                    <td>{eu}</td>
                    <td>{uk}</td>
                    <td>{us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Bust cm</th>
                  <th>Waist cm</th>
                  <th>Hips cm</th>
                </tr>
              </thead>
              <tbody>
                {CLOTHING.map(([s, b, w, h]) => (
                  <tr key={s}>
                    <td>{s}</td>
                    <td>{b}</td>
                    <td>{w}</td>
                    <td>{h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p>
            Still unsure? Send us your usual size on WhatsApp and we will tell you
            what to order in this piece.
          </p>
          <p>
            <Link href="/size-guide" className="link-grow">
              Open the full size guide
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
