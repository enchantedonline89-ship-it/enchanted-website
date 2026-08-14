import { createClient } from '@/lib/supabase/server'
import PromotionManager from './PromotionManager'
import type { Promotion } from '@/lib/promotions'

export const dynamic = 'force-dynamic'

export default async function PromotionsPage() {
  const supabase = await createClient()
  const [{ data: promotions, error }, { data: categories }] = await Promise.all([
    supabase
      .from('promotions')
      .select('*, category:categories(id, name)')
      .order('starts_at', { ascending: false }),
    supabase.from('categories').select('id, name').order('sort_order'),
  ])

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

      {error ? (
        <div className="border border-signal-warn/40 bg-signal-warn/10 px-4 py-3 text-sm text-ink">
          Promotions are not available yet. Run <code>supabase/promotions-events-migration.sql</code>
          {' '}in the Supabase SQL editor, then refresh this page.
        </div>
      ) : (
        <PromotionManager
          initialPromotions={(promotions ?? []) as Promotion[]}
          categories={categories ?? []}
        />
      )}
    </div>
  )
}
