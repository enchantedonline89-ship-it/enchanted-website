function suffixForEmail(email: string): string {
  // Deterministic fictional reference: this is preview data, not a credential.
  // Keeping it derived from the email lets the stateless tracking route verify
  // the same pair without pretending a mock order was persisted.
  let hash = 2166136261
  for (const character of email.trim().toLowerCase()) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return String((hash >>> 0) % 1_000_000).padStart(6, '0')
}

export function mockOrderNumber(email: string, now = new Date()): string {
  const year = String(now.getUTCFullYear()).slice(-2)
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `ES-${year}${month}-${suffixForEmail(email)}`
}

export function matchesMockOrderNumber(orderNumber: string, email: string): boolean {
  return ORDER_NUMBER_SHAPE.test(orderNumber) && orderNumber.endsWith(`-${suffixForEmail(email)}`)
}

const ORDER_NUMBER_SHAPE = /^ES-\d{4}-\d{6}$/
