'use client'
import { useState } from 'react'
import { Order } from '@/types'

interface Props {
  orderId: string
  currentStatus: Order['status']
}

const STATUS_OPTIONS: Order['status'][] = ['pending', 'confirmed', 'delivered', 'cancelled']

export default function OrderStatusForm({ orderId, currentStatus }: Props) {
  const [status, setStatus] = useState<Order['status']>(currentStatus)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to update')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <select
        value={status}
        onChange={e => setStatus(e.target.value as Order['status'])}
        className="w-full bg-paper-raised border border-line px-4 py-2.5 text-ink text-sm focus:outline-none focus:border-ink transition-colors capitalize"
      >
        {STATUS_OPTIONS.map(s => (
          <option key={s} value={s} className="capitalize">{s}</option>
        ))}
      </select>

      {error && <p className="text-signal-error text-xs">{error}</p>}
      {saved && <p className="text-signal-ok text-xs">Status updated</p>}

      <button
        onClick={handleSave}
        disabled={saving || status === currentStatus}
        className="btn btn-primary"
      >
        {saving ? 'Saving...' : 'Update Status'}
      </button>
    </div>
  )
}
