// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const sql = (name: string) => readFileSync(join(root, 'supabase', name), 'utf8')

describe('Supabase migration safety', () => {
  it.each([
    'schema.sql',
    'orders-migration.sql',
    'admin-rls-ensure.sql',
    'product-detail-migration.sql',
    'site-settings-migration.sql',
    'promotions-events-migration.sql',
    'order-tracking-migration.sql',
    'analytics-views.sql',
  ])('%s applies its DDL atomically', (name) => {
    const source = sql(name)
    expect(source).toMatch(/^BEGIN;$/m)
    expect(source).toMatch(/^COMMIT;$/m)
  })

  it('keeps customer order policies idempotent and statement-caches auth.uid()', () => {
    const source = sql('orders-migration.sql')
    expect(source).toContain('DROP POLICY IF EXISTS "Users can insert own orders" ON orders;')
    expect(source).toContain('DROP POLICY IF EXISTS "Users can read own orders" ON orders;')
    expect(source).toContain('user_id = (SELECT auth.uid())')
  })

  it('never recommends authenticated-only storage mutation access', () => {
    const source = sql('schema.sql')
    expect(source).not.toMatch(/WITH CHECK\s*\(auth\.uid\(\) IS NOT NULL\)/)
    expect(source).toContain('admin-rls-ensure.sql')
  })
})
