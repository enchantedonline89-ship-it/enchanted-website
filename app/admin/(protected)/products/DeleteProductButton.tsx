'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user?.email) throw new Error('Your session has expired.')
      const { data: product, error: readError } = await supabase.from('products').select().eq('id', id).single()
      if (readError) throw new Error('Could not load the product before deleting it.')
      const { error: deleteError } = await supabase.from('products').delete().eq('id', id)
      if (deleteError) throw new Error('The product could not be deleted.')
      const { error: logError } = await supabase.from('admin_logs').insert({
        admin_email: user.email,
        action: 'DELETE',
        entity_type: 'product',
        entity_id: id,
        entity_name: name,
        changes: { before: product, after: null }
      })
      if (logError) throw new Error('Product deleted, but audit logging failed.')
      const response = await fetch('/api/revalidate', { method: 'POST' })
      if (!response.ok) throw new Error('Product deleted, but storefront refresh failed.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  if (confirm) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-signal-error text-xs">Delete?</span>
        <button onClick={handleDelete} disabled={deleting} className="text-signal-error hover:text-signal-error text-xs px-2 py-1 bg-signal-error/10 transition-colors disabled:opacity-50">
          {deleting ? '...' : 'Yes'}
        </button>
        <button onClick={() => setConfirm(false)} className="text-ink-dim text-xs px-2 py-1 hover:text-ink transition-colors">No</button>
        {error && <span role="alert" className="basis-full text-xs text-signal-error">{error}</span>}
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)} className="text-ink-dim hover:text-signal-error text-xs px-3 py-1.5 border border-line hover:border-signal-error/30 transition-colors">
      Delete
    </button>
  )
}
