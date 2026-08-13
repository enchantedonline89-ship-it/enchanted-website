import * as React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CartProvider } from '@/lib/cart-context'
import { WHATSAPP_PHONE } from '@/lib/whatsapp'
import { CartControls, CartProbe, readCart } from '../helpers/cart-harness'
import { makeAccessory, makeSizedProduct } from '../helpers/factories'
import type { Product } from '@/types'

// ─── Module mocks ─────────────────────────────────────────────────────────────
// Supabase no longer resolves, so auth is faked outright. AuthModal is stubbed
// because sign-in is not what these tests are about.

const auth = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
}))

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: auth.user,
    loading: false,
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    resetPassword: vi.fn(),
    signOut: vi.fn(),
    mockSignIn: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/components/public/AuthModal', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="auth-modal">auth modal</div> : null,
}))

const CartDrawer = (await import('@/components/public/CartDrawer')).default

// ─── Fixtures & helpers ───────────────────────────────────────────────────────

const STILETTO = makeSizedProduct({
  id: 'p-stiletto',
  name: 'Velvet Gold-Strap Stiletto',
  price: 89.99,
  sizes: ['38'],
})
const CLIP = makeAccessory({ id: 'p-clip', name: 'Crystal Hair Claw Clip', price: 29.99 })

const fetchMock = vi.fn()
let openSpy: ReturnType<typeof vi.spyOn>

function jsonResponse(data: unknown, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => data }
}

beforeEach(() => {
  auth.user = null
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(jsonResponse({ id: 'ord-abc12345' }))
  openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
})

function tree(products: Product[] = [STILETTO, CLIP]) {
  return (
    <CartProvider>
      <CartControls products={products} />
      <CartDrawer />
      <CartProbe />
    </CartProvider>
  )
}

function renderDrawer(products: Product[] = [STILETTO, CLIP]) {
  return render(tree(products))
}

const drawer = () => screen.getByRole('dialog')
const CONTINUE = /continue to delivery details/i
const PLACE_ORDER = /place order/i
const WHATSAPP_ACTION = /send the order on whatsapp/i

async function seed(user: UserEvent, ids: string[]) {
  for (const id of ids) await user.click(screen.getByTestId(`seed-${id}`))
}

async function openCart(user: UserEvent) {
  await user.click(screen.getByTestId('open-cart'))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
}

async function chooseArea(user: UserEvent, area: 'Beirut' | 'Outside Beirut') {
  await user.click(within(drawer()).getByRole('button', { name: new RegExp(`^${area}`) }))
}

async function fillDetails(user: UserEvent) {
  await user.type(screen.getByLabelText(/full name/i), 'Nour Khalil')
  await user.type(screen.getByLabelText(/^phone$/i), '03 456 789')
  await user.type(screen.getByLabelText(/delivery address/i), 'Hamra Street, Building 4')
}

/** Signed-in customer, one stiletto in the cart, sitting on the details form. */
async function reachDetails(user: UserEvent) {
  auth.user = { id: 'session-user-id', email: 'nour@example.com' }
  const view = renderDrawer()
  await seed(user, ['p-stiletto'])
  await openCart(user)
  await chooseArea(user, 'Beirut')
  await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))
  await waitFor(() =>
    expect(screen.getByRole('dialog', { name: /delivery details/i })).toBeInTheDocument(),
  )
  return view
}

/** …and all the way through to the success screen. */
async function reachSuccess(user: UserEvent) {
  const view = await reachDetails(user)
  await fillDetails(user)
  await user.click(screen.getByRole('button', { name: PLACE_ORDER }))
  await waitFor(() =>
    expect(screen.getByRole('dialog', { name: /order placed/i })).toBeInTheDocument(),
  )
  return view
}

// ─── State machine ────────────────────────────────────────────────────────────

