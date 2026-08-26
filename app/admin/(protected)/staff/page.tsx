import StaffManager from '@/components/admin/StaffManager'
import { requireAdmin } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const session = await requireAdmin()
  const db = await getD1Database()
  if (!db) throw new Error('Staff database is unavailable.')
  const owner = await db.prepare(
    `SELECT "adminRole" AS role FROM "user" WHERE id = ?`,
  ).bind(session.user.id).first<{ role: string }>()
  if (owner?.role !== 'owner') {
    return <div className="p-4 sm:p-8"><h1 className="text-3xl text-ink">Staff & security</h1><p className="mt-4 text-sm text-ink-dim">Only the owner can manage staff access.</p></div>
  }
  const result = await db.prepare(
    `SELECT id, name, email, "adminRole" AS admin_role,
            "twoFactorEnabled" AS two_factor_enabled
     FROM "user" WHERE role = 'admin' ORDER BY "adminRole" DESC, lower(email)`,
  ).all<{ id: string; name: string; email: string; admin_role: 'owner' | 'admin'; two_factor_enabled: number }>()
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8"><p className="t-meta">Owner controls</p><h1 className="mt-2 text-3xl text-ink">Staff & security</h1></div>
      <StaffManager initialStaff={result.results} />
    </div>
  )
}
