'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Category } from '@/types'
import type { AdminProduct } from '@/lib/admin-catalog'
import { adminCatalogRequest } from '@/lib/admin-catalog-client'
import GalleryUpload from './GalleryUpload'
import ImageUpload from './ImageUpload'

interface Props {
  product?: AdminProduct
  categories: Category[]
  mode: 'create' | 'edit'
}

interface ColorDraft {
  id: string | null
  ref: string
  name: string
  hex_code: string
  image_url: string
}

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42']
const optionKey = (colorRef: string | null, size: string | null) => `${colorRef ?? ''}|${size ?? ''}`

function initialColors(product?: AdminProduct): ColorDraft[] {
  return (product?.colors ?? []).filter(color => color.is_active).map(color => ({
    id: color.id,
    ref: color.id,
    name: color.name,
    hex_code: color.hex_code,
    image_url: color.image_url ?? '',
  }))
}

function initialStock(product: AdminProduct | undefined, colors: ColorDraft[]) {
  const refsById = new Map(colors.filter(color => color.id).map(color => [color.id, color.ref]))
  return Object.fromEntries((product?.variants ?? []).filter(variant => variant.is_active).map(variant => [
    optionKey(variant.color_id ? refsById.get(variant.color_id) ?? null : null, variant.size),
    variant.stock_quantity === null ? '' : String(variant.stock_quantity),
  ]))
}

