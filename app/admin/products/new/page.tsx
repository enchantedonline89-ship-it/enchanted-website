import { createClient } from '@/lib/supabase/server'
import ProductForm from '@/components/admin/ProductForm'

export default async function NewProductPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order')

  return (
    <div className="p-8">
      <div className="mb-8">
        <a href="/admin/products" className="text-muted hover:text-gold text-sm transition-colors">← Back to Products</a>
        <h1 className="font-display text-3xl text-foreground mt-3">Add New Product</h1>
      </div>
      <ProductForm categories={categories ?? []} mode="create" />
    </div>
  )
}
