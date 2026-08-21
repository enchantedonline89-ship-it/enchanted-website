import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import type { SiteTheme } from '@/types'

const SITE_THEMES = new Set<SiteTheme>(['default', 'christmas', 'ramadan'])

function isSiteTheme(value: unknown): value is SiteTheme {
  return typeof value === 'string' && SITE_THEMES.has(value as SiteTheme)
}

function requestId(request: NextRequest): string {
  const value = request.headers.get('cf-ray') ?? request.headers.get('x-request-id')
  return value?.trim().slice(0, 120) || crypto.randomUUID()
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.ok) return auth.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const theme = body && typeof body === 'object' && !Array.isArray(body)
    ? Reflect.get(body, 'theme')
    : null
  if (!isSiteTheme(theme)) {
    return NextResponse.json({ error: 'Choose a valid storefront theme.' }, { status: 400 })
  }

  try {
    const existing = await auth.db
      .prepare('SELECT active_theme FROM site_settings WHERE id = ? LIMIT 1')
      .bind('storefront')
      .first<{ active_theme: string }>()
    const beforeTheme = isSiteTheme(existing?.active_theme) ? existing.active_theme : 'default'
    const updatedAt = new Date().toISOString()
    const changes = {
      before: { active_theme: beforeTheme },
      after: { active_theme: theme, updated_at: updatedAt },
    }

    await auth.db.batch([
      auth.db.prepare(`
        INSERT INTO site_settings (id, active_theme, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          active_theme = excluded.active_theme,
          updated_at = excluded.updated_at
      `).bind('storefront', theme, updatedAt),
      auth.db.prepare(`
        INSERT INTO admin_audit_logs (
          id, admin_user_id, admin_email, action, entity_type, entity_id,
          entity_name, changes_json, request_id
        ) VALUES (?, ?, ?, 'UPDATE', 'site_setting', ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        auth.user.id,
        auth.user.email,
        'storefront',
        'Storefront theme',
        JSON.stringify(changes),
        requestId(request),
      ),
    ])

    revalidateTag('site-settings', 'max')
    revalidatePath('/', 'layout')
    return NextResponse.json({ theme, updated_at: updatedAt })
  } catch (error) {
    console.error('Theme settings update failed:', error)
    return NextResponse.json({ error: 'Could not apply that theme.' }, { status: 500 })
  }
}
