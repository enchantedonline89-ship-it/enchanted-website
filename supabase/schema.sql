-- ============================================================
-- ENCHANTED STYLE — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

BEGIN;

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id        UUID REFERENCES categories(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  description        TEXT,
  price              NUMERIC(10, 2),
  image_url          TEXT,
  additional_images  TEXT[],
  sizes              TEXT[],
  is_featured        BOOLEAN DEFAULT FALSE,
  is_active          BOOLEAN DEFAULT TRUE,
  sort_order         INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADMIN AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email  TEXT NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('product', 'category', 'promotion', 'site_setting')),
  entity_id    UUID,
  entity_name  TEXT,
  changes      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STOREFRONT SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id           TEXT PRIMARY KEY CHECK (id = 'storefront'),
  active_theme TEXT NOT NULL DEFAULT 'default'
    CHECK (active_theme IN ('default', 'christmas', 'ramadan')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (id, active_theme)
VALUES ('storefront', 'default')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Customer checkout requires public sign-ups to remain enabled. Catalog and
-- storage mutation policies below still authorize only the pinned owner email;
-- an authenticated customer is not an administrator.
-- ============================================================

-- Categories: anon can read only active rows
DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (is_active = TRUE);

-- The owner can read all categories (including inactive) for admin lists.
DROP POLICY IF EXISTS "categories_admin_select" ON categories;
CREATE POLICY "categories_admin_select" ON categories
  FOR SELECT USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- Only the admin email can INSERT/UPDATE/DELETE categories
DROP POLICY IF EXISTS "categories_admin_insert" ON categories;
CREATE POLICY "categories_admin_insert" ON categories
  FOR INSERT WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

DROP POLICY IF EXISTS "categories_admin_update" ON categories;
CREATE POLICY "categories_admin_update" ON categories
  FOR UPDATE
  USING     (LOWER(auth.email()) = 'enchantedonline89@gmail.com')
  WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

DROP POLICY IF EXISTS "categories_admin_delete" ON categories;
CREATE POLICY "categories_admin_delete" ON categories
  FOR DELETE USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- Products: anon can read only active rows
DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (is_active = TRUE);

-- The owner can read all products (including inactive).
DROP POLICY IF EXISTS "products_admin_select" ON products;
CREATE POLICY "products_admin_select" ON products
  FOR SELECT USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- Only the admin email can INSERT/UPDATE/DELETE products
DROP POLICY IF EXISTS "products_admin_insert" ON products;
CREATE POLICY "products_admin_insert" ON products
  FOR INSERT WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

DROP POLICY IF EXISTS "products_admin_update" ON products;
CREATE POLICY "products_admin_update" ON products
  FOR UPDATE
  USING     (LOWER(auth.email()) = 'enchantedonline89@gmail.com')
  WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

DROP POLICY IF EXISTS "products_admin_delete" ON products;
CREATE POLICY "products_admin_delete" ON products
  FOR DELETE USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- Admin logs: only the admin email can read or write audit entries
DROP POLICY IF EXISTS "logs_admin_select" ON admin_logs;
CREATE POLICY "logs_admin_select" ON admin_logs
  FOR SELECT USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

DROP POLICY IF EXISTS "logs_admin_insert" ON admin_logs;
CREATE POLICY "logs_admin_insert" ON admin_logs
  FOR INSERT WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- Storefront settings: the active theme is public, but only the owner can write.
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

-- ============================================================
-- STORAGE RLS — Run AFTER creating the product-images bucket
-- The executable policies live in admin-rls-ensure.sql. They allow public
-- reads but pin every mutation to the owner email; merely checking
-- auth.uid() IS NOT NULL would let any customer upload or replace catalog
-- images and must not be used.
-- ============================================================

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_logs_created ON admin_logs(created_at DESC);

-- ============================================================
-- SEED DATA — 6 Categories + 12 Products (Unsplash placeholders)
-- ============================================================

INSERT INTO categories (name, slug, description, image_url, sort_order) VALUES
  ('Heels & Stilettos', 'heels-stilettos', 'Elevate every outfit with our curated collection of heels and stilettos.', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop', 1),
  ('Boots & Ankle Boots', 'boots-ankle-boots', 'From sleek ankle boots to statement knee-highs.', 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&auto=format&fit=crop', 2),
  ('Sneakers', 'sneakers', 'Fashionable sneakers that blend comfort with street-chic style.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop', 3),
  ('Dresses', 'dresses', 'From daytime florals to evening glamour — find your perfect dress.', 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&auto=format&fit=crop', 4),
  ('Tops & Sets', 'tops-sets', 'Effortlessly chic tops, blouses, and coordinated sets.', 'https://images.unsplash.com/photo-1485230405346-71acb9518d9c?w=600&auto=format&fit=crop', 5),
  ('Accessories', 'accessories', 'Complete your look with our curated accessories collection.', 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=600&auto=format&fit=crop', 6)
ON CONFLICT (slug) DO NOTHING;

-- Products (using category slugs via subqueries)
INSERT INTO products (name, description, price, image_url, sizes, is_featured, category_id) VALUES
  (
    'Velvet Gold-Strap Stiletto',
    'Luxurious velvet finish with a delicate gold ankle strap. 10cm heel. Perfect for evening events.',
    89.99,
    'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=600&auto=format&fit=crop',
    ARRAY['36','37','38','39','40','41'],
    TRUE,
    (SELECT id FROM categories WHERE slug = 'heels-stilettos')
  ),
  (
    'Crystal Clear Mule Heel',
    'Transparent PVC mule with a sculpted block heel. The shoe that goes with everything.',
    69.99,
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop',
    ARRAY['36','37','38','39','40'],
    FALSE,
    (SELECT id FROM categories WHERE slug = 'heels-stilettos')
  ),
  (
    'Snake-Print Chelsea Boot',
    'Faux snake-print leather Chelsea boot with elastic side panels. Chunky sole.',
    119.99,
    'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&auto=format&fit=crop',
    ARRAY['36','37','38','39','40','41'],
    TRUE,
    (SELECT id FROM categories WHERE slug = 'boots-ankle-boots')
  ),
  (
    'Over-the-Knee Suede Boot',
    'Plush suede over-the-knee boot with a 5cm block heel. A wardrobe essential.',
    149.99,
    'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=600&auto=format&fit=crop',
    ARRAY['36','37','38','39','40'],
    FALSE,
    (SELECT id FROM categories WHERE slug = 'boots-ankle-boots')
  ),
  (
    'Rhinestone Platform Sneaker',
    'White leather platform sneaker embellished with rhinestone accents. 4cm platform.',
    79.99,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop',
    ARRAY['36','37','38','39','40','41'],
    FALSE,
    (SELECT id FROM categories WHERE slug = 'sneakers')
  ),
  (
    'Iridescent Chunky Sneaker',
    'Holographic iridescent finish on a chunky sole. Sporty meets glam.',
    94.99,
    'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&auto=format&fit=crop',
    ARRAY['36','37','38','39','40'],
    TRUE,
    (SELECT id FROM categories WHERE slug = 'sneakers')
  ),
  (
    'Satin Slip Midi Dress',
    'Bias-cut satin slip dress in champagne gold. Adjustable spaghetti straps.',
    109.99,
    'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&auto=format&fit=crop',
    ARRAY['XS','S','M','L','XL'],
    TRUE,
    (SELECT id FROM categories WHERE slug = 'dresses')
  ),
  (
    'Cutout Bodycon Maxi',
    'Black stretch-jersey maxi dress with strategic side cutouts. Invisible zip.',
    134.99,
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop',
    ARRAY['XS','S','M','L'],
    FALSE,
    (SELECT id FROM categories WHERE slug = 'dresses')
  ),
  (
    'Corset Bralette Top',
    'Structured boned corset bralette in ivory lace. Busk front fastening.',
    59.99,
    'https://images.unsplash.com/photo-1485230405346-71acb9518d9c?w=600&auto=format&fit=crop',
    ARRAY['XS','S','M','L','XL'],
    FALSE,
    (SELECT id FROM categories WHERE slug = 'tops-sets')
  ),
  (
    'Sequin Co-Ord Set',
    'Two-piece co-ord set: cropped blazer and flared trousers in silver sequin.',
    179.99,
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&auto=format&fit=crop',
    ARRAY['XS','S','M','L'],
    TRUE,
    (SELECT id FROM categories WHERE slug = 'tops-sets')
  ),
  (
    'Gold Chain Statement Bag',
    'Mini croc-embossed bag with thick gold chain strap. Magnetic clasp closure.',
    74.99,
    'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=600&auto=format&fit=crop',
    NULL,
    FALSE,
    (SELECT id FROM categories WHERE slug = 'accessories')
  ),
  (
    'Crystal Hair Claw Clip',
    'Oversized acetate claw clip adorned with hand-set crystals. Holds thick hair.',
    29.99,
    'https://images.unsplash.com/photo-1524117074681-31bd4de22ad3?w=600&auto=format&fit=crop',
    NULL,
    FALSE,
    (SELECT id FROM categories WHERE slug = 'accessories')
  );

-- ============================================================
-- STORAGE BUCKET (run this in Supabase Dashboard → Storage)
-- Or via API:
--   supabase.storage.createBucket('product-images', { public: true })
-- ============================================================
-- NOTE: Create a bucket named 'product-images' with public access enabled
-- in your Supabase Dashboard → Storage → New Bucket

COMMIT;
