'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelOrderButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = async () => {
    if (!window.confirm(`Cancel order ${orderNumber}? This cannot be undone.`)) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' })
      const body = await response.json() as { error?: unknown }
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not cancel this order.')
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not cancel this order.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={cancel} disabled={busy} className="btn btn-ghost text-signal-error disabled:opacity-50">
        {busy ? 'Cancelling…' : 'Cancel order'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-signal-error">{error}</p>}
    </div>
  )
}
