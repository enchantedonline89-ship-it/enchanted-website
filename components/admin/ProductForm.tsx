'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Product, Category } from '@/types'
import ImageUpload from './ImageUpload'
import { createClient } from '@/lib/supabase/client'

interface Props {
  product?: Product
  categories: Category[]
  mode: 'create' | 'edit'
}

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42']

export default function ProductForm({ product, categories, mode }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    category_id: product?.category_id ?? '',
    price: product?.price?.toString() ?? '',
    image_url: product?.image_url ?? '',
    sizes: product?.sizes ?? [] as string[],
    is_featured: product?.is_featured ?? false,
    is_active: product?.is_active ?? true,
    sort_order: product?.sort_order ?? 0,
  })

  const set = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }))

  const toggleSize = (size: string) => {
    set('sizes', form.sizes.includes(size)
      ? form.sizes.filter(s => s !== size)
      : [...form.sizes, size]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Product name is required'); return }
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        price: form.price ? parseFloat(form.price) : null,
        image_url: form.image_url || null,
        sizes: form.sizes.length > 0 ? form.sizes : null,
        is_featured: form.is_featured,
        is_active: form.is_active,
        sort_order: form.sort_order,
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('SESSION_EXPIRED')

      if (mode === 'create') {
        const { data, error: dbError } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single()
        if (dbError) throw dbError

        await supabase.from('admin_logs').insert({
          admin_email: user.email ?? 'unknown',
          action: 'CREATE',
          entity_type: 'product',
          entity_id: data.id,
          entity_name: data.name,
          changes: { before: null, after: data }
        })
      } else {
        const { data: before } = await supabase.from('products').select().eq('id', product!.id).single()
        const { data, error: dbError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product!.id)
          .select()
          .single()
        if (dbError) throw dbError

        await supabase.from('admin_logs').insert({
          admin_email: user.email ?? 'unknown',
          action: 'UPDATE',
          entity_type: 'product',
          entity_id: data.id,
          entity_name: data.name,
          changes: { before, after: data }
        })
      }

      // Trigger ISR revalidation (auth checked server-side)
      await fetch('/api/revalidate', { method: 'POST' })
      router.push('/admin/products')
      router.refresh()
    } catch (err) {
      // Sanitize error messages — never expose raw DB error strings
      const msg = err instanceof Error ? err.message : 'unknown'
      if (msg === 'SESSION_EXPIRED') {
        setError('Your session has expired. Please sign in again.')
      } else if (msg.includes('duplicate key') || msg.includes('unique')) {
        setError('A product with this name or slug already exists.')
      } else {
        setError(`Save failed: ${msg}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:border-gold/50 placeholder:text-muted transition-colors"
  const labelClass = "block text-sm text-muted mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Name */}
      <div>
        <label className={labelClass}>Product Name *</label>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required className={inputClass} placeholder="e.g. Velvet Gold-Strap Stiletto" />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputClass + ' resize-none'} placeholder="Describe the product..." />
      </div>

      {/* Category + Price */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className={inputClass + ' cursor-pointer'}>
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Price (USD)</label>
          <input type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)} className={inputClass} placeholder="0.00" />
        </div>
      </div>

      {/* Image */}
      <ImageUpload value={form.image_url} onChange={url => set('image_url', url)} />

      {/* Sizes */}
      <div>
        <label className={labelClass}>Available Sizes</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                form.sizes.includes(size)
                  ? 'bg-gold/20 border-gold text-gold'
                  : 'bg-card border-border text-muted hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-6">
        {[
          { key: 'is_featured', label: 'Featured Product' },
          { key: 'is_active', label: 'Active (visible)' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set(key, !form[key as keyof typeof form])}
              className={`relative w-11 h-6 rounded-full transition-colors ${(form[key as keyof typeof form] as boolean) ? 'bg-gold' : 'bg-border'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(form[key as keyof typeof form] as boolean) ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm text-muted">{label}</span>
          </label>
        ))}
      </div>

      {/* Sort Order */}
      <div>
        <label className={labelClass}>Sort Order</label>
        <input type="number" min="0" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} className={inputClass} style={{width: '120px'}} />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-gold hover:bg-gold-light text-black text-sm font-semibold px-8 py-3 rounded-lg transition-all duration-200 disabled:opacity-50"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-foreground/5 hover:bg-foreground/10 text-muted hover:text-foreground text-sm px-6 py-3 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
