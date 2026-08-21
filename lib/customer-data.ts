const MAX_JSON_BYTES = 16_384
export const MAX_ACTIVE_ADDRESSES = 10

export const LEBANON_GOVERNORATES = [
  'Akkar',
  'Baalbek-Hermel',
  'Beirut',
  'Bekaa',
  'Mount Lebanon',
  'Nabatieh',
  'North Lebanon',
  'South Lebanon',
] as const

export type LebanonGovernorate = (typeof LEBANON_GOVERNORATES)[number]

export type CustomerProfile = {
  name: string
  email: string
  defaultPhone: string | null
  marketingConsent: boolean
  analyticsConsent: boolean
}

export type CustomerAddress = {
  id: string
  label: string
  recipientName: string
  phone: string
  countryCode: 'LB'
  governorate: LebanonGovernorate
  city: string
  area: string
  street: string
  building: string | null
  floor: string | null
  landmark: string | null
  deliveryNotes: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerProfileInput = Omit<CustomerProfile, 'email'>

export type CustomerAddressInput = Omit<
  CustomerAddress,
  'id' | 'createdAt' | 'updatedAt'
>

type ProfileRow = {
  name: string
  email: string
  defaultPhone: string | null
  marketingConsent: number
  analyticsConsent: number
}

type AddressRow = {
  id: string
  label: string
  recipientName: string
  phone: string
  countryCode: 'LB'
  governorate: LebanonGovernorate
  city: string
  area: string
  street: string
  building: string | null
  floor: string | null
  landmark: string | null
  deliveryNotes: string | null
  isDefault: number
  createdAt: string
  updatedAt: string
}

type AddressIdentityRow = { id: string; isDefault: number }

export class CustomerDataError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message)
    this.name = 'CustomerDataError'
  }
}

function inputError(field: string, message: string): never {
  throw new CustomerDataError(400, 'INVALID_INPUT', 'Check the highlighted fields.', {
    [field]: message,
  })
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CustomerDataError(400, 'INVALID_INPUT', 'A JSON object is required.')
  }
  return value as Record<string, unknown>
}

function assertAllowedKeys(record: Record<string, unknown>, allowed: readonly string[]) {
  const allowedKeys = new Set(allowed)
  const unexpected = Object.keys(record).find((key) => !allowedKeys.has(key))
  if (unexpected) inputError(unexpected, 'This field is not accepted.')
}

function requiredText(
  record: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
): string {
  const value = record[field]
  if (typeof value !== 'string') inputError(field, 'This field is required.')
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (/[\u0000-\u001f\u007f]/u.test(normalized)) {
    inputError(field, 'Control characters are not allowed.')
  }
  if (normalized.length < min || normalized.length > max) {
    inputError(field, `Enter between ${min} and ${max} characters.`)
  }
  return normalized
}

function optionalText(
  record: Record<string, unknown>,
  field: string,
  max: number,
  multiline = false,
): string | null {
  const value = record[field]
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') inputError(field, 'Enter text or leave this field empty.')

  const normalized = multiline
    ? value.replace(/\r\n?/g, '\n').trim()
    : value.trim().replace(/\s+/g, ' ')
  const controlPattern = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u : /[\u0000-\u001f\u007f]/u
  if (controlPattern.test(normalized)) inputError(field, 'Control characters are not allowed.')
  if (normalized.length > max) inputError(field, `Use ${max} characters or fewer.`)
  return normalized || null
}

function requiredBoolean(record: Record<string, unknown>, field: string): boolean {
  const value = record[field]
  if (typeof value !== 'boolean') inputError(field, 'Choose yes or no.')
  return value
}

