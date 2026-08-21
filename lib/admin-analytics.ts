type CountsRow = {
  total_products: number
  active_products: number
  tracked_variants: number
  low_stock_variants: number
  categories: number
  customers: number
}

type OrderStatsRow = {
  total_orders: number
  pending: number
  confirmed: number
  preparing: number
  out_for_delivery: number
  delivered: number
  cancelled: number
  delivered_revenue_cents: number
  pipeline_cents: number
  avg_order_cents: number
}

type EmailStatsRow = {
  total: number
  delivered: number
  sent: number
  failed: number
  bounced: number
}

export async function getDashboardAnalytics(db: D1Database) {
  const [catalog, orders, email, topProducts, daily, logs] = await Promise.all([
    db.prepare(
      `SELECT
         (SELECT count(*) FROM products) AS total_products,
         (SELECT count(*) FROM products WHERE is_active = 1) AS active_products,
         (SELECT count(*) FROM product_variants WHERE is_active = 1) AS tracked_variants,
         (SELECT count(*) FROM product_variants WHERE is_active = 1 AND stock_quantity IS NOT NULL AND stock_quantity <= 3) AS low_stock_variants,
         (SELECT count(*) FROM categories WHERE is_active = 1) AS categories,
         (SELECT count(*) FROM "user" WHERE role = 'customer') AS customers`,
    ).first<CountsRow>(),
    db.prepare(
      `SELECT
         count(*) AS total_orders,
         coalesce(sum(status = 'pending'), 0) AS pending,
         coalesce(sum(status = 'confirmed'), 0) AS confirmed,
         coalesce(sum(status = 'preparing'), 0) AS preparing,
         coalesce(sum(status = 'out_for_delivery'), 0) AS out_for_delivery,
         coalesce(sum(status = 'delivered'), 0) AS delivered,
         coalesce(sum(status = 'cancelled'), 0) AS cancelled,
         coalesce(sum(CASE WHEN status = 'delivered' THEN total_cents ELSE 0 END), 0) AS delivered_revenue_cents,
         coalesce(sum(CASE WHEN status IN ('pending','confirmed','preparing','out_for_delivery') THEN total_cents ELSE 0 END), 0) AS pipeline_cents,
         coalesce(avg(CASE WHEN status <> 'cancelled' THEN total_cents END), 0) AS avg_order_cents
       FROM orders`,
    ).first<OrderStatsRow>(),
    db.prepare(
      `SELECT count(*) AS total,
         coalesce(sum(latest_status = 'delivered'), 0) AS delivered,
         coalesce(sum(latest_status = 'sent'), 0) AS sent,
         coalesce(sum(latest_status IN ('failed','complained')), 0) AS failed,
         coalesce(sum(latest_status = 'bounced'), 0) AS bounced
       FROM email_messages WHERE created_at >= datetime('now', '-30 days')`,
    ).first<EmailStatsRow>(),
    db.prepare(
      `SELECT oi.product_name AS name, sum(oi.quantity) AS quantity,
              sum(oi.line_total_cents) AS revenue_cents
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'delivered'
       GROUP BY oi.product_name ORDER BY quantity DESC LIMIT 8`,
    ).all<{ name: string; quantity: number; revenue_cents: number }>(),
    db.prepare(
      `SELECT substr(created_at, 1, 10) AS day, count(*) AS orders,
              sum(total_cents) AS total_cents
       FROM orders WHERE created_at >= datetime('now', '-30 days')
       GROUP BY day ORDER BY day`,
    ).all<{ day: string; orders: number; total_cents: number }>(),
    db.prepare(
      `SELECT id, admin_email, action, entity_type, entity_name, created_at
       FROM admin_audit_logs ORDER BY created_at DESC LIMIT 12`,
    ).all<{ id: string; admin_email: string; action: string; entity_type: string; entity_name: string | null; created_at: string }>(),
  ])

  return {
    catalog: catalog ?? {
      total_products: 0, active_products: 0, tracked_variants: 0,
      low_stock_variants: 0, categories: 0, customers: 0,
    },
    orders: orders ?? {
      total_orders: 0, pending: 0, confirmed: 0, preparing: 0,
      out_for_delivery: 0, delivered: 0, cancelled: 0,
      delivered_revenue_cents: 0, pipeline_cents: 0, avg_order_cents: 0,
    },
    email: email ?? { total: 0, delivered: 0, sent: 0, failed: 0, bounced: 0 },
    topProducts: topProducts.results,
    daily: daily.results,
    logs: logs.results,
  }
}

async function jsonFetch(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(4_000) })
  if (!response.ok) throw new Error(`HTTP_${response.status}`)
  return response.json()
}

export async function getExternalAnalytics(env: CloudflareEnv) {
  const sentryConfigured = Boolean(env.SENTRY_API_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT)
  const posthogConfigured = Boolean(env.POSTHOG_PERSONAL_API_KEY && env.POSTHOG_PROJECT_ID)

  const [sentryResult, posthogResult] = await Promise.allSettled([
    sentryConfigured
      ? jsonFetch(
          `https://sentry.io/api/0/organizations/${encodeURIComponent(env.SENTRY_ORG!)}/issues/?project=${encodeURIComponent(env.SENTRY_PROJECT!)}&statsPeriod=14d&query=is%3Aunresolved&limit=5`,
          { headers: { Authorization: `Bearer ${env.SENTRY_API_TOKEN}` } },
        )
      : Promise.resolve(null),
    posthogConfigured
      ? jsonFetch(
          `${(env.POSTHOG_HOST || 'https://eu.posthog.com').replace(/\/$/, '')}/api/projects/${encodeURIComponent(env.POSTHOG_PROJECT_ID!)}/query/`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: {
                kind: 'HogQLQuery',
                query: `SELECT count() AS events, uniq(distinct_id) AS visitors,
                               countIf(event = '$pageview') AS pageviews
                        FROM events WHERE timestamp > now() - INTERVAL 7 DAY`,
              },
            }),
          },
        )
      : Promise.resolve(null),
  ])

  const sentryIssues = sentryResult.status === 'fulfilled' && Array.isArray(sentryResult.value)
    ? sentryResult.value.slice(0, 5).map((value) => {
        const issue = value as Record<string, unknown>
        return {
          id: String(issue.id ?? ''),
          title: String(issue.title ?? 'Untitled issue'),
          count: Number(issue.count ?? 0),
          level: String(issue.level ?? 'error'),
          lastSeen: String(issue.lastSeen ?? ''),
          permalink: typeof issue.permalink === 'string' ? issue.permalink : null,
        }
      })
    : []

  let posthog: { events: number; visitors: number; pageviews: number } | null = null
  if (posthogResult.status === 'fulfilled' && posthogResult.value) {
    const response = posthogResult.value as { results?: unknown[][] }
    const row = response.results?.[0]
    if (Array.isArray(row)) {
      posthog = { events: Number(row[0] ?? 0), visitors: Number(row[1] ?? 0), pageviews: Number(row[2] ?? 0) }
    }
  }

  return {
    sentry: {
      configured: sentryConfigured,
      available: sentryResult.status === 'fulfilled' && sentryResult.value !== null,
      issues: sentryIssues,
    },
    posthog: {
      configured: posthogConfigured,
      available: posthogResult.status === 'fulfilled' && posthogResult.value !== null,
      summary: posthog,
    },
  }
}
