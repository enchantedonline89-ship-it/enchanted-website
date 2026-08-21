import * as React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CartProvider } from '@/lib/cart-context'
import { WHATSAPP_PHONE } from '@/lib/whatsapp'
import type { CustomerAddress } from '@/lib/customer-data'
import type { Product } from '@/types'
import { CartControls, CartProbe, readCart } from '../helpers/cart-harness'
import { makeAccessory, makeColorProduct, makeSizedProduct } from '../helpers/factories'

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
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/components/public/AuthModal', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="auth-modal">Authentication choices</div> : null,
}))

const CartDrawer = (await import('@/components/public/CartDrawer')).default

const STILETTO = makeSizedProduct({
  id: 'p-stiletto',
  name: 'Velvet Gold-Strap Stiletto',
  price: 89.99,
  sizes: ['38'],
})
const CLIP = makeAccessory({ id: 'p-clip', name: 'Crystal Hair Claw Clip', price: 29.99 })

const HOME_ADDRESS: CustomerAddress = {
  id: 'addr-home',
  label: 'Home',
  recipientName: 'Nour Khalil',
  phone: '+9613456789',
  countryCode: 'LB',
  governorate: 'Beirut',
  city: 'Beirut',
  area: 'Hamra',
  street: 'Hamra Street, Building 4',
  building: 'Building 4',
  floor: '3',
  landmark: null,
  deliveryNotes: null,
  isDefault: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

const WORK_ADDRESS: CustomerAddress = {
  ...HOME_ADDRESS,
  id: 'addr-work',
  label: 'Work',
  recipientName: 'Nour at work',
  phone: '+96181492994',
  governorate: 'Mount Lebanon',
  city: 'Jounieh',
  area: 'Kaslik',
  street: 'Sea Road',
  building: null,
  floor: null,
  isDefault: false,
  updatedAt: '2026-08-02T00:00:00.000Z',
}

type FetchReply = {
  data: unknown
  ok: boolean
  status: number
}

const fetchMock = vi.fn()
let addressReply: FetchReply | Error
let orderReply: FetchReply | Error

function reply(data: unknown, { ok = true, status = 200 } = {}): FetchReply {
  return { data, ok, status }
}

function responseFrom(result: FetchReply | Error) {
  if (result instanceof Error) return Promise.reject(result)
  return Promise.resolve({
    ok: result.ok,
    status: result.status,
    json: async () => result.data,
  })
}

function requestUrl(input: unknown): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  if (input instanceof Request) return input.url
  return String(input)
}

beforeEach(() => {
  auth.user = null
  addressReply = reply({ addresses: [HOME_ADDRESS, WORK_ADDRESS] })
  orderReply = reply({ id: 'ord-abc12345', order_number: 'ES-2608-001001' })
  fetchMock.mockImplementation((input: unknown) =>
    responseFrom(requestUrl(input) === '/api/account/addresses' ? addressReply : orderReply),
  )
  vi.stubGlobal('fetch', fetchMock)
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

async function seed(user: UserEvent, ids: string[]) {
  for (const id of ids) await user.click(screen.getByTestId(`seed-${id}`))
}

async function openCart(user: UserEvent) {
  await user.click(screen.getByTestId('open-cart'))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
}

async function reachDetails(
  user: UserEvent,
  products: Product[] = [STILETTO, CLIP],
  waitForAddress = true,
) {
  auth.user = { id: 'session-user-id', email: 'nour@example.com' }
  const view = renderDrawer(products)
  await seed(user, [products[0].id])
  await openCart(user)
  await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))
  await waitFor(() =>
    expect(screen.getByRole('dialog', { name: /delivery details/i })).toBeInTheDocument(),
  )
  if (waitForAddress) {
    await waitFor(() =>
      expect(within(drawer()).getByRole('radio', { name: /home.*default/i })).toBeChecked(),
    )
  }
  return view
}

async function reachSuccess(user: UserEvent, products: Product[] = [STILETTO, CLIP]) {
  const view = await reachDetails(user, products)
  await user.click(within(drawer()).getByRole('button', { name: PLACE_ORDER }))
  await waitFor(() =>
    expect(screen.getByRole('dialog', { name: /order placed/i })).toBeInTheDocument(),
  )
  return view
}

function orderCalls() {
  return fetchMock.mock.calls.filter(([input]) => requestUrl(input) === '/api/orders')
}

