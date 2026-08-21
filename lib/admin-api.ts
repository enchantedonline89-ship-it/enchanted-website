import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth/server'
import { getD1Database } from '@/lib/cloudflare/d1'

type AdminAuthorization =
  | { ok: false; error: NextResponse }
  | {
      ok: true
      db: NonNullable<Awaited<ReturnType<typeof getD1Database>>>
      user: { id: string; email: string; name: string; role: string }
    }

export async function authorizeAdminRequest(request: NextRequest): Promise<AdminAuthorization> {
  const origin = request.headers.get('origin')
  const isRead = request.method === 'GET' || request.method === 'HEAD'
  if ((!isRead && !origin) || (origin && origin !== request.nextUrl.origin)) {
    return { ok: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  try {
    const [session, db] = await Promise.all([
      (await getAuth()).api.getSession({ headers: request.headers }),
      getD1Database(),
    ])
    if (!session?.user) {
      return { ok: false, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }
    if (session.user.role !== 'admin') {
      return { ok: false, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    if (!db) {
      return { ok: false, error: NextResponse.json({ error: 'Database unavailable' }, { status: 503 }) }
    }

    return {
      ok: true,
      db,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      },
    }
  } catch {
    return { ok: false, error: NextResponse.json({ error: 'Authentication unavailable' }, { status: 503 }) }
  }
}
