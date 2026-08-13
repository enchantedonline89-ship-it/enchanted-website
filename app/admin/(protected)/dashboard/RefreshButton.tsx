'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowsClockwise } from '@phosphor-icons/react/ssr'

export default function RefreshButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRefresh() {
    setLoading(true)
    try {
      await fetch('/api/admin/refresh-analytics', { method: 'POST' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="btn btn-ghost px-4 py-2.5"
    >
      <ArrowsClockwise
        size={14}
        weight="light"
        className={loading ? 'animate-spin' : undefined}
      />
      {loading ? 'Refreshing' : 'Refresh'}
    </button>
  )
}
