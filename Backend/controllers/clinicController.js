import supabase from "../config/supabase.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { buildClinicUrl } from "../utils/clinicUrl.js";
import { invalidateTenantCache, EARLY_ACCESS, requestHost } from "../middleware/tenant.js";
import { entitlementsFor } from "../config/plans.js";

// Slug validation: lowercase a-z, 0-9, hyphens only, 3-50 chars
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{2,49}$/;

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 46); // leave room for a uniqueness suffix
}

async function generateUniqueSlug(name) {
  const base = slugify(name) || "clinic";
  let candidate = base.length >= 3 ? base : `${base}-clinic`;
  for (let i = 2; ; i++) {
    const { data } = await supabase
      .from("clinics")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i}`;
  }
}

/**
 * Clinic self-registration
 * Creates a clinic row + linked admin row in an UNPAID state
 * (subscription_plan = null, no trial). The clinic is inactive for booking
 * until the admin picks and pays for a plan on the billing page.
 * Slug is auto-generated from the clinic name when not provided.
 */
export const registerClinic = async (req, res) => {
  try {
    const { name, ownerName, ownerEmail, password, address, specialization } =
      req.body;
    let { slug } = req.body;

    // --- Validation ---
    if (!name || !ownerEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Clinic name, owner email, and password are required.",
      });
    }

    if (slug && !SLUG_REGEX.test(slug)) {
      return res.status(400).json({
        success: false,
        message:
          "Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only, and start with a letter or number.",
      });
    }

    if (!slug) {
      slug = await generateUniqueSlug(name);
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    // Check slug uniqueness
    const { data: existingClinic } = await supabase
      .from("clinics")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingClinic) {
      return res.status(409).json({
        success: false,
        message: "This slug is already taken. Choose a different one.",
      });
    }

    // Check email uniqueness (owner email must be unique across admins)
    const { data: existingAdmin } = await supabase
      .from("admins")
      .select("id")
      .eq("email", ownerEmail)
      .single();

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "An admin with this email already exists.",
      });
    }

    // --- Create clinic ---
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .insert({
        name,
        slug,
        owner_email: ownerEmail,
        address: address || null,
        specialization: specialization || null,
        is_active: true,
        // Unpaid until the admin subscribes — no free plan, no trial.
        subscription_plan: null,
      })
      .select("*")
      .single();

    if (clinicError || !clinic) {
      console.error("Clinic creation error:", clinicError);
      return res.status(500).json({
        success: false,
        message: "Failed to create clinic.",
      });
    }

    // --- Create admin ---
    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .insert({
        full_name: ownerName || name,
        email: ownerEmail,
        password: hashedPassword,
        clinic_id: clinic.id,
      })
      .select("id, full_name, email, clinic_id")
      .single();

    if (adminError || !admin) {
      console.error("Admin creation error:", adminError);
      // Note: clinic row already exists but has no admin — this is a
      // degraded state. In production, wrap in a transaction.
      return res.status(500).json({
        success: false,
        message: "Clinic created but admin account failed. Contact support.",
      });
    }

    // --- Issue admin JWT ---
    const token = jwt.sign(
      { id: admin.id, role: "admin", email: admin.email, clinic_id: clinic.id },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    const subdomainUrl = buildClinicUrl(slug);

    return res.status(201).json({
      success: true,
      message: "Clinic registered successfully.",
      token,
      clinic: {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        address: clinic.address,
        specialization: clinic.specialization,
        is_active: clinic.is_active,
        subscription_plan: clinic.subscription_plan,
        subscription_active: false,
        subdomain_url: subdomainUrl,
      },
      admin: {
        id: admin.id,
        fullName: admin.full_name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("registerClinic error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * Update clinic branding — admin only
 * Body: { clinic_name, primary_color, logo_url, tagline }
 */
export const updateBranding = async (req, res) => {
  try {
    const clinicId = req.admin.clinic_id
    const { clinic_name, primary_color, logo_url, tagline, badges } = req.body

    if (!clinic_name && !primary_color && !logo_url && !tagline && badges === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one branding field is required.',
      })
    }

    if (primary_color && !/^#[0-9a-fA-F]{6}$/.test(primary_color)) {
      return res.status(400).json({
        success: false,
        message: 'Primary color must be a hex color like #1d7f72.',
      })
    }

    // Badges: clinic-defined credentials shown on the booking page
    // (e.g. "NABH Accredited"). Up to 4 short text labels.
    let cleanBadges
    if (badges !== undefined) {
      if (!Array.isArray(badges)) {
        return res.status(400).json({
          success: false,
          message: 'badges must be an array of short text labels.',
        })
      }
      cleanBadges = badges
        .map((b) => String(b).trim())
        .filter(Boolean)
        .slice(0, 4)
      if (cleanBadges.some((b) => b.length > 48)) {
        return res.status(400).json({
          success: false,
          message: 'Each badge must be 48 characters or fewer.',
        })
      }
    }

    // Fetch current branding
    const { data: currentClinic } = await supabase
      .from('clinics')
      .select('branding')
      .eq('id', clinicId)
      .single()

    if (!currentClinic) {
      return res.status(404).json({
        success: false,
        message: 'Clinic not found.',
      })
    }

    // Merge with existing branding (or create new object)
    const currentBranding = currentClinic.branding || {}
    const updatedBranding = {
      ...currentBranding,
      ...(clinic_name !== undefined && { clinic_name }),
      ...(primary_color !== undefined && { primary_color }),
      ...(logo_url !== undefined && { logo_url }),
      ...(tagline !== undefined && { tagline }),
      ...(cleanBadges !== undefined && { badges: cleanBadges }),
    }

    // Remove null/undefined values
    Object.keys(updatedBranding).forEach(key => {
      if (updatedBranding[key] === null || updatedBranding[key] === undefined) {
        delete updatedBranding[key]
      }
    })

    const { data: updatedClinic, error } = await supabase
      .from('clinics')
      .update({ branding: updatedBranding })
      .eq('id', clinicId)
      .select('id, name, slug, branding')
      .single()

    if (error || !updatedClinic) {
      console.error('updateBranding error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to update branding.',
      })
    }

    // Make the change visible on the public booking page immediately
    invalidateTenantCache(updatedClinic.slug)

    return res.status(200).json({
      success: true,
      message: 'Branding updated successfully.',
      data: updatedClinic,
    })
  } catch (error) {
    console.error('updateBranding error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    })
  }
}

/**
 * Update clinic settings (operating hours) — admin only.
 * Body: { operating_hours: { days: ["Mon", ...], open: "09:00", close: "18:00" } }
 */
export const updateClinicSettings = async (req, res) => {
  try {
    const clinicId = req.admin.clinic_id
    const { operating_hours } = req.body

    if (!operating_hours) {
      return res.status(400).json({
        success: false,
        message: 'operating_hours is required.',
      })
    }

    const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/
    const { days, open, close } = operating_hours

    if (
      !Array.isArray(days) ||
      days.length === 0 ||
      !days.every((d) => VALID_DAYS.includes(d)) ||
      !TIME_REGEX.test(open) ||
      !TIME_REGEX.test(close) ||
      open >= close
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide valid working days and an opening time earlier than the closing time.',
      })
    }

    const { data: clinic, error } = await supabase
      .from('clinics')
      .update({ operating_hours: { days, open, close } })
      .eq('id', clinicId)
      .select('id, name, slug, operating_hours')
      .single()

    if (error || !clinic) {
      console.error('updateClinicSettings error:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to update clinic settings.',
      })
    }

    // Make the change visible on the public booking page immediately
    invalidateTenantCache(clinic.slug)

    return res.status(200).json({
      success: true,
      message: 'Clinic settings updated.',
      data: clinic,
    })
  } catch (error) {
    console.error('updateClinicSettings error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    })
  }
}

/**
 * Get the logged-in admin's clinic — clinic_id sourced from the JWT.
 * Returns the env-aware booking URL for dashboard display.
 */
export const getMyClinic = async (req, res) => {
  try {
    const clinicId = req.admin.clinic_id

    // select("*") + whitelist below so a not-yet-migrated column
    // (e.g. operating_hours) can never break this endpoint
    const [{ data: clinic, error }, { data: activeSub }] = await Promise.all([
      supabase.from("clinics").select("*").eq("id", clinicId).single(),
      supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .then((r) => ({ data: r.data?.[0] || null }), () => ({ data: null })),
    ])

    if (error || !clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found.",
      })
    }

    // A clinic is "paid" when Early Access is on, or it has an active
    // subscription. The billing page uses this to show the current plan
    // vs. a "choose a plan" prompt.
    const subscriptionActive = EARLY_ACCESS || !!activeSub

    // The plan shown to the admin. Prefer the active subscription's plan;
    // during early access fall back to the clinic's stored plan for the label.
    const activePlan = activeSub?.plan || (EARLY_ACCESS ? clinic.subscription_plan : null)

    // Entitlements MUST derive from an actually-active subscription (or early
    // access), never from a stale clinics.subscription_plan. Otherwise a
    // clinic whose plan column was set but has no active subscription would
    // wrongly unlock paid features (e.g. branding).
    const entitlementPlan = subscriptionActive ? activePlan : null

    return res.status(200).json({
      success: true,
      data: {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        address: clinic.address,
        specialization: clinic.specialization,
        branding: clinic.branding || null,
        operating_hours: clinic.operating_hours ?? null,
        is_active: clinic.is_active,
        subscription_plan: subscriptionActive ? activePlan : null,
        subscription_active: subscriptionActive,
        early_access: EARLY_ACCESS,
        // Plan entitlements — the frontend gates features on `features.*`.
        // Only meaningful once subscription_active is true.
        entitlements: entitlementsFor({ subscription_plan: entitlementPlan }),
        subdomain_url: buildClinicUrl(clinic.slug),
      },
    })
  } catch (error) {
    console.error("getMyClinic error:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    })
  }
}

/**
 * Resolve clinic from Host header — public, no auth required.
 * Returns clinic info for the frontend to apply branding.
 */
export const resolveClinic = async (req, res) => {
  try {
    // If tenant middleware already resolved it, use that
    if (req.tenant) {
      return res.status(200).json({
        success: true,
        data: {
          id: req.tenant.id,
          name: req.tenant.name,
          slug: req.tenant.slug,
          branding: req.tenant.branding || null,
          address: req.tenant.address || null,
          specialization: req.tenant.specialization || null,
          operating_hours: req.tenant.operating_hours || null,
          is_active: req.tenant.is_active,
        },
      });
    }

    // Otherwise, resolve manually from Host header
    const host = requestHost(req);
    const parts = host.split(".");
    const subdomain = parts[0]?.toLowerCase();

    if (!subdomain || parts.length < 2) {
      return res.status(400).json({
        success: false,
        message: "No subdomain detected",
      });
    }

    // select("*") + whitelist so a not-yet-migrated column can't break
    // the public endpoint, and internal fields never leak to patients
    const { data: clinic, error } = await supabase
      .from("clinics")
      .select("*")
      .eq("slug", subdomain)
      .eq("is_active", true)
      .single();

    if (error || !clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        branding: clinic.branding || null,
        address: clinic.address || null,
        specialization: clinic.specialization || null,
        operating_hours: clinic.operating_hours ?? null,
        is_active: clinic.is_active,
      },
    });
  } catch (error) {
    console.error("resolveClinic error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
