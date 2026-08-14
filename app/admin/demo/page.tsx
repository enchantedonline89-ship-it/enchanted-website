import Link from 'next/link'
import Logo from '@/components/public/Logo'
import { mockCategories, mockProducts } from '@/lib/mock-data'
import { formatPrice } from '@/lib/utils'

const demoProducts = mockProducts.slice(0, 6)

const demoOrders = [
  {
    id: 'DEMO-1042',
    customer: 'Demo Customer',
    area: 'Beirut',
    total: 93.99,
    status: 'Pending',
  },
  {
    id: 'DEMO-1041',
    customer: 'Client Preview',
    area: 'Jounieh',
    total: 138.99,
    status: 'Confirmed',
  },
]

const nav = [
  ['Dashboard', '#dashboard'],
  ['Products', '#products'],
  ['Categories', '#categories'],
  ['Orders', '#orders'],
] as const

export default function AdminDemoPage() {
  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <header className="flex h-[68px] items-center justify-between border-b border-line bg-paper-raised px-4 sm:px-8">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <span className="hidden border border-signal-warn/40 bg-signal-warn/10 px-2.5 py-1 text-[0.6875rem] uppercase tracking-wider text-ink-dim sm:inline">
            Read-only demo
          </span>
          <Link href="/" className="btn btn-ghost min-h-10 px-3 py-2 text-xs">
            View shop
          </Link>
        </div>
      </header>

      <nav className="track-scroll overflow-x-auto border-b border-line bg-paper-raised px-4 md:hidden" aria-label="Demo admin sections">
        <div className="flex min-w-max gap-6">
          {nav.map(([label, href]) => (
            <a key={href} href={href} className="flex min-h-12 items-center text-sm text-ink-dim">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-[1600px] md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100dvh-68px)] border-r border-line bg-paper-raised p-4 md:block">
          <p className="t-meta px-3 py-2">Client preview</p>
          <nav className="mt-2" aria-label="Demo admin sections">
            <ul className="space-y-1">
              {nav.map(([label, href], index) => (
                <li key={href}>
                  <a
                    href={href}
                    className={`block px-3 py-2.5 text-sm ${index === 0 ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-ink/5 hover:text-ink'}`}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-8 border border-line p-3 text-xs leading-relaxed text-ink-dim">
            Demo data only. Customer details and all create, edit, delete, and status actions are disabled.
          </p>
        </aside>

        <main className="min-w-0 space-y-12 p-4 sm:p-8">
          <section id="dashboard" className="scroll-mt-24">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="t-meta text-ink-dim">Read-only client preview</p>
                <h1 className="mt-2 text-3xl text-ink">Dashboard</h1>
                <p className="mt-2 text-sm text-ink-dim">A safe preview of the shop-management experience.</p>
              </div>
              <span className="border border-signal-warn/40 bg-signal-warn/10 px-3 py-2 text-xs text-ink-dim">
                Changes disabled
              </span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Products', mockProducts.length],
                ['Active products', mockProducts.filter((p) => p.is_active).length],
                ['Categories', mockCategories.length],
                ['Demo orders', demoOrders.length],
              ].map(([label, value]) => (
                <div key={label} className="border border-line bg-paper-raised p-4 sm:p-5">
                  <p className="text-xs uppercase tracking-wider text-ink-dim">{label}</p>
                  <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="products" className="scroll-mt-24">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl text-ink">Products</h2>
                <p className="mt-1 text-sm text-ink-dim">Preview inventory</p>
              </div>
              <button disabled className="btn btn-primary opacity-45">+ Add product</button>
            </div>
            <div className="overflow-x-auto border border-line bg-paper-raised">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-dim">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {demoProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-ink-dim">{product.category?.name ?? '—'}</td>
                      <td className="tnum px-4 py-3">{formatPrice(product.price)}</td>
                      <td className="px-4 py-3"><span className="bg-signal-ok/10 px-2 py-1 text-xs text-signal-ok">Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="categories" className="scroll-mt-24">
            <h2 className="text-2xl text-ink">Categories</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mockCategories.map((category) => (
                <article key={category.id} className="border border-line bg-paper-raised p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">{category.name}</h3>
                    <span className="bg-signal-ok/10 px-2 py-1 text-xs text-signal-ok">Active</span>
                  </div>
                  <p className="mt-2 text-xs text-ink-dim">/{category.slug}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="orders" className="scroll-mt-24 pb-10">
            <h2 className="text-2xl text-ink">Orders</h2>
            <p className="mt-1 text-sm text-ink-dim">Fictional records for layout review only</p>
            <div className="mt-4 overflow-x-auto border border-line bg-paper-raised">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-dim">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {demoOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="tnum px-4 py-3">{order.id}</td>
                      <td className="px-4 py-3">{order.customer}</td>
                      <td className="px-4 py-3 text-ink-dim">{order.area}</td>
                      <td className="tnum px-4 py-3">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3"><span className="border border-line px-2 py-1 text-xs">{order.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
