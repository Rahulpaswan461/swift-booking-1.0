// Env-aware clinic URL builder.
// Dev:  APP_BASE_DOMAIN=localhost:3000  → http://{slug}.localhost:3000
// Prod: APP_BASE_DOMAIN=healibrate.in     → https://{slug}.healibrate.in
// Never hardcode the domain elsewhere — always build URLs through this.

function baseDomain() {
  return process.env.APP_BASE_DOMAIN || "healibrate.in"
}

function protocol() {
  if (process.env.APP_PROTOCOL) return process.env.APP_PROTOCOL
  return baseDomain().startsWith("localhost") ? "http" : "https"
}

export function clinicDomain(slug) {
  return `${slug}.${baseDomain()}`
}

export function buildClinicUrl(slug, path = "") {
  return `${protocol()}://${clinicDomain(slug)}${path}`
}
