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
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <a href="/admin/products" className="text-ink-dim hover:text-ink text-sm transition-colors">Back to products</a>
        <h1 className="text-3xl text-ink mt-3">Edit Product</h1>
        <p className="text-ink-dim text-sm mt-1">{product.name}</p>
      </div>
      <ProductForm product={product} categories={categories ?? []} mode="edit" />
    </div>
  )
}
