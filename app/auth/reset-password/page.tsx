'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/public/Logo'
import { authClient } from '@/lib/auth/client'

function ResetPasswordForm() {
  const token = useSearchParams().get('token')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!token) return setError('This reset link is missing its secure token.')
    if (password !== confirm) return setError('Those two passwords are not the same.')

    setLoading(true)
    setError(null)
    const result = await authClient.resetPassword({ newPassword: password, token })
    setLoading(false)
    if (result.error) return setError(result.error.message || 'This link has expired.')

    setDone(true)
    window.setTimeout(() => router.push('/?auth=1'), 1800)
  }

  return (
    <main id="main" className="flex min-h-[100dvh] flex-col">
      <div className="flex h-[68px] shrink-0 items-center border-b border-line px-5 lg:px-10">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          {done ? (
            <>
              <h1 className="t-section text-ink">Password changed.</h1>
              <p className="t-body mt-4 text-[0.9375rem]">Sign in with your new password.</p>
              <Link href="/?auth=1" className="btn btn-ghost mt-7 w-full">Sign in</Link>
            </>
          ) : !token ? (
            <>
              <h1 className="t-section text-ink">This link is not valid.</h1>
              <p className="t-body mt-4 text-[0.9375rem]">
                Request a fresh reset link from the sign-in panel.
              </p>
              <Link href="/?auth=1" className="btn btn-ghost mt-7 w-full">Back to sign in</Link>
            </>
          ) : (
            <>
              <h1 className="t-section text-ink">Choose a new password.</h1>
              <p className="t-body mt-4 text-[0.9375rem]">Use at least 12 characters.</p>
              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
                <div>
                  <label htmlFor="new-password" className="t-meta mb-1.5 block">New password</label>
                  <input id="new-password" type="password" required minLength={12} maxLength={128}
                    value={password} onChange={(event) => setPassword(event.target.value)}
                    className="field" autoComplete="new-password" aria-invalid={Boolean(error)} />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="t-meta mb-1.5 block">Repeat it</label>
                  <input id="confirm-password" type="password" required minLength={12} maxLength={128}
                    value={confirm} onChange={(event) => setConfirm(event.target.value)}
                    className="field" autoComplete="new-password" aria-invalid={Boolean(error)} />
                </div>
                {error && <p role="alert" className="border border-signal-error/40 bg-signal-error/10 px-3 py-2.5 text-[0.8125rem] text-signal-error">{error}</p>}
                <button type="submit" disabled={loading} className="btn btn-primary w-full">
                  {loading ? 'Saving' : 'Save password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={(
        <main id="main" className="flex min-h-[100dvh] items-center justify-center px-5">
          <p className="t-body text-[0.9375rem]">Checking your secure reset link…</p>
        </main>
      )}
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
