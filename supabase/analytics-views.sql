-- ============================================================
-- ENCHANTED STYLE — Order Analytics Materialized View
-- Run in Supabase SQL Editor (project: mnbdyiemlifvxvgobfwq)
--
-- Safe to re-run: DROP IF EXISTS before each CREATE.
-- The view always returns exactly 1 row (even with 0 orders),
-- so REFRESH CONCURRENTLY works once the unique index exists.
-- ============================================================

-- ── 1. Materialized view ────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS order_analytics;

CREATE MATERIALIZED VIEW order_analytics AS
SELECT
  -- Unique key needed for REFRESH CONCURRENTLY
  1::int AS id,

  -- ── Totals ──────────────────────────────────────────────
  COUNT(*)::int                                        AS total_orders,
  COALESCE(SUM(total), 0)::numeric(12,2)               AS total_revenue,
  COALESCE(ROUND(AVG(total)::numeric, 2), 0)           AS avg_order_value,

  -- ── This month ──────────────────────────────────────────
  COUNT(*) FILTER (
    WHERE created_at >= date_trunc('month', now())
  )::int                                               AS orders_this_month,
  COALESCE(SUM(total) FILTER (
    WHERE created_at >= date_trunc('month', now())
  ), 0)::numeric(12,2)                                 AS revenue_this_month,

  -- ── This week ───────────────────────────────────────────
  COUNT(*) FILTER (
    WHERE created_at >= date_trunc('week', now())
  )::int                                               AS orders_this_week,
  COALESCE(SUM(total) FILTER (
    WHERE created_at >= date_trunc('week', now())
  ), 0)::numeric(12,2)                                 AS revenue_this_week,

  -- ── Status breakdown ────────────────────────────────────
  COUNT(*) FILTER (WHERE status = 'pending')::int      AS pending_count,
  COUNT(*) FILTER (WHERE status = 'confirmed')::int    AS confirmed_count,
  COUNT(*) FILTER (WHERE status = 'delivered')::int    AS delivered_count,
  COUNT(*) FILTER (WHERE status = 'cancelled')::int    AS cancelled_count,

  -- ── Delivery area ───────────────────────────────────────
  COUNT(*) FILTER (WHERE area = 'beirut')::int         AS beirut_count,
  COUNT(*) FILTER (WHERE area = 'outside')::int        AS outside_count,

  -- ── Top 10 products by units sold ───────────────────────
  (
    SELECT COALESCE(jsonb_agg(p ORDER BY (p->>'qty')::int DESC), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'name',    item->>'name',
        'qty',     SUM((item->>'qty')::int),
        'revenue', ROUND(SUM((item->>'qty')::int * (item->>'price')::numeric), 2)
      ) AS p
      FROM orders, jsonb_array_elements(items) AS item
      GROUP BY item->>'name'
      ORDER BY SUM((item->>'qty')::int) DESC
      LIMIT 10
    ) sub
  ) AS top_products,

  -- ── Top 5 outside cities ────────────────────────────────
  (
    SELECT COALESCE(jsonb_agg(c ORDER BY (c->>'count')::int DESC), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object('city', city, 'count', COUNT(*)) AS c
      FROM orders
      WHERE area = 'outside' AND city IS NOT NULL AND city <> ''
      GROUP BY city
      ORDER BY COUNT(*) DESC
      LIMIT 5
    ) sub
  ) AS top_cities,

  -- ── Daily volume: last 30 days ───────────────────────────
  (
    SELECT COALESCE(jsonb_agg(d ORDER BY d->>'date'), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'date',  to_char(created_at::date, 'YYYY-MM-DD'),
        'count', COUNT(*)::int
      ) AS d
      FROM orders
      WHERE created_at >= now() - interval '30 days'
      GROUP BY created_at::date
      ORDER BY created_at::date
    ) sub
  ) AS daily_volume

FROM orders
WITH DATA;

-- ── 2. Unique index (required for REFRESH CONCURRENTLY) ─────
CREATE UNIQUE INDEX IF NOT EXISTS order_analytics_singleton
  ON order_analytics (id);

-- ── 3. Access ────────────────────────────────────────────────
-- Materialized views do NOT honour RLS on their base table, and PostgREST exposes
-- anything in `public` as a readable endpoint. Granting SELECT to `authenticated`
-- therefore published total revenue, average order value, top products and top
-- cities to every customer account. That was tolerable when the schema comment
-- said public sign-ups were disabled; the storefront now requires a customer
-- account to check out, so any visitor can create one and read the shop's books.
REVOKE SELECT ON order_analytics FROM anon, authenticated;

-- The dashboard reads this through the service-role client, which bypasses grants.
GRANT SELECT ON order_analytics TO service_role;

-- ── 4. Refresh function — called by the manual refresh API ──
-- Returns void; call via supabase.rpc('refresh_order_analytics')
CREATE OR REPLACE FUNCTION refresh_order_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW order_analytics;
END;
$$;

-- ── 5. Trigger wrapper (must return trigger, not void) ───────
-- ── 6. Auto-refresh trigger on orders ───────────────────────
-- Remove the legacy synchronous refresh trigger. Order writes must not depend
-- on analytics maintenance succeeding; refresh explicitly or on a schedule.
DROP TRIGGER IF EXISTS trg_refresh_analytics ON orders;

DROP FUNCTION IF EXISTS trg_fn_refresh_order_analytics();

-- ── 7. Lock down execution ──────────────────────────────────
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default, and PostgREST
-- exposes them as RPC endpoints. Without these REVOKEs, anyone holding only the
-- public anon key could POST /rest/v1/rpc/refresh_order_analytics and invoke a
-- definer-rights function directly, making the admin gate on the Next.js route
-- decorative. Only the service-role-backed admin route may invoke it.
REVOKE EXECUTE ON FUNCTION refresh_order_analytics() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION refresh_order_analytics() TO service_role;

-- ── VERIFY BEFORE DEPLOYING ─────────────────────────────────
-- After applying, verify one order insert, one status update, and one protected
-- manual refresh against the live database.
