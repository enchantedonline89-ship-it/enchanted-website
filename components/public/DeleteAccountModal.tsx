'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface DeleteAccountModalProps {
  onClose: () => void
}

export default function DeleteAccountModal({ onClose }: DeleteAccountModalProps) {
  const [step, setStep] = useState<'warning' | 'confirm'>('warning')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signOut } = useAuth()
  const router = useRouter()

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      await signOut()
      router.push('/')
    } catch {
      setError('Network error. Please check your connection.')
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {step === 'warning' ? (
            <>
              {/* Warning icon */}
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <h2 id="delete-account-title" className="font-display text-xl text-foreground text-center mb-2">
                Delete Account
              </h2>
              <p className="text-muted text-sm text-center mb-5 leading-relaxed">
                This will permanently delete your account and all your order history. This action cannot be undone.
              </p>

              <button
                onClick={() => setStep('confirm')}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors mb-2"
              >
                Continue
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 border border-border text-muted text-sm rounded-lg hover:border-gold/40 hover:text-foreground transition-all"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <h2 id="delete-account-title" className="font-display text-xl text-foreground text-center mb-2">
                Confirm Deletion
              </h2>
              <p className="text-muted text-sm text-center mb-4 leading-relaxed">
                Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm you want to permanently delete your account.
              </p>

              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                autoFocus
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-border bg-surface text-foreground placeholder:text-subtle focus:outline-none focus:border-red-400 transition-colors mb-4 font-mono"
              />

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-3">
                  {error}
                </div>
              )}

              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || loading}
                className={`w-full py-3 text-sm font-semibold rounded-lg transition-all mb-2 ${
                  confirmText === 'DELETE' && !loading
                    ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                    : 'bg-border text-subtle cursor-not-allowed'
                }`}
              >
                {loading ? 'Deleting...' : 'Delete My Account'}
              </button>
              <button
                onClick={() => { setStep('warning'); setConfirmText('') }}
                disabled={loading}
                className="w-full py-2.5 border border-border text-muted text-sm rounded-lg hover:border-gold/40 hover:text-foreground transition-all"
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
