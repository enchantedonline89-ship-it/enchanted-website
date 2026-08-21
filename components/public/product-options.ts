import type { Product, ProductColor, ProductVariant } from '@/types'

export interface ProductSizeOption {
  label: string
  inStock: boolean
  variantId: string | null
}

export interface ProductOptionState {
  colors: ProductColor[]
  hasColors: boolean
  inventoryManaged: boolean
  requiresColor: boolean
  requiresSize: boolean
  sizes: ProductSizeOption[]
  selectedColor: ProductColor | null
  selectedVariant: ProductVariant | null
  canAdd: boolean
  isOutOfStock: boolean
}

function variantAvailable(variant: ProductVariant): boolean {
  return variant.is_active && variant.in_stock
}

function variantsForColor(product: Product, colorId: string | null): ProductVariant[] {
  const colors = product.colors ?? []
  const variants = product.variants ?? []
  if (colors.length > 0) {
    if (!colorId) return []
    return variants.filter((variant) => variant.color_id === colorId)
  }
  return variants.filter((variant) => variant.color_id === null)
}

export function colorIsInStock(product: Product, colorId: string): boolean {
  return variantsForColor(product, colorId).some(variantAvailable)
}

/** Derive the selectable UI state from normalized catalog inventory. */
export function productOptionState(
  product: Product,
  selectedColorId: string | null,
  selectedSize: string | null,
): ProductOptionState {
  const colors = product.colors ?? []
  const variants = product.variants ?? []
  const hasColors = colors.length > 0
  const selectedColor = hasColors
    ? colors.find((color) => color.id === selectedColorId) ?? null
    : null
  const requiresColor = hasColors && selectedColor === null
  const relevantVariants = variantsForColor(product, selectedColor?.id ?? null)
  const inventoryManaged = Boolean(
    product.inventory_tracked || hasColors || variants.length > 0,
  )

  const variantSizes = new Map<string, ProductVariant[]>()
  for (const variant of relevantVariants) {
    if (variant.size === null) continue
    const group = variantSizes.get(variant.size) ?? []
    group.push(variant)
    variantSizes.set(variant.size, group)
  }

  const sizes: ProductSizeOption[] = variantSizes.size > 0
    ? Array.from(variantSizes, ([label, matches]) => {
        const available = matches.find(variantAvailable)
        return {
          label,
          inStock: Boolean(available),
          variantId: (available ?? matches[0])?.id ?? null,
        }
      })
    : inventoryManaged
      ? []
      : (product.sizes ?? []).map((label) => ({
          label,
          inStock: true,
          variantId: null,
        }))

  const requiresSize = sizes.length > 0
  const selectedVariant = inventoryManaged
    ? relevantVariants.find((variant) =>
        requiresSize ? variant.size === selectedSize : variant.size === null,
      ) ?? null
    : null
  const selectionInStock = requiresSize
    ? inventoryManaged
      ? Boolean(selectedSize && selectedVariant && variantAvailable(selectedVariant))
      : Boolean(selectedSize)
    : inventoryManaged
      ? Boolean(selectedVariant && variantAvailable(selectedVariant))
      : true
  const colorReady = !hasColors || selectedColor !== null
  const anyStock = inventoryManaged
    ? relevantVariants.some(variantAvailable)
    : true

  return {
    colors,
    hasColors,
    inventoryManaged,
    requiresColor,
    requiresSize,
    sizes,
    selectedColor,
    selectedVariant,
    canAdd: colorReady && selectionInStock,
    isOutOfStock: colorReady && !anyStock,
  }
}
