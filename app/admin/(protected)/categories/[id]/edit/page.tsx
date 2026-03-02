import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CategoryForm from '@/components/admin/CategoryForm'

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: category } = await supabase.from('categories').select('*').eq('id', id).single()
  if (!category) notFound()

  return (
    <div className="p-8">
      <div className="mb-8">
        <a href="/admin/categories" className="text-muted hover:text-gold text-sm transition-colors">← Back to Categories</a>
        <h1 className="font-display text-3xl text-foreground mt-3">Edit Category</h1>
        <p className="text-muted text-sm mt-1">{category.name}</p>
      </div>
      <CategoryForm category={category} mode="edit" />
    </div>
  )
}
