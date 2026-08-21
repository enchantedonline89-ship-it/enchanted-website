'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminCatalogRequest } from '@/lib/admin-catalog-client'

export default function DeleteCategoryButton({ id }: { id: string; name: string }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await adminCatalogRequest(`/api/admin/categories/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deactivation failed.')
    } finally {
      setDeleting(false)
    }
  }

  if (confirm) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-signal-error text-xs">Hide this category?</span>
        <button onClick={handleDelete} disabled={deleting} className="text-signal-error hover:text-signal-error text-xs px-2 py-1 bg-signal-error/10 disabled:opacity-50">
          {deleting ? 'Hiding...' : 'Yes, hide'}
        </button>
        <button onClick={() => setConfirm(false)} className="text-ink-dim text-xs px-2 py-1 hover:text-ink">No</button>
        {error && <span role="alert" className="basis-full text-xs text-signal-error">{error}</span>}
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)} className="text-ink-dim hover:text-signal-error text-xs px-3 py-1.5 border border-line hover:border-signal-error/30 transition-colors">
      Deactivate
    </button>
  )
}
