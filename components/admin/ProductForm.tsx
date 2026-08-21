'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Product, Category } from '@/types'
import GalleryUpload from './GalleryUpload'
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
    additional_images: product?.additional_images ?? [] as string[],
    sizes: product?.sizes ?? [] as string[],
    fit_advice: product?.fit_advice ?? '',
    materials: product?.materials ?? '',
    heel_height_cm: product?.heel_height_cm?.toString() ?? '',
    model_note: product?.model_note ?? '',
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
        additional_images:
          form.additional_images.length > 0 ? form.additional_images : null,
        sizes: form.sizes.length > 0 ? form.sizes : null,
        fit_advice: form.fit_advice || null,
        materials: form.materials.trim() || null,
        heel_height_cm: form.heel_height_cm ? parseFloat(form.heel_height_cm) : null,
        model_note: form.model_note.trim() || null,
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

        const { error: logError } = await supabase.from('admin_logs').insert({
          admin_email: user.email ?? 'unknown',
          action: 'CREATE',
          entity_type: 'product',
          entity_id: data.id,
          entity_name: data.name,
          changes: { before: null, after: data }
        })
        if (logError) throw new Error('AUDIT_LOG_FAILED')
      } else {
        const { data: before, error: beforeError } = await supabase.from('products').select().eq('id', product!.id).single()
        if (beforeError) throw beforeError
        const { data, error: dbError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product!.id)
          .select()
          .single()
        if (dbError) throw dbError

        const { error: logError } = await supabase.from('admin_logs').insert({
          admin_email: user.email ?? 'unknown',
          action: 'UPDATE',
          entity_type: 'product',
          entity_id: data.id,
          entity_name: data.name,
          changes: { before, after: data }
        })
        if (logError) throw new Error('AUDIT_LOG_FAILED')
      }

      // Trigger ISR revalidation (auth checked server-side)
      const revalidateResponse = await fetch('/api/revalidate', { method: 'POST' })
      if (!revalidateResponse.ok) throw new Error('REVALIDATION_FAILED')
      router.push('/admin/products')
      router.refresh()
    } catch (err) {
      // Sanitize error messages - never expose raw DB error strings
      const msg = err instanceof Error ? err.message : 'unknown'
      if (msg === 'SESSION_EXPIRED') {
        setError('Your session has expired. Please sign in again.')
      } else if (msg === 'AUDIT_LOG_FAILED') {
        setError('The product was saved, but its audit entry failed. Please contact support.')
      } else if (msg === 'REVALIDATION_FAILED') {
        setError('The product was saved, but the storefront refresh failed. Refresh it manually.')
      } else if (msg.includes('duplicate key') || msg.includes('unique')) {
        setError('A product with this name or slug already exists.')
      } else {
        setError(`Save failed: ${msg}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "field"
  const labelClass = "block text-sm text-ink-dim mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div role="alert" className="bg-signal-error/10 border border-signal-error/30 text-signal-error text-sm px-4 py-3">{error}</div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="product-name" className={labelClass}>Product Name *</label>
        <input id="product-name" type="text" value={form.name} onChange={e => set('name', e.target.value)} required className={inputClass} placeholder="e.g. Velvet Gold-Strap Stiletto" />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="product-description" className={labelClass}>Description</label>
        <textarea id="product-description" value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={inputClass + ' resize-none'} placeholder="Describe the product..." />
      </div>

      {/* Category + Price */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="product-category" className={labelClass}>Category</label>
          <select id="product-category" value={form.category_id} onChange={e => set('category_id', e.target.value)} className={inputClass + ' cursor-pointer'}>
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="product-price" className={labelClass}>Price (USD)</label>
          <input id="product-price" type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)} className={inputClass} placeholder="0.00" />
        </div>
      </div>

      <fieldset className="grid gap-4 border border-line p-4 sm:grid-cols-2">
        <legend className="t-meta px-2">Product-page details</legend>
        <div>
          <label htmlFor="product-fit" className={labelClass}>Fit advice</label>
          <select id="product-fit" value={form.fit_advice} onChange={e => set('fit_advice', e.target.value)} className={inputClass}>
            <option value="">Not specified</option>
            <option value="true_to_size">True to size</option>
            <option value="size_up">Size up</option>
            <option value="size_down">Size down</option>
          </select>
        </div>
        <div>
          <label htmlFor="product-heel" className={labelClass}>Heel height (cm)</label>
          <input id="product-heel" type="number" min="0" step="0.1" value={form.heel_height_cm} onChange={e => set('heel_height_cm', e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="product-materials" className={labelClass}>Materials</label>
          <input id="product-materials" value={form.materials} onChange={e => set('materials', e.target.value)} className={inputClass} placeholder="e.g. Satin upper, synthetic sole" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="product-model-note" className={labelClass}>Model note</label>
          <input id="product-model-note" value={form.model_note} onChange={e => set('model_note', e.target.value)} className={inputClass} placeholder="e.g. Model is 1.68 m and wears a 38" />
        </div>
      </fieldset>

      {/* Photos. Cover plus gallery, ordered. */}
      <GalleryUpload
        cover={form.image_url}
        extra={form.additional_images}
        onChange={({ cover, extra }) => {
          set('image_url', cover)
          set('additional_images', extra)
        }}
      />

      {/* Sizes */}
      <div>
        <label className={labelClass}>Available Sizes</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors ${ form.sizes.includes(size) ? 'bg-ink/20 border-ink text-ink' : 'bg-paper-raised border-line text-ink-dim hover:border-line-strong hover:text-ink' }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {[
          { key: 'is_featured', label: 'Featured Product' },
          { key: 'is_active', label: 'Active (visible)' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form[key as 'is_featured' | 'is_active']}
              onChange={e => set(key, e.target.checked)}
              className="peer sr-only"
            />
            <span className={`relative block w-11 h-6 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${(form[key as 'is_featured' | 'is_active']) ? 'bg-ink' : 'bg-line'}`}>
              <span className={`absolute top-0.5 left-0.5 block w-5 h-5 bg-paper shadow transition-transform ${(form[key as keyof typeof form] as boolean) ? 'translate-x-5' : 'translate-x-0'}`} />
            </span>
            <span className="text-sm text-ink-dim">{label}</span>
          </label>
        ))}
      </div>

      {/* Sort Order */}
      <div>
        <label htmlFor="product-sort" className={labelClass}>Sort Order</label>
        <input id="product-sort" type="number" min="0" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} className={inputClass} style={{width: '120px'}} />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
