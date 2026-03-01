'use client'

import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryFilterProps {
  categories: Category[]
  activeSlug: string | null
  onSelect: (slug: string | null) => void
}

export default function CategoryFilter({
  categories,
  activeSlug,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {/* "All" pill */}
      <button
        onClick={() => onSelect(null)}
        data-hover
        className={cn(
          'category-pill',
          'whitespace-nowrap px-5 py-2 text-xs tracking-widest uppercase font-medium transition-colors',
          activeSlug === null
            ? 'text-[#c9a84c] active'
            : 'text-muted hover:text-foreground'
        )}
      >
        All
      </button>

      {/* Category pills */}
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.slug)}
          data-hover
          className={cn(
            'category-pill',
            'whitespace-nowrap px-5 py-2 text-xs tracking-widest uppercase font-medium transition-colors',
            activeSlug === category.slug
              ? 'text-[#c9a84c] active'
              : 'text-muted hover:text-foreground'
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
