import { DodoConfigurationError } from "../config/dodo.js"
import supabase from "../config/supabase.js"
import { dodoConfigured, createSubscriptionCheckout, verifyDodoSignature, handleDodoEvent, verifyAndActivateSubscription } from "../services/dodoPayments.js"
import { CheckoutError, checkoutPlan } from "../services/dodoCheckout.js"
import { randomUUID } from "node:crypto"
import { buildClinicUrl } from "../utils/clinicUrl.js"

/**
 * Build the post-checkout return URL. Marked `from=checkout` rather than
 * `status=success`: the provider appends its OWN status params, and a
 * hardcoded "success" both masks them and would be a lie after a failed
 * payment. What actually happened is confirmed server-side, never from the URL.
 *
 * The admin must land back on the SAME
 * origin they started from (their session token is per-origin), so we honor
 * the origin the frontend reports — but only if it's one we trust (the
 * clinic's own subdomain or the platform host), to avoid an open redirect.
 */
function resolveReturnUrl(clinic, requestedOrigin) {
  const allowed = new Set()
  try { allowed.add(new URL(buildClinicUrl(clinic.slug, "/")).origin) } catch { /* ignore */ }
  if (process.env.FRONTEND_URL) {
    try { allowed.add(new URL(process.env.FRONTEND_URL).origin) } catch { /* ignore */ }
  }

  if (requestedOrigin) {
    try {
      const origin = new URL(requestedOrigin).origin
      if (allowed.has(origin)) return `${origin}/admin/billing?from=checkout`
    } catch { /* fall through to default */ }
  }
  return buildClinicUrl(clinic.slug, "/admin/billing?from=checkout")
}

/**
 * POST /api/admin/billing/checkout — start a Dodo subscription checkout
 * for the admin's clinic. Returns the hosted payment page URL.
 */
export const createCheckout = async (req, res) => {
  try {
    const { plan, returnOrigin } = req.body
    if (!checkoutPlan(plan)) {
      return res.status(400).json({ success: false, message: "Choose a valid plan: basic, growth, or pro." })
    }

    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name, slug, subscription_plan")
      .eq("id", req.admin.clinic_id)
      .single()

    if (clinicError && clinicError.code !== 'PGRST116') {
      throw new CheckoutError('billing_lookup_failed', 'Your clinic details could not be loaded. Please try again shortly.', 503)
    }
    if (!clinic) {
      return res.status(404).json({ success: false, message: "Clinic not found." })
    }

    const { url } = await createSubscriptionCheckout({
      plan,
      clinic,
      adminEmail: req.admin.email,
      returnUrl: resolveReturnUrl(clinic, returnOrigin),
    })

    return res.status(200).json({ success: true, url })
  } catch (error) {
    const reference = randomUUID()
    const known = error instanceof CheckoutError || error instanceof DodoConfigurationError
    console.error("createCheckout error:", { reference, code: known ? error.code : 'checkout_failed', ...(error.diagnostics || {}) })
    return res.status(known ? error.status : 502).json({
      success: false,
      code: known ? error.code : 'checkout_failed',
      reference,
      message: known ? error.message : "Checkout could not be opened. Please try again or contact platform support with the reference below.",
    })
  }
}

/**
 * POST /api/admin/billing/verify — confirm a checkout server-side.
 * Called when the admin returns from Dodo (?status=success&subscription_id=…).
 * Fetches the subscription from Dodo and activates the plan if it's paid,
 * so the plan reflects immediately even when the webhook hasn't arrived
 * (localhost) or is delayed. Idempotent with the webhook path.
 */
export const verifySubscription = async (req, res) => {
  try {
    if (!dodoConfigured()) {
      return res.status(503).json({
        success: false,
        message: "Payments aren't enabled yet — contact support to upgrade your plan.",
      })
    }

    const { subscription_id } = req.body
    if (!subscription_id) {
      return res.status(400).json({ success: false, message: "Missing subscription reference." })
    }

    const result = await verifyAndActivateSubscription(subscription_id, req.admin.clinic_id)

    if (result.active) {
      return res.status(200).json({ success: true, active: true, plan: result.plan })
    }
    // Payment not confirmed yet — the webhook may still land shortly.
    return res.status(200).json({ success: true, active: false, status: result.status })
  } catch (error) {
    console.error("verifySubscription error:", error.message)
    return res.status(502).json({
      success: false,
      message: "Couldn't confirm your payment yet. If you were charged, it will activate shortly.",
    })
  }
}

/**
 * GET /api/admin/billing/history — the clinic's payment ledger.
 * Lets an admin confirm at any time whether a payment succeeded, rather
 * than relying on the transient post-checkout banner or the provider's
 * receipt email.
 */
export const getBillingHistory = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("id, plan, amount, currency, status, paid_at, receipt_url")
      .eq("clinic_id", req.admin.clinic_id)
      .order("paid_at", { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    return res.status(200).json({ success: true, data: data || [] })
  } catch (error) {
    console.error("getBillingHistory error:", error.message)
    return res.status(500).json({
      success: false,
      message: "Couldn't load your payment history. Please try again shortly.",
    })
  }
}

/**
 * POST /api/webhooks/dodo — Dodo webhook receiver.
 * Signature-verified against the raw body; always 2xx on handled events
 * so Dodo doesn't retry forever.
 */
export const dodoWebhook = async (req, res) => {
  try {
    const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body)

    if (!verifyDodoSignature(rawBody, req.headers)) {
      console.warn("[Dodo webhook] signature verification failed — returning 401")
      return res.status(401).json({ success: false, message: "Invalid signature" })
    }

    await handleDodoEvent(req.body)
    return res.status(200).json({ received: true })
  } catch (error) {
    console.error("[Dodo webhook] error:", error)
    return res.status(500).json({ success: false })
  }
}
