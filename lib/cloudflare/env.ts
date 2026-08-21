import { getCloudflareContext } from '@opennextjs/cloudflare'

/** Resolve request-scoped bindings. Never cache this object in global state. */
export async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return env
  } catch {
    return null
  }
}
