'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

export default function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: OrderStatus
}) {
  const router = useRouter()
  const options = NEXT[currentStatus]
  const [status, setStatus] = useState<OrderStatus | ''>(options[0] ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!status) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) return setError(result.error ?? 'The order could not be updated.')
      router.refresh()
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!options.length) {
    return <p className="text-sm text-ink-dim">This order is closed and cannot change status.</p>
  }

  return (
    <div className="space-y-3">
      <label htmlFor="order-next-status" className="t-meta block">Move order to</label>
      <select id="order-next-status" value={status} onChange={(event) => setStatus(event.target.value as OrderStatus)} className="field capitalize">
        {options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
      </select>
      {error && <p role="alert" className="text-xs text-signal-error">{error}</p>}
      <button type="button" onClick={handleSave} disabled={saving || !status} className="btn btn-primary">
        {saving ? 'Updating' : 'Update status and email customer'}
      </button>
    </div>
  )
}
