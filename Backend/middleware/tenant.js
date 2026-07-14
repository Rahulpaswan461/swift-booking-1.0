import supabase from "../config/supabase.js";

// Reserved subdomains that should NOT be treated as clinic slugs
const RESERVED = new Set(["www", "medibook", "api", "admin", "app", "portal"]);

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
 * A bare domain (localhost:5173, medibook.in) is the PLATFORM homepage,
 * never a clinic: req.tenant stays null and downstream controllers reject
 * clinic-scoped operations. Clinics are only reachable via their slug
 * subdomain ({slug}.localhost:5173 in dev, {slug}.medibook.in in prod).
 */
export const resolveTenant = async (req, res, next) => {
  try {
    const host = req.headers.host || "";
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
    const host = req.headers.host || "";
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
export const EARLY_ACCESS = process.env.BETA_MODE !== "false";

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
      .select("id, name, subscription_plan, trial_ends_at, is_active")
      .eq("id", clinicId)
      .single(),
    supabase
      .from("subscriptions")
      .select("plan, status, ends_at")
      .eq("clinic_id", clinicId)
      .eq("status", "active")
      .single()
      .then((r) => r, () => ({ data: null })),
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
          ? "This clinic is currently inactive. Contact Medibook support."
          : patientBlockedMessage,
      });
    }

    // Early Access: everything below (trial expiry, subscription checks)
    // is suspended — clinics get full free access.
    if (EARLY_ACCESS) {
      req.subscription = subscription;
      req.clinicPlan = "early_access";
      return next();
    }

    // Check trial expiration for free plan
    if (
      clinic.subscription_plan === "free" &&
      clinic.trial_ends_at &&
      new Date(clinic.trial_ends_at) < new Date()
    ) {
      return res.status(403).json({
        success: false,
        message: isStaff
          ? "Your free trial has expired. Upgrade to a paid plan to continue."
          : patientBlockedMessage,
        trial_expired: true,
      });
    }

    // Check active subscription for all plans (loaded alongside the clinic)
    if (!subscription) {
      // No active subscription and trial expired → blocked
      if (
        clinic.trial_ends_at &&
        new Date(clinic.trial_ends_at) < new Date()
      ) {
        return res.status(403).json({
          success: false,
          message: isStaff
            ? "No active subscription. Upgrade to continue using the platform."
            : patientBlockedMessage,
          subscription_required: true,
        });
      }
    } else if (subscription.ends_at && new Date(subscription.ends_at) < new Date()) {
      // Subscription expired
      return res.status(403).json({
        success: false,
        message: isStaff
          ? "Your subscription has expired. Renew to continue."
          : patientBlockedMessage,
        subscription_expired: true,
      });
    }

    // Attach subscription info for downstream use
    req.subscription = subscription;
    req.clinicPlan = clinic.subscription_plan;

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
 * Free plan: 1 doctor, 50 appointments/month
 * Pro plan: 5 doctors, unlimited appointments
 * Enterprise: unlimited everything
 */
const PLAN_LIMITS = {
  free: { maxDoctors: 1, maxAppointmentsPerMonth: 50 },
  pro: { maxDoctors: 5, maxAppointmentsPerMonth: Infinity },
  enterprise: { maxDoctors: Infinity, maxAppointmentsPerMonth: Infinity },
};

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
    const plan = req.clinicPlan || "free";

    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: "No clinic context found",
      });
    }

    const { maxDoctors, maxAppointmentsPerMonth } = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    if (resource === "doctors") {
      const { count: doctorCount } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("is_active", true);

      if (doctorCount >= maxDoctors) {
        return res.status(403).json({
          success: false,
          message: `Your ${plan} plan allows up to ${maxDoctors} doctor(s). Upgrade to add more.`,
          plan_limit_exceeded: true,
          limit: "doctors",
        });
      }
    }

    if (resource === "appointments") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { count: appointmentCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);

      if (appointmentCount >= maxAppointmentsPerMonth) {
        // This limit surfaces on the PATIENT booking flow — never mention
        // the clinic's billing/plan to patients.
        return res.status(403).json({
          success: false,
          message: "This clinic can't accept new online bookings right now. Please contact the clinic directly.",
          plan_limit_exceeded: true,
          limit: "appointments",
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
