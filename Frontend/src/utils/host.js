// Which site is this browser tab actually on?
//
// One build serves three kinds of host: the platform site, a clinic's
// subdomain, and localhost in dev. Only the platform site should ever be
// indexed by search engines, so this check is what the robots policy and the
// homepage fallback both key off.

const BASE = (import.meta.env.VITE_APP_BASE_DOMAIN || 'healibrate.com')
  .split(':')[0]
  .toLowerCase()

/**
 * True on healibrate.com, www.healibrate.com, and bare localhost.
 *
 * Deliberately fail-safe: anything this can't positively identify as the
 * platform is treated as a clinic subdomain. Getting it wrong in that
 * direction hides one clinic page; getting it wrong the other way would
 * de-index the marketing site.
 */
export function isPlatformHost() {
  if (typeof window === 'undefined') return true
  const host = window.location.hostname.toLowerCase()
  return host === BASE || host === `www.${BASE}` || host === 'localhost'
}
