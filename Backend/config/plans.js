// ── Plan entitlements — the single source of truth ────────────
// The pricing page (Frontend/src/pages/PricingPage.jsx) is the human
// version of this file; keep the two in sync when plans change.
//
// Early Access (beta): every clinic gets every feature free and billing is NOT
// enforced. It is OPT-IN via BETA_MODE=true so the default is *enforced* — a
// missing or misloaded env var can never silently turn billing off (which also
// hides the "no active plan" prompt for unpaid clinics and makes it flicker
// between runs). To run the free beta, set BETA_MODE=true explicitly.
export const EARLY_ACCESS = process.env.BETA_MODE === "true"

const PLAN_CONFIG = {
  basic: {
    label: "Basic",
    maxDoctors: 1,
    features: {
      customBranding: false,
      credentialBadges: false,
      visitTags: false,
      sessionNotes: false,
      smsNotifications: false,
    },
  },
  growth: {
    label: "Growth",
    maxDoctors: 5,
    features: {
      customBranding: true,
      credentialBadges: true,
      visitTags: true,
      sessionNotes: false,
      smsNotifications: false,
    },
  },
  pro: {
    label: "Pro",
    maxDoctors: Infinity,
    features: {
      customBranding: true,
      credentialBadges: true,
      visitTags: true,
      sessionNotes: true,
      smsNotifications: true,
    },
  },
}

// Legacy subscription_plan values stored before the 99/299/499 lineup
const LEGACY_PLAN_MAP = { free: "basic", starter: "basic", pro: "growth", enterprise: "pro" }

export function normalizePlan(plan) {
  const p = String(plan || "basic").toLowerCase()
  if (PLAN_CONFIG[p]) return p
  return LEGACY_PLAN_MAP[p] || "basic"
}

export function planConfig(plan) {
  return PLAN_CONFIG[normalizePlan(plan)]
}

/**
 * The entitlements a clinic actually has right now.
 * During Early Access (BETA_MODE) everything is enabled for everyone.
 */
export function entitlementsFor(clinic) {
  const plan = normalizePlan(clinic?.subscription_plan)
  const config = PLAN_CONFIG[plan]

  if (EARLY_ACCESS) {
    return {
      plan,
      plan_label: config.label,
      max_doctors: null, // unlimited during beta
      features: Object.fromEntries(Object.keys(config.features).map((k) => [k, true])),
    }
  }

  return {
    plan,
    plan_label: config.label,
    max_doctors: config.maxDoctors === Infinity ? null : config.maxDoctors,
    features: { ...config.features },
  }
}
