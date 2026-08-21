'use client'

import { FormEvent, useState } from 'react'

type TrackedOrder = {
  order_number: string
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
  created_at: string
  updated_at: string
}

const STATUS = {
  pending: {
    label: 'Awaiting confirmation',
    detail: 'We received your order and will confirm it shortly.',
  },
  confirmed: {
    label: 'Confirmed',
    detail: 'Your order is confirmed. We will email you as it moves forward.',
  },
  preparing: {
    label: 'Being prepared',
    detail: 'We are preparing your items for delivery.',
  },
  out_for_delivery: {
    label: 'Out for delivery',
    detail: 'Your order is with the delivery driver.',
  },
  delivered: {
    label: 'Delivered',
    detail: 'This order has been marked as delivered.',
  },
  cancelled: {
    label: 'Cancelled',
    detail: 'This order was cancelled. Contact us if you need help.',
  },
} as const

export default function TrackOrderForm() {
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setOrder(null)

    try {
      const response = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber, email }),
      })
      const result = await response.json() as { order?: TrackedOrder; error?: string }
      if (!response.ok || !result.order) {
        setError(result.error ?? 'Unable to track that order.')
        return
      }
      setOrder(result.order)
    } catch {
      setError('Tracking is temporarily unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const status = order ? STATUS[order.status] : null

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-5" aria-label="Track an order">
        <div>
          <label htmlFor="tracking-number" className="t-meta block mb-2 text-ink-dim">
            Order number
          </label>
          <input
            id="tracking-number"
            value={orderNumber}
            onChange={event => setOrderNumber(event.target.value.toUpperCase())}
            placeholder="ES-2608-001001"
            autoComplete="off"
            required
            maxLength={14}
            className="w-full border border-line bg-paper-raised px-4 py-3 text-ink outline-none focus:border-ink"
          />
        </div>
        <div>
          <label htmlFor="tracking-email" className="t-meta block mb-2 text-ink-dim">
            Checkout email
          </label>
          <input
            id="tracking-email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
            maxLength={254}
            className="w-full border border-line bg-paper-raised px-4 py-3 text-ink outline-none focus:border-ink"
          />
        </div>
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={loading}>
          {loading ? 'Checking...' : 'Track order'}
        </button>
      </form>

      <div aria-live="polite">
        {error && <p className="border border-signal-error/40 p-4 text-sm text-signal-error">{error}</p>}
        {order && status && (
          <section className="border border-line bg-paper-raised p-6">
            <p className="t-meta text-ink-dim">{order.order_number}</p>
            <h2 className="mt-2 text-2xl text-ink">{status.label}</h2>
            <p className="mt-3 text-sm text-ink-dim">{status.detail}</p>
            <p className="t-meta mt-5 text-ink-faint">
              Last updated {new Date(order.updated_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

