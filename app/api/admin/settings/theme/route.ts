import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-api'
import { readBoundedJsonObject, RequestBodyTooLargeError } from '@/lib/request-body'
import type { SiteTheme, ThemeIntensity, ThemeSchedule } from '@/types'

const SITE_THEME_OPTIONS: readonly SiteTheme[] = ['default', 'christmas', 'ramadan']
const THEME_INTENSITY_OPTIONS: readonly ThemeIntensity[] = ['low', 'medium', 'high']

function isSiteTheme(value: unknown): value is SiteTheme {
  return typeof value === 'string' && (SITE_THEME_OPTIONS as readonly string[]).includes(value)
}

function requestId(request: NextRequest): string {
  return (request.headers.get('cf-ray') ?? request.headers.get('x-request-id'))
    ?.trim().slice(0, 120) || crypto.randomUUID()
}

function parseDate(value: unknown): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw new Error('Choose valid schedule dates.')
  const time = Date.parse(value)
  if (!Number.isFinite(time)) throw new Error('Choose valid schedule dates.')
  return new Date(time).toISOString()
}

function parseSchedule(value: unknown, expectedTheme: 'christmas' | 'ramadan'): ThemeSchedule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Add the ${expectedTheme} schedule.`)
  }
  const row = value as Record<string, unknown>
  if (row.theme !== expectedTheme) throw new Error('Choose valid holiday schedules.')
  if (!(THEME_INTENSITY_OPTIONS as readonly unknown[]).includes(row.animation_intensity)) {
    throw new Error('Choose a valid animation intensity.')
  }
  const campaignCopy = typeof row.campaign_copy === 'string' ? row.campaign_copy.trim() : ''
  if (campaignCopy.length > 120) throw new Error('Campaign copy must be 120 characters or fewer.')
  const startsAt = parseDate(row.starts_at)
  const endsAt = parseDate(row.ends_at)
  const enabled = row.is_enabled === true
  if (enabled && (!startsAt || !endsAt)) throw new Error(`Set the ${expectedTheme} start and end dates.`)
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error('Each schedule must end after it starts.')
  return {
    theme: expectedTheme,
    starts_at: startsAt,
    ends_at: endsAt,
    animation_intensity: row.animation_intensity as ThemeIntensity,
    campaign_copy: campaignCopy,
    is_enabled: enabled,
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request)
  if (!auth.ok) return auth.error

  let body: Record<string, unknown>
  try {
    body = await readBoundedJsonObject(request, 8192)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof RequestBodyTooLargeError ? 'Request body is too large.' : 'Invalid JSON body.' },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
    )
  }
  if (!isSiteTheme(body.theme)) {
    return NextResponse.json({ error: 'Choose a valid storefront theme.' }, { status: 400 })
  }

  const rows = Array.isArray(body.schedules) ? body.schedules : []
  let schedules: ThemeSchedule[]
  try {
    schedules = [
      parseSchedule(rows.find(value => (value as Record<string, unknown>)?.theme === 'christmas'), 'christmas'),
      parseSchedule(rows.find(value => (value as Record<string, unknown>)?.theme === 'ramadan'), 'ramadan'),
    ]
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Choose valid holiday schedules.' },
      { status: 400 },
    )
  }

  try {
    const existing = await auth.db.prepare(
      'SELECT active_theme FROM site_settings WHERE id = ? LIMIT 1',
    ).bind('storefront').first<{ active_theme: string }>()
    const updatedAt = new Date().toISOString()
    const statements = schedules.map(schedule => auth.db.prepare(
      `INSERT INTO theme_schedules
         (theme, starts_at, ends_at, animation_intensity, campaign_copy, is_enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(theme) DO UPDATE SET
         starts_at = excluded.starts_at,
         ends_at = excluded.ends_at,
         animation_intensity = excluded.animation_intensity,
         campaign_copy = excluded.campaign_copy,
         is_enabled = excluded.is_enabled,
         updated_at = excluded.updated_at`,
    ).bind(
      schedule.theme,
      schedule.starts_at,
      schedule.ends_at,
      schedule.animation_intensity,
      schedule.campaign_copy,
      schedule.is_enabled ? 1 : 0,
      updatedAt,
    ))

    await auth.db.batch([
      auth.db.prepare(
        `INSERT INTO site_settings (id, active_theme, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET active_theme = excluded.active_theme, updated_at = excluded.updated_at`,
      ).bind('storefront', body.theme, updatedAt),
      ...statements,
      auth.db.prepare(
        `INSERT INTO admin_audit_logs (
           id, admin_user_id, admin_email, action, entity_type, entity_id,
           entity_name, changes_json, request_id
         ) VALUES (?, ?, ?, 'UPDATE', 'site_setting', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        auth.user.id,
        auth.user.email,
        'storefront',
        'Storefront appearance',
        JSON.stringify({
          before: { active_theme: isSiteTheme(existing?.active_theme) ? existing.active_theme : 'default' },
          after: { active_theme: body.theme, schedules, updated_at: updatedAt },
        }),
        requestId(request),
      ),
    ])

    revalidateTag('site-settings', 'max')
    revalidatePath('/', 'layout')
    return NextResponse.json({ theme: body.theme, schedules, updated_at: updatedAt })
  } catch (error) {
    console.error('Theme settings update failed:', error)
    return NextResponse.json({ error: 'Could not save storefront appearance.' }, { status: 500 })
  }
}
