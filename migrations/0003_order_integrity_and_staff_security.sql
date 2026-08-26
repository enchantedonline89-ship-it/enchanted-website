PRAGMA foreign_keys = ON;

-- Checkout attempts are replayable per customer instead of creating a second
-- order when a browser or edge retry arrives after the first commit.
ALTER TABLE orders ADD COLUMN checkout_idempotency_key TEXT;
UPDATE orders
SET checkout_idempotency_key = 'legacy:' || id
WHERE checkout_idempotency_key IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_idempotency
  ON orders(user_id, checkout_idempotency_key);

-- Pending orders reserve stock for 24 hours. pending_expired_at distinguishes
-- automatic expiry from an owner cancellation in conditional audit writes.
ALTER TABLE orders ADD COLUMN pending_expires_at TEXT;
ALTER TABLE orders ADD COLUMN pending_expired_at TEXT;
ALTER TABLE orders ADD COLUMN pending_extension_token TEXT;
UPDATE orders
SET pending_expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+24 hours')
WHERE pending_expires_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_pending_expiry
  ON orders(status, pending_expires_at);

CREATE TRIGGER IF NOT EXISTS orders_require_checkout_integrity
BEFORE INSERT ON orders
WHEN NEW.checkout_idempotency_key IS NULL
  OR length(trim(NEW.checkout_idempotency_key)) < 16
  OR NEW.pending_expires_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'ORDER_CHECKOUT_INTEGRITY_REQUIRED');
END;

-- A variant may appear only once in an order. The API also canonicalizes
-- untracked product/size lines so totals and inventory remain deterministic.
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_items_unique_variant
  ON order_items(order_id, variant_id)
  WHERE variant_id IS NOT NULL;

DROP TRIGGER IF EXISTS orders_restore_inventory_on_cancel;
CREATE TRIGGER orders_restore_inventory_on_cancel
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'cancelled' AND OLD.status <> 'cancelled'
BEGIN
  UPDATE product_variants
  SET stock_quantity = stock_quantity + (
        SELECT coalesce(sum(oi.quantity), 0)
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

-- role remains the coarse access class used by existing sessions. adminRole
-- separates the owner from delegated staff without rebuilding Better Auth's
-- referenced user table.
ALTER TABLE "user" ADD COLUMN "adminRole" TEXT
  CHECK ("adminRole" IS NULL OR "adminRole" IN ('owner', 'admin'));
UPDATE "user" SET "adminRole" = 'owner'
WHERE role = 'admin' AND "adminRole" IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_adminRole ON "user"("adminRole");

-- Better Auth 1.7 built-in twoFactor plugin schema. Enrollment is opt-in; the
-- server is ready for TOTP and backup codes without a new authentication store.
ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" INTEGER NOT NULL DEFAULT 0
  CHECK ("twoFactorEnabled" IN (0, 1));

CREATE TABLE IF NOT EXISTS "twoFactor" (
  id TEXT PRIMARY KEY NOT NULL,
  secret TEXT NOT NULL,
  "backupCodes" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  verified INTEGER NOT NULL DEFAULT 1 CHECK (verified IN (0, 1)),
  "failedVerificationCount" INTEGER NOT NULL DEFAULT 0
    CHECK ("failedVerificationCount" >= 0),
  "lockedUntil" DATE
);

CREATE INDEX IF NOT EXISTS idx_twoFactor_userId ON "twoFactor"("userId");
