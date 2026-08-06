import crypto from "crypto"
import bcrypt from "bcrypt"
import supabase from "../config/supabase.js"
import { sendPasswordResetEmail } from "./emailService.js"

/**
 * Password reset for clinic staff (admins and doctors).
 *
 * The flow is deliberately the same for both roles — only the table and the
 * owning column differ, so the mechanism lives here once instead of being
 * copy-pasted per role. Adding a third staff role is a one-line change to ROLES.
 *
 * Safety properties, all enforced below:
 *   - the code is stored ONLY as a SHA-256 hash (a table dump is useless)
 *   - it expires (PASSWORD_RESET_TTL_MINUTES, default 1)
 *   - it is single-use (used_at)
 *   - wrong guesses are capped (MAX_ATTEMPTS) — a 6-digit code needs this
 *   - requests are throttled per email (MAX_REQUESTS_PER_WINDOW)
 *   - callers never learn whether an account exists (no enumeration)
 */

// `columns` differs per role because the tables do: only `doctors` has an
// is_active flag (selecting a non-existent column fails the whole query).
const ROLES = {
  admin: {
    table: "admins",
    idColumn: "admin_id",
    columns: "id, email, full_name, clinic_id",
  },
  doctor: {
    table: "doctors",
    idColumn: "doctor_id",
    columns: "id, email, full_name, clinic_id, is_active",
  },
}

// A 1-minute window is tight for an email round-trip, so this is env-tunable
// without a code change — same pattern as the tenant/subscription cache TTLs.
const TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 1)
const MAX_ATTEMPTS = 5
const MAX_REQUESTS_PER_WINDOW = 3
const REQUEST_WINDOW_MINUTES = 15
const MIN_PASSWORD_LENGTH = 8

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString()
}

// Same hashing the patient OTP flow uses — see controllers/authController.js.
function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex")
}

function roleConfig(role) {
  const config = ROLES[role]
  if (!config) throw new Error(`Unknown password-reset role: ${role}`)
  return config
}

/**
 * Look up the staff member a reset is for. Returns null when absent.
 *
 * Matched case-insensitively: stored addresses are mixed-case (e.g.
 * "hexaHealthCare@gmail.com") and nobody recalls the exact casing of an email
 * they are trying to recover. `%` and `_` are escaped first — ilike would
 * otherwise treat them as wildcards, and an address like `john_doe@x.com`
 * could match a different account.
 */
async function findUser(role, email) {
  const { table, columns } = roleConfig(role)
  const pattern = email.replace(/[\\%_]/g, (char) => `\\${char}`)

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .ilike("email", pattern)
    .limit(1)
    .then((r) => r, (err) => ({ data: null, error: err }))

  // A malformed query must not masquerade as "no such user" — that once hid a
  // missing-column bug behind a silent null.
  if (error) {
    console.error(`[password-reset] ${role} lookup failed:`, error.message)
    return null
  }
  return data?.[0] || null
}

/**
 * Too many codes requested for this email recently? Prevents using the
 * endpoint as a mail bomb and slows brute-force attempts.
 */
async function isThrottled(email) {
  const since = new Date(Date.now() - REQUEST_WINDOW_MINUTES * 60_000).toISOString()
  const { count } = await supabase
    .from("password_resets")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since)
    .then((r) => r, () => ({ count: 0 }))
  return (count || 0) >= MAX_REQUESTS_PER_WINDOW
}

/**
 * Step 1 — issue a reset code.
 *
 * Always resolves the same way regardless of whether the account exists, is
 * inactive, or is throttled: callers must not be able to probe for valid
 * emails. Real failures are logged server-side.
 */