/** Normalize a Lebanon number to E.164 without accepting a foreign country code. */
export function normalizeLebanesePhone(
  value: unknown,
  required = true,
  field = 'phone',
): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) inputError(field, 'Enter a Lebanese phone number.')
    return null
  }
  if (typeof value !== 'string') inputError(field, 'Enter a Lebanese phone number.')

  const raw = value.trim()
  if (!raw) {
    if (required) inputError(field, 'Enter a Lebanese phone number.')
    return null
  }
  if (!/^(?:\+|00)?[0-9\s().-]+$/u.test(raw)) {
    inputError(field, 'Use a valid Lebanese phone number.')
  }

  const digits = raw.replace(/\D/g, '')
  let national: string
  if (raw.startsWith('+')) {
    if (!digits.startsWith('961')) inputError(field, 'Only Lebanese (+961) numbers are accepted.')
    national = digits.slice(3)
  } else if (raw.startsWith('00')) {
    if (!digits.startsWith('00961')) inputError(field, 'Only Lebanese (+961) numbers are accepted.')
    national = digits.slice(5)
  } else {
    national = digits.startsWith('0') ? digits.slice(1) : digits
  }

  // Lebanon national numbers are seven digits for legacy mobile/fixed lines,
  // or eight digits for the two-digit mobile prefixes currently in use.
  if (!/^[1-9]\d{6,7}$/u.test(national)) {
    inputError(field, 'Enter a 7 or 8 digit Lebanese number, with or without +961.')
  }
  return `+961${national}`
}

export function parseCustomerProfileInput(value: unknown): CustomerProfileInput {
  const record = asRecord(value)
  assertAllowedKeys(record, ['name', 'defaultPhone', 'marketingConsent', 'analyticsConsent'])
  return {
    name: requiredText(record, 'name', 2, 100),
    defaultPhone: normalizeLebanesePhone(record.defaultPhone, false, 'defaultPhone'),
    marketingConsent: requiredBoolean(record, 'marketingConsent'),
    analyticsConsent: requiredBoolean(record, 'analyticsConsent'),
  }
}

export function parseCustomerAddressInput(value: unknown): CustomerAddressInput {
  const record = asRecord(value)
  assertAllowedKeys(record, [
    'label',
    'recipientName',
    'phone',
    'countryCode',
    'governorate',
    'city',
    'area',
    'street',
    'building',
    'floor',
    'landmark',
    'deliveryNotes',
    'isDefault',
  ])

  if (record.countryCode !== 'LB') {
    inputError('countryCode', 'Delivery addresses must be in Lebanon.')
  }
  if (
    typeof record.governorate !== 'string' ||
    !LEBANON_GOVERNORATES.includes(record.governorate as LebanonGovernorate)
  ) {
    inputError('governorate', 'Choose a Lebanese governorate.')
  }

  return {
    label: requiredText(record, 'label', 1, 40),
    recipientName: requiredText(record, 'recipientName', 2, 100),
    phone: normalizeLebanesePhone(record.phone)!,
    countryCode: 'LB',
    governorate: record.governorate as LebanonGovernorate,
    city: requiredText(record, 'city', 2, 100),
    area: requiredText(record, 'area', 2, 120),
    street: requiredText(record, 'street', 2, 200),
    building: optionalText(record, 'building', 100),
    floor: optionalText(record, 'floor', 40),
    landmark: optionalText(record, 'landmark', 200),
    deliveryNotes: optionalText(record, 'deliveryNotes', 500, true),
    isDefault: requiredBoolean(record, 'isDefault'),
  }
}

/** Reject cross-site and non-browser mutation requests before touching D1. */
export function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

/** Read a small JSON object without buffering an unbounded request body. */
export async function readBoundedJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') {
    throw new CustomerDataError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send this request as JSON.')
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new CustomerDataError(413, 'PAYLOAD_TOO_LARGE', 'The request is too large.')
  }

  if (!request.body) throw new CustomerDataError(400, 'INVALID_JSON', 'A JSON object is required.')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_JSON_BYTES) {
      await reader.cancel()
      throw new CustomerDataError(413, 'PAYLOAD_TOO_LARGE', 'The request is too large.')
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return asRecord(JSON.parse(new TextDecoder().decode(bytes)))
  } catch (error) {
    if (error instanceof CustomerDataError) throw error
    throw new CustomerDataError(400, 'INVALID_JSON', 'The request body is not valid JSON.')
  }
}

function mapAddress(row: AddressRow): CustomerAddress {
  return { ...row, isDefault: row.isDefault === 1 }
}

