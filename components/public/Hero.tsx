import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Type on the left, the gown on the right, gold dust drifting over both.
 *
 * The gown is a plain server-rendered <Image> with `priority`, so it IS the LCP
 * element and paints without waiting for any JavaScript. `visual` carries the
 * WebGL dust layer on top of it and is purely additive: the headline, rule,
 * subtext and CTA are all readable before it loads, and the page is complete
 * without it if WebGL is unavailable or motion is reduced.
 *
 * On a phone the gown is pushed mostly off the right edge and softened, so it
 * reads as an atmosphere behind the words rather than fighting them for the
 * one column of space there is.
 */
export default function Hero({ visual }: { visual?: ReactNode }) {
  return (
    <section className="relative flex min-h-[88dvh] items-center overflow-hidden bg-paper">
      {/* The gown */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-[-30%] w-[85%] opacity-45 sm:right-[-14%] sm:w-[62%] sm:opacity-70 lg:right-[2%] lg:w-[46%] lg:opacity-100"
      >
        <Image
          src="/brand/hero.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 85vw, (max-width: 1024px) 62vw, 46vw"
          className="anim-settle object-contain object-bottom"
        />
      </div>

      {/* Gold dust, over the gown */}
      <div className="pointer-events-none absolute inset-0">{visual}</div>

      <div className="relative mx-auto w-full max-w-[1440px] px-5 pb-16 pt-24 lg:px-10 lg:pb-24">
        <h1 className="t-display max-w-[24ch] text-ink">
          <span className="mask-line">
            <span>Dressed for the evenings </span>
          </span>
          <span className="mask-line">
            <span className="anim-delay-1 italic">you remember.</span>
          </span>
        </h1>

        <hr className="rule-gold anim-clear anim-delay-2 mt-8 w-24" />

        <p className="anim-clear anim-delay-2 t-body mt-7 max-w-[38ch]">
          Heels, dresses and the pieces that finish a look. Cash on delivery,
          anywhere in Lebanon.
        </p>

        <div className="anim-clear anim-delay-3 mt-9">
          <Link href="/#catalog" className="btn btn-gold">
            Shop the catalog
          </Link>
        </div>
      </div>
    </section>
  )
}
