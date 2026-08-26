import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const migrationsDirectory = join(root, 'migrations')

function migrationFiles() {
  if (!existsSync(migrationsDirectory)) return []
  return readdirSync(migrationsDirectory)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort()
}

function migrations() {
  return migrationFiles()
    .map((name) => readFileSync(join(migrationsDirectory, name), 'utf8'))
    .join('\n')
}

function tableDefinition(sql: string, table: string) {
  const match = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\n\\);`, 'i'))
  return match?.[1] ?? ''
}

describe('Cloudflare D1 migration contracts', () => {
  it('starts at migration 0001 and has no numbering gaps', () => {
    const files = migrationFiles()
    const numbers = files.map((name) => Number(name.slice(0, 4)))

    expect(files.length).toBeGreaterThan(0)
    expect(numbers[0]).toBe(1)
    expect(numbers).toEqual(numbers.map((_, index) => index + 1))
  })

  it('enables foreign keys and contains no retired Supabase policy syntax', () => {
    const sql = migrations()

    expect(sql).toMatch(/PRAGMA\s+foreign_keys\s*=\s*ON/i)
    expect(sql).not.toMatch(/auth\.uid\s*\(|row level security|security definer|service_role/i)
  })

  it('keys saved addresses to an owner and enforces one active default', () => {
    const sql = migrations()
    const addresses = tableDefinition(sql, 'addresses')

    expect(addresses).toMatch(/user_id\s+TEXT\s+NOT NULL/i)
    expect(addresses).toMatch(/REFERENCES\s+"?user"?\s*\(id\)\s+ON DELETE CASCADE/i)
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS\s+\w+\s+ON addresses\s*\(user_id\)\s+WHERE is_default = 1 AND deleted_at IS NULL/i)
  })

  it('uses non-enumerable tracking material and a constrained status vocabulary', () => {
    const orders = tableDefinition(migrations(), 'orders')

    expect(orders).toMatch(/order_number\s+TEXT\s+NOT NULL\s+UNIQUE/i)
    expect(orders).toMatch(/tracking_token_hash\s+TEXT\s+NOT NULL\s+UNIQUE/i)
    for (const status of ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']) {
      expect(orders).toContain(`'${status}'`)
    }
  })

  it('makes notification delivery and provider webhooks idempotent', () => {
    const sql = migrations()
    const outbox = tableDefinition(sql, 'notification_outbox')
    const emailEvents = tableDefinition(sql, 'email_events')

    expect(outbox).toMatch(/idempotency_key\s+TEXT\s+NOT NULL\s+UNIQUE/i)
    expect(emailEvents).toMatch(/provider_event_id\s+TEXT\s+NOT NULL\s+UNIQUE/i)
  })

  it('enforces replay-safe checkout, unique variant lines, and 24-hour expiry metadata', () => {
    const sql = migrations()
    const orders = tableDefinition(sql, 'orders')

    expect(sql).toMatch(/checkout_idempotency_key/i)
    expect(sql).toMatch(/UNIQUE INDEX[\s\S]+orders\s*\(user_id, checkout_idempotency_key\)/i)
    expect(sql).toMatch(/UNIQUE INDEX[\s\S]+order_items\s*\(order_id, variant_id\)/i)
    expect(sql).toMatch(/pending_expires_at/i)
    expect(sql).toMatch(/coalesce\s*\(\s*sum\s*\(oi\.quantity\)/i)
    expect(orders).toContain('status')
  })

  it('adds separate owner/admin metadata and the Better Auth TOTP schema', () => {
    const sql = migrations()

    expect(sql).toMatch(/adminRole[\s\S]+owner[\s\S]+admin/i)
    expect(sql).toMatch(/twoFactorEnabled/i)
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "twoFactor"/i)
    expect(sql).toMatch(/failedVerificationCount/i)
    expect(sql).toMatch(/lockedUntil/i)
  })

  it('stores bounded holiday schedules with explicit intensity and active windows', () => {
    const schedules = tableDefinition(migrations(), 'theme_schedules')

    expect(schedules).toMatch(/theme\s+TEXT\s+PRIMARY KEY/i)
    expect(schedules).toMatch(/christmas[\s\S]+ramadan/i)
    expect(schedules).toMatch(/animation_intensity[\s\S]+low[\s\S]+medium[\s\S]+high/i)
    expect(schedules).toMatch(/length\(campaign_copy\)\s*<=\s*120/i)
    expect(schedules).toMatch(/starts_at\s+IS NOT NULL[\s\S]+ends_at\s+IS NOT NULL/i)
  })

  it('keeps direct contact data out of recommendation events', () => {
    const events = tableDefinition(migrations(), 'recommendation_events')

    expect(events).not.toMatch(/\b(email|phone|address|recipient_name)\b/i)
    expect(events).toMatch(/anonymous_id_hash\s+TEXT/i)
    expect(events).toMatch(/algorithm_version\s+TEXT\s+NOT NULL/i)
  })
})
