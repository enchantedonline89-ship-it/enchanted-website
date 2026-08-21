import { requireAdmin } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import { listAdminCategories } from '@/lib/admin-catalog'
import DeleteCategoryButton from './DeleteCategoryButton'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  await requireAdmin()
  const db = await getD1Database()
  if (!db) throw new Error('Catalog database is unavailable.')
  const categories = await listAdminCategories(db)

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-ink">Categories</h1>
          <p className="text-ink-dim text-sm mt-1">{categories.length} categories</p>
        </div>
        <a href="/admin/categories/new" className="btn btn-primary">
          + Add Category
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(c => (
          <div key={c.id} className="bg-paper-raised border border-line overflow-hidden">
            {c.image_url && (
              // Admin accepts owner-supplied HTTPS hosts that cannot be safely
              // enumerated in next/image remotePatterns.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image_url} alt={c.name} className="w-full h-32 object-cover" />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-ink font-medium">{c.name}</h3>
                <span className={`text-xs px-2 py-0.5 ${c.is_active ? 'text-signal-ok bg-signal-ok/10' : 'text-ink-dim bg-ink/8'}`}>
                  {c.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <p className="text-ink-dim text-xs mb-1">/{c.slug}</p>
              {c.description && <p className="text-ink-dim/70 text-xs mt-2 line-clamp-2">{c.description}</p>}
              <div className="flex gap-2 mt-4">
                <a href={`/admin/categories/${c.id}/edit`} className="text-xs text-ink-dim hover:text-ink px-3 py-1.5 border border-line hover:border-ink/30 transition-colors">
                  Edit
                </a>
                {c.is_active && <DeleteCategoryButton id={c.id} name={c.name} />}
              </div>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="col-span-full text-center text-ink-dim py-16">No categories yet. <a href="/admin/categories/new" className="text-ink hover:underline">Add your first</a></p>
        )}
      </div>
    </div>
  )
}
