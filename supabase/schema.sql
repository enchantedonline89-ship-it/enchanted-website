-- ============================================================
-- ENCHANTED STYLE — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

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
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('product', 'category')),
  entity_id    UUID,
  entity_name  TEXT,
  changes      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- IMPORTANT: Disable public sign-ups in Supabase Dashboard
-- Authentication → Providers → Email → toggle "Enable sign ups" OFF
-- This ensures only manually-created admin accounts can authenticate.
-- ============================================================

-- Categories: anon can read only active rows
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (is_active = TRUE);

-- Any authenticated user can read ALL categories (including inactive)
-- so the admin panel can show inactive rows in dropdowns/lists
CREATE POLICY "categories_admin_select" ON categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only the admin email can INSERT/UPDATE/DELETE categories
CREATE POLICY "categories_admin_insert" ON categories
  FOR INSERT WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "categories_admin_update" ON categories
  FOR UPDATE
  USING     (LOWER(auth.email()) = 'enchantedonline89@gmail.com')
  WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "categories_admin_delete" ON categories
  FOR DELETE USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- Products: anon can read only active rows
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (is_active = TRUE);

-- Any authenticated user can read ALL products (including inactive)
CREATE POLICY "products_admin_select" ON products
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only the admin email can INSERT/UPDATE/DELETE products
CREATE POLICY "products_admin_insert" ON products
  FOR INSERT WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "products_admin_update" ON products
  FOR UPDATE
  USING     (LOWER(auth.email()) = 'enchantedonline89@gmail.com')
  WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "products_admin_delete" ON products
  FOR DELETE USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- Admin logs: only the admin email can read or write audit entries
CREATE POLICY "logs_admin_select" ON admin_logs
  FOR SELECT USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "logs_admin_insert" ON admin_logs
  FOR INSERT WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- ============================================================
-- STORAGE RLS — Run AFTER creating the product-images bucket
-- In Supabase Dashboard: Storage → product-images → Policies
-- ============================================================
-- Anyone can read (download) files from the public bucket
-- Only authenticated users can upload files
-- SQL to run in Supabase SQL editor for Storage policies:
--
-- INSERT INTO storage.policies (name, bucket_id, definition, check_definition, command, roles)
-- VALUES
--   ('storage_public_read', 'product-images',
--    'true', NULL, 'SELECT', '{anon,authenticated}'),
--   ('storage_admin_insert', 'product-images',
--    NULL, '(auth.uid() IS NOT NULL)', 'INSERT', '{authenticated}'),
--   ('storage_admin_update', 'product-images',
--    '(auth.uid() IS NOT NULL)', '(auth.uid() IS NOT NULL)', 'UPDATE', '{authenticated}'),
--   ('storage_admin_delete', 'product-images',
--    '(auth.uid() IS NOT NULL)', NULL, 'DELETE', '{authenticated}');
--
-- Alternatively configure via Dashboard: Storage → product-images → Policies → New Policy

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
