-- Better Auth 1.7 core schema for its built-in Cloudflare D1 adapter.
-- Field names intentionally match Better Auth's current camelCase contract.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL DEFAULT 0 CHECK ("emailVerified" IN (0, 1)),
  image TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY NOT NULL,
  "expiresAt" DATE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_userId ON session("userId");

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY NOT NULL,
  issuer TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" DATE,
  "refreshTokenExpiresAt" DATE,
  scope TEXT,
  password TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL,
  UNIQUE(issuer, "accountId")
);

CREATE INDEX IF NOT EXISTS idx_account_userId ON account("userId");

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" DATE NOT NULL,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_identifier
  ON verification(identifier);

-- Better Auth's database-backed limiter avoids per-isolate in-memory auth
-- throttles. Application tracking/checkout limits use separate durable keys.
CREATE TABLE IF NOT EXISTS "rateLimit" (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL
);
