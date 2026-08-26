import type { Metadata } from 'next'
import { requireCustomer } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'
import { getCustomerProfile, listCustomerAddresses } from '@/lib/customer-data'
import PageShell from '@/components/public/PageShell'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'
import AddressManager from './AddressManager'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Account & addresses',
  description: 'Manage your Enchanted account details and saved Lebanon delivery addresses.',
  alternates: { canonical: '/account/addresses' },
  robots: { index: false, follow: false },
}

export default async function AccountAddressesPage() {
  const session = await requireCustomer('/account/addresses')
  const db = await getD1Database()
  if (!db) throw new Error('Account storage is temporarily unavailable.')

  const [profile, addresses] = await Promise.all([
    getCustomerProfile(db, session.user.id),
    listCustomerAddresses(db, session.user.id),
  ])

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Account & addresses', path: '/account/addresses' }]} />
      <PageShell
        title="Account & addresses"
        standfirst="Keep your delivery details ready for a faster checkout. You can save up to ten addresses in Lebanon."
        meta={`${addresses.length} saved ${addresses.length === 1 ? 'address' : 'addresses'}`}
        wide
      >
        <AddressManager initialProfile={profile} initialAddresses={addresses} />
      </PageShell>
    </>
  )
}
