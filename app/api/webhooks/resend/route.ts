import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { getCloudflareEnv } from '@/lib/cloudflare/env'

type ResendEvent = {
  type: string
  created_at: string
  data: { email_id?: string }
}

export async function POST(request: Request) {
  const env = await getCloudflareEnv()
  if (!env?.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  }

  const id = request.headers.get('svix-id')
  const timestamp = request.headers.get('svix-timestamp')
  const signature = request.headers.get('svix-signature')
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const rawBody = await request.text()
    const event = new Webhook(env.RESEND_WEBHOOK_SECRET).verify(rawBody, {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': signature,
    }) as ResendEvent
    const providerMessageId = event.data.email_id
    if (!providerMessageId || !event.type || !event.created_at) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const terminal = ['email.delivered', 'email.bounced', 'email.failed'].includes(event.type)
    await env.DB.batch([
      env.DB.prepare(
        `INSERT OR IGNORE INTO email_events
           (id, provider_event_id, provider_message_id, event_type, occurred_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), id, providerMessageId, event.type, event.created_at, now),
      env.DB.prepare(
        `UPDATE email_messages SET
           latest_status = CASE
             WHEN ? = 1 THEN ?
             WHEN latest_status NOT IN ('delivered', 'bounced', 'failed') THEN ?
             ELSE latest_status
           END,
           delivered_at = CASE WHEN ? = 'email.delivered' THEN ? ELSE delivered_at END,
           failed_at = CASE WHEN ? IN ('email.bounced', 'email.failed') THEN ? ELSE failed_at END,
           updated_at = ?
         WHERE provider_message_id = ?`,
      ).bind(
        terminal ? 1 : 0, event.type.replace('email.', ''), event.type.replace('email.', ''),
        event.type, event.created_at, event.type, event.created_at, now, providerMessageId,
      ),
    ])
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
}
