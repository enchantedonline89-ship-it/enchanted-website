import { formatPrice, formatDate } from '@/lib/utils'
import DeleteProductButton from './DeleteProductButton'
import { requireAdmin } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import { listAdminProducts } from '@/lib/admin-catalog'
import ProductCsvImport from '@/components/admin/ProductCsvImport'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  await requireAdmin()
  const db = await getD1Database()
  if (!db) throw new Error('Catalog database is unavailable.')
  const products = await listAdminProducts(db)

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
        <div>
          <h1 className="text-3xl text-ink">Products</h1>
          <p className="text-ink-dim text-sm mt-1">{products.length} total products</p>
        </div>
        <a href="/admin/products/new" className="btn btn-primary">
          + Add Product
        </a>
      </div>

      <ProductCsvImport />

      <div className="bg-paper-raised border border-line overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="border-b border-line">
            <tr>
              {['Product', 'Category', 'Price', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left text-ink-dim text-xs uppercase tracking-wider px-5 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-ink/[0.04] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {p.image_url && (
                      // Admin accepts owner-supplied HTTPS hosts that cannot be
                      // safely enumerated in next/image remotePatterns.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover flex-shrink-0 bg-paper-raised" />
                    )}
                    <div>
                      <p className="text-ink font-medium">{p.name}</p>
                      {p.is_featured && <span className="text-ink text-xs">Featured</span>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-ink-dim">{(p.category as { name: string } | null)?.name ?? ' - '}</td>
                <td className="px-5 py-4 text-ink font-medium">{formatPrice(p.price)}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${p.is_active ? 'text-signal-ok bg-signal-ok/10' : 'text-ink-dim bg-ink/8'}`}>
                    {p.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-5 py-4 text-ink-dim text-xs">{formatDate(p.created_at)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <a href={`/admin/products/${p.id}/edit`} className="text-ink-dim hover:text-ink text-xs px-3 py-1.5 border border-line hover:border-ink/30 transition-colors">
                      Edit
                    </a>
                    {p.is_active && <DeleteProductButton id={p.id} name={p.name} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="text-center text-ink-dim py-16">No products yet. <a href="/admin/products/new" className="text-ink hover:underline">Add your first product</a></p>
        )}
        </div>
      </div>
    </div>
  )
}
