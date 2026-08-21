"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Warning } from "@phosphor-icons/react/ssr"
import { useAuth } from "@/lib/auth-context"
import { useOverlay } from "@/lib/use-overlay"

const CONFIRM_WORD = "DELETE"

export default function DeleteAccountModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { signOut } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dialogRef = useOverlay<HTMLDivElement>(open, onClose)

  // Reset the two-step confirmation whenever the dialog closes, during render
  // so a reopened dialog never shows the previous step or a stale error.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) {
      setStep(1)
      setTyped("")
      setError(null)
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (typed !== CONFIRM_WORD) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: typed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? "We could not delete the account. Please contact us.")
        setBusy(false)
        return
      }
      await signOut()
      router.replace("/")
      router.refresh()
    } catch {
      setError("Network error. Check your connection and try again.")
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center">
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
        aria-labelledby="delete-title"
        className="relative w-full max-w-md border border-line bg-paper-raised"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="delete-title" className="t-meta text-ink">
            Delete your account
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
          {step === 1 ? (
            <>
              <div className="flex h-11 w-11 items-center justify-center border border-signal-error text-signal-error">
                <Warning size={20} weight="light" />
              </div>
              <p className="mt-4 text-[0.9375rem] text-ink">This cannot be undone.</p>
              <p className="t-body mt-3 text-[0.875rem]">
                Your sign in and your order history on this site are removed. Orders
                already placed with us stay in our records, because we need them to
                complete deliveries and to keep our books straight.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <button onClick={() => setStep(2)} className="btn btn-ghost w-full">
                  Continue
                </button>
                <button onClick={onClose} className="btn btn-primary w-full">
                  Keep my account
                </button>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="delete-confirm" className="t-meta mb-1.5 block">
                Type {CONFIRM_WORD} to confirm
              </label>
              <input
                id="delete-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="field"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(error)}
              />

              {error && (
                <p
                  role="alert"
                  className="mt-3 border border-signal-error/40 bg-signal-error/10 px-3 py-2.5 text-[0.8125rem] text-signal-error"
                >
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={handleDelete}
                  disabled={typed !== CONFIRM_WORD || busy}
                  className="btn btn-danger w-full"
                >
                  {busy ? "Deleting" : "Delete my account"}
                </button>
                <button onClick={onClose} className="btn btn-ghost w-full">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
