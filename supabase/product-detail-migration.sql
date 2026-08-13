-- ============================================================
-- Product detail page: the fields the PDP needs.
-- Idempotent, safe to re-run.
--
-- Four columns on products, one on categories. The set is deliberately small:
-- every field added lowers the fill rate of every other field, and this shop is
-- run by one person between Instagram posts.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fit_advice     TEXT,
  ADD COLUMN IF NOT EXISTS materials      TEXT,
  ADD COLUMN IF NOT EXISTS heel_height_cm NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS model_note     TEXT;

-- No DEFAULT on fit_advice, deliberately. A default of 'true_to_size' would make
-- every untouched product silently claim a fit the owner never verified, which is
-- a fabricated product claim. NULL means "not stated" and renders nothing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_fit_advice_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_fit_advice_check
      CHECK (fit_advice IS NULL OR fit_advice IN ('true_to_size','size_up','size_down'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_heel_height_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_heel_height_check
      CHECK (heel_height_cm IS NULL OR (heel_height_cm > 0 AND heel_height_cm <= 30));
  END IF;
END $$;

-- Which size chart the product page shows. Derived from a column rather than by
-- string-matching category slugs, which would break the moment a category is
-- renamed. Six rows, set once. The safe default shows no chart at all rather
-- than the wrong one.
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS size_system TEXT NOT NULL DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_size_system_check'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_size_system_check
      CHECK (size_system IN ('eu_footwear','letter_clothing','none'));
  END IF;
END $$;

UPDATE categories SET size_system = 'eu_footwear'
  WHERE slug IN ('heels-stilettos','boots-ankle-boots','sneakers');

UPDATE categories SET size_system = 'letter_clothing'
  WHERE slug IN ('dresses','tops-sets');

-- accessories intentionally stays 'none'

-- Simplifies the null coalescing the storefront already does around galleries.
ALTER TABLE products ALTER COLUMN additional_images SET DEFAULT '{}'::text[];

-- ── VERIFY AFTER RUNNING ────────────────────────────────────
-- The two UPDATEs match on slug. Confirm they hit six rows between them before
-- trusting the size-guide routing:
--   SELECT slug, size_system FROM categories ORDER BY sort_order;
