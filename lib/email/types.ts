export type TransactionalEmailJob = {
  idempotencyKey: string
  template: 'verify-email' | 'reset-password' | 'order-received' | 'order-status'
  recipient: string
  payload: Record<string, string | number | null>
}
