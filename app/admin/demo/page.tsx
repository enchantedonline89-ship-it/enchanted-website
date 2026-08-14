import Link from 'next/link'
import Logo from '@/components/public/Logo'
import { mockCategories, mockProducts } from '@/lib/mock-data'
import { formatPrice } from '@/lib/utils'

const demoProducts = mockProducts.slice(0, 8)

const demoOrders = [
  { number: 'EN-260814-1042', customer: 'Demo Customer', area: 'Beirut', total: 93.99, status: 'Pending' },
  { number: 'EN-260813-1041', customer: 'Client Preview', area: 'Jounieh', total: 138.99, status: 'Completed' },
  { number: 'EN-260812-1040', customer: 'Sample Shopper', area: 'Tripoli', total: 72.0, status: 'Shipped' },
]

const demoEvents = [
  { name: 'Christmas Edit', dates: 'Dec 1–26', theme: 'Christmas', status: 'Scheduled' },
  { name: 'Ramadan Collection', dates: 'Feb 17–Mar 19', theme: 'Ramadan', status: 'Draft' },
]

const demoDiscounts = [
  { name: 'Weekend edit', scope: 'Entire shop', amount: '10%', status: 'Active' },
  { name: 'Heels spotlight', scope: 'Heels & Stilettos', amount: '15%', status: 'Scheduled' },
]

const nav = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'orders', label: 'Orders' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'discounts', label: 'Discounts' },
  { id: 'events', label: 'Events' },
  { id: 'appearance', label: 'Appearance' },
] as const

type DemoTab = (typeof nav)[number]['id']

function isDemoTab(value: string | undefined): value is DemoTab {
  return nav.some((item) => item.id === value)
}

function tabHref(tab: DemoTab) {
  return tab === 'dashboard' ? '/admin/demo' : `/admin/demo?tab=${tab}`
}

function PageHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow ? <p className="t-meta text-ink-dim">{eyebrow}</p> : null}
        <h1 className={`${eyebrow ? 'mt-2' : ''} text-3xl text-ink`}>{title}</h1>
        <p className="mt-2 text-sm text-ink-dim">{description}</p>
      </div>
      <span className="border border-signal-warn/40 bg-signal-warn/10 px-3 py-2 text-xs text-ink-dim">
        Changes disabled
      </span>
    </div>
  )
}

function Status({ children, ok = true }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <span className={ok ? 'bg-signal-ok/10 px-2 py-1 text-xs text-signal-ok' : 'border border-line px-2 py-1 text-xs'}>
      {children}
    </span>
  )
}

