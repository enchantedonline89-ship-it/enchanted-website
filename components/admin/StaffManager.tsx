'use client'

import { useState } from 'react'

type Staff = {
  id: string
  name: string
  email: string
  admin_role: 'owner' | 'admin'
  two_factor_enabled: number
}

export default function StaffManager({ initialStaff }: { initialStaff: Staff[] }) {
  const [email, setEmail] = useState('')
  const [staff, setStaff] = useState(initialStaff)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function mutate(targetEmail: string, action: 'promote' | 'remove') {
    setBusy(targetEmail)
    setError(null)
    const response = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail, action }),
    })
    const result = await response.json() as { error?: string }
    if (!response.ok) {
      setError(result.error ?? 'Staff access could not be updated.')
    } else if (action === 'remove') {
      setStaff(current => current.filter(member => member.email !== targetEmail))
    } else {
      setEmail('')
      window.location.reload()
    }
    setBusy(null)
  }

  return (
    <div className="space-y-8">
      <form onSubmit={event => { event.preventDefault(); void mutate(email.trim(), 'promote') }} className="border border-line bg-paper-raised p-4 sm:p-6">
        <h2 className="text-xl text-ink">Add an administrator</h2>
        <p className="mt-2 text-sm leading-6 text-ink-dim">They must create and verify a storefront account first. Promotion signs them out; their next admin visit requires authenticator setup.</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="staff-email">Account email</label>
          <input id="staff-email" type="email" required className="field flex-1" placeholder="staff@example.com" value={email} onChange={event => setEmail(event.target.value)} />
          <button type="submit" disabled={Boolean(busy)} className="btn btn-primary">Add administrator</button>
        </div>
        {error && <p role="alert" className="mt-4 border border-signal-error/40 bg-signal-error/10 px-3 py-2.5 text-sm text-signal-error">{error}</p>}
      </form>

      <section aria-labelledby="staff-list-heading">
        <h2 id="staff-list-heading" className="t-meta mb-3">Current staff</h2>
        <ul className="space-y-3">
          {staff.map(member => (
            <li key={member.id} className="flex flex-col gap-4 border border-line bg-paper-raised p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm text-ink">{member.name}</p><p className="mt-1 text-xs text-ink-dim">{member.email} · {member.admin_role} · {member.two_factor_enabled ? '2FA active' : '2FA enrollment required'}</p></div>
              {member.admin_role === 'admin' && <button type="button" disabled={busy === member.email} onClick={() => void mutate(member.email, 'remove')} className="btn btn-ghost text-signal-error">{busy === member.email ? 'Removing…' : 'Remove access'}</button>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
