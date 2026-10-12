// Shared by HTTP CORS and WebSocket upgrade requests.
export function isAllowedOrigin(origin) {
  if (!origin) return true // authenticated non-browser clients
  try {
    const url = new URL(origin)
    if (!['http:', 'https:'].includes(url.protocol)) return false
    const domain = (process.env.APP_BASE_DOMAIN || 'healibrate.com').split(':')[0]
    const extra = ['https://swift-booking-1-0.vercel.app', ...(process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)]
    return url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
      url.hostname === domain || url.hostname.endsWith(`.${domain}`) || extra.includes(url.origin)
  } catch { return false }
}
