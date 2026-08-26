const ALGORITHM_VERSION = 'hybrid-v1'
const MIN_COLLABORATIVE_SUPPORT = 3

type ProductSignal = { id: string; category_id: string | null; tags_json: string }
type DeliveredLine = { order_id: string; product_id: string }
type EngagementRow = {
  source_product_id: string
  recommended_product_id: string
  impressions: number
  clicks: number
  adds: number
}

function tags(row: ProductSignal): Set<string> {
  try {
    const parsed: unknown = JSON.parse(row.tags_json || '[]')
    return new Set(Array.isArray(parsed) ? parsed.map(String).map((value) => value.toLowerCase()) : [])
  } catch {
    return new Set()
  }
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (!left.size && !right.size) return 0
  const intersection = [...left].filter((value) => right.has(value)).length
  return intersection / new Set([...left, ...right]).size
}

export function recommendationEngagementScore(
  impressions: number,
  clicks: number,
  adds: number,
): number {
  return Math.min(
    1,
    ((Math.max(clicks, 0) + 1) / (Math.max(impressions, 0) + 10)) * 0.35
      + ((Math.max(adds, 0) + 1) / (Math.max(impressions, 0) + 20)) * 0.65,
  )
}

async function batches(db: D1Database, statements: D1PreparedStatement[]) {
  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50))
  }
}

/**
 * Rebuild the small catalog model after an order reaches delivered. Until a
 * pair has appeared in at least three delivered orders, it is presented only
 * as a content-based similar style—not as social proof.
 */
export async function rebuildRecommendationModel(db: D1Database): Promise<void> {
  const [productRows, deliveredRows, engagementRows] = await Promise.all([
    db.prepare(
      `SELECT id, category_id, tags_json FROM products WHERE is_active = 1`,
    ).all<ProductSignal>(),
    db.prepare(
      `SELECT DISTINCT oi.order_id, oi.product_id
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'delivered' AND oi.product_id IS NOT NULL`,
    ).all<DeliveredLine>(),
    db.prepare(
      `SELECT source_product_id, recommended_product_id,
              sum(event_type = 'impression') AS impressions,
              sum(event_type = 'click') AS clicks,
              sum(event_type = 'add_to_cart') AS adds
       FROM recommendation_events
       WHERE source_product_id IS NOT NULL
         AND created_at >= datetime('now', '-90 days')
       GROUP BY source_product_id, recommended_product_id`,
    ).all<EngagementRow>(),
  ])
  const products = productRows.results
  if (!products.length) return

  const orderProducts = new Map<string, Set<string>>()
  for (const line of deliveredRows.results) {
    const set = orderProducts.get(line.order_id) ?? new Set<string>()
    set.add(line.product_id)
    orderProducts.set(line.order_id, set)
  }
  const productCounts = new Map<string, number>()
  const pairCounts = new Map<string, number>()
  for (const productIds of orderProducts.values()) {
    for (const source of productIds) {
      productCounts.set(source, (productCounts.get(source) ?? 0) + 1)
      for (const target of productIds) {
        if (source !== target) {
          const key = `${source}\u0000${target}`
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
        }
      }
    }
  }

  const totalOrders = Math.max(orderProducts.size, 1)
  const maxPopularity = Math.max(...productCounts.values(), 1)
  const now = new Date().toISOString()
  const tagSets = new Map(products.map((product) => [product.id, tags(product)]))
  const engagement = new Map(
    engagementRows.results.map((row) => [
      `${row.source_product_id}\u0000${row.recommended_product_id}`,
      row,
    ]),
  )
  const pairStatements: D1PreparedStatement[] = []
  const scoreStatements: D1PreparedStatement[] = []

  for (const source of products) {
    for (const target of products) {
      if (source.id === target.id) continue
      const support = pairCounts.get(`${source.id}\u0000${target.id}`) ?? 0
      const sourceOrders = productCounts.get(source.id) ?? 0
      const targetOrders = productCounts.get(target.id) ?? 0
      const confidence = sourceOrders ? support / sourceOrders : 0
      const targetProbability = targetOrders / totalOrders
      const lift = targetProbability ? confidence / targetProbability : 0
      const collaborative = Math.min(1, support / 5) * 0.4
        + Math.min(1, confidence) * 0.35
        + Math.min(1, lift / 3) * 0.25
      const content = (source.category_id && source.category_id === target.category_id ? 0.65 : 0)
        + jaccard(tagSets.get(source.id)!, tagSets.get(target.id)!) * 0.35
      const popularity = targetOrders / maxPopularity
      const events = engagement.get(`${source.id}\u0000${target.id}`)
      const impressions = Math.max(Number(events?.impressions ?? 0), 0)
      const clicks = Math.max(Number(events?.clicks ?? 0), 0)
      const adds = Math.max(Number(events?.adds ?? 0), 0)
      // Smoothed rates stop one click in a tiny sample from outranking real
      // delivered-order evidence while still improving cold-start ordering.
      const behavioral = recommendationEngagementScore(impressions, clicks, adds)
      const hasEvidence = support >= MIN_COLLABORATIVE_SUPPORT
      const score = hasEvidence
        ? collaborative * 0.55 + content * 0.25 + behavioral * 0.15 + popularity * 0.05
        : content * 0.70 + behavioral * 0.20 + popularity * 0.10

      if (support > 0) {
        pairStatements.push(db.prepare(
          `INSERT INTO product_pair_stats
             (source_product_id, target_product_id, delivered_order_count,
              confidence, lift, score, algorithm_version, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(source.id, target.id, support, confidence, lift, collaborative, ALGORITHM_VERSION, now))
      }
      scoreStatements.push(db.prepare(
        `INSERT INTO recommendation_scores
           (source_product_id, target_product_id, placement, score, reason,
            support_count, algorithm_version, updated_at)
         VALUES (?, ?, 'pdp', ?, ?, ?, ?, ?)`,
      ).bind(
        source.id,
        target.id,
        score,
        hasEvidence ? 'People also bought' : 'Similar style',
        support,
        ALGORITHM_VERSION,
        now,
      ))
    }
  }

  await db.batch([
    db.prepare('DELETE FROM product_pair_stats'),
    db.prepare("DELETE FROM recommendation_scores WHERE placement = 'pdp'"),
  ])
  await batches(db, pairStatements)
  await batches(db, scoreStatements)
}

export async function getRecommendationIds(
  db: D1Database,
  sourceProductId: string,
  limit = 4,
): Promise<{ ids: string[]; heading: string }> {
  const result = await db.prepare(
    `SELECT rs.target_product_id, rs.reason
     FROM recommendation_scores rs
     JOIN products p ON p.id = rs.target_product_id AND p.is_active = 1
     WHERE rs.source_product_id = ? AND rs.placement = 'pdp'
     ORDER BY rs.score DESC, p.sort_order, p.created_at DESC
     LIMIT ?`,
  ).bind(sourceProductId, limit).all<{ target_product_id: string; reason: string }>()
  const peopleAlsoBought = result.results.some(
    (row) => row.reason === 'People also bought',
  )
  return {
    ids: result.results.map((row) => row.target_product_id),
    heading: peopleAlsoBought ? 'People also bought' : 'Similar styles',
  }
}