describe('CartDrawer — state machine', () => {
  it('opens in the cart state', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)

    expect(screen.getByRole('dialog', { name: /your cart/i })).toBeInTheDocument()
  })

  it('shows the empty state when there is nothing in the cart', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await openCart(user)

    expect(within(drawer()).getByText(/your cart is empty/i)).toBeInTheDocument()
    expect(within(drawer()).queryByRole('button', { name: CONTINUE })).not.toBeInTheDocument()
  })

  it('lists each line with its name and chosen size', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto', 'p-clip'])
    await openCart(user)

    expect(within(drawer()).getByText('Velvet Gold-Strap Stiletto')).toBeInTheDocument()
    expect(within(drawer()).getByText('Size 38')).toBeInTheDocument()
    expect(within(drawer()).getByText('Crystal Hair Claw Clip')).toBeInTheDocument()
  })

  it('disables Continue until a delivery area is chosen', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)

    expect(within(drawer()).getByRole('button', { name: CONTINUE })).toBeDisabled()
    expect(within(drawer()).getByText(/choose a delivery area to continue/i)).toBeInTheDocument()

    await chooseArea(user, 'Beirut')
    expect(within(drawer()).getByRole('button', { name: CONTINUE })).toBeEnabled()
  })

  it('sends a signed-out customer to the auth wall', async () => {
    const user = userEvent.setup()
    auth.user = null
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await chooseArea(user, 'Beirut')
    await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))

    expect(screen.getByRole('dialog', { name: /sign in to order/i })).toBeInTheDocument()
  })

  it('sends a signed-in customer straight to the details form', async () => {
    const user = userEvent.setup()
    await reachDetails(user)

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })

  it('advances from the auth wall to details as soon as the session lands', async () => {
    const user = userEvent.setup()
    auth.user = null
    const { rerender } = renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await chooseArea(user, 'Beirut')
    await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))
    expect(screen.getByRole('dialog', { name: /sign in to order/i })).toBeInTheDocument()

    auth.user = { id: 'session-user-id', email: 'nour@example.com' }
    rerender(tree())

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /delivery details/i })).toBeInTheDocument(),
    )
  })

  it('resumes checkout at the details step, with the area intact, after a sign-in round trip', async () => {
    const user = userEvent.setup()
    auth.user = null
    const first = renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await chooseArea(user, 'Outside Beirut')
    await user.type(screen.getByLabelText(/town or city/i), 'Jounieh')
    await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))
    expect(screen.getByRole('dialog', { name: /sign in to order/i })).toBeInTheDocument()

    // The auth round trip remounts the tree; the resume marker lives in sessionStorage.
    first.unmount()
    auth.user = { id: 'session-user-id', email: 'nour@example.com' }
    renderDrawer()

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /delivery details/i })).toBeInTheDocument(),
    )
    // $4 outside-Beirut fee survived the round trip.
    expect(within(drawer()).getByText('$4.00')).toBeInTheDocument()
    expect(within(drawer()).getByText(/delivery, jounieh/i)).toBeInTheDocument()
  })

  it('does not resume into details on a fresh visit with no saved marker', async () => {
    const user = userEvent.setup()
    auth.user = { id: 'session-user-id', email: 'nour@example.com' }
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)

    expect(screen.getByRole('dialog', { name: /your cart/i })).toBeInTheDocument()
  })

  it('goes back to the cart from the details form', async () => {
    const user = userEvent.setup()
    await reachDetails(user)

    await user.click(within(drawer()).getByRole('button', { name: /back to cart/i }))

    expect(screen.getByRole('dialog', { name: /your cart/i })).toBeInTheDocument()
  })

  it('goes back to the cart from the auth wall', async () => {
    const user = userEvent.setup()
    auth.user = null
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await chooseArea(user, 'Beirut')
    await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))

    // The auth wall offers both the header arrow and an in-body button.
    const backButtons = within(drawer()).getAllByRole('button', { name: /^back to cart$/i })
    expect(backButtons).toHaveLength(2)
    await user.click(backButtons[1])

    expect(screen.getByRole('dialog', { name: /your cart/i })).toBeInTheDocument()
  })

  it('reaches the success state after a successful order', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)

    expect(within(drawer()).getByText(/order saved/i)).toBeInTheDocument()
    expect(within(drawer()).getByText('ord-abc1')).toBeInTheDocument()
  })

  it('routes back to the auth wall with an explanation if the session lapsed mid-form', async () => {
    const user = userEvent.setup()
    const { rerender } = await reachDetails(user)
    await fillDetails(user)

    auth.user = null // session expires while the form is open
    rerender(tree())
    await user.click(screen.getByRole('button', { name: PLACE_ORDER }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /sign in to order/i })).toBeInTheDocument(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(readCart().lines).toHaveLength(1)
  })
})

// ─── Money ────────────────────────────────────────────────────────────────────

