import crypto from "crypto"
import supabase from "../config/supabase.js"
import { normalizePlan } from "../config/plans.js"
import { invalidateSubscriptionCache } from "../middleware/tenant.js"
import { buildClinicUrl } from "../utils/clinicUrl.js"

/**
 * Dodo Payments integration (dodopayments.com) — Merchant of Record,
 * handles cards/UPI + tax for Indian SaaS.
 *
 * .env:
 *   DODO_API_KEY=...                     (Dashboard → Developer → API keys)
 *   DODO_WEBHOOK_SECRET=whsec_...        (Dashboard → Developer → Webhooks)
 *   DODO_API_BASE=https://test.dodopayments.com   (live: https://live.dodopayments.com)
 *   DODO_PRODUCT_BASIC / DODO_PRODUCT_GROWTH / DODO_PRODUCT_PRO
 *     — product ids of the three subscription products created in the dashboard
 */

// Trim stray whitespace/commas/slashes — a pasted trailing character in
// .env otherwise produces an invalid hostname and a bare "fetch failed"
const API_BASE = (process.env.DODO_API_BASE || "https://test.dodopayments.com")
  .trim()
  .replace(/[,/\s]+$/, "")

function productIdFor(plan) {
  return {
    basic: process.env.DODO_PRODUCT_BASIC,
    growth: process.env.DODO_PRODUCT_GROWTH,
    pro: process.env.DODO_PRODUCT_PRO,
  }[plan]
}

export function dodoConfigured() {
  return !!(process.env.DODO_API_KEY && process.env.DODO_WEBHOOK_SECRET)
}

/**
 * Create a subscription checkout for a clinic and return the payment URL.
 * The clinic_id and plan ride along as metadata and come back in webhooks.
 */
export async function createSubscriptionCheckout({ plan, clinic, adminEmail, returnUrl: returnUrlOverride }) {
  const normalized = normalizePlan(plan)
  const productId = productIdFor(normalized)
  if (!productId) {
    throw new Error(`No Dodo product configured for the ${normalized} plan (set DODO_PRODUCT_${normalized.toUpperCase()})`)
  }

  // Return the admin to the SAME origin they started checkout from (validated
  // by the caller), so their session token — which is per-origin — is still
  // present when they land back. Falls back to the clinic subdomain.
  const returnUrl = returnUrlOverride
    || (clinic?.slug
      ? buildClinicUrl(clinic.slug, "/admin/billing?status=success")
      : `${process.env.FRONTEND_URL || ""}/admin/billing?status=success`)

  const res = await fetch(`${API_BASE}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DODO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      quantity: 1,
      payment_link: true,
      return_url: returnUrl,
      customer: {
        email: adminEmail,
        name: clinic?.name || "Clinic admin",
      },
      billing: {
        country: "IN",
        state: "NA",
        city: "NA",
        street: "NA",
        zipcode: "000000",
      },
      metadata: {
        clinic_id: clinic.id,
        plan: normalized,
      },
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Dodo ${res.status}: ${body.message || body.error || "checkout creation failed"}`)
  }

  const url = body.payment_link || body.payment_link_url || body.checkout_url
  if (!url) throw new Error("Dodo response contained no payment link")
  return { url, subscription_id: body.subscription_id || null }
}

/**
 * Fetch a single subscription from Dodo by id. Used by verify-on-return
 * to confirm a payment server-side when the webhook hasn't arrived yet
 * (e.g. on localhost, where Dodo can't reach the dev machine).
 */
export async function fetchSubscription(subscriptionId) {
  const res = await fetch(`${API_BASE}/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${process.env.DODO_API_KEY}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Dodo ${res.status}: ${body.message || body.error || "fetch subscription failed"}`)
  }
  return body
}

// Dodo subscription statuses that mean the clinic has paid and is entitled.
const ACTIVE_SUB_STATUSES = new Set(["active", "activated", "renewed", "trialing", "on_trial"])

/**
 * Confirm a subscription with Dodo and, if it's active, apply the same
 * plan activation the webhook would. Safe to call repeatedly (idempotent
 * via the subscription upsert). Returns { active, plan, status }.
 *
 * `expectedClinicId` guards against activating another clinic's plan if a
 * caller passes a subscription id that isn't theirs.
 */