function orderPayload(): Record<string, unknown> {
  const call = orderCalls().at(-1)
  if (!call) throw new Error('Expected an order request')
  const init = call[1] as RequestInit
  return JSON.parse(String(init.body)) as Record<string, unknown>
}

describe('CartDrawer — cart and account-required state machine', () => {
  it('opens with cart lines, size, fixed Lebanon delivery, and total', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)

    const cart = within(drawer())
    expect(screen.getByRole('dialog', { name: /your cart/i })).toBeInTheDocument()
    expect(cart.getByText('Velvet Gold-Strap Stiletto')).toBeInTheDocument()
    expect(cart.getByText('Size 38')).toBeInTheDocument()
    expect(cart.getByText(/\$4 delivery anywhere in Lebanon/i)).toBeInTheDocument()
    expect(cart.getByText('$93.99')).toBeInTheDocument()
    expect(cart.getByRole('button', { name: CONTINUE })).toBeEnabled()
  })

  it('shows the empty Shop All state and closes when its catalog link is used', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await openCart(user)

    const cartDialog = drawer()
    expect(within(cartDialog).getByText(/your cart is empty/i)).toBeInTheDocument()
    const shopAll = within(cartDialog).getByRole('link', { name: /shop all/i })
    expect(shopAll).toHaveAttribute('href', '/#catalog')
    await user.click(shopAll)
    expect(cartDialog.parentElement).toHaveAttribute('inert')
  })

  it('sends a signed-out customer to the auth wall and records only a resume marker', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))

    expect(screen.getByRole('dialog', { name: /sign in to order/i })).toBeInTheDocument()
    await waitFor(() =>
      expect(sessionStorage.getItem('enchanted_resume_checkout')).toBe('{"checkout":true}'),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('opens the sign-in modal from the auth wall', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))
    await user.click(within(drawer()).getByRole('button', { name: /^sign in$/i }))

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument()
  })

  it('advances from the auth wall when a Better Auth session arrives', async () => {
    const user = userEvent.setup()
    const view = renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))

    auth.user = { id: 'session-user-id', email: 'nour@example.com' }
    view.rerender(tree())

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /delivery details/i })).toBeInTheDocument(),
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/account/addresses', {
      credentials: 'same-origin',
    }))
  })

  it('resumes checkout after a sign-in round trip without persisting personal data', async () => {
    const user = userEvent.setup()
    const first = renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))
    await waitFor(() => expect(sessionStorage.getItem('enchanted_resume_checkout')).toBeTruthy())

    first.unmount()
    auth.user = { id: 'session-user-id', email: 'nour@example.com' }
    renderDrawer()

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /delivery details/i })).toBeInTheDocument(),
    )
    expect(sessionStorage.getItem('enchanted_resume_checkout')).toBeNull()
    expect(JSON.stringify(sessionStorage)).not.toContain('nour@example.com')
  })

  it('does not resume a fresh signed-in visit without the marker', async () => {
    const user = userEvent.setup()
    auth.user = { id: 'session-user-id', email: 'nour@example.com' }
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    expect(screen.getByRole('dialog', { name: /your cart/i })).toBeInTheDocument()
  })

  it('goes back to the cart from details and from the auth wall', async () => {
    const user = userEvent.setup()
    const view = await reachDetails(user)
    await user.click(within(drawer()).getByRole('button', { name: /back to cart/i }))
    expect(screen.getByRole('dialog', { name: /your cart/i })).toBeInTheDocument()

    auth.user = null
    view.rerender(tree())
    await user.click(within(drawer()).getByRole('button', { name: CONTINUE }))
    const backButtons = within(drawer()).getAllByRole('button', { name: /^back to cart$/i })
    await user.click(backButtons.at(-1)!)
    expect(screen.getByRole('dialog', { name: /your cart/i })).toBeInTheDocument()
  })
})

