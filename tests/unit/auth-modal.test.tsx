import * as React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthModal from '@/components/public/AuthModal'

const auth = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ ...auth, user: null }),
}))

beforeEach(() => {
  auth.signUpWithEmail.mockResolvedValue(null)
})

describe('AuthModal', () => {
  it('shows Google only when the server reports configured credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ google: true }) }))
    render(<AuthModal open onClose={vi.fn()} />)
    expect(await screen.findByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('requires a 12-character password and explains email verification after signup', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ google: false }) }))
    const user = userEvent.setup()
    render(<AuthModal open onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /create one/i }))
    const password = screen.getByLabelText(/password/i)
    expect(password).toHaveAttribute('minlength', '12')
    await user.type(screen.getByLabelText(/email/i), 'customer@example.com')
    await user.type(password, 'a-secure-passphrase')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(auth.signUpWithEmail).toHaveBeenCalledWith('customer@example.com', 'a-secure-passphrase'))
    expect(screen.getByText(/sent a verification link/i)).toBeInTheDocument()
  })
})
