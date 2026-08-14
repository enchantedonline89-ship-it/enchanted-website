"use client"

import type { Category } from "@/types"

/**
 * Text navigation, not pills. The active item is set in ink with a rule under it,
 * so nothing needs a coloured chip or a dot to read as selected.
 */
export default function CategoryFilter({
  categories,
  active,
  onChange,
  counts,
}: {
  categories: Category[]
  active: string
  onChange: (slug: string) => void
  counts: Record<string, number>
}) {
  const items = [{ id: "all", name: "Shop All", slug: "all" }, ...categories]

  return (
    <div className="track-scroll -mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
      <div className="flex min-w-max items-center gap-7" role="group" aria-label="Filter by category">
        {items.map((cat) => {
          const isActive = active === cat.slug
          const count = cat.slug === "all" ? counts.all : (counts[cat.slug] ?? 0)
          return (
            <button
              key={cat.id}
              aria-pressed={isActive}
              onClick={() => onChange(cat.slug)}
              className={`relative flex min-h-11 shrink-0 items-end pb-2.5 text-[0.9375rem] transition-colors ${
                isActive ? "text-ink" : "text-ink-faint hover:text-ink-dim"
              }`}
            >
              {cat.name}
              <span className="tnum ml-1.5 align-super text-[0.625rem] text-ink-faint">
                {count}
              </span>
              <span
                className={`absolute inset-x-0 bottom-0 h-px origin-left bg-ink transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
                  isActive ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
