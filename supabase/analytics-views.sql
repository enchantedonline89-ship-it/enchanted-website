-- ============================================================

BEGIN;
-- ENCHANTED STYLE - live, read-only order analytics
-- Run in Supabase SQL Editor after orders-migration.sql.
--
-- This intentionally uses a normal view. A synchronous materialized-view
-- refresh makes checkout/status writes slower and can make those writes fail;
-- a manual refresh leaves the dashboard stale. The indexes below keep these
-- small-shop aggregates efficient while every read stays current.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
  ON orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_area_city
  ON orders (area, city)
  WHERE status <> 'cancelled';

-- Remove every legacy refresh object before changing object type.
DROP TRIGGER IF EXISTS trg_refresh_analytics ON orders;
DROP FUNCTION IF EXISTS trg_fn_refresh_order_analytics();
DROP FUNCTION IF EXISTS refresh_order_analytics();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'order_analytics'
  ) THEN
    EXECUTE 'DROP MATERIALIZED VIEW public.order_analytics';
  ELSIF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'order_analytics'
  ) THEN
    EXECUTE 'DROP VIEW public.order_analytics';
  END IF;
END;
$$;

CREATE VIEW order_analytics
WITH (security_invoker = true)
AS
WITH totals AS (
  SELECT
    COUNT(*)::int AS total_orders,
    COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS valid_orders,
    COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
    COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_count,
    COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered_count,
    COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS orders_today,
    COUNT(*) FILTER (
      WHERE status <> 'cancelled' AND created_at >= date_trunc('month', now())
    )::int AS orders_this_month,
    COUNT(*) FILTER (
      WHERE status <> 'cancelled' AND created_at >= date_trunc('week', now())
    )::int AS orders_this_week,
    COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0)::numeric(12,2)
      AS total_revenue,
    COALESCE(SUM(total) FILTER (
      WHERE status = 'delivered' AND created_at >= date_trunc('month', now())
    ), 0)::numeric(12,2) AS revenue_this_month,
    COALESCE(SUM(total) FILTER (
      WHERE status = 'delivered' AND created_at >= date_trunc('week', now())
    ), 0)::numeric(12,2) AS revenue_this_week,
    COALESCE(SUM(total) FILTER (
      WHERE status = 'delivered' AND created_at >= now() - interval '30 days'
    ), 0)::numeric(12,2) AS revenue_last_30_days,
    COALESCE(SUM(total) FILTER (WHERE status IN ('pending', 'confirmed')), 0)::numeric(12,2)
      AS pipeline_value,
    COALESCE(ROUND(AVG(total) FILTER (WHERE status = 'delivered'), 2), 0)::numeric(12,2)
      AS avg_order_value,
    COUNT(*) FILTER (WHERE area = 'beirut' AND status <> 'cancelled')::int
      AS beirut_count,
    COUNT(*) FILTER (WHERE area = 'outside' AND status <> 'cancelled')::int
      AS outside_count
  FROM orders
), product_totals AS (
  SELECT
    item->>'name' AS name,
    SUM((item->>'qty')::int)::int AS qty,
    ROUND(SUM((item->>'qty')::int * (item->>'price')::numeric), 2) AS revenue
  FROM orders
  CROSS JOIN LATERAL jsonb_array_elements(items) AS item
  WHERE status = 'delivered'
  GROUP BY item->>'name'
  ORDER BY qty DESC, revenue DESC
  LIMIT 10
), city_totals AS (
  SELECT city, COUNT(*)::int AS count
  FROM orders
  WHERE area = 'outside'
    AND status <> 'cancelled'
    AND city IS NOT NULL
    AND btrim(city) <> ''
  GROUP BY city
  ORDER BY count DESC, city
  LIMIT 5
), days AS (
  SELECT generate_series(
    current_date - interval '29 days', current_date, interval '1 day'
  )::date AS day
), daily_totals AS (
  SELECT
    d.day,
    COUNT(o.id) FILTER (WHERE o.status <> 'cancelled')::int AS count,
    COALESCE(SUM(o.total) FILTER (WHERE o.status = 'delivered'), 0)::numeric(12,2)
      AS revenue
  FROM days d
  LEFT JOIN orders o
    ON o.created_at >= d.day
   AND o.created_at < d.day + interval '1 day'
  GROUP BY d.day
  ORDER BY d.day
)
SELECT
  1::int AS id,
  t.*,
  CASE
    WHEN t.valid_orders = 0 THEN 0
    ELSE ROUND((t.delivered_count::numeric / t.valid_orders) * 100, 1)
  END AS completion_rate,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('name', name, 'qty', qty, 'revenue', revenue)
      ORDER BY qty DESC, revenue DESC
    )
    FROM product_totals
  ), '[]'::jsonb) AS top_products,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('city', city, 'count', count)
      ORDER BY count DESC, city
    )
    FROM city_totals
  ), '[]'::jsonb) AS top_cities,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', to_char(day, 'YYYY-MM-DD'),
        'count', count,
        'revenue', revenue
      ) ORDER BY day
    )
    FROM daily_totals
  ), '[]'::jsonb) AS daily_volume
FROM totals t;

-- Views can otherwise expose their base-table aggregates through PostgREST.
-- Only the cookie-free service-role client used after the admin auth check may
-- read shop financials.
REVOKE ALL ON order_analytics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON order_analytics TO service_role;

COMMIT;
