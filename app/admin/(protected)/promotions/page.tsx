import PromotionManager from './PromotionManager'
import { getAdminPromotionsData } from '@/lib/admin-promotions-d1'
import { getD1Database } from '@/lib/cloudflare/d1'

export const dynamic = 'force-dynamic'

export default async function PromotionsPage() {
  const db = await getD1Database()
  let data: Awaited<ReturnType<typeof getAdminPromotionsData>> | null = null
  if (db) {
    try {
      data = await getAdminPromotionsData(db)
    } catch (error) {
      console.error('Promotion list failed:', error)
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <p className="t-meta">Storefront campaigns</p>
        <h1 className="mt-2 text-3xl text-ink">Events & discounts</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-dim">
          Schedule a named event, choose who receives the discount, and pause it at any time.
          If events overlap, customers receive the single largest discount.
        </p>
      </div>

      {!data ? (
        <div className="border border-signal-warn/40 bg-signal-warn/10 px-4 py-3 text-sm text-ink">
          Promotions are temporarily unavailable. Refresh the page or try again shortly.
        </div>
      ) : (
        <PromotionManager
          initialPromotions={data.promotions}
          categories={data.categories}
        />
      )}
    </div>
  )
}
