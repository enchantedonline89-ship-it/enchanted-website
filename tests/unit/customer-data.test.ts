// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  CustomerDataError,
  normalizeLebanesePhone,
  parseCustomerAddressInput,
  softDeleteCustomerAddress,
  updateCustomerAddress,
  type CustomerAddressInput,
} from '@/lib/customer-data'

const addressInput: CustomerAddressInput = {
  label: 'Home',
  recipientName: 'Teri Rita',
  phone: '+96181492994',
  countryCode: 'LB',
  governorate: 'Beirut',
  city: 'Beirut',
  area: 'Achrafieh',
  street: 'Sassine Square',
  building: 'Enchanted',
  floor: '2',
  landmark: null,
  deliveryNotes: null,
  isDefault: false,
}

describe('Lebanon customer data validation', () => {
  it.each([
    ['81 492 994', '+96181492994'],
    ['03 123 456', '+9613123456'],
    ['+961 (81) 492-994', '+96181492994'],
    ['00961 1 234 567', '+9611234567'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeLebanesePhone(input)).toBe(expected)
  })

  it.each(['+33612345678', '00441234567890', '123', 'hello'])('rejects non-Lebanese or malformed phone %s', (phone) => {
    expect(() => normalizeLebanesePhone(phone)).toThrow(CustomerDataError)
  })

  it('rejects a foreign country and mass-assignment fields', () => {
    try {
      parseCustomerAddressInput({ ...addressInput, countryCode: 'FR' })
      throw new Error('Expected foreign country validation to fail')
    } catch (error) {
      expect(error).toMatchObject({
        status: 400,
        fieldErrors: { countryCode: 'Delivery addresses must be in Lebanon.' },
      })
    }
    expect(() => parseCustomerAddressInput({ ...addressInput, userId: 'another-user' })).toThrow(
      CustomerDataError,
    )
  })
})

describe('D1 address ownership', () => {
  it('stops a non-owner before issuing an update', async () => {
    const bound: unknown[][] = []
    const run = vi.fn()
    const batch = vi.fn()
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...values: unknown[]) => {
          bound.push([sql, ...values])
          return { first: vi.fn().mockResolvedValue(null), run }
        },
      })),
      batch,
    } as unknown as D1Database

    await expect(
      updateCustomerAddress(
        db,
        'owner-a',
        '11111111-1111-4111-8111-111111111111',
        addressInput,
      ),
    ).rejects.toMatchObject({ status: 404, code: 'ADDRESS_NOT_FOUND' })

    expect(bound[0]?.[0]).toContain('id = ? AND user_id = ?')
    expect(bound[0]?.slice(-2)).toEqual([
      '11111111-1111-4111-8111-111111111111',
      'owner-a',
    ])
    expect(run).not.toHaveBeenCalled()
    expect(batch).not.toHaveBeenCalled()
  })

  it('scopes a default-address soft delete and replacement to the same owner', async () => {
    const prepared: Array<{ sql: string; values: unknown[] }> = []
    let firstCall = 0
    const batch = vi.fn().mockResolvedValue([])
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...values: unknown[]) => {
          const statement = {
            sql,
            values,
            first: vi.fn().mockImplementation(async () => {
              firstCall += 1
              return firstCall === 1
                ? { id: '11111111-1111-4111-8111-111111111111', isDefault: 1 }
                : { id: '22222222-2222-4222-8222-222222222222' }
            }),
          }
          prepared.push(statement)
          return statement
        },
      })),
      batch,
    } as unknown as D1Database

    const result = await softDeleteCustomerAddress(
      db,
      'owner-a',
      '11111111-1111-4111-8111-111111111111',
    )

    expect(result.defaultAddressId).toBe('22222222-2222-4222-8222-222222222222')
    expect(batch).toHaveBeenCalledOnce()
    const statements = batch.mock.calls[0]?.[0] as Array<{ sql: string; values: unknown[] }>
    expect(statements).toHaveLength(2)
    expect(statements.every((statement) => statement.sql.includes('user_id'))).toBe(true)
    expect(statements[0]?.values).toContain('owner-a')
    expect(statements[1]?.values.filter((value) => value === 'owner-a')).toHaveLength(2)
  })
})
