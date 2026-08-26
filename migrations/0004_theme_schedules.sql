PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS theme_schedules (
  theme TEXT PRIMARY KEY NOT NULL CHECK (theme IN ('christmas', 'ramadan')),
  starts_at TEXT,
  ends_at TEXT,
  animation_intensity TEXT NOT NULL DEFAULT 'medium'
    CHECK (animation_intensity IN ('low', 'medium', 'high')),
  campaign_copy TEXT NOT NULL DEFAULT '' CHECK (length(campaign_copy) <= 120),
  is_enabled INTEGER NOT NULL DEFAULT 0 CHECK (is_enabled IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    is_enabled = 0 OR
    (starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at < ends_at)
  )
);

INSERT OR IGNORE INTO theme_schedules
  (theme, animation_intensity, campaign_copy, is_enabled)
VALUES
  ('christmas', 'medium', 'A little Christmas magic, styled for the season.', 0),
  ('ramadan', 'medium', 'Ramadan evenings, dressed in gold.', 0);

CREATE INDEX IF NOT EXISTS idx_theme_schedules_active
  ON theme_schedules(is_enabled, starts_at, ends_at);
