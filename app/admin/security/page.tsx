import { redirect } from 'next/navigation'
import Logo from '@/components/public/Logo'
import TwoFactorEnrollment from '@/components/admin/TwoFactorEnrollment'
import { requireAdminEnrollment } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'

export const dynamic = 'force-dynamic'

export default async function AdminSecurityPage() {
  const session = await requireAdminEnrollment()
  const db = await getD1Database()
  const row = db ? await db.prepare(
    'SELECT "twoFactorEnabled" AS enabled FROM "user" WHERE id = ?',
  ).bind(session.user.id).first<{ enabled: number }>() : null
  if (row?.enabled === 1) redirect('/admin/dashboard')

  return (
    <main id="main" className="min-h-[100dvh] bg-paper">
      <header className="flex h-[68px] items-center justify-between border-b border-line px-5 lg:px-10"><Logo /><p className="t-meta">Staff security</p></header>
      <div className="mx-auto max-w-md px-5 py-16">
        <p className="t-meta">Required before admin access</p>
        <h1 className="t-section mt-2 text-ink">Protect this account with two-factor authentication.</h1>
        <p className="t-body mt-4 text-sm">Use an authenticator app. A fresh code will be required whenever this staff account signs in.</p>
        <TwoFactorEnrollment />
      </div>
    </main>
  )
}
