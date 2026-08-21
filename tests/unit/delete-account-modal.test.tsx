import * as React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Auth is isolated so the modal can be tested without a live Better Auth session.
const signOut = vi.hoisted(() => vi.fn())
const routerReplace = vi.hoisted(() => vi.fn())
const routerRefresh = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, refresh: routerRefresh }),
}))

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'session-user-id', email: 'nour@example.com' },
    loading: false,
    signOut,
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    resetPassword: vi.fn(),
    mockSignIn: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const DeleteAccountModal = (await import('@/components/public/DeleteAccountModal')).default

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ deleted: true }) })
  signOut.mockResolvedValue(undefined)
  routerReplace.mockReset()
  routerRefresh.mockReset()
})

const dialog = () => screen.getByRole('dialog')

async function reachConfirmStep(user: ReturnType<typeof userEvent.setup>) {
  render(<DeleteAccountModal open onClose={vi.fn()} />)
  await user.click(within(dialog()).getByRole('button', { name: /^continue$/i }))
}

describe('DeleteAccountModal', () => {
  it('renders nothing when closed', () => {
    render(<DeleteAccountModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens on the warning step, not the confirmation input', () => {
    render(<DeleteAccountModal open onClose={vi.fn()} />)

    expect(within(dialog()).getByText(/this cannot be undone/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/type delete to confirm/i)).not.toBeInTheDocument()
  })

  it('keeps the delete button disabled until DELETE is typed exactly', async () => {
    const user = userEvent.setup()
    await reachConfirmStep(user)

    const confirmButton = within(dialog()).getByRole('button', { name: /delete my account/i })
    expect(confirmButton).toBeDisabled()

    await user.type(screen.getByLabelText(/type delete to confirm/i), 'delete')
    expect(confirmButton).toBeDisabled()

    await user.clear(screen.getByLabelText(/type delete to confirm/i))
    await user.type(screen.getByLabelText(/type delete to confirm/i), 'DELETE')
    expect(confirmButton).toBeEnabled()
  })

  it('calls /api/account/delete with the DELETE verb the route actually exports', async () => {
    const user = userEvent.setup()
    await reachConfirmStep(user)
    await user.type(screen.getByLabelText(/type delete to confirm/i), 'DELETE')
    await user.click(within(dialog()).getByRole('button', { name: /delete my account/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/account/delete')
    // app/api/account/delete/route.ts only exports DELETE — a POST would 405.
    expect(init.method).toBe('DELETE')
  })

  it('signs the user out after a successful deletion', async () => {
    const user = userEvent.setup()
    await reachConfirmStep(user)
    await user.type(screen.getByLabelText(/type delete to confirm/i), 'DELETE')
    await user.click(within(dialog()).getByRole('button', { name: /delete my account/i }))

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(routerReplace).toHaveBeenCalledWith('/')
    expect(routerRefresh).toHaveBeenCalledTimes(1)
  })

  it('surfaces the API error and does not sign the user out', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Admin account cannot be deleted via this endpoint.' }),
    })
    await reachConfirmStep(user)
    await user.type(screen.getByLabelText(/type delete to confirm/i), 'DELETE')
    await user.click(within(dialog()).getByRole('button', { name: /delete my account/i }))

    await waitFor(() =>
      expect(within(dialog()).getByRole('alert')).toHaveTextContent(
        'Admin account cannot be deleted via this endpoint.',
      ),
    )
    expect(signOut).not.toHaveBeenCalled()
  })

  it('surfaces a network failure without signing the user out', async () => {
    const user = userEvent.setup()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await reachConfirmStep(user)
    await user.type(screen.getByLabelText(/type delete to confirm/i), 'DELETE')
    await user.click(within(dialog()).getByRole('button', { name: /delete my account/i }))

    await waitFor(() =>
      expect(within(dialog()).getByRole('alert')).toHaveTextContent(/network error/i),
    )
    expect(signOut).not.toHaveBeenCalled()
  })

  it('resets to the warning step when reopened after being cancelled', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<DeleteAccountModal open onClose={vi.fn()} />)
    await user.click(within(dialog()).getByRole('button', { name: /^continue$/i }))
    await user.type(screen.getByLabelText(/type delete to confirm/i), 'DELETE')

    rerender(<DeleteAccountModal open={false} onClose={vi.fn()} />)
    rerender(<DeleteAccountModal open onClose={vi.fn()} />)

    expect(within(dialog()).getByText(/this cannot be undone/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/type delete to confirm/i)).not.toBeInTheDocument()
  })
})
