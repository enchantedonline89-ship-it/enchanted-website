import type { CampaignType, PromotionScope } from '@/lib/promotions'

export interface PromotionInput {
  name: string
  description: string | null
  campaign_type: CampaignType
  scope: PromotionScope
  category_id: string | null
  discount_percent: number | null
  starts_at: string
  ends_at: string | null
  is_active: boolean
}

type Result = { value: PromotionInput; error?: never } | { value?: never; error: string }

export function validatePromotionInput(input: unknown): Result {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Request body must be an object.' }
  }
  const body = input as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name.length < 2 || name.length > 100) {
    return { error: 'Event name must be between 2 and 100 characters.' }
  }

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (description.length > 300) return { error: 'Description must be 300 characters or fewer.' }

  const campaignType = body.campaign_type
  if (campaignType !== 'event' && campaignType !== 'discount') {
    return { error: 'Choose event or discount.' }
  }

  const scope = campaignType === 'event' ? 'sitewide' : body.scope
  if (scope !== 'sitewide' && scope !== 'category') {
    return { error: 'Choose a site-wide or category-wide discount.' }
  }

  const categoryId = typeof body.category_id === 'string' ? body.category_id.trim() : ''
  if (scope === 'category' && !categoryId) {
    return { error: 'Choose a category for this discount.' }
  }

  const discountPercent = campaignType === 'discount' ? Number(body.discount_percent) : null
  if (campaignType === 'discount' &&
      (!Number.isFinite(discountPercent) || Number(discountPercent) <= 0 || Number(discountPercent) > 100)) {
    return { error: 'Discount must be greater than 0% and no more than 100%.' }
  }

  const startsAt = typeof body.starts_at === 'string' ? new Date(body.starts_at) : null
  if (!startsAt || !Number.isFinite(startsAt.getTime())) {
    return { error: 'Choose a valid start date and time.' }
  }

  const endsAt = typeof body.ends_at === 'string' && body.ends_at
    ? new Date(body.ends_at)
    : null
  if (endsAt && !Number.isFinite(endsAt.getTime())) {
    return { error: 'Choose a valid end date and time.' }
  }
  if (endsAt && endsAt <= startsAt) {
    return { error: 'End time must be after the start time.' }
  }

  return {
    value: {
      name,
      description: description || null,
      campaign_type: campaignType,
      scope,
      category_id: scope === 'category' ? categoryId : null,
      discount_percent: discountPercent === null ? null : Number(discountPercent.toFixed(2)),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
      is_active: body.is_active !== false,
    },
  }
}
