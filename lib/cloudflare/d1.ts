import {
  getCloudflareContext,
  type CloudflareContext,
} from '@opennextjs/cloudflare'

type D1DatabaseBinding = NonNullable<
  CloudflareContext['env']['NEXT_TAG_CACHE_D1']
>

function isD1DatabaseBinding(value: unknown): value is D1DatabaseBinding {
  if (typeof value !== 'object' || value === null) return false

  return (
    typeof Reflect.get(value, 'prepare') === 'function' &&
    typeof Reflect.get(value, 'batch') === 'function'
  )
}

/** Resolve the production D1 binding from the current OpenNext request. */
export async function getD1Database(): Promise<D1DatabaseBinding | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const database = Reflect.get(env, 'DB')
    return isD1DatabaseBinding(database) ? database : null
  } catch {
    return null
  }
}
