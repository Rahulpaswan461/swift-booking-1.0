// Env-aware clinic URL builder — mirrors Backend/utils/clinicUrl.js.
// Dev:  VITE_APP_BASE_DOMAIN=localhost:3000 → http://{slug}.localhost:3000
// Prod: VITE_APP_BASE_DOMAIN=medibook.in    → https://{slug}.medibook.in
// Never hardcode the domain in components — always build URLs through this.

const BASE_DOMAIN = import.meta.env.VITE_APP_BASE_DOMAIN || 'medibook.in'
const PROTOCOL =
  import.meta.env.VITE_APP_PROTOCOL ||
  (BASE_DOMAIN.startsWith('localhost') ? 'http' : 'https')

export const clinicDomain = (slug) => `${slug}.${BASE_DOMAIN}`
export const clinicUrl = (slug, path = '') => `${PROTOCOL}://${clinicDomain(slug)}${path}`
