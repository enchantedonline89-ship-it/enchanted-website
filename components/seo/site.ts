/**
 * Single source of truth for the site's absolute origin and brand name.
 *
 * Cloudflare supplies the public deployment origin at build time.
 */
const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim()

export const SITE_URL = configuredOrigin
  ? new URL(configuredOrigin).origin
  : "https://enchanted-style.workers.dev"

export const SITE_NAME = "Enchanted Style"

/** Resolve a root-relative path (e.g. "/privacy") to an absolute URL. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString()
}
