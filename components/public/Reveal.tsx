import type { ReactNode } from "react"

/**
 * Semantic wrapper retained as a tiny server component. The former one-off
 * viewport animation pulled the full Motion runtime into the home route.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: "div" | "section" | "li" | "article"
}) {
  const Tag = as
  void delay

  return <Tag className={className}>{children}</Tag>
}
