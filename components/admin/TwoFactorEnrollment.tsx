'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'

type Enrollment = { totpURI: string; backupCodes: string[] }

function secretFrom(uri: string): string {
  try {
    return new URL(uri).searchParams.get('secret') ?? uri
  } catch {
    return uri
  }
}

export default function TwoFactorEnrollment() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function begin(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { data, error: authError } = await authClient.twoFactor.enable({
      password,
      method: 'totp',
      issuer: 'Enchanted Style',
    })
    if (authError || !data || data.method !== 'totp') {
      setError(authError?.message ?? 'Two-factor setup could not start.')
    } else {
      setEnrollment({ totpURI: data.totpURI, backupCodes: data.backupCodes })
      setPassword('')
    }
    setBusy(false)
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error: authError } = await authClient.twoFactor.verifyTotp({
      code: code.replace(/\s/g, ''),
      trustDevice: false,
    })
    if (authError) {
      setError(authError.message ?? 'That authenticator code is not valid.')
      setBusy(false)
      return
    }
    router.replace('/admin/dashboard')
    router.refresh()
  }

  if (!enrollment) {
    return (
      <form onSubmit={begin} className="mt-8 space-y-4">
        <div>
          <label htmlFor="two-factor-password" className="t-meta mb-1.5 block">Current password</label>
          <input id="two-factor-password" type="password" required autoComplete="current-password" className="field" value={password} onChange={event => setPassword(event.target.value)} />
        </div>
        {error && <p role="alert" className="border border-signal-error/40 bg-signal-error/10 px-3 py-2.5 text-sm text-signal-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? 'Starting setup…' : 'Set up authenticator'}</button>
      </form>
    )
  }

  return (
    <form onSubmit={verify} className="mt-8 space-y-5">
      <div className="border border-line bg-paper-sunken p-4">
        <p className="t-meta">Authenticator secret</p>
        <code className="mt-2 block break-all text-sm text-ink">{secretFrom(enrollment.totpURI)}</code>
        <a href={enrollment.totpURI} className="btn btn-ghost mt-4 w-full">Open authenticator app</a>
      </div>
      <div>
        <label htmlFor="two-factor-code" className="t-meta mb-1.5 block">Six-digit code</label>
        <input id="two-factor-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required className="field tnum" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
      </div>
      {error && <p role="alert" className="border border-signal-error/40 bg-signal-error/10 px-3 py-2.5 text-sm text-signal-error">{error}</p>}
      <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary w-full">{busy ? 'Verifying…' : 'Verify and enter admin'}</button>
      <details className="border-t border-line pt-4">
        <summary className="t-meta cursor-pointer">Backup codes—save these now</summary>
        <ul className="mt-3 grid grid-cols-2 gap-2" aria-label="Backup codes">
          {enrollment.backupCodes.map(backup => <li key={backup}><code className="text-sm">{backup}</code></li>)}
        </ul>
      </details>
    </form>
  )
}