describe('CartDrawer — cart line behavior', () => {
  it('sums multiple lines and updates the total when quantity changes', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto', 'p-clip'])
    await openCart(user)

    expect(within(drawer()).getByText('$123.98')).toBeInTheDocument()
    await user.click(within(drawer()).getByRole('button', {
      name: /increase quantity of crystal hair claw clip/i,
    }))
    await waitFor(() => expect(within(drawer()).getByText('$153.97')).toBeInTheDocument())
    expect(readCart().total).toBe(3)
  })

  it('removes a line when its quantity reaches zero', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await user.click(within(drawer()).getByRole('button', {
      name: /reduce quantity of velvet gold-strap stiletto/i,
    }))

    await waitFor(() => expect(within(drawer()).getByText(/your cart is empty/i)).toBeInTheDocument())
    expect(readCart().lines).toEqual([])
  })

  it('removes only the requested line with the trash action', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto', 'p-clip'])
    await openCart(user)
    await user.click(within(drawer()).getByRole('button', {
      name: /^remove crystal hair claw clip$/i,
    }))

    await waitFor(() => expect(readCart().lines.map((line) => line.id)).toEqual(['p-stiletto']))
  })

  it('shows the selected color and preserves its exact variant', async () => {
    const user = userEvent.setup()
    const product = makeColorProduct()
    renderDrawer([product])
    await seed(user, [product.id])
    await openCart(user)

    expect(within(drawer()).getByText('Color Ruby Red')).toBeInTheDocument()
    expect(readCart().lines[0]).toMatchObject({
      colorId: 'color-red',
      colorName: 'Ruby Red',
      variantId: 'variant-red-36',
    })
  })
})

describe('CartDrawer — saved-address checkout', () => {
  it('loads saved addresses, selects the default, and links to address management', async () => {
    const user = userEvent.setup()
    await reachDetails(user)

    expect(fetchMock).toHaveBeenCalledWith('/api/account/addresses', {
      credentials: 'same-origin',
    })
    expect(within(drawer()).getByRole('radio', { name: /home.*default/i })).toBeChecked()
    expect(within(drawer()).getByRole('radio', { name: /work/i })).not.toBeChecked()
    expect(within(drawer()).getByRole('link', { name: /manage/i })).toHaveAttribute(
      'href',
      '/account/addresses',
    )
  })

  it('disables ordering and offers address management when none are saved', async () => {
    const user = userEvent.setup()
    addressReply = reply({ addresses: [] })
    await reachDetails(user, [STILETTO], false)

    await waitFor(() =>
      expect(within(drawer()).getByText(/add a delivery address to continue/i)).toBeInTheDocument(),
    )
    expect(within(drawer()).getByRole('link', { name: /add delivery address/i })).toHaveAttribute(
      'href',
      '/account/addresses',
    )
    expect(within(drawer()).getByRole('button', { name: PLACE_ORDER })).toBeDisabled()
  })

  it('surfaces an address API failure and cannot submit without a selection', async () => {
    const user = userEvent.setup()
    addressReply = reply({ error: 'Unavailable' }, { ok: false, status: 503 })
    await reachDetails(user, [STILETTO], false)

    await waitFor(() =>
      expect(within(drawer()).getByRole('alert')).toHaveTextContent(
        'We could not load your saved addresses.',
      ),
    )
    expect(within(drawer()).getByRole('button', { name: PLACE_ORDER })).toBeDisabled()
    expect(orderCalls()).toHaveLength(0)
  })

  it('posts only the selected address ID, notes, cart items, and current totals', async () => {
    const user = userEvent.setup()
    await reachDetails(user)
    await user.click(within(drawer()).getByRole('radio', { name: /work/i }))
    await user.type(within(drawer()).getByLabelText(/notes, optional/i), '  Ring reception  ')
    await user.click(within(drawer()).getByRole('button', { name: PLACE_ORDER }))
    await waitFor(() => expect(orderCalls()).toHaveLength(1))

    expect(orderPayload()).toEqual({
      address_id: 'addr-work',
      order_notes: 'Ring reception',
      items: [{
        product_id: 'p-stiletto',
        name: 'Velvet Gold-Strap Stiletto',
        size: '38',
        qty: 1,
        price: 89.99,
      }],
      subtotal: 89.99,
      total: 93.99,
    })
    const [, init] = orderCalls()[0] as [string, RequestInit]
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('posts color and variant identity for variant-managed products', async () => {
    const user = userEvent.setup()
    const product = makeColorProduct()
    await reachSuccess(user, [product])

    const payload = orderPayload()
    expect((payload.items as Array<Record<string, unknown>>)[0]).toMatchObject({
      product_id: 'p-color',
      size: '36',
      color_id: 'color-red',
      color_name: 'Ruby Red',
      color_hex: '#B2182B',
      variant_id: 'variant-red-36',
    })
  })

  it('surfaces an order API message, stays in details, and preserves the cart', async () => {
    const user = userEvent.setup()
    orderReply = reply({ error: 'That variant just sold out.' }, { ok: false, status: 409 })
    await reachDetails(user)
    await user.click(within(drawer()).getByRole('button', { name: PLACE_ORDER }))

    await waitFor(() =>
      expect(within(drawer()).getByRole('alert')).toHaveTextContent('That variant just sold out.'),
    )
    expect(screen.getByRole('dialog', { name: /delivery details/i })).toBeInTheDocument()
    expect(readCart().lines).toHaveLength(1)
  })

  it('surfaces a network failure without losing the selected address or cart', async () => {
    const user = userEvent.setup()
    orderReply = new TypeError('Failed to fetch')
    await reachDetails(user)
    await user.click(within(drawer()).getByRole('button', { name: PLACE_ORDER }))

    await waitFor(() =>
      expect(within(drawer()).getByRole('alert')).toHaveTextContent(/network error/i),
    )
    expect(within(drawer()).getByRole('radio', { name: /home.*default/i })).toBeChecked()
    expect(readCart().lines).toHaveLength(1)
  })

  it('returns to authentication without posting if the session expires mid-form', async () => {
    const user = userEvent.setup()
    const view = await reachDetails(user)
    auth.user = null
    view.rerender(tree())
    await user.click(within(drawer()).getByRole('button', { name: PLACE_ORDER }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /sign in to order/i })).toBeInTheDocument(),
    )
    expect(orderCalls()).toHaveLength(0)
    expect(readCart().lines).toHaveLength(1)
  })
})

