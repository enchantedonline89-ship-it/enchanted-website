import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminShell from '@/components/admin/AdminShell'

export const dynamic = 'force-dynamic'

/**
 * Server-side authorization gate for every admin page.
 *
 * proxy.ts already checks this at the edge, but until now that was the ONLY
 * check: this layout was a client component with no verification, and the pages
 * beneath it fetch every order, including customer names, phone numbers and
 * delivery addresses. A middleware bypass, or a misconfigured
 * NEXT_PUBLIC_SUPABASE_URL putting the proxy into mock mode, would have served
 * that table to an anonymous visitor.
 *
 * Defence in depth: nothing below can render unless this passes, whatever
 * happens at the edge.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminEmail = (process.env.ADMIN_EMAIL ?? '').toLowerCase()

  // Fails closed. With ADMIN_EMAIL unset, nobody is an admin.
  if (!adminEmail) redirect('/admin/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email?.toLowerCase() !== adminEmail) {
    redirect('/admin/login')
  }

  return <AdminShell>{children}</AdminShell>
}
