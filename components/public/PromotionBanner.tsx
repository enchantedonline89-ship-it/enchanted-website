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

  const featured = [...promotions].sort(
    (a, b) => Number(b.discount_percent) - Number(a.discount_percent),
  )[0]

  return (
    <aside className="border-b border-gold-deep/20 bg-gold/20 px-5 py-3 text-center" aria-label="Current offer">
      <p className="text-[0.8125rem] text-ink">
        <strong className="font-medium">{featured.name}</strong>
        <span aria-hidden="true"> — </span>
        {copy(featured)}
        {featured.campaign_type === 'discount' && featured.description
          ? <span className="text-ink-dim"> · {featured.description}</span>
          : null}
      </p>
    </aside>
  )
}
