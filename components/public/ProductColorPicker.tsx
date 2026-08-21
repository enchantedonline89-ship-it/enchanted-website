import type { Product, ProductColor } from '@/types'
import { colorIsInStock } from './product-options'

function swatchLabel(color: ProductColor, inStock: boolean): string {
  return `${color.name} (${color.hex_code})${inStock ? '' : ', out of stock'}`
}

export default function ProductColorPicker({
  product,
  selectedColorId,
  onSelect,
}: {
  product: Product
  selectedColorId?: string | null
  onSelect?: (color: ProductColor) => void
}) {
  const colors = product.colors ?? []
  if (colors.length === 0) return null

  if (!onSelect) {
    return (
      <div className="mt-3 flex flex-wrap gap-2" role="list" aria-label="Available colors">
        {colors.map((color) => {
          const inStock = colorIsInStock(product, color.id)
          return (
            <span
              key={color.id}
              role="listitem"
              aria-label={swatchLabel(color, inStock)}
              title={swatchLabel(color, inStock)}
              className={inStock ? '' : 'opacity-45'}
            >
              <span
                aria-hidden="true"
                className="block h-6 w-6 rounded-full border border-line-strong shadow-[inset_0_0_0_2px_rgba(255,255,255,0.72)]"
                style={{ backgroundColor: color.hex_code }}
              />
            </span>
          )
        })}
      </div>
    )
  }

  const selected = colors.find((color) => color.id === selectedColorId)
  return (
    <fieldset>
      <legend className="t-meta">
        Color{selected ? ` — ${selected.name}` : ''}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {colors.map((color) => {
          const active = color.id === selectedColorId
          const inStock = colorIsInStock(product, color.id)
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onSelect(color)}
              aria-label={`Select ${swatchLabel(color, inStock)}`}
              aria-pressed={active}
              title={swatchLabel(color, inStock)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                active
                  ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-paper'
                  : 'border-line-strong hover:border-ink'
              } ${inStock ? '' : 'opacity-45'}`}
            >
              <span
                aria-hidden="true"
                className="h-7 w-7 rounded-full border border-line-strong shadow-[inset_0_0_0_2px_rgba(255,255,255,0.72)]"
                style={{ backgroundColor: color.hex_code }}
              />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