export async function getCustomerProfile(
  db: D1Database,
  userId: string,
): Promise<CustomerProfile> {
  const row = await db
    .prepare(
      `SELECT u.name,
              u.email,
              p.default_phone_e164 AS defaultPhone,
              COALESCE(p.marketing_consent, 0) AS marketingConsent,
              COALESCE(p.analytics_consent, 0) AS analyticsConsent
       FROM "user" u
       LEFT JOIN customer_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
    )
    .bind(userId)
    .first<ProfileRow>()

  if (!row) throw new CustomerDataError(404, 'PROFILE_NOT_FOUND', 'Account not found.')
  return {
    name: row.name,
    email: row.email,
    defaultPhone: row.defaultPhone,
    marketingConsent: row.marketingConsent === 1,
    analyticsConsent: row.analyticsConsent === 1,
  }
}

export async function updateCustomerProfile(
  db: D1Database,
  userId: string,
  input: CustomerProfileInput,
): Promise<CustomerProfile> {
  const now = new Date().toISOString()
  const results = await db.batch([
    db.prepare('UPDATE "user" SET name = ?, "updatedAt" = ? WHERE id = ?').bind(
      input.name,
      now,
      userId,
    ),
    db.prepare(
      `INSERT INTO customer_profiles
         (user_id, default_phone_e164, marketing_consent, analytics_consent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         default_phone_e164 = excluded.default_phone_e164,
         marketing_consent = excluded.marketing_consent,
         analytics_consent = excluded.analytics_consent,
         updated_at = excluded.updated_at`,
    ).bind(
      userId,
      input.defaultPhone,
      Number(input.marketingConsent),
      Number(input.analyticsConsent),
      now,
      now,
    ),
  ])
  if (Number(results[0]?.meta.changes ?? 0) !== 1) {
    throw new CustomerDataError(404, 'PROFILE_NOT_FOUND', 'Account not found.')
  }
  return getCustomerProfile(db, userId)
}

export async function listCustomerAddresses(
  db: D1Database,
  userId: string,
): Promise<CustomerAddress[]> {
  const result = await db
    .prepare(
      `SELECT id,
              label,
              recipient_name AS recipientName,
              phone_e164 AS phone,
              country_code AS countryCode,
              governorate,
              city,
              area,
              street,
              building,
              floor,
              landmark,
              delivery_notes AS deliveryNotes,
              is_default AS isDefault,
              created_at AS createdAt,
              updated_at AS updatedAt
       FROM addresses
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY is_default DESC, updated_at DESC`,
    )
    .bind(userId)
    .all<AddressRow>()
  return result.results.map(mapAddress)
}

async function getOwnedAddress(
  db: D1Database,
  userId: string,
  addressId: string,
): Promise<AddressIdentityRow> {
  const row = await db
    .prepare(
      `SELECT id, is_default AS isDefault
       FROM addresses
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    )
    .bind(addressId, userId)
    .first<AddressIdentityRow>()
  if (!row) throw new CustomerDataError(404, 'ADDRESS_NOT_FOUND', 'Address not found.')
  return row
}

async function readCustomerAddress(
  db: D1Database,
  userId: string,
  addressId: string,
): Promise<CustomerAddress> {
  const result = await listCustomerAddresses(db, userId)
  const address = result.find((item) => item.id === addressId)
  if (!address) throw new CustomerDataError(404, 'ADDRESS_NOT_FOUND', 'Address not found.')
  return address
}

export async function createCustomerAddress(
  db: D1Database,
  userId: string,
  input: CustomerAddressInput,
): Promise<CustomerAddress> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const insert = await db
    .prepare(
      `INSERT INTO addresses
         (id, user_id, label, recipient_name, phone_e164, country_code,
          governorate, city, area, street, building, floor, landmark,
          delivery_notes, is_default, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, 'LB', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?
       WHERE (
         SELECT COUNT(*) FROM addresses
         WHERE user_id = ? AND deleted_at IS NULL
       ) < ?`,
    )
    .bind(
      id,
      userId,
      input.label,
      input.recipientName,
      input.phone,
      input.governorate,
      input.city,
      input.area,
      input.street,
      input.building,
      input.floor,
      input.landmark,
      input.deliveryNotes,
      now,
      now,
      userId,
      MAX_ACTIVE_ADDRESSES,
    )
    .run()

  if (Number(insert.meta.changes ?? 0) !== 1) {
    throw new CustomerDataError(
      409,
      'ADDRESS_LIMIT_REACHED',
      `You can save up to ${MAX_ACTIVE_ADDRESSES} addresses.`,
    )
  }

  const existingDefault = await db
    .prepare(
      `SELECT id FROM addresses
       WHERE user_id = ? AND deleted_at IS NULL AND is_default = 1
       LIMIT 1`,
    )
    .bind(userId)
    .first<{ id: string }>()

  if (input.isDefault || !existingDefault) {
    await db.batch([
      db.prepare(
        `UPDATE addresses SET is_default = 0, updated_at = ?
         WHERE user_id = ? AND deleted_at IS NULL AND is_default = 1`,
      ).bind(now, userId),
      db.prepare(
        `UPDATE addresses SET is_default = 1, updated_at = ?
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      ).bind(now, id, userId),
    ])
  }

  return readCustomerAddress(db, userId, id)
}

export async function updateCustomerAddress(
  db: D1Database,
  userId: string,
  addressId: string,
  input: CustomerAddressInput,
): Promise<CustomerAddress> {
  await getOwnedAddress(db, userId, addressId)
  const now = new Date().toISOString()
  const update = db.prepare(
    `UPDATE addresses
     SET label = ?, recipient_name = ?, phone_e164 = ?, country_code = 'LB',
         governorate = ?, city = ?, area = ?, street = ?, building = ?,
         floor = ?, landmark = ?, delivery_notes = ?, updated_at = ?
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
  ).bind(
    input.label,
    input.recipientName,
    input.phone,
    input.governorate,
    input.city,
    input.area,
    input.street,
    input.building,
    input.floor,
    input.landmark,
    input.deliveryNotes,
    now,
    addressId,
    userId,
  )

  if (input.isDefault) {
    await db.batch([
      update,
      db.prepare(
        `UPDATE addresses SET is_default = 0, updated_at = ?
         WHERE user_id = ? AND id <> ? AND deleted_at IS NULL AND is_default = 1`,
      ).bind(now, userId, addressId),
      db.prepare(
        `UPDATE addresses SET is_default = 1, updated_at = ?
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      ).bind(now, addressId, userId),
    ])
  } else {
    const result = await update.run()
    if (Number(result.meta.changes ?? 0) !== 1) {
      throw new CustomerDataError(404, 'ADDRESS_NOT_FOUND', 'Address not found.')
    }
  }

  return readCustomerAddress(db, userId, addressId)
}

export async function softDeleteCustomerAddress(
  db: D1Database,
  userId: string,
  addressId: string,
): Promise<{ deletedId: string; defaultAddressId: string | null }> {
  const address = await getOwnedAddress(db, userId, addressId)
  const now = new Date().toISOString()

  if (address.isDefault === 1) {
    await db.batch([
      db.prepare(
        `UPDATE addresses
         SET deleted_at = ?, is_default = 0, updated_at = ?
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      ).bind(now, now, addressId, userId),
      db.prepare(
        `UPDATE addresses
         SET is_default = 1, updated_at = ?
         WHERE id = (
           SELECT id FROM addresses
           WHERE user_id = ? AND deleted_at IS NULL
           ORDER BY updated_at DESC LIMIT 1
         ) AND user_id = ?`,
      ).bind(now, userId, userId),
    ])
  } else {
    const result = await db
      .prepare(
        `UPDATE addresses
         SET deleted_at = ?, is_default = 0, updated_at = ?
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      )
      .bind(now, now, addressId, userId)
      .run()
    if (Number(result.meta.changes ?? 0) !== 1) {
      throw new CustomerDataError(404, 'ADDRESS_NOT_FOUND', 'Address not found.')
    }
  }

  const replacement = await db
    .prepare(
      `SELECT id FROM addresses
       WHERE user_id = ? AND deleted_at IS NULL AND is_default = 1
       LIMIT 1`,
    )
    .bind(userId)
    .first<{ id: string }>()

  return { deletedId: addressId, defaultAddressId: replacement?.id ?? null }
}
