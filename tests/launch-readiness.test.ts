import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function sourceFiles(relativePath: string): string[] {
  const absolutePath = join(root, relativePath)
  if (!existsSync(absolutePath)) return []

  if (!statSync(absolutePath).isDirectory()) return [absolutePath]

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = join(absolutePath, entry.name)
    if (entry.isDirectory()) return sourceFiles(relative(root, child))
    return /\.(?:ts|tsx|mts)$/.test(entry.name) ? [child] : []
  })
}

describe('production launch guardrails', () => {
  it('has no Supabase runtime dependency', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    expect(Object.keys(dependencies).filter((name) => name.startsWith('@supabase/'))).toEqual([])
  })

  it('has no Supabase or mock-mode reference in production TypeScript', () => {
    const productionFiles = [
      ...sourceFiles('app'),
      ...sourceFiles('components'),
      ...sourceFiles('lib'),
      ...sourceFiles('middleware.ts'),
      ...sourceFiles('next.config.ts'),
    ]
    const forbidden = /@supabase|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|ENABLE_MOCK_CATALOG|isSupabaseMockMode|mock-data|mock-order/i
    const hits = productionFiles
      .filter((file) => forbidden.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file).replaceAll('\\', '/'))

    expect(hits).toEqual([])
  })

  it('does not ship the public admin demo or mock data modules', () => {
    expect(existsSync(join(root, 'app/admin/demo'))).toBe(false)
    expect(existsSync(join(root, 'e2e/admin-demo.spec.ts'))).toBe(false)
    expect(existsSync(join(root, 'lib/mock-data.ts'))).toBe(false)
    expect(existsSync(join(root, 'lib/mock-order.ts'))).toBe(false)
  })

  it('removes the retired Supabase schema and environment contract', () => {
    expect(existsSync(join(root, 'supabase'))).toBe(false)
    expect(read('.env.example')).not.toMatch(/SUPABASE|ENABLE_MOCK_CATALOG/i)
  })

  it('declares D1 and R2 bindings for relational records and product media', () => {
    const wrangler = read('wrangler.jsonc')

    expect(wrangler).toMatch(/(?:^|\n)\s*"d1_databases"\s*:/)
    expect(wrangler).toMatch(/(?:^|\n)\s*"r2_buckets"\s*:/)
  })

  it('keeps preview flags, public admin identity and plaintext secrets out of Wrangler vars', () => {
    const wrangler = read('wrangler.jsonc')

    expect(wrangler).not.toMatch(/ENABLE_MOCK_CATALOG/i)
    expect(wrangler).not.toMatch(/NEXT_PUBLIC_ADMIN_EMAIL/i)
    expect(wrangler).not.toMatch(/"(?:ADMIN_)?PASSWORD"\s*:/i)
    expect(wrangler).not.toMatch(/"(?:AUTH|SESSION|OAUTH)_SECRET"\s*:/i)
  })
})