describe('CartDrawer — cart maths', () => {
  it('adds $3 delivery for Beirut', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await chooseArea(user, 'Beirut')

    const totals = within(drawer())
    // $89.99 appears twice: once on the line, once as the subtotal.
    expect(totals.getAllByText('$89.99')).toHaveLength(2)
    expect(totals.getByText('$3.00')).toBeInTheDocument()
    expect(totals.getByText('$92.99')).toBeInTheDocument()
  })

  it('adds $4 delivery for outside Beirut and asks for the town', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await chooseArea(user, 'Outside Beirut')

    expect(within(drawer()).getByText('$4.00')).toBeInTheDocument()
    expect(within(drawer()).getByText('$93.99')).toBeInTheDocument()
    expect(screen.getByLabelText(/town or city/i)).toBeInTheDocument()
  })

  it('shows the subtotal only, with no delivery, before an area is picked', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)

    expect(within(drawer()).getByText(/pick an area/i)).toBeInTheDocument()
    expect(within(drawer()).getAllByText('$89.99').length).toBeGreaterThanOrEqual(2)
  })

  it('sums multiple lines and reflects quantity changes', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto', 'p-clip'])
    await openCart(user)
    await chooseArea(user, 'Beirut')

    // 89.99 + 29.99 = 119.98, + $3 delivery = 122.98
    expect(within(drawer()).getByText('$122.98')).toBeInTheDocument()

    await user.click(
      within(drawer()).getByRole('button', {
        name: /increase quantity of crystal hair claw clip/i,
      }),
    )

    // 89.99 + 59.98 = 149.97, + $3 = 152.97
    await waitFor(() => expect(within(drawer()).getByText('$152.97')).toBeInTheDocument())
    expect(readCart().total).toBe(3)
  })

  it('removes a line when its quantity is decremented to zero', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)

    await user.click(
      within(drawer()).getByRole('button', {
        name: /reduce quantity of velvet gold-strap stiletto/i,
      }),
    )

    await waitFor(() =>
      expect(within(drawer()).getByText(/your cart is empty/i)).toBeInTheDocument(),
    )
    expect(readCart().lines).toEqual([])
  })

  it('removes a line via the trash button', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto', 'p-clip'])
    await openCart(user)

    await user.click(
      within(drawer()).getByRole('button', { name: /^remove crystal hair claw clip$/i }),
    )

    await waitFor(() => expect(readCart().lines.map(l => l.id)).toEqual(['p-stiletto']))
  })
})

// ─── Order submission ─────────────────────────────────────────────────────────

describe('CartDrawer — order submission', () => {
  it('posts an order whose fee and total match the chosen area', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/orders')
    expect(init.method).toBe('POST')

    const payload = JSON.parse(init.body as string)
    expect(payload).toMatchObject({
      area: 'beirut',
      delivery_fee: 3,
      subtotal: 89.99,
      total: 92.99,
      full_name: 'Nour Khalil',
      phone: '03 456 789',
      delivery_address: 'Hamra Street, Building 4',
      city: null,
      order_notes: null,
    })
    expect(payload.items).toEqual([
      {
        product_id: 'p-stiletto',
        name: 'Velvet Gold-Strap Stiletto', size: '38', qty: 1, price: 89.99 },
    ])
  })

  it('posts the $4 fee and the town for an outside-Beirut order', async () => {
    const user = userEvent.setup()
    auth.user = { id: 'session-user-id', email: 'nour@example.com' }
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await chooseArea(user, 'Outside Beirut')
    await user.type(screen.getByLabelText(/town or city/i), 'Jounieh')
    await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))
    await fillDetails(user)
    await user.click(screen.getByRole('button', { name: PLACE_ORDER }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const payload = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(payload).toMatchObject({
      area: 'outside',
      city: 'Jounieh',
      delivery_fee: 4,
      total: 93.99,
    })
  })

  it('surfaces the API error message and stays on the details form', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'Delivery fee for Beirut must be $3' }, { ok: false, status: 400 }),
    )
    await reachDetails(user)
    await fillDetails(user)
    await user.click(screen.getByRole('button', { name: PLACE_ORDER }))

    await waitFor(() =>
      expect(within(drawer()).getByRole('alert')).toHaveTextContent(
        'Delivery fee for Beirut must be $3',
      ),
    )
    expect(screen.getByRole('dialog', { name: /delivery details/i })).toBeInTheDocument()
    expect(readCart().lines).toHaveLength(1)
  })

  it('surfaces a network failure without losing the cart', async () => {
    const user = userEvent.setup()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await reachDetails(user)
    await fillDetails(user)
    await user.click(screen.getByRole('button', { name: PLACE_ORDER }))

    await waitFor(() =>
      expect(within(drawer()).getByRole('alert')).toHaveTextContent(/network error/i),
    )
    expect(readCart().lines).toHaveLength(1)
  })

  it('does not open WhatsApp or reach success when the API rejects the order', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Subtotal is invalid' }, { ok: false, status: 400 }))
    await reachDetails(user)
    await fillDetails(user)
    await user.click(screen.getByRole('button', { name: PLACE_ORDER }))

    await waitFor(() => expect(within(drawer()).getByRole('alert')).toBeInTheDocument())
    expect(openSpy).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: WHATSAPP_ACTION })).not.toBeInTheDocument()
  })
})

