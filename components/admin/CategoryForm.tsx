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
        await supabase.from('admin_logs').insert({ admin_email: user.email ?? 'unknown', action: 'CREATE', entity_type: 'category', entity_id: data.id, entity_name: data.name, changes: { before: null, after: data } })
      } else {
        const { data: before } = await supabase.from('categories').select().eq('id', category!.id).single()
        const { data, error: dbError } = await supabase.from('categories').update(payload).eq('id', category!.id).select().single()
        if (dbError) throw dbError
        await supabase.from('admin_logs').insert({ admin_email: user.email ?? 'unknown', action: 'UPDATE', entity_type: 'category', entity_id: data.id, entity_name: data.name, changes: { before, after: data } })
      }

      await fetch('/api/revalidate', { method: 'POST' })
      router.push('/admin/categories')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      if (msg === 'SESSION_EXPIRED') {
        setError('Your session has expired. Please sign in again.')
      } else if (msg.includes('duplicate key') || msg.includes('unique')) {
        setError('A category with this name or slug already exists.')
      } else {
        setError('Failed to save category. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:border-gold/50 placeholder:text-muted transition-colors"
  const labelClass = "block text-sm text-muted mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <label className={labelClass}>Category Name *</label>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required className={inputClass} placeholder="e.g. Heels & Stilettos" />
        {form.name && <p className="text-muted/60 text-xs mt-1">Slug: {slugify(form.name)}</p>}
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inputClass + ' resize-none'} />
      </div>

      <ImageUpload value={form.image_url} onChange={url => set('image_url', url)} label="Category Image" />

      <div className="flex gap-4 items-end">
        <div>
          <label className={labelClass}>Sort Order</label>
          <input type="number" min="0" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} className={inputClass} style={{width: '120px'}} />
        </div>
        <label className="flex items-center gap-3 cursor-pointer pb-3">
          <div onClick={() => set('is_active', !form.is_active)} className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-gold' : 'bg-border'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm text-muted">Active</span>
        </label>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="bg-gold hover:bg-gold-light text-black text-sm font-semibold px-8 py-3 rounded-lg transition-all duration-200 disabled:opacity-50">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Category' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()} className="bg-foreground/5 hover:bg-foreground/10 text-muted hover:text-foreground text-sm px-6 py-3 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
