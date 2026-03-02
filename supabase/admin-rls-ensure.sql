-- ============================================================
-- Enchanted Style — Admin RLS Policy Fix
-- Run this in the Supabase SQL Editor (project: mnbdyiemlifvxvgobfwq)
--
-- Idempotent: drops and recreates each policy so it is safe to re-run.
--
-- Security: mutation policies (INSERT/UPDATE/DELETE) use
-- LOWER(auth.email()) = 'enchantedonline89@gmail.com'
-- NOT auth.uid() IS NOT NULL (which would grant any signed-up customer
-- full write access to the product catalog).
--
-- LOWER() is used for case-insensitive match — the Supabase user record
-- stores the email as all-lowercase regardless of how it was entered.
-- ============================================================

-- ============================================================
-- CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "categories_public_read"   ON categories;
DROP POLICY IF EXISTS "categories_admin_select"  ON categories;
DROP POLICY IF EXISTS "categories_admin_insert"  ON categories;
DROP POLICY IF EXISTS "categories_admin_update"  ON categories;
DROP POLICY IF EXISTS "categories_admin_delete"  ON categories;

-- Anon can only see active categories (public catalog)
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (is_active = TRUE);

-- Any authenticated user can read all categories (including inactive)
-- so the admin panel can display inactive ones in lists/dropdowns
CREATE POLICY "categories_admin_select" ON categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only the admin email can mutate categories
CREATE POLICY "categories_admin_insert" ON categories
  FOR INSERT WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "categories_admin_update" ON categories
  FOR UPDATE
  USING     (LOWER(auth.email()) = 'enchantedonline89@gmail.com')
  WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "categories_admin_delete" ON categories
  FOR DELETE USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- ============================================================
-- PRODUCTS
-- ============================================================
DROP POLICY IF EXISTS "products_public_read"   ON products;
DROP POLICY IF EXISTS "products_admin_select"  ON products;
DROP POLICY IF EXISTS "products_admin_insert"  ON products;
DROP POLICY IF EXISTS "products_admin_update"  ON products;
DROP POLICY IF EXISTS "products_admin_delete"  ON products;

-- Anon can only see active products
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (is_active = TRUE);

-- Any authenticated user can read all products (including inactive)
CREATE POLICY "products_admin_select" ON products
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only the admin email can mutate products
CREATE POLICY "products_admin_insert" ON products
  FOR INSERT WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "products_admin_update" ON products
  FOR UPDATE
  USING     (LOWER(auth.email()) = 'enchantedonline89@gmail.com')
  WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "products_admin_delete" ON products
  FOR DELETE USING (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- ============================================================
-- ADMIN LOGS
-- ============================================================
DROP POLICY IF EXISTS "logs_admin_select" ON admin_logs;
DROP POLICY IF EXISTS "logs_admin_insert" ON admin_logs;

-- Any authenticated user can read audit logs (harmless)
CREATE POLICY "logs_admin_select" ON admin_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only the admin email can write audit log entries
CREATE POLICY "logs_admin_insert" ON admin_logs
  FOR INSERT WITH CHECK (LOWER(auth.email()) = 'enchantedonline89@gmail.com');

-- ============================================================
-- STORAGE — product-images bucket
-- Storage policies are RLS on storage.objects (NOT storage.policies table)
-- ============================================================
DROP POLICY IF EXISTS "public_read_product_images"  ON storage.objects;
DROP POLICY IF EXISTS "admin_upload_product_images" ON storage.objects;
DROP POLICY IF EXISTS "admin_update_product_images" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_product_images" ON storage.objects;

-- Anyone can read/download images from the public bucket
CREATE POLICY "public_read_product_images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

-- Only the admin email can upload, update, or delete images
CREATE POLICY "admin_upload_product_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND LOWER(auth.email()) = 'enchantedonline89@gmail.com'
  );

CREATE POLICY "admin_update_product_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING     (bucket_id = 'product-images' AND LOWER(auth.email()) = 'enchantedonline89@gmail.com')
  WITH CHECK (bucket_id = 'product-images' AND LOWER(auth.email()) = 'enchantedonline89@gmail.com');

CREATE POLICY "admin_delete_product_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND LOWER(auth.email()) = 'enchantedonline89@gmail.com');
