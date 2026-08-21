import type { Promotion } from '@/lib/promotions'
import type { PromotionInput } from '@/lib/promotion-input'
import type { getD1Database } from '@/lib/cloudflare/d1'

type PromotionDatabase = NonNullable<Awaited<ReturnType<typeof getD1Database>>>
type PromotionStatement = Parameters<PromotionDatabase['batch']>[0][number]

export type PromotionActor = { id: string; email: string }
export type PromotionCategoryOption = { id: string; name: string }

type PromotionRow = {
  id: string
  name: string
  description: string | null
  campaign_type: 'event' | 'discount'
  scope: 'sitewide' | 'category'
  category_id: string | null
  discount_basis_points: number | null
  starts_at: string
  ends_at: string | null
  is_active: number
  created_at: string
  updated_at: string
  category_name: string | null
}

const PROMOTION_SELECT = `
  SELECT
    p.id,
    p.name,
    p.description,
    p.campaign_type,
    p.scope,
    p.category_id,
    p.discount_basis_points,
    p.starts_at,
    p.ends_at,
    p.is_active,
    p.created_at,
    p.updated_at,
    c.name AS category_name
  FROM promotions p
  LEFT JOIN categories c ON c.id = p.category_id
`

function mapPromotion(row: PromotionRow): Promotion {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    campaign_type: row.campaign_type,
    scope: row.scope,
    category_id: row.category_id,
    discount_percent:
      row.discount_basis_points === null ? null : row.discount_basis_points / 100,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    is_active: row.is_active === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category: row.category_id && row.category_name
      ? { id: row.category_id, name: row.category_name }
      : null,
  }
}

function safeRequestId(value?: string | null): string {
  const normalized = value?.trim().slice(0, 120)
  return normalized || crypto.randomUUID()
}

function auditStatement(
  db: PromotionDatabase,
  actor: PromotionActor,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityId: string,
  entityName: string,
  changes: unknown,
  requestId?: string | null,
): PromotionStatement {
  return db.prepare(`
    INSERT INTO admin_audit_logs (
      id, admin_user_id, admin_email, action, entity_type, entity_id,
      entity_name, changes_json, request_id
    ) VALUES (?, ?, ?, ?, 'promotion', ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    actor.id,
    actor.email,
    action,
    entityId,
    entityName,
    JSON.stringify(changes),
    safeRequestId(requestId),
  )
}

async function getCategory(
  db: PromotionDatabase,
  categoryId: string | null,
): Promise<PromotionCategoryOption | null> {
  if (!categoryId) return null
  return db.prepare(`
    SELECT id, name
    FROM categories
    WHERE id = ? AND is_active = 1
    LIMIT 1
  `).bind(categoryId).first<PromotionCategoryOption>()
}

function snapshot(
  id: string,
  input: PromotionInput,
  category: PromotionCategoryOption | null,
  createdAt: string,
  updatedAt: string,
): Promotion {
  return {
    id,
    ...input,
    category,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

function discountBasisPoints(input: PromotionInput): number | null {
  return input.discount_percent === null
    ? null
    : Math.round(input.discount_percent * 100)
}

export class PromotionMutationError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'CATEGORY_NOT_FOUND') {
    super(code)
    this.name = 'PromotionMutationError'
  }
}

export async function getAdminPromotionsData(
  db: PromotionDatabase,
): Promise<{ promotions: Promotion[]; categories: PromotionCategoryOption[] }> {
  const [promotionsResult, categoriesResult] = await db.batch([
    db.prepare(`${PROMOTION_SELECT} ORDER BY p.starts_at DESC, p.created_at DESC`),
    db.prepare(`
      SELECT id, name
      FROM categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, name ASC
    `),
  ])

  return {
    promotions: ((promotionsResult.results ?? []) as PromotionRow[]).map(mapPromotion),
    categories: (categoriesResult.results ?? []) as PromotionCategoryOption[],
  }
}

export async function getAdminPromotion(
  db: PromotionDatabase,
  id: string,
): Promise<Promotion | null> {
  const row = await db
    .prepare(`${PROMOTION_SELECT} WHERE p.id = ? LIMIT 1`)
    .bind(id)
    .first<PromotionRow>()
  return row ? mapPromotion(row) : null
}

export async function createPromotion(
  db: PromotionDatabase,
  input: PromotionInput,
  actor: PromotionActor,
  requestId?: string | null,
): Promise<Promotion> {
  const category = await getCategory(db, input.category_id)
  if (input.scope === 'category' && !category) {
    throw new PromotionMutationError('CATEGORY_NOT_FOUND')
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const after = snapshot(id, input, category, now, now)
  await db.batch([
    db.prepare(`
      INSERT INTO promotions (
        id, name, description, campaign_type, scope, category_id,
        discount_basis_points, starts_at, ends_at, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.name,
      input.description,
      input.campaign_type,
      input.scope,
      input.category_id,
      discountBasisPoints(input),
      input.starts_at,
      input.ends_at,
      input.is_active ? 1 : 0,
      now,
      now,
    ),
    auditStatement(db, actor, 'CREATE', id, input.name, { before: null, after }, requestId),
  ])

  return after
}

export async function updatePromotion(
  db: PromotionDatabase,
  id: string,
  input: PromotionInput,
  actor: PromotionActor,
  requestId?: string | null,
): Promise<Promotion> {
  const before = await getAdminPromotion(db, id)
  if (!before) throw new PromotionMutationError('NOT_FOUND')

  const category = await getCategory(db, input.category_id)
  if (input.scope === 'category' && !category) {
    throw new PromotionMutationError('CATEGORY_NOT_FOUND')
  }

  const now = new Date().toISOString()
  const after = snapshot(id, input, category, before.created_at ?? now, now)
  await db.batch([
    db.prepare(`
      UPDATE promotions
      SET name = ?, description = ?, campaign_type = ?, scope = ?, category_id = ?,
          discount_basis_points = ?, starts_at = ?, ends_at = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      input.name,
      input.description,
      input.campaign_type,
      input.scope,
      input.category_id,
      discountBasisPoints(input),
      input.starts_at,
      input.ends_at,
      input.is_active ? 1 : 0,
      now,
      id,
    ),
    auditStatement(db, actor, 'UPDATE', id, input.name, { before, after }, requestId),
  ])

  return after
}

export async function deletePromotion(
  db: PromotionDatabase,
  id: string,
  actor: PromotionActor,
  requestId?: string | null,
): Promise<void> {
  const before = await getAdminPromotion(db, id)
  if (!before) throw new PromotionMutationError('NOT_FOUND')

  await db.batch([
    db.prepare('DELETE FROM promotions WHERE id = ?').bind(id),
    auditStatement(db, actor, 'DELETE', id, before.name, { before, after: null }, requestId),
  ])
}
