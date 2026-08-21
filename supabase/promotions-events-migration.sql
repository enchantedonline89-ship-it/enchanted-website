-- Enchanted Style — scheduled events and discounts
-- Safe to run more than once in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS promotions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 100),
  description       TEXT CHECK (description IS NULL OR char_length(description) <= 300),
  campaign_type     TEXT NOT NULL DEFAULT 'discount' CHECK (campaign_type IN ('event', 'discount')),
  scope             TEXT NOT NULL CHECK (scope IN ('sitewide', 'category')),
  category_id       UUID REFERENCES categories(id) ON DELETE CASCADE,
  discount_percent  NUMERIC(5, 2),
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promotions_schedule_valid CHECK (ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT promotions_discount_valid CHECK (
    (campaign_type = 'event' AND discount_percent IS NULL)
    OR (campaign_type = 'discount' AND discount_percent > 0 AND discount_percent <= 100)
  ),
  CONSTRAINT promotions_scope_category_valid CHECK (
    (scope = 'sitewide' AND category_id IS NULL)
    OR (scope = 'category' AND category_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_promotions_active_schedule
  ON promotions (is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_category
  ON promotions (category_id) WHERE category_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_promotions_updated_at ON promotions;
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotions_public_read" ON promotions;
DROP POLICY IF EXISTS "promotions_authenticated_read" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_select" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_insert" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_update" ON promotions;
DROP POLICY IF EXISTS "promotions_admin_delete" ON promotions;

-- The storefront only needs promotions that are effective now. Future and
-- inactive campaign plans remain private to the owner.
CREATE POLICY "promotions_public_read" ON promotions
  FOR SELECT TO anon
  USING (
    is_active = TRUE
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at > NOW())
  );

CREATE POLICY "promotions_authenticated_read" ON promotions
  FOR SELECT TO authenticated
  USING (
    is_active = TRUE
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at > NOW())
  );

CREATE POLICY "promotions_admin_select" ON promotions
  FOR SELECT TO authenticated
  USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "promotions_admin_insert" ON promotions
  FOR INSERT TO authenticated
  WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "promotions_admin_update" ON promotions
  FOR UPDATE TO authenticated
  USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com')
  WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "promotions_admin_delete" ON promotions
  FOR DELETE TO authenticated
  USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- Promotions participate in the same immutable admin audit trail.
ALTER TABLE admin_logs DROP CONSTRAINT IF EXISTS admin_logs_entity_type_check;
ALTER TABLE admin_logs ADD CONSTRAINT admin_logs_entity_type_check
  CHECK (entity_type IN ('product', 'category', 'promotion', 'site_setting'));

COMMIT;
