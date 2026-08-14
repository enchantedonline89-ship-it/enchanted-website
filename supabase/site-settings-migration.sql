-- Persistent public storefront theme, editable only by the owner account.
BEGIN;

CREATE TABLE IF NOT EXISTS site_settings (
  id           TEXT PRIMARY KEY CHECK (id = 'storefront'),
  active_theme TEXT NOT NULL DEFAULT 'default'
    CHECK (active_theme IN ('default', 'christmas', 'ramadan')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (id, active_theme)
VALUES ('storefront', 'default')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read" ON site_settings
  FOR SELECT USING (id = 'storefront');

DROP POLICY IF EXISTS "site_settings_admin_insert" ON site_settings;
CREATE POLICY "site_settings_admin_insert" ON site_settings
  FOR INSERT WITH CHECK (
    id = 'storefront'
    AND LOWER(auth.email()) = 'enchantedonline89@gmail.com'
  );

DROP POLICY IF EXISTS "site_settings_admin_update" ON site_settings;
CREATE POLICY "site_settings_admin_update" ON site_settings
  FOR UPDATE
  USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com')
  WITH CHECK (
    id = 'storefront'
    AND LOWER(auth.email()) = 'enchantedonline89@gmail.com'
  );

-- Keep audit types aligned with the promotions migration, regardless of which
-- migration is applied first.
ALTER TABLE admin_logs DROP CONSTRAINT IF EXISTS admin_logs_entity_type_check;
ALTER TABLE admin_logs ADD CONSTRAINT admin_logs_entity_type_check
  CHECK (entity_type IN ('product', 'category', 'promotion', 'site_setting'));

COMMIT;
