import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProductForm from '@/components/admin/ProductForm'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*, category:categories(*)').eq('id', id).single(),
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
  ])

  if (!product) notFound()

  return (
    <div className="p-8">
      <div className="mb-8">
        <a href="/admin/products" className="text-muted hover:text-gold text-sm transition-colors">← Back to Products</a>
        <h1 className="font-display text-3xl text-foreground mt-3">Edit Product</h1>
        <p className="text-muted text-sm mt-1">{product.name}</p>
      </div>
      <ProductForm product={product} categories={categories ?? []} mode="edit" />
    </div>
  )
}