function Dashboard() {
  return (
    <>
      <PageHeading eyebrow="Read-only client preview" title="Dashboard" description="A safe preview of the shop-management experience." />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Products', mockProducts.length],
          ['Active products', mockProducts.filter((product) => product.is_active).length],
          ['Categories', mockCategories.length],
          ['Demo orders', demoOrders.length],
        ].map(([label, value]) => (
          <div key={label} className="border border-line bg-paper-raised p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-ink-dim">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="border border-line bg-paper-raised p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl">Sales overview</h2>
              <p className="mt-1 text-sm text-ink-dim">Last 7 days · fictional preview data</p>
            </div>
            <p className="text-2xl font-semibold">$1,284</p>
          </div>
          <div className="mt-7 flex h-40 items-end gap-2" aria-label="Demo seven-day sales chart">
            {[42, 68, 50, 84, 61, 100, 76].map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full bg-gold/70" style={{ height: `${height}%` }} />
                <span className="text-[0.625rem] text-ink-dim">{['F', 'S', 'S', 'M', 'T', 'W', 'T'][index]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="border border-line bg-paper-raised p-5">
          <h2 className="text-xl">Storefront</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink-dim">Current theme</dt><dd>Default</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-dim">Active discount</dt><dd>10% shop-wide</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-dim">Delivery</dt><dd>$4 Lebanon-wide</dd></div>
          </dl>
          <Link href="/admin/demo?tab=appearance" className="mt-6 inline-flex text-sm underline underline-offset-4">Preview customization</Link>
        </section>
      </div>
    </>
  )
}

function Products() {
  return (
    <>
      <PageHeading title="Products" description="Manage inventory, product details, images, sizes, and availability." />
      <div className="mt-6 flex justify-end"><button disabled className="btn btn-primary opacity-45">+ Add product</button></div>
      <div className="mt-4 overflow-x-auto border border-line bg-paper-raised">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-dim"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {demoProducts.map((product) => <tr key={product.id}><td className="px-4 py-3 font-medium">{product.name}</td><td className="px-4 py-3 text-ink-dim">{product.category?.name ?? '—'}</td><td className="tnum px-4 py-3">{formatPrice(product.price)}</td><td className="px-4 py-3"><Status>Active</Status></td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Categories() {
  return (
    <>
      <PageHeading title="Categories" description="Organize the catalog and control category visibility." />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mockCategories.map((category) => <article key={category.id} className="border border-line bg-paper-raised p-4"><div className="flex items-start justify-between gap-3"><h2 className="font-medium">{category.name}</h2><Status>Active</Status></div><p className="mt-2 text-xs text-ink-dim">/{category.slug}</p><button disabled className="mt-5 text-xs uppercase tracking-wider text-ink-dim opacity-50">Edit category</button></article>)}
      </div>
    </>
  )
}

function Orders() {
  return (
    <>
      <PageHeading title="Orders" description="Follow every order from pending to completed with a unique tracking number." />
      <div className="mt-6 overflow-x-auto border border-line bg-paper-raised">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-dim"><tr><th className="px-4 py-3">Order number</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-line">{demoOrders.map((order) => <tr key={order.number}><td className="tnum px-4 py-3 font-medium">{order.number}</td><td className="px-4 py-3">{order.customer}</td><td className="px-4 py-3 text-ink-dim">{order.area}</td><td className="tnum px-4 py-3">{formatPrice(order.total)}</td><td className="px-4 py-3"><Status ok={order.status === 'Completed'}>{order.status}</Status></td></tr>)}</tbody>
        </table>
      </div>
    </>
  )
}

function Analytics() {
  const cards = [['Revenue', '$4,860', '+18%'], ['Completed orders', '47', '+12%'], ['Average order', '$103', '+5%'], ['Conversion', '3.8%', '+0.6%']]
  return (
    <>
      <PageHeading title="Analytics" description="Understand revenue, completed orders, product demand, and promotion performance." />
      <div className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(([label, value, delta]) => <article key={label} className="border border-line bg-paper-raised p-5"><p className="text-xs uppercase tracking-wider text-ink-dim">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-signal-ok">{delta} this month</p></article>)}</div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2"><section className="border border-line bg-paper-raised p-5"><h2 className="text-xl">Revenue by category</h2>{[['Heels & Stilettos', 82], ['Dresses', 66], ['Sneakers', 48], ['Accessories', 29]].map(([name, width]) => <div key={name} className="mt-5"><div className="mb-2 flex justify-between text-sm"><span>{name}</span><span className="text-ink-dim">{width}%</span></div><div className="h-2 bg-ink/5"><div className="h-full bg-gold" style={{ width: `${width}%` }} /></div></div>)}</section><section className="border border-line bg-paper-raised p-5"><h2 className="text-xl">Order status</h2><div className="mt-6 grid grid-cols-2 gap-3">{[['Completed', 47], ['Shipped', 12], ['Pending', 8], ['Cancelled', 2]].map(([label, value]) => <div key={label} className="border border-line p-4"><p className="text-sm text-ink-dim">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div></section></div>
    </>
  )
}

function Discounts() {
  return (
    <>
      <PageHeading title="Discounts" description="Schedule a promotion for the entire shop or a selected category." />
      <div className="mt-6 flex justify-end"><button disabled className="btn btn-primary opacity-45">+ Create discount</button></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">{demoDiscounts.map((discount) => <article key={discount.name} className="border border-line bg-paper-raised p-5"><div className="flex items-start justify-between gap-4"><div><p className="t-meta text-ink-dim">{discount.scope}</p><h2 className="mt-2 text-xl">{discount.name}</h2></div><p className="text-3xl font-semibold text-gold-deep">{discount.amount}</p></div><div className="mt-6 flex items-center justify-between"><Status>{discount.status}</Status><button disabled className="text-xs uppercase tracking-wider opacity-45">Edit</button></div></article>)}</div>
    </>
  )
}

function Events() {
  return (
    <>
      <PageHeading title="Events" description="Plan seasonal campaigns, storefront messaging, dates, and a matching visual theme." />
      <div className="mt-6 flex justify-end"><button disabled className="btn btn-primary opacity-45">+ Add event</button></div>
      <div className="mt-4 space-y-3">{demoEvents.map((event) => <article key={event.name} className="grid gap-4 border border-line bg-paper-raised p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><h2 className="text-xl">{event.name}</h2><p className="mt-1 text-sm text-ink-dim">{event.dates}</p></div><p className="text-sm">{event.theme} theme</p><Status ok={event.status === 'Scheduled'}>{event.status}</Status></article>)}</div>
    </>
  )
}

function Appearance() {
  const themes = [{ name: 'Default', detail: 'Classic ivory and gold', swatch: 'bg-[#c99a3d]' }, { name: 'Christmas', detail: 'Snow, festive green and a logo hat', swatch: 'bg-[#9f2d2d]' }, { name: 'Ramadan', detail: 'Lantern glow, crescent and midnight blue', swatch: 'bg-[#18234d]' }]
  return (
    <>
      <PageHeading title="Appearance" description="Apply a polished seasonal look across the storefront from one place." />
      <div className="mt-8 grid gap-4 lg:grid-cols-3">{themes.map((theme, index) => <article key={theme.name} className={`border bg-paper-raised p-5 ${index === 0 ? 'border-gold ring-1 ring-gold' : 'border-line'}`}><div className={`h-28 ${theme.swatch}`}><div className="flex h-full items-center justify-center text-4xl text-white/90">{theme.name === 'Christmas' ? '❄' : theme.name === 'Ramadan' ? '☾' : '✦'}</div></div><div className="mt-4 flex items-start justify-between gap-4"><div><h2 className="text-xl">{theme.name}</h2><p className="mt-1 text-sm text-ink-dim">{theme.detail}</p></div>{index === 0 ? <Status>Active</Status> : null}</div><button disabled className="btn btn-ghost mt-5 w-full opacity-45">{index === 0 ? 'Current theme' : 'Apply theme'}</button></article>)}</div>
      <section className="mt-6 border border-line bg-paper-raised p-5"><h2 className="text-xl">Announcement bar</h2><p className="mt-1 text-sm text-ink-dim">Show an event or promotion message across the shop.</p><div className="mt-4 border border-line bg-paper px-4 py-3 text-sm">Delivery $4 all over Lebanon</div></section>
    </>
  )
}

const content: Record<DemoTab, React.ComponentType> = { dashboard: Dashboard, products: Products, categories: Categories, orders: Orders, analytics: Analytics, discounts: Discounts, events: Events, appearance: Appearance }

export default async function AdminDemoPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams
  const activeTab: DemoTab = isDemoTab(params.tab) ? params.tab : 'dashboard'
  const ActiveContent = content[activeTab]

  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <header className="flex h-[68px] items-center justify-between border-b border-line bg-paper-raised px-4 sm:px-8"><Logo size="sm" /><div className="flex items-center gap-3"><span className="hidden border border-signal-warn/40 bg-signal-warn/10 px-2.5 py-1 text-[0.6875rem] uppercase tracking-wider text-ink-dim sm:inline">Read-only demo</span><Link href="/" className="btn btn-ghost min-h-10 px-3 py-2 text-xs">View shop</Link></div></header>

      <nav className="track-scroll overflow-x-auto border-b border-line bg-paper-raised px-4 md:hidden" aria-label="Demo admin sections"><div className="flex min-w-max gap-1">{nav.map((item) => <Link key={item.id} href={tabHref(item.id)} aria-current={activeTab === item.id ? 'page' : undefined} className={`flex min-h-12 items-center border-b-2 px-3 text-sm ${activeTab === item.id ? 'border-ink text-ink' : 'border-transparent text-ink-dim'}`}>{item.label}</Link>)}</div></nav>

      <div className="mx-auto grid max-w-[1600px] md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100dvh-68px)] border-r border-line bg-paper-raised p-4 md:block"><p className="t-meta px-3 py-2">Client preview</p><nav className="mt-2" aria-label="Demo admin sections"><ul className="space-y-1">{nav.map((item) => <li key={item.id}><Link href={tabHref(item.id)} aria-current={activeTab === item.id ? 'page' : undefined} className={`block px-3 py-2.5 text-sm ${activeTab === item.id ? 'bg-ink text-paper' : 'text-ink-dim hover:bg-ink/5 hover:text-ink'}`}>{item.label}</Link></li>)}</ul></nav><p className="mt-8 border border-line p-3 text-xs leading-relaxed text-ink-dim">Demo data only. Customer details and all create, edit, delete, and status actions are disabled.</p></aside>
        <main className="min-w-0 p-4 sm:p-8"><ActiveContent /></main>
      </div>
    </div>
  )
}
