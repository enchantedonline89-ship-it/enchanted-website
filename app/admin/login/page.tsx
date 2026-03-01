'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo.png" alt="Enchanted Style" className="h-12 w-auto object-contain mx-auto mb-4" />
          <h1 className="font-display text-3xl text-foreground">Admin Access</h1>
          <p className="text-muted text-sm mt-2">Sign in to manage your catalog</p>
        </div>

        {/* Form */}
        <div className="bg-surface border border-border rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-muted mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:border-gold/50 placeholder:text-muted"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:outline-none focus:border-gold/50 placeholder:text-muted"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-obsidian font-semibold py-3 rounded-lg text-sm transition-all duration-200 disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-muted/40 text-xs text-center mt-6">Enchanted Style Admin Panel</p>
      </div>
    </div>
  )
}
