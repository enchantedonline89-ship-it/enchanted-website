"use client"

import { useEffect, useState } from "react"
import { X, GoogleLogo } from "@phosphor-icons/react/ssr"
import { useAuth } from "@/lib/auth-context"
import { useOverlay } from "@/lib/use-overlay"

type Mode = "signin" | "signup" | "forgot"

const COPY: Record<Mode, { title: string; action: string }> = {
  signin: { title: "Sign in", action: "Sign in" },
  signup: { title: "Create an account", action: "Create account" },
  forgot: { title: "Reset your password", action: "Send reset link" },
}

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, user } = useAuth()

  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const dialogRef = useOverlay<HTMLDivElement>(open, onClose)

  // Close as soon as the session lands
  useEffect(() => {
    if (user && open) onClose()
  }, [user, open, onClose])

  // Clear transient state when the panel closes, during render rather than in
  // an effect so reopening never flashes the previous error.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) {
      setError(null)
      setSent(false)
      setBusy(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setSent(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    let message: string | null = null
    if (mode === "signin") message = await signInWithEmail(email.trim(), password)
    else if (mode === "signup") message = await signUpWithEmail(email.trim(), password)
    else message = await resetPassword(email.trim())

    if (message) {
      setError(message)
    } else if (mode === "forgot") {
      setSent(true)
    }
    setBusy(false)
  }

  async function handleGoogle() {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError("Google sign in did not complete. Try again, or use your email below.")
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/45"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="relative w-full max-w-md border border-line bg-paper-raised"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="auth-title" className="t-meta text-ink">
            {COPY[mode].title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-ink"
            aria-label="Close"
          >
            <X size={19} weight="light" />
          </button>
        </div>

        <div className="p-5">
          {mode !== "forgot" && (
            <>
              <button
                onClick={handleGoogle}
                disabled={busy}
                className="btn btn-ghost w-full"
                type="button"
              >
                <GoogleLogo size={17} weight="light" />
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-4">
                <span className="h-px flex-1 bg-line" />
                <span className="t-meta">or</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          {sent ? (
            <div className="flex flex-col gap-4">
              <p className="text-[0.9375rem] text-ink">Check your inbox.</p>
              <p className="t-body text-[0.875rem]">
                If an account exists for {email.trim()}, a reset link is on its way. The
                link expires in one hour.
              </p>
              <button onClick={() => switchMode("signin")} className="btn btn-ghost w-full">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="auth-email" className="t-meta mb-1.5 block">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <label htmlFor="auth-password" className="t-meta">
                      Password
                    </label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="t-meta link-grow text-ink-dim hover:text-ink"
                      >
                        Forgot
                      </button>
                    )}
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    aria-invalid={Boolean(error)}
                  />
                  {mode === "signup" && (
                    <p className="t-meta mt-1.5 normal-case tracking-normal">
                      At least 6 characters.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="border border-signal-error/40 bg-signal-error/10 px-3 py-2.5 text-[0.8125rem] text-signal-error"
                >
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className="btn btn-primary w-full">
                {busy ? "Working" : COPY[mode].action}
              </button>
            </form>
          )}

          {!sent && (
            <p className="mt-5 text-center text-[0.8125rem] text-ink-faint">
              {mode === "signin" && (
                <>
                  No account yet?{" "}
                  <button
                    onClick={() => switchMode("signup")}
                    className="link-grow text-ink hover:text-ink"
                  >
                    Create one
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  Already have one?{" "}
                  <button
                    onClick={() => switchMode("signin")}
                    className="link-grow text-ink hover:text-ink"
                  >
                    Sign in
                  </button>
                </>
              )}
              {mode === "forgot" && (
                <button
                  onClick={() => switchMode("signin")}
                  className="link-grow text-ink hover:text-ink"
                >
                  Back to sign in
                </button>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
