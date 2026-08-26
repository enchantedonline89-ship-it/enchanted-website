export const ANALYTICS_CONSENT_KEY = 'enchanted_analytics_consent'
export const ANALYTICS_CONSENT_EVENT = 'enchanted:analytics-consent'
export const ANALYTICS_ROUTE_EVENT = 'enchanted:analytics-route'

const PRIVATE_PREFIXES = [
  '/account',
  '/admin',
  '/auth',
  '/checkout',
  '/orders',
  '/track-order',
]

export function isPrivateAnalyticsPath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function getAnalyticsConsent(): boolean {
  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'granted'
  } catch {
    return false
  }
}

export function setAnalyticsConsent(allowed: boolean): void {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, allowed ? 'granted' : 'denied')
  } catch {
    // The event still applies the choice for this page.
  }
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: allowed }))
}
