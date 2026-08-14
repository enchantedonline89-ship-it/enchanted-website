import Link from "next/link"
import Image from "next/image"

/**
 * The supplied wordmark, cropped out of the ring lockup so it sits comfortably
 * in a 68px navigation bar. The full ring lockup lives at
 * /brand/logo-mark.png and is used where there is room to give it air.
 *
 * The mark is gold on transparent, which only reads on a light ground. That is
 * one of the reasons the site is built on paper rather than on ink.
 */
export default function Logo({
  className = "",
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const width = { sm: 116, md: 140, lg: 190 }[size]
  const height = Math.round((width * 393) / 900)

  return (
    <Link
      href="/"
      aria-label="Enchanted Style, home"
      className={`seasonal-logo relative inline-flex items-center transition-opacity duration-200 hover:opacity-75 ${className}`}
    >
      <Image
        src="/brand/logo-wordmark.png"
        alt="Enchanted Style"
        width={width}
        height={height}
        priority
        sizes={`${width}px`}
        className="h-auto w-auto"
        style={{ width, height }}
      />
      <span className="seasonal-logo-accent" aria-hidden="true" />
    </Link>
  )
}
