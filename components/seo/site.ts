/**
 * Single source of truth for the site's absolute origin and brand name.
 *
 * The deployment origin is supplied by each host. Keeping the fallback here
 * preserves existing local/Vercel previews, while Cloudflare can publish
 * correct canonicals by setting NEXT_PUBLIC_SITE_URL without a code change.
 */
const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim()

export const SITE_URL = configuredOrigin
  ? new URL(configuredOrigin).origin
  : "https://enchanted-website-xi.vercel.app"

export const SITE_NAME = "Enchanted Style"

/** Resolve a root-relative path (e.g. "/privacy") to an absolute URL. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString()
}
