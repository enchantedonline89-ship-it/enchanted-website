import { createClient } from '@/lib/supabase/server'
import { Product } from '@/types'
import { formatPrice, formatDate } from '@/lib/utils'
import DeleteProductButton from './DeleteProductButton'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-foreground">Products</h1>
          <p className="text-muted text-sm mt-1">{products?.length ?? 0} total products</p>
        </div>
        <a href="/admin/products/new" className="bg-gold hover:bg-gold-light text-black text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-200">
          + Add Product
        </a>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              {['Product', 'Category', 'Price', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} className="text-left text-muted text-xs uppercase tracking-wider px-5 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(products ?? []).map((p: Product) => (
              <tr key={p.id} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-card" />
                    )}
                    <div>
                      <p className="text-foreground font-medium">{p.name}</p>
                      {p.is_featured && <span className="text-gold text-xs">★ Featured</span>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-muted">{(p.category as { name: string } | null)?.name ?? '—'}</td>
                <td className="px-5 py-4 text-gold font-medium">{formatPrice(p.price)}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${p.is_active ? 'text-green-400 bg-green-400/10' : 'text-muted bg-foreground/5'}`}>
                    {p.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-5 py-4 text-muted text-xs">{formatDate(p.created_at)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <a href={`/admin/products/${p.id}/edit`} className="text-muted hover:text-gold text-xs px-3 py-1.5 rounded border border-border hover:border-gold/30 transition-colors">
                      Edit
                    </a>
                    <DeleteProductButton id={p.id} name={p.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!products || products.length === 0) && (
          <p className="text-center text-muted py-16">No products yet. <a href="/admin/products/new" className="text-gold hover:underline">Add your first product →</a></p>
        )}
      </div>
    </div>
  )
}
