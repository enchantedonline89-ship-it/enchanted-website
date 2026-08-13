/**
 * Single source of truth for the site's absolute origin and brand name.
 *
 * A custom domain is planned but not live yet. When it goes live, change
 * ONLY this value. metadataBase in app/layout.tsx reads from here, every
 * page's canonical and Open Graph url is a root-relative path resolved
 * against metadataBase, and app/sitemap.ts, app/robots.ts, and the JSON-LD
 * components import it directly. Nothing else needs rewriting.
 */
export const SITE_URL = "https://enchanted-website-xi.vercel.app"

export const SITE_NAME = "Enchanted Style"

/** Resolve a root-relative path (e.g. "/privacy") to an absolute URL. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString()
}
