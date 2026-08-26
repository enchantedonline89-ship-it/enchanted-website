'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/public/Logo'
import { authClient } from '@/lib/auth/client'

export default function TwoFactorChallengePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [backup, setBackup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function verify(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = backup
      ? await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice: false })
      : await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, ''), trustDevice: false })
    if (result.error) {
      setError('That code is invalid or expired. Try the current code or a backup code.')
      setBusy(false)
      return
    }
    const role = 'user' in (result.data ?? {})
      ? (result.data as { user?: { role?: string } }).user?.role
      : null
    router.replace(role === 'admin' ? '/admin/dashboard' : '/')
    router.refresh()
  }

  return (
    <main id="main" className="flex min-h-[100dvh] flex-col bg-paper">
      <header className="flex h-[68px] items-center justify-between border-b border-line px-5 lg:px-10"><Logo /><p className="t-meta">Secure sign in</p></header>
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <h1 className="t-section text-ink">Enter your {backup ? 'backup' : 'authenticator'} code.</h1>
          <form onSubmit={verify} className="mt-8 space-y-4">
            <div>
              <label htmlFor="challenge-code" className="t-meta mb-1.5 block">{backup ? 'Backup code' : 'Six-digit code'}</label>
              <input id="challenge-code" inputMode={backup ? 'text' : 'numeric'} autoComplete="one-time-code" required className="field tnum" value={code} onChange={event => setCode(backup ? event.target.value : event.target.value.replace(/\D/g, '').slice(0, 6))} />
            </div>
            {error && <p role="alert" className="border border-signal-error/40 bg-signal-error/10 px-3 py-2.5 text-sm text-signal-error">{error}</p>}
            <button type="submit" disabled={busy || !code.trim()} className="btn btn-primary w-full">{busy ? 'Verifying…' : 'Continue'}</button>
            <button type="button" className="btn btn-ghost w-full" onClick={() => { setBackup(current => !current); setCode(''); setError(null) }}>{backup ? 'Use authenticator code' : 'Use a backup code'}</button>
          </form>
        </div>
      </div>
    </main>
  )
}
