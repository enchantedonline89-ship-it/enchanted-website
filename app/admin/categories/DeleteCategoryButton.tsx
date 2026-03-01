'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: category } = await supabase.from('categories').select().eq('id', id).single()
    await supabase.from('categories').delete().eq('id', id)
    await supabase.from('admin_logs').insert({
      admin_email: user!.email!,
      action: 'DELETE',
      entity_type: 'category',
      entity_id: id,
      entity_name: name,
      changes: { before: category, after: null }
    })
    await fetch('/api/revalidate', { method: 'POST' })
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-red-400 text-xs">Delete?</span>
        <button onClick={handleDelete} disabled={deleting} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10 disabled:opacity-50">
          {deleting ? '...' : 'Yes'}
        </button>
        <button onClick={() => setConfirm(false)} className="text-muted text-xs px-2 py-1 rounded hover:text-white">No</button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)} className="text-muted hover:text-red-400 text-xs px-3 py-1.5 rounded border border-border hover:border-red-400/30 transition-colors">
      Delete
    </button>
  )
}
