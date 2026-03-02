'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { isSupabaseMockMode } from '@/lib/mock-data'

interface AuthModalProps {
  onClose: () => void
}

type Mode = 'signin' | 'signup' | 'forgot'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, mockSignIn } = useAuth()
  const isMock = isSupabaseMockMode()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const switchMode = (next: Mode) => { setMode(next); setError(null); setSuccess(null) }

  const handleMock = () => { mockSignIn(); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (mode === 'forgot') {
      const err = await resetPassword(email)
      setLoading(false)
      if (err) { setError(err) }
      else { setSuccess('Check your email — we sent a password reset link.') }
      return
    }

    const err = mode === 'signin'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password)
    setLoading(false)
    if (err) {
      setError(err)
    } else if (mode === 'signin' && email.toLowerCase() === 'enchantedonline89@gmail.com') {
      window.location.href = '/admin/dashboard'
    } else {
      onClose()
    }
  }

  if (isMock) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center">
        <h2 className="font-display text-2xl text-foreground mb-2">Sign in to order</h2>
        <div className="w-full mt-4 space-y-3">
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-lg">
            Dev mode — Supabase not configured
          </div>
          <button onClick={handleMock} className="w-full bg-gold hover:bg-gold-light text-black text-sm font-semibold py-3 px-6 rounded-xl transition-all duration-200">
            Continue as Test User
          </button>
        </div>
        <button onClick={onClose} className="mt-6 text-muted text-xs hover:text-foreground transition-colors">Cancel</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full px-8 py-10">
      {/* Header */}
      <div className="text-center mb-7">
        <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4 mx-auto">
          <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </div>
        <h2 className="font-display text-2xl text-foreground mb-1">
          {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
        </h2>
        <p className="text-muted text-sm">
          {mode === 'signin' ? 'Sign in to place your order'
            : mode === 'signup' ? 'Sign up to track your orders'
            : 'Enter your email and we\'ll send a reset link'}
        </p>
      </div>

      {/* Google — only on sign in / sign up */}
      {mode !== 'forgot' && (
        <>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-card border border-border hover:border-gold/50 text-foreground text-sm font-medium py-3 px-6 rounded-xl transition-all duration-200 mb-5"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted text-xs">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-lg">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2.5 rounded-lg">{success}</div>
        )}

        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="Email address"
          autoComplete="email"
          className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-gold/50 placeholder:text-muted/60 transition-colors"
        />

        {/* Password field with show/hide toggle */}
        {mode !== 'forgot' && (
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Password (min. 6 characters)"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 pr-11 text-foreground text-sm focus:outline-none focus:border-gold/50 placeholder:text-muted/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        )}

        {/* Forgot password link — shown only in sign in mode */}
        {mode === 'signin' && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="text-muted hover:text-gold text-xs transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (mode === 'forgot' && !!success)}
          className="w-full bg-gold hover:bg-gold-light text-black text-sm font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50"
        >
          {loading
            ? '…'
            : mode === 'signin' ? 'Sign In'
            : mode === 'signup' ? 'Create Account'
            : 'Send Reset Link'}
        </button>
      </form>

      {/* Toggle sign in / sign up */}
      {mode !== 'forgot' && (
        <p className="text-center text-muted text-xs mt-4">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-gold hover:underline font-medium"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      )}

      {mode === 'forgot' && !success && (
        <p className="text-center text-muted text-xs mt-4">
          <button onClick={() => switchMode('signin')} className="text-gold hover:underline font-medium">
            ← Back to sign in
          </button>
        </p>
      )}

      <button onClick={onClose} className="mt-4 text-muted text-xs hover:text-foreground transition-colors text-center">
        Cancel
      </button>
    </div>
  )
}
