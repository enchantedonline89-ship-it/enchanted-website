'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Promotion, PromotionScope } from '@/lib/promotions'

type CategoryOption = { id: string; name: string }

interface FormState {
  name: string
  description: string
  scope: PromotionScope
  category_id: string
  discount_percent: string
  starts_at: string
  ends_at: string
  is_active: boolean
}

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 16)
}

function emptyForm(): FormState {
  return {
    name: '',
    description: '',
    scope: 'sitewide',
    category_id: '',
    discount_percent: '10',
    starts_at: toLocalInput(new Date().toISOString()),
    ends_at: '',
    is_active: true,
  }
}

function statusOf(promotion: Promotion): { label: string; className: string } {
  const now = Date.now()
  if (!promotion.is_active) return { label: 'Paused', className: 'bg-ink/8 text-ink-dim' }
  if (Date.parse(promotion.starts_at) > now) return { label: 'Scheduled', className: 'bg-gold/25 text-gold-deep' }
  if (promotion.ends_at && Date.parse(promotion.ends_at) <= now) {
    return { label: 'Ended', className: 'bg-ink/8 text-ink-dim' }
  }
  return { label: 'Live', className: 'bg-signal-ok/10 text-signal-ok' }
}

function readableDate(value: string | null): string {
  if (!value) return 'No end date'
  return new Intl.DateTimeFormat('en-LB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function PromotionManager({
  initialPromotions,
  categories,
}: {
  initialPromotions: Promotion[]
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...initialPromotions].sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at)),
    [initialPromotions],
  )

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function edit(promotion: Promotion) {
    setEditingId(promotion.id)
    setForm({
      name: promotion.name,
      description: promotion.description ?? '',
      scope: promotion.scope,
      category_id: promotion.category_id ?? '',
      discount_percent: String(promotion.discount_percent),
      starts_at: toLocalInput(promotion.starts_at),
      ends_at: toLocalInput(promotion.ends_at),
      is_active: promotion.is_active,
    })
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() {
    setEditingId(null)
    setForm(emptyForm())
    setError(null)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      ...form,
      category_id: form.scope === 'category' ? form.category_id : null,
      discount_percent: Number(form.discount_percent),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    }

    try {
      const response = await fetch(
        editingId ? `/api/admin/promotions/${editingId}` : '/api/admin/promotions',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not save that event.')
      reset()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save that event.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(promotion: Promotion) {
    if (!window.confirm(`Delete “${promotion.name}”? This cannot be undone.`)) return
    setDeletingId(promotion.id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/promotions/${promotion.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not delete that event.')
      if (editingId === promotion.id) reset()
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete that event.')
    } finally {
      setDeletingId(null)
    }
  }

  async function toggle(promotion: Promotion) {
    setTogglingId(promotion.id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/promotions/${promotion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: promotion.name,
          description: promotion.description,
          scope: promotion.scope,
          category_id: promotion.category_id,
          discount_percent: Number(promotion.discount_percent),
          starts_at: promotion.starts_at,
          ends_at: promotion.ends_at,
          is_active: !promotion.is_active,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not change that event.')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not change that event.')
    } finally {
      setTogglingId(null)
    }
  }

  const label = 'mb-1.5 block text-sm text-ink-dim'

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(20rem,30rem)_1fr] xl:items-start">
      <form onSubmit={submit} className="border border-line bg-paper-raised p-5 sm:p-6 xl:sticky xl:top-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="t-meta">{editingId ? 'Editing event' : 'New event'}</p>
            <h2 className="mt-1 text-xl text-ink">{editingId ? 'Update campaign' : 'Schedule a campaign'}</h2>
          </div>
          {editingId && <button type="button" onClick={reset} className="btn btn-ghost">Cancel</button>}
        </div>

        {error && <p role="alert" className="mb-5 border border-signal-error/30 bg-signal-error/10 px-3 py-2 text-sm text-signal-error">{error}</p>}

        <div className="space-y-5">
          <div>
            <label htmlFor="promotion-name" className={label}>Event name</label>
            <input id="promotion-name" required maxLength={100} className="field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Christmas Weekend" />
          </div>
          <div>
            <label htmlFor="promotion-description" className={label}>Storefront message</label>
            <textarea id="promotion-description" maxLength={300} rows={2} className="field resize-none" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="A short optional message for shoppers" />
          </div>
          <fieldset>
            <legend className={label}>Discount applies to</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['sitewide', 'category'] as const).map((scope) => (
                <button key={scope} type="button" aria-pressed={form.scope === scope} onClick={() => set('scope', scope)} className={`min-h-11 border px-3 text-sm ${form.scope === scope ? 'border-ink bg-ink text-paper' : 'border-line text-ink-dim'}`}>
                  {scope === 'sitewide' ? 'Entire site' : 'One category'}
                </button>
              ))}
            </div>
          </fieldset>
          {form.scope === 'category' && (
            <div>
              <label htmlFor="promotion-category" className={label}>Category</label>
              <select id="promotion-category" required className="field" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                <option value="">Choose a category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="promotion-percent" className={label}>Discount percentage</label>
            <div className="relative">
              <input id="promotion-percent" required type="number" min="0.01" max="100" step="0.01" className="field pr-10" value={form.discount_percent} onChange={(e) => set('discount_percent', e.target.value)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim">%</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="promotion-start" className={label}>Starts</label>
              <input id="promotion-start" required type="datetime-local" className="field" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
            </div>
            <div>
              <label htmlFor="promotion-end" className={label}>Ends (optional)</label>
              <input id="promotion-end" type="datetime-local" className="field" value={form.ends_at} min={form.starts_at} onChange={(e) => set('ends_at', e.target.value)} />
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            <span className="text-sm text-ink">Enabled</span>
            <span className="text-xs text-ink-dim">Only enabled events can go live.</span>
          </label>
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary mt-6 w-full">
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create event'}
        </button>
      </form>

      <section aria-labelledby="campaign-list-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="campaign-list-heading" className="text-2xl text-ink">Campaigns</h2>
            <p className="mt-1 text-sm text-ink-dim">{sorted.length} total</p>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="border border-dashed border-line px-5 py-16 text-center text-sm text-ink-dim">No events yet. Create the first campaign.</div>
        ) : (
          <ul className="space-y-3">
            {sorted.map((promotion) => {
              const status = statusOf(promotion)
              return (
                <li key={promotion.id} className="border border-line bg-paper-raised p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg text-ink">{promotion.name}</h3>
                        <span className={`px-2 py-1 text-[0.6875rem] ${status.className}`}>{status.label}</span>
                      </div>
                      <p className="mt-2 text-sm text-ink">
                        <strong className="tnum font-medium">{Number(promotion.discount_percent).toLocaleString()}% off</strong>
                        {' · '}{promotion.scope === 'sitewide' ? 'Entire site' : promotion.category?.name ?? 'Category'}
                      </p>
                      {promotion.description && <p className="mt-2 text-sm leading-6 text-ink-dim">{promotion.description}</p>}
                      <dl className="mt-3 grid gap-1 text-xs text-ink-dim sm:grid-cols-2 sm:gap-x-6">
                        <div><dt className="inline">Starts: </dt><dd className="inline tnum">{readableDate(promotion.starts_at)}</dd></div>
                        <div><dt className="inline">Ends: </dt><dd className="inline tnum">{readableDate(promotion.ends_at)}</dd></div>
                      </dl>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" disabled={togglingId === promotion.id} onClick={() => toggle(promotion)} className="btn btn-ghost">
                        {togglingId === promotion.id ? 'Saving…' : promotion.is_active ? 'Pause' : 'Activate'}
                      </button>
                      <button type="button" onClick={() => edit(promotion)} className="btn btn-ghost">Edit</button>
                      <button type="button" disabled={deletingId === promotion.id} onClick={() => remove(promotion)} className="btn btn-ghost text-signal-error">
                        {deletingId === promotion.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
