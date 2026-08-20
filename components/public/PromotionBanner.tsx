import type { Promotion } from '@/lib/promotions'

function copy(promotion: Promotion): string {
  if (promotion.campaign_type === 'event') return promotion.description ?? 'Now on at Enchanted Style'
  const amount = Number(promotion.discount_percent).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })
  const scope = promotion.scope === 'sitewide'
    ? 'sitewide'
    : promotion.category?.name
      ? `on ${promotion.category.name}`
      : 'on selected pieces'
  return `${amount}% off ${scope}`
}

export default function PromotionBanner({ promotions }: { promotions: Promotion[] }) {
  if (promotions.length === 0) return null

  const featured = [...promotions]
    .sort((a, b) => {
      if (a.campaign_type !== b.campaign_type) return a.campaign_type === 'event' ? -1 : 1
      return Number(b.discount_percent ?? 0) - Number(a.discount_percent ?? 0)
    })
    .slice(0, 3)

  return (
    <aside className="border-b border-gold-deep/20 bg-gold/20 px-5 py-2.5 text-center" aria-label="Current offers">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        {featured.map((promotion) => (
          <p key={promotion.id} className="text-[0.8125rem] text-ink">
            <strong className="font-medium">{promotion.name}</strong>
            <span aria-hidden="true"> — </span>
            {copy(promotion)}
            {promotion.campaign_type === 'discount' && promotion.description
              ? <span className="text-ink-dim"> · {promotion.description}</span>
              : null}
          </p>
        ))}
      </div>
    </aside>
  )
}
