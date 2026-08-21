'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Category, SizeSystem } from '@/types'
import { slugify } from '@/lib/utils'
import { adminCatalogRequest } from '@/lib/admin-catalog-client'
import ImageUpload from './ImageUpload'

interface Props { category?: Category; mode: 'create' | 'edit' }

export default function CategoryForm({ category, mode }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: category?.name ?? '',
    description: category?.description ?? '',
    image_url: category?.image_url ?? '',
    size_system: category?.size_system ?? 'none' as SizeSystem,
    sort_order: category?.sort_order ?? 0,
    is_active: category?.is_active ?? true,
  })

  const set = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Category name is required'); return }
    setSaving(true)
    setError(null)

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        size_system: form.size_system,
        sort_order: form.sort_order,
        is_active: form.is_active,
      }
      await adminCatalogRequest(mode === 'create' ? '/api/admin/categories' : `/api/admin/categories/${category!.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        body: JSON.stringify(payload),
      })
      router.push('/admin/categories')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The category could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "field"
  const labelClass = "block text-sm text-ink-dim mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && <div role="alert" className="bg-signal-error/10 border border-signal-error/30 text-signal-error text-sm px-4 py-3">{error}</div>}

      <div>
        <label htmlFor="category-name" className={labelClass}>Category Name *</label>
        <input id="category-name" type="text" value={form.name} onChange={e => set('name', e.target.value)} required className={inputClass} placeholder="e.g. Heels & Stilettos" />
        {form.name && <p className="text-ink-dim/60 text-xs mt-1">Slug: {slugify(form.name)}</p>}
      </div>

      <div>
        <label htmlFor="category-description" className={labelClass}>Description</label>
        <textarea id="category-description" value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inputClass + ' resize-none'} />
      </div>

      <ImageUpload value={form.image_url} onChange={url => set('image_url', url)} label="Category Image" />

      <div>
        <label htmlFor="category-size-system" className={labelClass}>Size system</label>
        <select id="category-size-system" value={form.size_system} onChange={e => set('size_system', e.target.value as SizeSystem)} className={inputClass}>
          <option value="none">No standard sizes</option>
          <option value="letter_clothing">Clothing (XS–XXL)</option>
          <option value="eu_footwear">Footwear (EU)</option>
        </select>
        <p className="mt-1 text-xs text-ink-dim">Controls the size choices available to products in this category.</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="category-sort" className={labelClass}>Sort Order</label>
          <input id="category-sort" type="number" min="0" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} className={inputClass} style={{width: '120px'}} />
        </div>
        <label className="flex items-center gap-3 cursor-pointer pb-3">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="peer sr-only" />
          <span className={`relative block w-11 h-6 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${form.is_active ? 'bg-ink' : 'bg-line'}`}>
            <span className={`absolute top-0.5 left-0.5 block w-5 h-5 bg-paper shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
          </span>
          <span className="text-sm text-ink-dim">Active</span>
        </label>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Category' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  )
}
