-- ============================================================
-- ENCHANTED STYLE - human-readable order references and tracking timestamps
-- Run after orders-migration.sql. Safe to re-run.
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'ES-' || to_char(CURRENT_TIMESTAMP, 'YYMM') || '-' ||
         lpad(nextval('order_number_seq')::text, 6, '0');
$$;

-- Sequence privileges are needed because the column default executes as the
-- role performing the insert. No caller can choose or enumerate a reference.
REVOKE ALL ON SEQUENCE order_number_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE order_number_seq TO service_role;

-- Do not expose the generator as a public PostgREST RPC: clients receive the
-- number only after the server-side order insert succeeds.
REVOKE EXECUTE ON FUNCTION generate_order_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_order_number() TO service_role;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE orders
  ALTER COLUMN order_number SET DEFAULT generate_order_number(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Backfill legacy orders in creation order. nextval is concurrency-safe and
-- the unique index below is the final guard against duplicate references.
WITH missing AS (
  SELECT id
  FROM orders
  WHERE order_number IS NULL
  ORDER BY created_at, id
)
UPDATE orders o
SET order_number = generate_order_number()
FROM missing m
WHERE o.id = m.id;

ALTER TABLE orders
  ALTER COLUMN order_number SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number
  ON orders (order_number);

CREATE INDEX IF NOT EXISTS idx_orders_user_created_at
  ON orders (user_id, created_at DESC);

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
