import { createClient } from '@/lib/supabase/server'
import { Category } from '@/types'
import { formatDate } from '@/lib/utils'
import DeleteCategoryButton from './DeleteCategoryButton'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase.from('categories').select('*').order('sort_order')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-white">Categories</h1>
          <p className="text-muted text-sm mt-1">{categories?.length ?? 0} categories</p>
        </div>
        <a href="/admin/categories/new" className="bg-gold hover:bg-gold-light text-obsidian text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-200">
          + Add Category
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(categories ?? []).map((c: Category) => (
          <div key={c.id} className="bg-surface border border-border rounded-xl overflow-hidden">
            {c.image_url && (
              <img src={c.image_url} alt={c.name} className="w-full h-32 object-cover" />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-white font-medium">{c.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${c.is_active ? 'text-green-400 bg-green-400/10' : 'text-muted bg-white/5'}`}>
                  {c.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <p className="text-muted text-xs mb-1">/{c.slug}</p>
              {c.description && <p className="text-muted/70 text-xs mt-2 line-clamp-2">{c.description}</p>}
              <div className="flex gap-2 mt-4">
                <a href={`/admin/categories/${c.id}/edit`} className="text-xs text-muted hover:text-gold px-3 py-1.5 rounded border border-border hover:border-gold/30 transition-colors">
                  Edit
                </a>
                <DeleteCategoryButton id={c.id} name={c.name} />
              </div>
            </div>
          </div>
        ))}
        {(!categories || categories.length === 0) && (
          <p className="col-span-full text-center text-muted py-16">No categories yet. <a href="/admin/categories/new" className="text-gold hover:underline">Add your first →</a></p>
        )}
      </div>
    </div>
  )
}