export default function ProductForm({ product, categories, mode }: Props) {
  const router = useRouter()
  const startingColors = initialColors(product)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colors, setColors] = useState<ColorDraft[]>(startingColors)
  const [inventoryEnabled, setInventoryEnabled] = useState(product?.inventory_tracked ?? false)
  const [stock, setStock] = useState<Record<string, string>>(() => initialStock(product, startingColors))
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    category_id: product?.category_id ?? '',
    price: product?.price?.toFixed(2) ?? '',
    image_url: product?.image_url ?? '',
    additional_images: product?.additional_images ?? [] as string[],
    sizes: product?.sizes ?? [] as string[],
    fit_advice: product?.fit_advice ?? '',
    materials: product?.materials ?? '',
    heel_height_cm: product?.heel_height_cm?.toString() ?? '',
    model_note: product?.model_note ?? '',
    is_featured: product?.is_featured ?? false,
    is_active: product?.is_active ?? false,
    sort_order: product?.sort_order ?? 0,
  })

  const set = (key: string, value: unknown) => setForm(current => ({ ...current, [key]: value }))
  const toggleSize = (size: string) => set('sizes', form.sizes.includes(size)
    ? form.sizes.filter(item => item !== size)
    : [...form.sizes, size])

  function addColor() {
    setInventoryEnabled(true)
    setColors(current => [...current, {
      id: null,
      ref: `new-${crypto.randomUUID()}`,
      name: '',
      hex_code: '#C8A951',
      image_url: '',
    }])
  }

  function updateColor(ref: string, patch: Partial<ColorDraft>) {
    setColors(current => current.map(color => color.ref === ref ? { ...color, ...patch } : color))
  }

  function variantsPayload() {
    if (!inventoryEnabled) return []
    const colorRefs = colors.length ? colors.map(color => color.ref) : [null]
    const sizes = form.sizes.length ? form.sizes : [null]
    return colorRefs.flatMap(colorRef => sizes.map(size => {
      const value = stock[optionKey(colorRef, size)] ?? ''
      return {
        color_ref: colorRef,
        size,
        sku: null,
        stock_quantity: value === '' ? null : Number(value),
      }
    }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const variants = variantsPayload()
    if (form.is_active) {
      const missing = !form.price
        ? 'Add a price before making this product active.'
        : !form.category_id
          ? 'Choose a category before making this product active.'
          : !form.image_url
            ? 'Add a cover photo before making this product active.'
            : !inventoryEnabled || !variants.some((variant) => variant.stock_quantity === null || variant.stock_quantity > 0)
              ? 'Add at least one in-stock option before making this product active.'
              : null
      if (missing) {
        setError(missing)
        return
      }
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim(),
        materials: form.materials.trim(),
        model_note: form.model_note.trim(),
        category_id: form.category_id || null,
        colors: colors.map((color, index) => ({
          id: color.id,
          ref: color.ref,
          name: color.name.trim(),
          hex_code: color.hex_code.toUpperCase(),
          image_url: color.image_url,
          sort_order: index,
        })),
        variants,
      }
      await adminCatalogRequest(mode === 'create' ? '/api/admin/products' : `/api/admin/products/${product!.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        body: JSON.stringify(payload),
      })
      router.push('/admin/products')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The product could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'field'
  const labelClass = 'mb-1.5 block text-sm text-ink-dim'
  const colorOptions = colors.length
    ? colors.map(color => ({ ref: color.ref, label: color.name || 'Unnamed color' }))
    : [{ ref: null, label: 'All colors' }]
  const sizeOptions = form.sizes.length ? form.sizes : [null]

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-7">
      {error && <div role="alert" className="border border-signal-error/30 bg-signal-error/10 px-4 py-3 text-sm text-signal-error">{error}</div>}
      {mode === 'create' && (
        <p className="border border-line bg-paper-sunken px-4 py-3 text-sm text-ink-dim">
          New products start hidden. Add the selling details and stock below, then make the product active when it is ready.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="product-name" className={labelClass}>Product name *</label>
          <input id="product-name" value={form.name} onChange={event => set('name', event.target.value)} required maxLength={180} className={inputClass} />
        </div>
        <div>
          <label htmlFor="product-sku" className={labelClass}>Product SKU</label>
          <input id="product-sku" value={form.sku} onChange={event => set('sku', event.target.value.toUpperCase())} maxLength={60} className={inputClass} placeholder="DRESS-RUBY" />
        </div>
        <div>
          <label htmlFor="product-price" className={labelClass}>Price (USD){form.is_active ? ' *' : ''}</label>
          <input id="product-price" type="number" inputMode="decimal" step="0.01" min="0" value={form.price} onChange={event => set('price', event.target.value)} required={form.is_active} className={inputClass} placeholder="0.00" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="product-description" className={labelClass}>Description</label>
          <textarea id="product-description" value={form.description} onChange={event => set('description', event.target.value)} rows={4} maxLength={5000} className={`${inputClass} resize-y`} />
        </div>
        <div>
          <label htmlFor="product-category" className={labelClass}>Category{form.is_active ? ' *' : ''}</label>
          <select id="product-category" value={form.category_id} onChange={event => set('category_id', event.target.value)} required={form.is_active} className={inputClass}>
            <option value="">No category</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}{category.is_active ? '' : ' (hidden)'}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="product-sort" className={labelClass}>Sort order</label>
          <input id="product-sort" type="number" min="0" max="100000" value={form.sort_order} onChange={event => set('sort_order', Number(event.target.value))} className={inputClass} />
        </div>
      </div>

      <GalleryUpload cover={form.image_url} extra={form.additional_images} onChange={({ cover, extra }) => setForm(current => ({ ...current, image_url: cover, additional_images: extra }))} />

      <fieldset className="border border-line p-4 sm:p-5">
        <legend className="t-meta px-2">Sizes</legend>
        <div className="flex flex-wrap gap-2">
          {COMMON_SIZES.map(size => {
            const selected = form.sizes.includes(size)
            return (
              <button key={size} type="button" aria-pressed={selected} onClick={() => toggleSize(size)} className={`min-h-11 min-w-11 border px-3 text-xs font-medium transition-colors ${selected ? 'border-ink bg-ink text-paper' : 'border-line bg-paper-raised text-ink-dim hover:border-ink'}`}>
                {size}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="border border-line p-4 sm:p-5">
        <legend className="t-meta px-2">Colors</legend>
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
          <button type="button" onClick={addColor} className="btn btn-ghost">+ Add color</button>
        </div>
        {colors.length === 0 ? (
          <p className="text-sm text-ink-dim">No color options. Add one when customers need to choose a color.</p>
        ) : (
          <div className="space-y-4">
            {colors.map((color, index) => (
              <div key={color.ref} className="grid gap-4 border border-line bg-paper-raised p-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`color-name-${color.ref}`} className={labelClass}>Color name</label>
                    <input id={`color-name-${color.ref}`} value={color.name} onChange={event => updateColor(color.ref, { name: event.target.value })} maxLength={60} required className={inputClass} placeholder="Ruby red" />
                  </div>
                  <div>
                    <label htmlFor={`color-hex-${color.ref}`} className={labelClass}>Hex color</label>
                    <div className="flex items-center gap-2">
                      <input aria-label={`${color.name || `Color ${index + 1}`} color picker`} type="color" value={color.hex_code} onChange={event => updateColor(color.ref, { hex_code: event.target.value.toUpperCase() })} className="h-11 w-12 cursor-pointer border border-line bg-transparent p-1" />
                      <span role="img" aria-label={`${color.name || `Color ${index + 1}`} swatch, ${color.hex_code}`} className="h-7 w-7 shrink-0 rounded-full border border-ink/20" style={{ backgroundColor: color.hex_code }} />
                      <input id={`color-hex-${color.ref}`} value={color.hex_code} onChange={event => updateColor(color.ref, { hex_code: event.target.value.toUpperCase() })} pattern="#[0-9A-Fa-f]{6}" maxLength={7} className={inputClass} aria-label={`${color.name || `Color ${index + 1}`} hex value`} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <ImageUpload inputId={`color-image-${color.ref}`} label={`${color.name || `Color ${index + 1}`} image (optional)`} value={color.image_url} onChange={url => updateColor(color.ref, { image_url: url })} />
                  </div>
                </div>
                <button type="button" onClick={() => setColors(current => current.filter(item => item.ref !== color.ref))} className="self-start border border-line px-3 py-2 text-xs text-ink-dim transition-colors hover:border-signal-error hover:text-signal-error" aria-label={`Remove ${color.name || `color ${index + 1}`}`}>
                  Remove color
                </button>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="border border-line p-4 sm:p-5">
        <legend className="t-meta px-2">Inventory</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={inventoryEnabled} disabled={form.is_active || colors.length > 0} onChange={event => setInventoryEnabled(event.target.checked)} className="h-4 w-4" />
          <span className="text-sm text-ink">Track stock by selected color and size</span>
        </label>
        {(form.is_active || colors.length > 0) && <p className="mt-1 text-xs text-ink-dim">Stock options are required for active products and products with colors.</p>}
        {inventoryEnabled && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead><tr className="border-b border-line"><th className="px-2 py-2 text-left font-normal text-ink-dim">Option</th><th className="px-2 py-2 text-left font-normal text-ink-dim">Stock (blank = unlimited)</th></tr></thead>
              <tbody className="divide-y divide-line">
                {colorOptions.flatMap(color => sizeOptions.map(size => {
                  const key = optionKey(color.ref, size)
                  const label = [color.label, size ? `size ${size}` : null].filter(Boolean).join(', ')
                  return (
                    <tr key={key}>
                      <td className="px-2 py-2 text-ink">{label}</td>
                      <td className="px-2 py-2"><input aria-label={`Stock for ${label}`} type="number" inputMode="numeric" min="0" max="1000000" step="1" value={stock[key] ?? ''} onChange={event => setStock(current => ({ ...current, [key]: event.target.value }))} className="field max-w-40" placeholder="Unlimited" /></td>
                    </tr>
                  )
                }))}
              </tbody>
            </table>
          </div>
        )}
      </fieldset>

      <fieldset className="grid gap-4 border border-line p-4 sm:grid-cols-2 sm:p-5">
        <legend className="t-meta px-2">Product-page details</legend>
        <div><label htmlFor="product-fit" className={labelClass}>Fit advice</label><select id="product-fit" value={form.fit_advice} onChange={event => set('fit_advice', event.target.value)} className={inputClass}><option value="">Not specified</option><option value="true_to_size">True to size</option><option value="size_up">Size up</option><option value="size_down">Size down</option></select></div>
        <div><label htmlFor="product-heel" className={labelClass}>Heel height (cm)</label><input id="product-heel" type="number" min="0" max="100" step="0.1" value={form.heel_height_cm} onChange={event => set('heel_height_cm', event.target.value)} className={inputClass} /></div>
        <div className="sm:col-span-2"><label htmlFor="product-materials" className={labelClass}>Materials</label><input id="product-materials" value={form.materials} onChange={event => set('materials', event.target.value)} maxLength={500} className={inputClass} /></div>
        <div className="sm:col-span-2"><label htmlFor="product-model-note" className={labelClass}>Model note</label><input id="product-model-note" value={form.model_note} onChange={event => set('model_note', event.target.value)} maxLength={500} className={inputClass} /></div>
      </fieldset>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {[{ key: 'is_featured', label: 'Featured product' }, { key: 'is_active', label: 'Active (visible)' }].map(({ key, label }) => (
          <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" checked={form[key as 'is_featured' | 'is_active']} onChange={event => {
            set(key, event.target.checked)
            if (key === 'is_active' && event.target.checked) setInventoryEnabled(true)
          }} className="h-4 w-4" /><span className="text-sm text-ink-dim">{label}</span></label>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : mode === 'create' ? 'Create product' : 'Save changes'}</button>
        <button type="button" onClick={() => router.back()} className="btn btn-ghost">Cancel</button>
      </div>
    </form>
  )
}
