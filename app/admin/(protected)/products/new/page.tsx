import ProductForm from '@/components/admin/ProductForm'
import { requireAdmin } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import { listAdminCategories } from '@/lib/admin-catalog'

export default async function NewProductPage() {
  await requireAdmin()
  const db = await getD1Database()
  if (!db) throw new Error('Catalog database is unavailable.')
  const categories = await listAdminCategories(db, { activeOnly: true })

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <a href="/admin/products" className="text-ink-dim hover:text-ink text-sm transition-colors">Back to products</a>
        <h1 className="text-3xl text-ink mt-3">Add New Product</h1>
      </div>
      <ProductForm categories={categories} mode="create" />
    </div>
  )
}
