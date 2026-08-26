import type { Category, Product } from '@/types'

/**
 * Product URLs are `/product/<name-slug>-<first 6 of id>`.
 *
 * Resolution matches on the id fragment ONLY; the name part is decoration for
 * humans and for search. That means renaming a product never breaks a link
 * anyone has already shared on WhatsApp, and there is no slug column to keep
 * unique, no uniqueness constraint and no trigger to maintain.
 */

const ID_LEN = 6

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function productSlug(product: Pick<Product, 'id' | 'name'>): string {
  const name = slugify(product.name)
  const ref = product.id.replace(/-/g, '').slice(0, ID_LEN)
  return name ? `${name}-${ref}` : ref
}

export function productHref(product: Pick<Product, 'id' | 'name'>): string {
  return `/product/${productSlug(product)}`
}

export function categoryHref(category: Pick<Category, 'slug'>): string {
  return `/category/${category.slug}`
}

/** Everything after the last hyphen: the id fragment. */
export function refFromSlug(slug: string): string {
  return (slug.split('-').pop() ?? '').toLowerCase()
}

function refOf(product: Pick<Product, 'id'>): string {
  return product.id.replace(/-/g, '').slice(0, ID_LEN).toLowerCase()
}

/**
 * Match on the full slug first, then fall back to the id fragment alone so a
 * renamed product still resolves from a link someone shared months ago.
 *
 * No length assumption about the fragment, so imported identifiers continue to
 * resolve even when they are not UUIDs.
 */
export function findBySlug<T extends Pick<Product, 'id' | 'name'>>(
  products: T[],
  slug: string,
): T | undefined {
  const wanted = slug.toLowerCase()
  const exact = products.find((p) => productSlug(p).toLowerCase() === wanted)
  if (exact) return exact

  const ref = refFromSlug(slug)
  if (!ref) return undefined
  return products.find((p) => refOf(p) === ref)
}
