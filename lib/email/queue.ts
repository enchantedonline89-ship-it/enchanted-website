import type { TransactionalEmailJob } from '@/lib/email/types'

type EmailQueue = {
  send(message: TransactionalEmailJob): Promise<void>
}

function isEmailQueue(value: unknown): value is EmailQueue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'send') === 'function'
  )
}

export async function enqueueEmail(
  env: CloudflareEnv,
  job: TransactionalEmailJob,
): Promise<void> {
  const queue = Reflect.get(env, 'EMAIL_QUEUE')
  if (!isEmailQueue(queue)) {
    throw new Error('Transactional email queue is unavailable')
  }
  await queue.send(job)
}