export async function requestReset({ role, email }) {
  const normalizedEmail = String(email || "").trim().toLowerCase()
  if (!normalizedEmail) return

  const user = await findUser(role, normalizedEmail)

  // Unknown account, deactivated doctor, or throttled — stop silently.
  if (!user || user.is_active === false) return
  if (await isThrottled(normalizedEmail)) {
    console.warn(`[password-reset] throttled: ${role} ${normalizedEmail}`)
    return
  }

  const otp = generateOtp()
  const { idColumn } = roleConfig(role)

  const { error } = await supabase.from("password_resets").insert({
    [idColumn]: user.id,
    email: normalizedEmail,
    otp_hash: hashOtp(otp),
    expires_at: new Date(Date.now() + TTL_MINUTES * 60_000).toISOString(),
  })

  if (error) {
    console.error(`[password-reset] could not store code for ${role} ${normalizedEmail}:`, error.message)
    return
  }

  // Branded, clinic-styled email. A send failure must not reveal anything to
  // the caller, so it is logged rather than surfaced.
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, slug, branding")
    .eq("id", user.clinic_id)
    .single()
    .then((r) => r, () => ({ data: null }))

  await sendPasswordResetEmail({
    to: normalizedEmail,
    otp,
    clinic,
    recipientName: user.full_name,
    ttlMinutes: TTL_MINUTES,
  }).catch((err) => {
    console.error(`[password-reset] email failed for ${normalizedEmail}:`, err.message)
  })
}

/**
 * Step 2 — verify the code and set the new password.
 *
 * Returns { ok: true } or { ok: false, message } with a message safe to show
 * the user. Unlike requestReset, this one does report *why* it failed —
 * the user needs to know their code expired or was mistyped, and by this
 * point they have already demonstrated knowledge of a valid code or not.
 */
export async function confirmReset({ role, email, otp, newPassword }) {
  const normalizedEmail = String(email || "").trim().toLowerCase()

  if (!normalizedEmail || !otp || !newPassword) {
    return { ok: false, message: "Email, code, and new password are all required." }
  }
  if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }
  }

  const user = await findUser(role, normalizedEmail)
  if (!user || user.is_active === false) {
    return { ok: false, message: "That code is invalid or has expired. Request a new one." }
  }

  const { table, idColumn } = roleConfig(role)

  // Newest unused code for this user.
  const { data: rows } = await supabase
    .from("password_resets")
    .select("id, otp_hash, expires_at, attempts, used_at")
    .eq(idColumn, user.id)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .then((r) => r, () => ({ data: null }))

  const reset = rows?.[0]
  if (!reset) {
    return { ok: false, message: "That code is invalid or has expired. Request a new one." }
  }
  if (new Date(reset.expires_at) < new Date()) {
    return { ok: false, message: "That code has expired. Request a new one." }
  }
  if (reset.attempts >= MAX_ATTEMPTS) {
    return { ok: false, message: "Too many incorrect attempts. Request a new code." }
  }

  if (reset.otp_hash !== hashOtp(String(otp).trim())) {
    await supabase
      .from("password_resets")
      .update({ attempts: reset.attempts + 1 })
      .eq("id", reset.id)
    const left = MAX_ATTEMPTS - (reset.attempts + 1)
    return {
      ok: false,
      message: left > 0
        ? `That code is incorrect. ${left} attempt${left === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts. Request a new code.",
    }
  }

  // Correct code — set the new password before retiring the code, so a failure
  // here leaves the code usable rather than stranding the user with neither.
  const { error: updateError } = await supabase
    .from(table)
    .update({ password: await bcrypt.hash(String(newPassword), 12) })
    .eq("id", user.id)

  if (updateError) {
    console.error(`[password-reset] password update failed for ${role} ${user.id}:`, updateError.message)
    return { ok: false, message: "Could not update your password. Please try again." }
  }

  // Retire this code and every other outstanding one for the user, so a code
  // issued earlier in the same window can't be replayed.
  const nowIso = new Date().toISOString()
  await supabase
    .from("password_resets")
    .update({ used_at: nowIso })
    .eq(idColumn, user.id)
    .is("used_at", null)
    .then((r) => r, () => {})

  console.log(`[password-reset] ${role} ${user.id} password reset successfully`)
  return { ok: true }
}
