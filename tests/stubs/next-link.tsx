/**
 * Test stub for `next/link`.
 * Renders a plain <a> and suppresses the jsdom "navigation not implemented"
 * noise, while still invoking any onClick handler the component attached.
 */
import * as React from 'react'

export interface StubLinkProps {
  href: string | { pathname?: string }
  children?: React.ReactNode
  className?: string
  target?: string
  rel?: string
  id?: string
  'aria-label'?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  prefetch?: boolean
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
}

export default function Link(props: StubLinkProps) {
  const resolved = typeof props.href === 'string' ? props.href : (props.href?.pathname ?? '#')

  return (
    <a
      href={resolved}
      className={props.className}
      target={props.target}
      rel={props.rel}
      id={props.id}
      aria-label={props['aria-label']}
      onClick={e => {
        e.preventDefault()
        props.onClick?.(e)
      }}
    >
      {props.children}
    </a>
  )
}
