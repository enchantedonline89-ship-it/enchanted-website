-- Enchanted Style production commerce schema for Cloudflare D1.
-- Better Auth's generated core tables are created by 0001_auth.sql.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  default_phone_e164 TEXT,
  marketing_consent INTEGER NOT NULL DEFAULT 0 CHECK (marketing_consent IN (0, 1)),
  analytics_consent INTEGER NOT NULL DEFAULT 0 CHECK (analytics_consent IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home' CHECK (length(trim(label)) BETWEEN 1 AND 40),
  recipient_name TEXT NOT NULL CHECK (length(trim(recipient_name)) BETWEEN 2 AND 100),
  phone_e164 TEXT NOT NULL CHECK (length(phone_e164) BETWEEN 8 AND 20),
  country_code TEXT NOT NULL DEFAULT 'LB' CHECK (country_code = 'LB'),
  governorate TEXT NOT NULL CHECK (length(trim(governorate)) BETWEEN 2 AND 80),
  city TEXT NOT NULL CHECK (length(trim(city)) BETWEEN 2 AND 100),
  area TEXT NOT NULL CHECK (length(trim(area)) BETWEEN 2 AND 120),
  street TEXT NOT NULL CHECK (length(trim(street)) BETWEEN 2 AND 200),
  building TEXT,
  floor TEXT,
  landmark TEXT,
  delivery_notes TEXT CHECK (delivery_notes IS NULL OR length(delivery_notes) <= 500),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_active
  ON addresses(user_id, deleted_at, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default
  ON addresses(user_id) WHERE is_default = 1 AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  slug TEXT NOT NULL UNIQUE,
  size_system TEXT NOT NULL DEFAULT 'none'
    CHECK (size_system IN ('eu_footwear', 'letter_clothing', 'none')),
  description TEXT,
  image_key TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_storefront
  ON categories(is_active, sort_order, created_at DESC);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT UNIQUE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 180),
  description TEXT,
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  image_key TEXT,
  image_url TEXT,
  additional_images_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(additional_images_json)),
  sizes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(sizes_json)),
  fit_advice TEXT CHECK (fit_advice IS NULL OR fit_advice IN ('true_to_size', 'size_up', 'size_down')),
  materials TEXT,
  heel_height_cm REAL CHECK (heel_height_cm IS NULL OR heel_height_cm >= 0),
  model_note TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_storefront
  ON products(is_active, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category
  ON products(category_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS product_colors (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  hex_code TEXT NOT NULL
    CHECK (hex_code GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  image_key TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id, product_id),
  UNIQUE(product_id, name),
  UNIQUE(product_id, hex_code)
);

CREATE INDEX IF NOT EXISTS idx_product_colors_product
  ON product_colors(product_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_id TEXT,
  sku TEXT UNIQUE,
  size TEXT,
  stock_quantity INTEGER CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (color_id, product_id)
    REFERENCES product_colors(id, product_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variants_product_active
  ON product_variants(product_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_unique_option
  ON product_variants(product_id, ifnull(color_id, ''), ifnull(size, ''));

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  description TEXT CHECK (description IS NULL OR length(description) <= 300),
  campaign_type TEXT NOT NULL DEFAULT 'discount'
    CHECK (campaign_type IN ('event', 'discount')),
  scope TEXT NOT NULL CHECK (scope IN ('sitewide', 'category')),
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  discount_basis_points INTEGER,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  CHECK (
    (campaign_type = 'event' AND discount_basis_points IS NULL)
    OR (campaign_type = 'discount' AND discount_basis_points BETWEEN 1 AND 10000)
  ),
  CHECK (
    (scope = 'sitewide' AND category_id IS NULL)
    OR (scope = 'category' AND category_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_promotions_active_schedule
  ON promotions(is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY CHECK (id = 'storefront'),
  active_theme TEXT NOT NULL DEFAULT 'default'
    CHECK (active_theme IN ('default', 'christmas', 'ramadan')),
  support_email TEXT,
  support_phone_e164 TEXT,
  whatsapp_phone_e164 TEXT,
  business_address TEXT,
  country_code TEXT NOT NULL DEFAULT 'LB' CHECK (country_code = 'LB'),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  delivery_fee_cents INTEGER NOT NULL DEFAULT 400 CHECK (delivery_fee_cents >= 0),
  cash_on_delivery INTEGER NOT NULL DEFAULT 1 CHECK (cash_on_delivery IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_settings (
  id,
  active_theme,
  support_email,
  support_phone_e164,
  whatsapp_phone_e164,
  delivery_fee_cents,
  cash_on_delivery
) VALUES (
  'storefront',
  'default',
  'enchantedonline89@gmail.com',
  '+96181492994',
  '+96181492994',
  400,
  1
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  tracking_token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  user_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'LB' CHECK (country_code = 'LB'),
  governorate TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  street TEXT NOT NULL,
  building TEXT,
  floor TEXT,
  landmark TEXT,
  delivery_notes TEXT,
  order_notes TEXT,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  delivery_fee_cents INTEGER NOT NULL CHECK (delivery_fee_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  recommendation_attribution_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(recommendation_attribution_json)),
  confirmed_at TEXT,
  preparing_at TEXT,
  out_for_delivery_at TEXT,
  delivered_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_email_number
  ON orders(lower(user_email), order_number);

CREATE TRIGGER IF NOT EXISTS orders_enforce_status_transition
BEFORE UPDATE OF status ON orders
WHEN NOT (
  (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled')) OR
  (OLD.status = 'confirmed' AND NEW.status IN ('preparing', 'cancelled')) OR
  (OLD.status = 'preparing' AND NEW.status IN ('out_for_delivery', 'cancelled')) OR
  (OLD.status = 'out_for_delivery' AND NEW.status IN ('delivered', 'cancelled'))
)
BEGIN
  SELECT RAISE(ABORT, 'INVALID_ORDER_STATUS_TRANSITION');
END;

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  size TEXT,
  color_name TEXT,
  color_hex TEXT CHECK (color_hex IS NULL OR color_hex GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  promotion_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id, order_id);

-- Inventory is validated and decremented inside the same D1 transaction as
-- order creation. Raising here rolls the entire D1 batch back, preventing an
-- order from being accepted after its last unit was bought concurrently.
CREATE TRIGGER IF NOT EXISTS order_items_validate_inventory
BEFORE INSERT ON order_items
WHEN NEW.variant_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'VARIANT_UNAVAILABLE')
  WHERE NOT EXISTS (
    SELECT 1 FROM product_variants
    WHERE id = NEW.variant_id
      AND product_id = NEW.product_id
      AND is_active = 1
      AND (stock_quantity IS NULL OR stock_quantity >= NEW.quantity)
  );
END;

CREATE TRIGGER IF NOT EXISTS order_items_decrement_inventory
AFTER INSERT ON order_items
WHEN NEW.variant_id IS NOT NULL
BEGIN
  UPDATE product_variants
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.variant_id AND stock_quantity IS NOT NULL;
END;

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  actor_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  public_note TEXT,
  private_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_history_order
  ON order_status_history(order_id, created_at ASC);

CREATE TRIGGER IF NOT EXISTS orders_restore_inventory_on_cancel
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'cancelled' AND OLD.status <> 'cancelled'
BEGIN
  UPDATE product_variants
  SET stock_quantity = stock_quantity + (
        SELECT oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND oi.variant_id = product_variants.id
      ),
      updated_at = CURRENT_TIMESTAMP
  WHERE stock_quantity IS NOT NULL
    AND id IN (
      SELECT variant_id FROM order_items
      WHERE order_id = NEW.id AND variant_id IS NOT NULL
    );
END;

CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email')),
  template TEXT NOT NULL,
  recipient TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'queued', 'sent', 'failed', 'cancelled')),
  provider_message_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code TEXT,
  available_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON notification_outbox(status, available_at);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  changes_json TEXT CHECK (changes_json IS NULL OR json_valid(changes_json)),
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON admin_audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS recommendation_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  anonymous_id_hash TEXT,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('impression', 'click', 'add_to_cart', 'purchase')),
  placement TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  source_product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  recommended_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  position INTEGER CHECK (position IS NULL OR position >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendation_events_product
  ON recommendation_events(recommended_product_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_order
  ON recommendation_events(order_id);

CREATE TABLE IF NOT EXISTS product_pair_stats (
  source_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delivered_order_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_order_count >= 0),
  confidence REAL NOT NULL DEFAULT 0,
  lift REAL NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  algorithm_version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_product_id, target_product_id),
  CHECK (source_product_id <> target_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_pair_rank
  ON product_pair_stats(source_product_id, score DESC);

CREATE TABLE IF NOT EXISTS recommendation_scores (
  source_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  placement TEXT NOT NULL,
  score REAL NOT NULL,
  reason TEXT NOT NULL,
  support_count INTEGER NOT NULL DEFAULT 0,
  algorithm_version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_product_id, target_product_id, placement),
  CHECK (source_product_id <> target_product_id)
);

CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  provider_message_id TEXT UNIQUE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  template TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  latest_status TEXT NOT NULL DEFAULT 'queued',
  sent_at TEXT,
  delivered_at TEXT,
  failed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  provider_event_id TEXT NOT NULL UNIQUE,
  provider_message_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_events_message
  ON email_events(provider_message_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS provider_sync_state (
  provider TEXT PRIMARY KEY CHECK (provider IN ('posthog', 'sentry', 'resend')),
  last_success_at TEXT,
  last_error_code TEXT,
  last_error_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
