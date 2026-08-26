import { describe, expect, it } from 'vitest'
import { recommendationEngagementScore } from '@/lib/recommendations'

describe('recommendation engagement score', () => {
  it('rewards cart intent more than a click without exceeding one', () => {
    const clicked = recommendationEngagementScore(20, 1, 0)
    const added = recommendationEngagementScore(20, 0, 1)
    expect(added).toBeGreaterThan(clicked)
    expect(recommendationEngagementScore(1, 1_000, 1_000)).toBe(1)
  })
})
