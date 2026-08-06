import supabase from "../config/supabase.js";

// Reserved subdomains that should NOT be treated as clinic slugs
const RESERVED = new Set(["www", "healibrate", "api", "admin", "app", "portal"]);

// Simple in-memory cache for tenant lookups (avoids DB hit on every request)
const TENANT_CACHE = new Map();
const CACHE_TTL_MS = Number(process.env.TENANT_CACHE_TTL_MS || 60_000); // 1 min default

/**
 * Drop a clinic from the tenant cache so updates (branding, settings)
 * are visible on the public booking page immediately.
 * Call with no slug to clear the whole cache.
 */
export function invalidateTenantCache(slug) {
  if (slug) {
    TENANT_CACHE.delete(`tenant:${slug}`);
  } else {
    TENANT_CACHE.clear();
  }
}

/**
 * Internal: resolve tenant from subdomain, with caching
 */
async function resolveTenantFromSubdomain(subdomain) {
  const cacheKey = `tenant:${subdomain}`;
  const cached = TENANT_CACHE.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.clinic;
  }

  const { data: clinic, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("slug", subdomain)
    .eq("is_active", true)
    .single();

  if (error || !clinic) return null;

  // Cache the result
  TENANT_CACHE.set(cacheKey, { clinic, timestamp: Date.now() });

  return clinic;
}

/**
 * Tenant resolution middleware
 * Reads the Host header, extracts the subdomain (slug),
 * and looks up the matching active clinic.
 * Attaches `req.tenant` with the clinic object.
 *
 * A bare domain (localhost:5173, healibrate.com) is the PLATFORM homepage,
 * never a clinic: req.tenant stays null and downstream controllers reject
 * clinic-scoped operations. Clinics are only reachable via their slug
 * subdomain ({slug}.localhost:5173 in dev, {slug}.healibrate.com in prod).
 */
/**
 * The public host the patient actually visited. Behind a proxy (Vercel
 * rewrites → Render), req.headers.host is the BACKEND's host — the real
 * clinic subdomain arrives in x-forwarded-host.
 */
export function requestHost(req) {
  const forwarded = req.headers["x-forwarded-host"];
  const host = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || req.headers.host || "";
  return host;
}

export const resolveTenant = async (req, res, next) => {
  try {
    const host = requestHost(req);
    const parts = host.split(".");
    const subdomain = parts[0]?.toLowerCase();

    // Bare domain → platform site, no tenant
    if (!subdomain || parts.length < 2) {
      req.tenant = null;
      return next();
    }

    // Skip reserved subdomains
    if (RESERVED.has(subdomain)) {
      return res.status(404).json({
        success: false,
        message: "Reserved subdomain",
      });
    }

    // Look up clinic (uses cache)
    const clinic = await resolveTenantFromSubdomain(subdomain);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found or inactive",
      });
    }

    req.tenant = clinic;
    next();
  } catch (err) {
    console.error("Tenant resolution error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve clinic",
    });
  }
};

/**
 * Optional tenant resolution — does not 404 if clinic is not found.
 * Useful for endpoints that want to handle the missing-clinic case themselves.
 */
export const resolveTenantOptional = async (req, res, next) => {
  try {
    const host = requestHost(req);
    const parts = host.split(".");
    const subdomain = parts[0]?.toLowerCase();

    if (!subdomain || parts.length < 2 || RESERVED.has(subdomain)) {
      req.tenant = null;
      return next();
    }

    const clinic = await resolveTenantFromSubdomain(subdomain);
    req.tenant = clinic || null;
    next();
  } catch (err) {
    console.error("Optional tenant resolution error:", err);
    req.tenant = null;
    next();
  }
};

/**
 * Subscription enforcement middleware
 * Checks if the clinic's subscription/trial is still valid.
 * Must be used AFTER resolveTenant or any middleware that sets req.tenant.
 *
 * For authenticated admin/doctor routes, uses clinic_id from the JWT.
 */
// ── Early Access (free beta) ─────────────────────────────────
// While validating the product there are no payments: trial expiry and
// plan limits are suspended. Set BETA_MODE=false when the payment
// gateway ships to re-enable full enforcement. Clinic deactivation
// (is_active=false) still works in Early Access.
// Re-exported from the plan entitlements config (single source of truth).
export { EARLY_ACCESS } from "../config/plans.js";
import { EARLY_ACCESS } from "../config/plans.js";
import { planConfig } from "../config/plans.js";

// Subscription lookups run on EVERY authenticated request — cache them
// briefly so each request doesn't pay 2 extra DB roundtrips.
const SUBSCRIPTION_CACHE = new Map();
const SUBSCRIPTION_CACHE_TTL_MS = Number(process.env.SUBSCRIPTION_CACHE_TTL_MS || 60_000);