describe('CartDrawer — successful order and cart clearing', () => {
  it('shows the trackable order number, confirmation state, and static WhatsApp contact', async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    await reachSuccess(user)

    const success = within(drawer())
    expect(success.getByText(/order saved/i)).toBeInTheDocument()
    expect(success.getByText('ES-2608-001001')).toBeInTheDocument()
    expect(success.getByText(/awaiting confirmation/i)).toBeInTheDocument()
    expect(success.getByText('+961 81 492 994')).toBeInTheDocument()
    const whatsapp = success.getByRole('link', { name: /contact us on whatsapp/i })
    expect(new URL(whatsapp.getAttribute('href')!).pathname).toBe(`/${WHATSAPP_PHONE}`)
    expect(whatsapp).toHaveAttribute('target', '_blank')
    expect(whatsapp).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('clears the cart when success is closed with X', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)
    expect(readCart().lines).toHaveLength(1)
    await user.click(within(drawer()).getByRole('button', { name: /close cart/i }))
    await waitFor(() => expect(readCart().lines).toEqual([]))
  })

  it('clears the cart via Continue shopping', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)
    await user.click(within(drawer()).getByRole('button', { name: /continue shopping/i }))
    await waitFor(() => expect(readCart().lines).toEqual([]))
  })

  it('clears the cart when success is dismissed with Escape', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(readCart().lines).toEqual([]))
  })

  it.each([
    [/see your orders/i, '/orders'],
    [/track an order/i, '/track-order'],
  ])('clears the cart when leaving through %s', async (name, href) => {
    const user = userEvent.setup()
    await reachSuccess(user)
    const link = within(drawer()).getByRole('link', { name })
    expect(link).toHaveAttribute('href', href)
    await user.click(link)
    await waitFor(() => expect(readCart().lines).toEqual([]))
  })

  it('reopens empty after success is closed, preventing a duplicate order', async () => {
    const user = userEvent.setup()
    await reachSuccess(user)
    await user.click(within(drawer()).getByRole('button', { name: /close cart/i }))
    await waitFor(() => expect(readCart().lines).toEqual([]))
    await openCart(user)
    expect(within(drawer()).getByText(/your cart is empty/i)).toBeInTheDocument()
  })

  it('does not clear the cart when closed from the cart state', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await seed(user, ['p-stiletto'])
    await openCart(user)
    await user.click(within(drawer()).getByRole('button', { name: /close cart/i }))
    expect(readCart().lines).toHaveLength(1)
  })

  it('does not clear the cart when delivery details are closed with X', async () => {
    const user = userEvent.setup()
    await reachDetails(user)
    await user.click(within(drawer()).getByRole('button', { name: /close cart/i }))
    expect(readCart().lines).toHaveLength(1)
  })
})