export async function verifyAndActivateSubscription(subscriptionId, expectedClinicId) {
  const sub = await fetchSubscription(subscriptionId)
  const status = String(sub.status || "").toLowerCase()
  const clinicId = sub.metadata?.clinic_id || expectedClinicId

  if (expectedClinicId && clinicId && clinicId !== expectedClinicId) {
    throw new Error("Subscription does not belong to this clinic")
  }
  if (!ACTIVE_SUB_STATUSES.has(status)) {
    return { active: false, status }
  }

  const plan = normalizePlan(sub.metadata?.plan)
  await activateClinicSubscription({
    clinicId,
    plan,
    providerSubId: sub.subscription_id || sub.id || subscriptionId,
    nextBillingDate: sub.next_billing_date || null,
    eventType: `verify:${status}`,
  })
  return { active: true, plan, status }
}

/**
 * Apply an activated subscription to our records: upgrade the clinic's
 * plan, write the active subscription row, and clear the enforcement cache.
 * Shared by the webhook handler and verify-on-return so both paths behave
 * identically, and idempotent so repeated deliveries are harmless.
 *
 * We deliberately do NOT use `.upsert({ onConflict })` here: the
 * provider_subscription_id unique index is *partial* (WHERE ... IS NOT NULL),
 * and PostgREST can't target a partial index as an ON CONFLICT arbiter
 * ("no unique or exclusion constraint matching the ON CONFLICT
 * specification"). We find-then-update/insert explicitly instead.
 */
function isUniqueViolation(error) {
  return error?.code === "23505" || /duplicate key|unique constraint/i.test(error?.message || "")
}

/**
 * Write the active subscription row, safe against the webhook + verify-on-return
 * race (both can fire for the same payment near-simultaneously):
 *   - update the existing row for this provider_subscription_id if present;
 *   - otherwise insert; and if a concurrent activation inserted the same
 *     provider_subscription_id a moment earlier (unique-index violation),
 *     recover by updating that row instead of erroring.
 * Uses limit(1)+[0] rather than .single() so a stray duplicate never throws.
 */
async function writeActiveSubscriptionRow(record, providerSubId) {
  const findId = async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("provider_subscription_id", providerSubId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .then((r) => r, () => ({ data: null }))
    return data?.[0] || null
  }

  if (providerSubId) {
    const existing = await findId()
    if (existing) return supabase.from("subscriptions").update(record).eq("id", existing.id)
  }

  const inserted = await supabase.from("subscriptions").insert(record)
  if (inserted.error && providerSubId && isUniqueViolation(inserted.error)) {
    const dup = await findId()
    if (dup) return supabase.from("subscriptions").update(record).eq("id", dup.id)
  }
  return inserted
}

export async function activateClinicSubscription({ clinicId, plan, providerSubId, nextBillingDate, eventType }) {
  const nowIso = new Date().toISOString()

  // 1. Expire any *other* active subscription for this clinic, so the
  //    "one active per clinic" invariant holds before we activate this one.
  let expire = supabase
    .from("subscriptions")
    .update({ status: "expired", updated_at: nowIso })
    .eq("clinic_id", clinicId)
    .eq("status", "active")
  if (providerSubId) expire = expire.neq("provider_subscription_id", providerSubId)
  await expire.then((r) => r, () => {})

  // 2. Write THIS subscription as active — update the existing row for this
  //    provider_subscription_id if present, otherwise insert a new one.
  //    This is the source of truth for "is the clinic paid", so it must
  //    succeed BEFORE we upgrade the clinic's plan — otherwise a failed
  //    write would leave the clinic plan set but no active subscription
  //    (branding unlocked, yet billing says "no active plan").
  const record = {
    clinic_id: clinicId,
    plan,
    status: "active",
    provider: "dodo",
    provider_subscription_id: providerSubId,
    next_billing_date: nextBillingDate,
    metadata: { event_type: eventType },
    updated_at: nowIso,
  }

  const { error } = await writeActiveSubscriptionRow(record, providerSubId)

  if (error) {
    console.error(`[Dodo] subscription write FAILED for clinic ${clinicId}:`, error.message)
    throw new Error(`subscription write failed: ${error.message}`)
  }

  // 3. Only now upgrade the clinic's plan — the active row exists, so the
  //    two never disagree.
  await supabase.from("clinics").update({ subscription_plan: plan }).eq("id", clinicId)

  invalidateSubscriptionCache(clinicId)
  console.log(`[Dodo] Clinic ${clinicId} → ${plan} active (${eventType})`)
}

