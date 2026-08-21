import AdminShell from '@/components/admin/AdminShell'
import { requireAdmin } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/** Every admin page revalidates the signed session and D1 role on the server. */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return <AdminShell>{children}</AdminShell>
}
