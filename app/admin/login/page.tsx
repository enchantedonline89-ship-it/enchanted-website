'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/public/Logo'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('That email and password do not match an account.')
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <main id="main" className="flex min-h-[100dvh] flex-col">
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-line px-5 lg:px-10">
        <Logo />
        <p className="t-meta">Staff</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <h1 className="t-section text-ink">Sign in to manage the shop.</h1>
          <p className="t-body mt-4 text-[0.9375rem]">
            This panel is for the shop owner. Customer accounts sign in from the
            storefront instead.
          </p>

          <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">
            <div>
              <label htmlFor="admin-email" className="t-meta mb-1.5 block">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                autoComplete="email"
                aria-invalid={Boolean(error)}
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="t-meta mb-1.5 block">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                autoComplete="current-password"
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
              {loading ? 'Signing in' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 border-t border-line pt-6">
            <Link href="/admin/demo" className="btn btn-ghost w-full">
              Open read-only client demo
            </Link>
            <p className="t-meta mt-2 text-center normal-case tracking-normal">
              Mock data only. No live customer information or editing access.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