/**
 * Verify a Dodo webhook (Standard Webhooks spec):
 * HMAC-SHA256 over `${id}.${timestamp}.${rawBody}` with the base64 part
 * of the whsec_ secret; signature header holds "v1,<base64>" entries.
 */
export function verifyDodoSignature(rawBody, headers) {
  const secret = process.env.DODO_WEBHOOK_SECRET
  if (!secret) {
    console.warn("[Dodo sig] no DODO_WEBHOOK_SECRET configured")
    return false
  }

  const id = headers["webhook-id"]
  const timestamp = headers["webhook-timestamp"]
  const signatureHeader = headers["webhook-signature"]
  if (!id || !timestamp || !signatureHeader) {
    console.warn("[Dodo sig] missing signature headers", { id: !!id, timestamp: !!timestamp, signature: !!signatureHeader })
    return false
  }

  // Reject stale deliveries (>5 min) to prevent replay
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > 300) {
    console.warn("[Dodo sig] timestamp rejected (stale or unparseable)", { timestamp, ageSeconds: age })
    return false
  }

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const signedContent = `${id}.${timestamp}.${rawBody}`
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64")

  const matched = signatureHeader.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    } catch {
      return false
    }
  })
  if (!matched) {
    console.warn("[Dodo sig] HMAC mismatch — check DODO_WEBHOOK_SECRET matches the endpoint's secret", {
      expectedPrefix: expected.slice(0, 8),
      headerPrefix: signatureHeader.slice(0, 24),
    })
  }
  return matched
}

/**
 * Apply a webhook event to our records. Activation events upgrade the
 * clinic's plan; termination events mark the subscription inactive
 * (the clinic then has no active subscription and is gated until it
 * subscribes again).
 */
export async function handleDodoEvent(event) {
  const type = event.type || event.event_type || ""
  const data = event.data || {}
  // Dodo echoes the metadata we set at checkout on the subscription object.
  // Some payment-level events may nest it elsewhere, so check known spots.
  const metadata = data.metadata || data.subscription?.metadata || event.metadata || {}
  const clinicId = metadata.clinic_id
  const plan = normalizePlan(metadata.plan)
  const providerSubId = data.subscription_id || data.id || data.subscription?.subscription_id || null

  if (!clinicId) {
    // Keep the payload here — it's the one case where we genuinely need to
    // see where clinic_id landed, and it only fires on a misconfigured event.
    console.warn(`[Dodo] ${type}: no clinic_id in metadata — ignoring`, JSON.stringify(event))
    return { handled: false, reason: "no_clinic_id" }
  }

  const ACTIVATE = ["subscription.active", "subscription.activated", "subscription.renewed", "payment.succeeded"]
  const TERMINATE = ["subscription.cancelled", "subscription.expired", "subscription.revoked", "subscription.failed"]
  const HOLD = ["subscription.on_hold", "subscription.paused", "payment.failed"]

  if (ACTIVATE.includes(type)) {
    await activateClinicSubscription({
      clinicId,
      plan,
      providerSubId,
      nextBillingDate: data.next_billing_date || null,
      eventType: type,
    })
    return { handled: true }
  }

  if (TERMINATE.includes(type) || HOLD.includes(type)) {
    const status = TERMINATE.includes(type) ? "cancelled" : "on_hold"
    // Scope to the specific subscription when Dodo gives us its id, so we
    // never disturb an unrelated row for the same clinic. Without an id, fall
    // back to the clinic's active subscription only.
    let q = supabase.from("subscriptions")
      .update({ status, cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("clinic_id", clinicId)
    q = providerSubId ? q.eq("provider_subscription_id", providerSubId) : q.eq("status", "active")
    await q.then((r) => r, () => {})
    invalidateSubscriptionCache(clinicId)
    console.log(`[Dodo] Clinic ${clinicId} subscription → ${status} (${type}${providerSubId ? `, ${providerSubId}` : ""})`)
    return { handled: true }
  }

  console.log(`[Dodo] Unhandled event type: ${type}`)
  return { handled: false }
}
