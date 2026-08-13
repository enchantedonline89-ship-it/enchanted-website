import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Two compositions, because a gown and a headline cannot share one column.
 *
 * Phone: a stack. Words first, then the gown beneath them at full width and
 * full opacity. It previously sat behind the type pushed off the right edge,
 * which cut a third of the dress away and read as a broken image rather than
 * as a design choice.
 *
 * Desktop: side by side, type left and gown right, where there is room for both.
 *
 * Either way the gown is a plain server-rendered <Image> with `priority`, so it
 * IS the LCP element and paints without waiting for JavaScript. `visual` carries
 * the WebGL dust on top and is purely additive.
 */
export default function Hero({ visual }: { visual?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-paper lg:flex lg:min-h-[88dvh] lg:items-center">
      {/* Desktop only: the gown sits behind the type, on the right. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-[2%] hidden w-[46%] lg:block"
      >
        <Image
          src="/brand/hero.webp"
          alt=""
          fill
          priority
          sizes="46vw"
          className="anim-settle object-contain"
        />
      </div>

      {/* Gold dust, over everything */}
      <div className="pointer-events-none absolute inset-0">{visual}</div>

      <div className="relative mx-auto w-full max-w-[1440px] px-5 pt-24 lg:px-10 lg:pb-24">
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

      {/* Phone only: the whole gown, under the words, nothing cropped. */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative mx-auto mt-10 aspect-[897/1280] w-[86%] max-w-sm lg:hidden"
      >
        <Image
          src="/brand/hero.webp"
          alt=""
          fill
          priority
          sizes="86vw"
          className="anim-settle object-contain"
        />
      </div>
    </section>
  )
}
