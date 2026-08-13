'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/public/Logo'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  // Supabase injects the session from the email link via hash params.
  // We wait for onAuthStateChange to confirm the session is established.
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Those two passwords are not the same.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/'), 2500)
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col">
      <div className="flex h-[68px] shrink-0 items-center border-b border-line px-5 lg:px-10">
        <Logo />
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          {done ? (
            <>
              <h1 className="t-section text-ink">Password changed.</h1>
              <p className="t-body mt-4 text-[0.9375rem]">
                You are signed in. Taking you back to the shop now.
              </p>
              <Link href="/" className="btn btn-ghost mt-7 w-full">
                Go now
              </Link>
            </>
          ) : !ready ? (
            <>
              <h1 className="t-section text-ink">Checking your link.</h1>
              <p className="t-body mt-4 text-[0.9375rem]">
                Open this page from the reset email so we can verify it is you. If the
                link has expired, request a new one from the sign in panel.
              </p>
              <div className="mt-7 flex flex-col gap-2">
                <div className="skeleton h-11 w-full" aria-hidden="true" />
                <div className="skeleton h-11 w-full" aria-hidden="true" />
              </div>
            </>
          ) : (
            <>
              <h1 className="t-section text-ink">Choose a new password.</h1>
              <p className="t-body mt-4 text-[0.9375rem]">
                At least 6 characters. You will stay signed in afterwards.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
                <div>
                  <label htmlFor="new-password" className="t-meta mb-1.5 block">
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field"
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="t-meta mb-1.5 block">
                    Repeat it
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="field"
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="border border-signal-error/40 bg-signal-error/10 px-3 py-2.5 text-[0.8125rem] text-signal-error"
                  >
                    {error}
                  </p>
                )}

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
