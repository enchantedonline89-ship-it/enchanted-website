import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import Navbar from "@/components/public/Navbar"
import Footer from "@/components/public/Footer"
import CartDrawer from "@/components/public/CartDrawer"
import WhatsAppFloat from "@/components/public/WhatsAppFloat"
import ProductGallery from "@/components/public/ProductGallery"
import ProductBuyBox from "@/components/public/ProductBuyBox"
import ProductCard from "@/components/public/ProductCard"
import { findBySlug, productHref } from "@/lib/product-url"
import { mockProducts, mockCategories, isSupabaseMockMode } from "@/lib/mock-data"
import type { Category, Product, SizeSystem } from "@/types"

export const revalidate = 3600

async function loadCatalog(): Promise<{ products: Product[]; categories: Category[] }> {
  if (isSupabaseMockMode()) {
    return { products: mockProducts, categories: mockCategories }
  }
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase
        .from("products")
        .select("*, category:categories(id, name, slug, size_system)")
        .eq("is_active", true),
      supabase.from("categories").select("*").eq("is_active", true),
    ])
    if (!p?.length) return { products: mockProducts, categories: mockCategories }
    return { products: p as Product[], categories: (c ?? []) as Category[] }
  } catch {
    return { products: mockProducts, categories: mockCategories }
  }
}

async function resolve(slug: string) {
  const { products, categories } = await loadCatalog()
  const product = findBySlug(products, slug)
  if (!product) return null
  const category =
    product.category ?? categories.find((c) => c.id === product.category_id) ?? null
  return { product, category, products }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const found = await resolve(slug)
  if (!found) return { title: "Piece not found" }

  const { product } = found
  const description =
    product.description ??
    `${product.name} from Enchanted Style. Cash on delivery anywhere in Lebanon.`

  return {
    title: product.name,
    description,
    alternates: { canonical: productHref(product) },
    openGraph: {
      title: product.name,
      description,
      url: productHref(product),
      type: "website",
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const found = await resolve(slug)
  if (!found) notFound()

  const { product, category, products } = found
  const sizeSystem: SizeSystem = (category?.size_system as SizeSystem) ?? "none"

  // Same category first, topped up from the rest so a strip is never left with
  // two items in it.
  const sameCategory = products.filter(
    (p) => p.id !== product.id && p.category_id === product.category_id,
  )
  const topUp = products.filter(
    (p) => p.id !== product.id && p.category_id !== product.category_id,
  )
  const related = [...sameCategory, ...topUp].slice(0, 4)
  const relatedHeading =
    sameCategory.length >= 4 && category ? `More in ${category.name}` : "More from the shop"

  const details: Array<[string, string]> = []
  if (product.materials) details.push(["Materials", product.materials])
  if (product.heel_height_cm) details.push(["Heel height", `${product.heel_height_cm} cm`])
  if (category?.name) details.push(["Category", category.name])

  /* Only what can be verified from real data. No rating, no review count. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    image: [product.image_url, ...(product.additional_images ?? [])].filter(Boolean),
    ...(product.price != null
      ? {
          offers: {
            "@type": "Offer",
            price: product.price.toFixed(2),
            priceCurrency: "USD",
            availability: product.is_active
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main id="main" className="pt-[68px]">
        <div className="mx-auto max-w-[1440px] lg:grid lg:grid-cols-2 lg:gap-12 lg:px-10 lg:py-14">
          <div className="lg:min-w-0">
            <ProductGallery product={product} />
            {product.model_note && (
              <p className="t-meta px-5 py-3 normal-case tracking-normal lg:px-0">
                {product.model_note}
              </p>
            )}
          </div>

          {/* Sticky on desktop so the buy box stays with a tall gallery. */}
          <div className="px-5 pb-16 pt-8 lg:sticky lg:top-[92px] lg:self-start lg:px-0 lg:pt-0">
            <h1
              className="text-ink"
              style={{
                fontFamily: "var(--font-cormorant), ui-serif, Georgia, serif",
                fontSize: "clamp(1.75rem, 5.5vw, 2.5rem)",
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              {product.name}
            </h1>

            <p className="tnum mt-3 text-[1.125rem] text-ink">
              {product.price != null ? `$${product.price.toFixed(2)}` : "Price on request"}
            </p>

            {category && (
              <p className="t-meta mt-2">
                <Link href={`/#catalog`} className="link-grow">
                  {category.name}
                </Link>
              </p>
            )}

            <ProductBuyBox product={product} sizeSystem={sizeSystem} />

            {product.description && (
              <div className="mt-10 border-t border-line pt-8">
                <p className="t-body">{product.description}</p>
              </div>
            )}

            {details.length > 0 && (
              <dl className="mt-8 border-t border-line text-[0.875rem]">
                {details.map(([term, value]) => (
                  <div key={term} className="flex justify-between gap-6 border-b border-line py-3">
                    <dt className="t-meta">{term}</dt>
                    <dd className="text-right text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <p className="t-body mt-8 text-[0.875rem]">
              Not sure about your size? Send us your usual size on WhatsApp and we
              will tell you what to order in this piece.
            </p>

            <details className="mt-8 border-t border-line pt-4">
              <summary className="t-meta flex min-h-11 cursor-pointer items-center text-ink">
                Delivery and returns
              </summary>
              <div className="prose-paper mt-4 text-[0.875rem]">
                <p>
                  Delivery is $3 in Beirut and $4 everywhere else in Lebanon, 1 to 3
                  business days in Beirut and 2 to 5 elsewhere. You pay the driver in
                  cash when it arrives.
                </p>
                <p>
                  You have 10 days from receipt to return anything unworn and unwashed
                  with its tags attached. Full terms are on the{" "}
                  <Link href="/returns">returns page</Link>.
                </p>
              </div>
            </details>
          </div>
        </div>

        {related.length > 0 && (
          <section
            aria-labelledby="related-heading"
            className="border-t border-line px-5 py-16 lg:px-10 lg:py-20"
          >
            <div className="mx-auto max-w-[1440px]">
              <h2 id="related-heading" className="t-section text-ink">
                {relatedHeading}
              </h2>
              <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
                {related.map((p) => (
                  <li key={p.id}>
                    {/* Link only. Adding an unseen piece to the cart from a strip
                        is exactly the wrong-size order this page exists to stop. */}
                    <ProductCard product={p} linkOnly />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
    </>
  )
}
