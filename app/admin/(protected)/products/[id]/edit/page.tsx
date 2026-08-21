import { notFound } from 'next/navigation'
import ProductForm from '@/components/admin/ProductForm'
import { requireAdmin } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import { getAdminProduct, getAdminCategory, listAdminCategories } from '@/lib/admin-catalog'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()
  const db = await getD1Database()
  if (!db) throw new Error('Catalog database is unavailable.')
  const [product, activeCategories] = await Promise.all([
    getAdminProduct(db, id),
    listAdminCategories(db, { activeOnly: true }),
  ])

  if (!product) notFound()
  const currentCategory = product.category_id && !activeCategories.some(category => category.id === product.category_id)
    ? await getAdminCategory(db, product.category_id)
    : null
  const categories = currentCategory ? [currentCategory, ...activeCategories] : activeCategories

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <a href="/admin/products" className="text-ink-dim hover:text-ink text-sm transition-colors">Back to products</a>
        <h1 className="text-3xl text-ink mt-3">Edit Product</h1>
        <p className="text-ink-dim text-sm mt-1">{product.name}</p>
      </div>
      <ProductForm product={product} categories={categories} mode="edit" />
    </div>
  )
}
