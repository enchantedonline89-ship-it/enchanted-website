'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function ProductCsvImport() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const file = form.get('catalog')
    if (!(file instanceof File) || !file.size) return setMessage('Choose a CSV file first.')
    if (file.size > 256_000) return setMessage('Keep CSV files under 256 KB.')
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: await file.text(),
      })
      const result = await response.json() as { imported?: number; errors?: Array<{ row: number; error: string }>; error?: string }
      if (!response.ok && !result.imported) throw new Error(result.error ?? result.errors?.[0]?.error ?? 'Import failed.')
      const errorCopy = result.errors?.length ? ` ${result.errors.length} rows need attention; first: row ${result.errors[0].row}, ${result.errors[0].error}` : ''
      setMessage(`${result.imported ?? 0} draft products imported.${errorCopy}`)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="mb-6 border border-line bg-paper-raised p-4">
      <summary className="min-h-11 cursor-pointer py-2 text-sm text-ink">Import draft products from CSV</summary>
      <form onSubmit={submit} className="mt-4 max-w-2xl space-y-3">
        <p className="text-xs leading-5 text-ink-dim">
          Required column: <code>name</code>. Optional: <code>category,price,sku,description,image_url,sizes,stock</code>. Separate sizes and matching stock counts with <code>|</code>. Imports stay hidden until reviewed and activated.
        </p>
        <input name="catalog" type="file" accept=".csv,text/csv" required className="field file:mr-3 file:border-0 file:bg-transparent" />
        <button type="submit" disabled={busy} className="btn btn-ghost">{busy ? 'Importing…' : 'Import CSV'}</button>
        {message && <p role="status" className="text-sm text-ink-dim">{message}</p>}
      </form>
    </details>
  )
}
