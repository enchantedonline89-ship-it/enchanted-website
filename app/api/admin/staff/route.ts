import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import { readBoundedJsonObject, RequestBodyTooLargeError } from '@/lib/request-body'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.ok) return auth.error
  if (auth.user.adminRole !== 'owner') return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })
  const result = await auth.db.prepare(
    `SELECT id, name, email, "emailVerified" AS email_verified,
            "adminRole" AS admin_role, "twoFactorEnabled" AS two_factor_enabled
     FROM "user" WHERE role = 'admin' ORDER BY "adminRole" DESC, lower(email)`,
  ).all()
  return NextResponse.json({ staff: result.results }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.ok) return auth.error
  if (auth.user.adminRole !== 'owner') return NextResponse.json({ error: 'Owner access required.' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await readBoundedJsonObject(request, 2048)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof RequestBodyTooLargeError ? 'Request body is too large.' : 'Invalid request.' },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
    )
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const action = body.action
  if (!EMAIL.test(email) || !['promote', 'remove'].includes(String(action))) {
    return NextResponse.json({ error: 'Enter a valid account email and action.' }, { status: 400 })
  }
  const account = await auth.db.prepare(
    `SELECT id, name, email, role, "adminRole" AS admin_role, "emailVerified" AS verified
     FROM "user" WHERE lower(email) = ?`,
  ).bind(email).first<{ id: string; name: string; email: string; role: string; admin_role: string | null; verified: number }>()
  if (!account) return NextResponse.json({ error: 'That person must create and verify a customer account first.' }, { status: 404 })
  if (account.admin_role === 'owner') return NextResponse.json({ error: 'The owner account cannot be changed here.' }, { status: 409 })
  if (action === 'promote' && account.verified !== 1) {
    return NextResponse.json({ error: 'That account must verify its email first.' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const nextRole = action === 'promote' ? 'admin' : 'customer'
  const nextAdminRole = action === 'promote' ? 'admin' : null
  await auth.db.batch([
    auth.db.prepare(
      `UPDATE "user" SET role = ?, "adminRole" = ?, "updatedAt" = ? WHERE id = ?`,
    ).bind(nextRole, nextAdminRole, now, account.id),
    auth.db.prepare('DELETE FROM session WHERE "userId" = ?').bind(account.id),
    auth.db.prepare(
      `INSERT INTO admin_audit_logs
         (id, admin_user_id, admin_email, action, entity_type, entity_id, entity_name, changes_json, created_at)
       VALUES (?, ?, ?, ?, 'staff', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(), auth.user.id, auth.user.email,
      action === 'promote' ? 'PROMOTE_ADMIN' : 'REMOVE_ADMIN',
      account.id, account.email,
      JSON.stringify({ before: account.role, after: nextRole }), now,
    ),
  ])
  return NextResponse.json({ success: true })
}
