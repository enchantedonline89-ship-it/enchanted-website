import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/public/Navbar'
import Footer from '@/components/public/Footer'
import CartDrawer from '@/components/public/CartDrawer'
import WhatsAppFloat from '@/components/public/WhatsAppFloat'
import ProductCard from '@/components/public/ProductCard'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import JsonLd from '@/components/seo/JsonLd'
import { absoluteUrl, SITE_NAME } from '@/components/seo/site'
import { getCatalog } from '@/lib/catalog'
import { categoryHref, productHref } from '@/lib/product-url'

export const revalidate = 300

async function resolve(slug: string) {
  const catalog = await getCatalog()
  const category = catalog.categories.find(item => item.slug === slug)
  if (!category) return null
  return {
    category,
    products: catalog.products.filter(product => product.category_id === category.id),
    source: catalog.source,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = await resolve((await params).slug)
  if (!found) return { title: 'Category not found' }
  const description = found.category.description
    ?? `Shop ${found.category.name} from Enchanted Style with cash on delivery across Lebanon.`
  const image = found.category.image_url ? absoluteUrl(found.category.image_url) : null
  return {
    title: found.category.name,
    description,
    robots: found.source === 'live' ? undefined : { index: false, follow: true },
    alternates: { canonical: categoryHref(found.category) },
    openGraph: {
      title: found.category.name,
      description,
      url: absoluteUrl(categoryHref(found.category)),
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_LB',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: found.category.name,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const found = await resolve((await params).slug)
  if (!found) return notFound()
  const { category, products, source } = found
  const list = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} at ${SITE_NAME}`,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(productHref(product)),
      name: product.name,
      ...(product.image_url ? { image: absoluteUrl(product.image_url) } : {}),
    })),
  }

  return (
    <>
      {source === 'live' && <JsonLd data={list} />}
      <BreadcrumbJsonLd items={[{ name: category.name, path: categoryHref(category) }]} />
      <Navbar />
      <main id="main" className="pt-[68px]">
        <header className="border-b border-line px-5 py-16 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-[1440px]">
            <p className="t-meta">Shop by category</p>
            <h1 className="t-section mt-4 text-ink">{category.name}</h1>
            {category.description && <p className="t-body mt-5 max-w-2xl">{category.description}</p>}
          </div>
        </header>
        <section className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10 lg:py-20">
          {products.length ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-14 md:grid-cols-3 md:gap-x-6 lg:gap-x-8 lg:gap-y-20">
              {products.map(product => <li key={product.id}><ProductCard product={product} /></li>)}
            </ul>
          ) : (
            <p className="t-body">No in-stock pieces are listed in this category yet.</p>
          )}
        </section>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
    </>
  )
}
