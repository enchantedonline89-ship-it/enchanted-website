/**
 * Test stub for `next/image`.
 * Renders a plain <img> so jsdom does not need the Next.js image runtime.
 * Next-only props (fill, priority, sizes, quality, …) are simply not forwarded,
 * so React never warns about unknown DOM attributes.
 */
import * as React from 'react'

export interface StubImageProps {
  src: string
  alt: string
  className?: string
  id?: string
  style?: React.CSSProperties
  fill?: boolean
  priority?: boolean
  sizes?: string
  quality?: number
  placeholder?: string
  blurDataURL?: string
  unoptimized?: boolean
  width?: number | string
  height?: number | string
}

export default function Image(props: StubImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} className={props.className} id={props.id} style={props.style} />
  )
}