// ─── Owner handoff ────────────────────────────────────────────────────────────

describe('CartDrawer — owner notification handoff', () => {
  it('opens the owner WhatsApp message addressed to the shop number', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)

    expect(openSpy).toHaveBeenCalledTimes(1)
    const openedUrl = openSpy.mock.calls[0][0] as string
    expect(new URL(openedUrl).pathname).toBe(`/${WHATSAPP_PHONE}`)
    expect(new URL(openedUrl).searchParams.get('text')).toContain('Nour Khalil')
  })

  /**
   * REGRESSION GUARD — components/public/CartDrawer.tsx:146-155, 541-555.
   * window.open() runs after two awaits, so its user-activation token is spent and
   * iOS Safari / in-app browsers block it. The success screen's anchor is the only
   * reliable handoff. If that anchor is ever removed, an order can be saved while
   * the shop is never notified — this test must keep failing loudly if that happens.
   */
  it('still hands the order to the shop when the popup is blocked', async () => {
    const user = userEvent.setup()
    openSpy.mockReturnValue(null) // what a blocked popup returns

    await reachSuccess(user)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(within(drawer()).getByText(/order saved/i)).toBeInTheDocument()

    const link = within(drawer()).getByRole('link', { name: WHATSAPP_ACTION })
    const href = link.getAttribute('href')!
    expect(new URL(href).pathname).toBe(`/${WHATSAPP_PHONE}`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('carries the full order detail in the fallback anchor, not just the number', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)

    const href = within(drawer()).getByRole('link', { name: WHATSAPP_ACTION }).getAttribute('href')!
    const text = new URL(href).searchParams.get('text')!
    expect(text).toContain('Nour Khalil')
    expect(text).toContain('Hamra Street, Building 4')
    expect(text).toContain('Velvet Gold-Strap Stiletto')
    expect(text).toContain('💰 TOTAL: $92.99')
  })

  it('never addresses the customer’s own number from the success screen', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)

    const href = within(drawer()).getByRole('link', { name: WHATSAPP_ACTION }).getAttribute('href')!
    expect(new URL(href).pathname).not.toBe('/9613456789')
  })
})

// ─── Regression: leaving the success state must clear the cart ────────────────

describe('CartDrawer — leaving the success state clears the cart', () => {
  it('clears the cart when closed with the X button', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)
    expect(readCart().lines).toHaveLength(1)

    await user.click(within(drawer()).getByRole('button', { name: /close cart/i }))

    await waitFor(() => expect(readCart().lines).toEqual([]))
    expect(readCart().total).toBe(0)
  })

  it('clears the cart via "Continue shopping"', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)

    await user.click(within(drawer()).getByRole('button', { name: /continue shopping/i }))

    await waitFor(() => expect(readCart().lines).toEqual([]))
  })

  it('clears the cart when dismissed with Escape', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)

    await user.keyboard('{Escape}')

    await waitFor(() => expect(readCart().lines).toEqual([]))
  })

  it('clears the cart when leaving via "See your orders"', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)

    await user.click(within(drawer()).getByRole('link', { name: /see your orders/i }))

    await waitFor(() => expect(readCart().lines).toEqual([]))
  })

  it('reopens on an empty cart after closing with X, so no duplicate order is possible', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)
    await user.click(within(drawer()).getByRole('button', { name: /close cart/i }))
    await waitFor(() => expect(readCart().lines).toEqual([]))

    await openCart(user)

    expect(screen.getByRole('dialog', { name: /your cart/i })).toBeInTheDocument()
    expect(within(drawer()).getByText(/your cart is empty/i)).toBeInTheDocument()
  })

  it('does NOT clear the cart when the drawer is closed from the cart state', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)

    await user.click(within(drawer()).getByRole('button', { name: /close cart/i }))

    expect(readCart().lines).toHaveLength(1)
  })

  it('does NOT clear the cart when the details form is abandoned with X', async () => {
    const user = userEvent.setup()
    await reachDetails(user)

    await user.click(within(drawer()).getByRole('button', { name: /close cart/i }))

    expect(readCart().lines).toHaveLength(1)
  })
})
