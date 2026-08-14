import type { Metadata } from 'next'
import PageShell from '@/components/public/PageShell'
import TrackOrderForm from './TrackOrderForm'

export const metadata: Metadata = {
  title: 'Track your order',
  description: 'Check the latest status of an Enchanted Style order.',
  robots: { index: false, follow: true },
}

export default function TrackOrderPage() {
  return (
    <PageShell
      title="Track your order"
      standfirst="Enter the order number from your confirmation and the email used at checkout."
    >
      <TrackOrderForm />
    </PageShell>
  )
}