export function invalidateSubscriptionCache(clinicId) {
  if (clinicId) SUBSCRIPTION_CACHE.delete(clinicId);
  else SUBSCRIPTION_CACHE.clear();
}

async function loadClinicSubscription(clinicId) {
  const cached = SUBSCRIPTION_CACHE.get(clinicId);
  if (cached && Date.now() - cached.at < SUBSCRIPTION_CACHE_TTL_MS) {
    return cached;
  }

  const [{ data: clinic, error }, { data: subscription }] = await Promise.all([
    supabase
      .from("clinics")
      .select("id, name, subscription_plan, is_active")
      .eq("id", clinicId)
      .single(),
    supabase
      .from("subscriptions")
      .select("plan, status, ends_at")
      .eq("clinic_id", clinicId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .then((r) => ({ data: r.data?.[0] || null }), () => ({ data: null })),
  ]);

  const entry = { clinic: error ? null : clinic, subscription: subscription || null, at: Date.now() };
  SUBSCRIPTION_CACHE.set(clinicId, entry);
  return entry;
}

export const enforceSubscription = async (req, res, next) => {
  try {
    // Determine clinic from tenant middleware or JWT
    const clinicId = req.tenant?.id || req.admin?.clinic_id || req.doctor?.clinic_id;

    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: "No clinic context found",
      });
    }

    const { clinic, subscription } = await loadClinicSubscription(clinicId);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    // Billing language is for clinic staff only — patients on tenant
    // routes get a neutral message that never mentions plans/upgrades.
    const isStaff = !!(req.admin || req.doctor);
    const patientBlockedMessage =
      "Online booking is temporarily unavailable for this clinic. Please contact the clinic directly.";

    // Check if clinic is active
    if (!clinic.is_active) {
      return res.status(403).json({
        success: false,
        message: isStaff
          ? "This clinic is currently inactive. Contact Healibrate support."
          : patientBlockedMessage,
      });
    }

    // Early Access: subscription checks are suspended — clinics get full
    // free access while the platform is in beta.
    if (EARLY_ACCESS) {
      req.subscription = subscription;
      req.clinicPlan = "early_access";
      return next();
    }

    // Paid-from-signup: an active subscription is required. There is no
    // free plan and no trial — a clinic must pick and pay for a plan
    // before the portal or its public booking page work.
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: isStaff
          ? "Choose a plan to activate your clinic and continue."
          : patientBlockedMessage,
        subscription_required: true,
      });
    }

    // Active subscription that has passed its end date → expired.
    if (subscription.ends_at && new Date(subscription.ends_at) < new Date()) {
      return res.status(403).json({
        success: false,
        message: isStaff
          ? "Your subscription has expired. Renew to continue."
          : patientBlockedMessage,
        subscription_expired: true,
      });
    }

    // Attach subscription info for downstream use. The subscription row is
    // the source of truth for which plan's limits/features apply.
    req.subscription = subscription;
    req.clinicPlan = subscription.plan;

    next();
  } catch (err) {
    console.error("Subscription enforcement error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to verify subscription",
    });
  }
};

/**
 * Plan limit enforcement middleware — resource-aware.
 * Usage: enforcePlanLimits('doctors') on the add-doctor route,
 *        enforcePlanLimits('appointments') on the booking route.
 * Only the named resource's limit is checked — adding a doctor must not
 * be blocked by the appointment quota and booking an appointment must
 * not be blocked by the doctor quota.
 *
 * Limits come from config/plans.js — the single source of truth for
 * what each plan (Basic ₹99 / Growth ₹299 / Pro ₹499) includes.
 */
export const enforcePlanLimits = (resource) => async (req, res, next) => {
  try {
    // Early Access: no plan limits while the platform is free
    if (EARLY_ACCESS) {
      return next();
    }

    // Only enforce limits when creating new resources (POST)
    if (req.method !== 'POST') {
      return next();
    }

    const clinicId = req.tenant?.id || req.admin?.clinic_id || req.doctor?.clinic_id;

    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: "No clinic context found",
      });
    }

    const config = planConfig(req.clinicPlan);
    const { maxDoctors } = config;

    if (resource === "doctors" && maxDoctors !== Infinity) {
      const { count: doctorCount } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("is_active", true);

      if (doctorCount >= maxDoctors) {
        return res.status(403).json({
          success: false,
          message: `Your ${config.label} plan includes up to ${maxDoctors} doctor(s). Upgrade to add more.`,
          plan_limit_exceeded: true,
          limit: "doctors",
        });
      }
    }

    next();
  } catch (err) {
    console.error("Plan limits enforcement error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to verify plan limits",
    });
  }
};
