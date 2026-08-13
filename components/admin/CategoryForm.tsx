'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Category } from '@/types'
import { slugify } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
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
      const supabase = createClient()
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.name),
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('SESSION_EXPIRED')

      if (mode === 'create') {
        const { data, error: dbError } = await supabase.from('categories').insert(payload).select().single()
        if (dbError) throw dbError
        const { error: logError } = await supabase.from('admin_logs').insert({ admin_email: user.email ?? 'unknown', action: 'CREATE', entity_type: 'category', entity_id: data.id, entity_name: data.name, changes: { before: null, after: data } })
        if (logError) throw new Error('AUDIT_LOG_FAILED')
      } else {
        const { data: before, error: beforeError } = await supabase.from('categories').select().eq('id', category!.id).single()
        if (beforeError) throw beforeError
        const { data, error: dbError } = await supabase.from('categories').update(payload).eq('id', category!.id).select().single()
        if (dbError) throw dbError
        const { error: logError } = await supabase.from('admin_logs').insert({ admin_email: user.email ?? 'unknown', action: 'UPDATE', entity_type: 'category', entity_id: data.id, entity_name: data.name, changes: { before, after: data } })
        if (logError) throw new Error('AUDIT_LOG_FAILED')
      }

      const revalidateResponse = await fetch('/api/revalidate', { method: 'POST' })
      if (!revalidateResponse.ok) throw new Error('REVALIDATION_FAILED')
      router.push('/admin/categories')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      if (msg === 'SESSION_EXPIRED') {
        setError('Your session has expired. Please sign in again.')
      } else if (msg === 'AUDIT_LOG_FAILED') {
        setError('The category was saved, but its audit entry failed. Please contact support.')
      } else if (msg === 'REVALIDATION_FAILED') {
        setError('The category was saved, but the storefront refresh failed. Refresh it manually.')
      } else if (msg.includes('duplicate key') || msg.includes('unique')) {
        setError('A category with this name or slug already exists.')
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && <div className="bg-signal-error/10 border border-signal-error/30 text-signal-error text-sm px-4 py-3">{error}</div>}

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

      <div className="flex gap-4 items-end">
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
