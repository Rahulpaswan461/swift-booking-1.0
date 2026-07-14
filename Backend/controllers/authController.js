import supabase from "../config/supabase.js"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { sendOtpEmail } from "../services/emailService.js"
import { sendOtpSms } from "../services/smsService.js"

// Generate a 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString()
}

// Hash the OTP (SHA-256, never store plaintext)
function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex")
}

// OTP expiry — short-lived by design. Override with OTP_TTL_SECONDS.
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 30)

function getExpiry() {
  return new Date(Date.now() + OTP_TTL_SECONDS * 1000)
}

/**
 * Request OTP — email or phone, scoped to the resolved clinic (tenant)
 * Body: { contact_value, contact_type }
 *   contact_type: 'email' | 'phone'
 */
export const requestOtp = async (req, res) => {
  try {
    const { contact_value, contact_type } = req.body

    if (!contact_value || !contact_type) {
      return res.status(400).json({
        success: false,
        message: "contact_value and contact_type are required.",
      })
    }

    if (!["email", "phone"].includes(contact_type)) {
      return res.status(400).json({
        success: false,
        message: "contact_type must be 'email' or 'phone'.",
      })
    }

    // Clinic must be resolved from tenant middleware
    const clinicId = req.tenant?.id
    if (!clinicId) {
      return res.status(400).json({
        success: false,
        message: "Clinic context is required. Access through your clinic subdomain.",
      })
    }

    // Delete any existing OTPs for this contact (prevent flooding)
    await supabase
      .from("otp_verifications")
      .delete()
      .eq("contact_value", contact_value)
      .eq("contact_type", contact_type)

    const otp = generateOtp()
    const otpHash = hashOtp(otp)
    const expiresAt = getExpiry()

    const { error: insertError } = await supabase
      .from("otp_verifications")
      .insert({
        contact_value,
        contact_type,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        clinic_id: clinicId,
      })

    if (insertError) {
      console.error("OTP insert error:", insertError)
      return res.status(500).json({
        success: false,
        message: "Failed to process OTP request.",
      })
    }

    // Send OTP via the chosen channel — in the background. Gmail SMTP can
    // take 5-15s (worse under throttling); the OTP is already stored, so
    // respond immediately and let delivery finish on its own.
    if (contact_type === "email") {
      sendOtpEmail({ email: contact_value, otp, clinic: req.tenant, ttlSeconds: OTP_TTL_SECONDS })
        .then(() => console.log(`OTP email delivered to ${contact_value}`))
        .catch((err) => console.error("OTP email failed:", err.message))
    } else {
      sendOtpSms({ phone: contact_value, otp, clinic: req.tenant, ttlSeconds: OTP_TTL_SECONDS }).catch((err) =>
        console.error("OTP SMS failed:", err.message)
      )
    }

    return res.status(200).json({
      success: true,
      message: `OTP sent to ${contact_type}.`,
    })
  } catch (error) {
    console.error("requestOtp error:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    })
  }
}

/**
 * Verify OTP → create or reuse patient → issue patient JWT
 * Body: { contact_value, contact_type, otp_code }
 */
export const verifyOtp = async (req, res) => {
  try {
    const { contact_value, contact_type, otp_code } = req.body

    if (!contact_value || !contact_type || !otp_code) {
      return res.status(400).json({
        success: false,
        message: "contact_value, contact_type, and otp_code are required.",
      })
    }

    // Find the latest unverified OTP for this contact
    const { data: record, error: fetchError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("contact_value", contact_value)
      .eq("contact_type", contact_type)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !record) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Request one first.",
      })
    }

    // Check expiry
    if (new Date(record.expires_at) < new Date()) {
      await supabase.from("otp_verifications").delete().eq("id", record.id)
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Request a new one.",
      })
    }

    // Check OTP hash match
    const inputHash = hashOtp(otp_code)
    if (record.otp_hash !== inputHash) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      })
    }

    // Mark OTP as verified
    await supabase
      .from("otp_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", record.id)

    // --- Create or reuse patient ---
    let query = supabase.from("patients").select("id")
    if (contact_type === "email") {
      query = query.eq("email", contact_value)
    } else {
      query = query.eq("phone", contact_value)
    }

    const { data: existingPatient } = await query.single()

    let patient_id = existingPatient?.id

    if (!patient_id) {
      // First time — create the patient silently. `name` is NOT NULL in
      // the schema but unknown at this point; use a placeholder derived
      // from the contact — the booking step updates it to the real name.
      const placeholderName = contact_type === "email"
        ? contact_value.split("@")[0]
        : `Patient ${contact_value.slice(-4)}`
      const insertData = contact_type === "email"
        ? { email: contact_value, name: placeholderName }
        : { phone: contact_value, name: placeholderName }

      let { data: newPatient, error: patientError } = await supabase
        .from("patients")
        .insert(insertData)
        .select("id")
        .single()

      // Legacy schema (pre-migration-007) requires BOTH email and phone.
      // Fill the missing one with a unique placeholder — the booking step
      // overwrites it with the real value.
      if (patientError && /not-null/i.test(patientError.message || "")) {
        const rand = crypto.randomBytes(4).toString("hex")
        const fallbackData = contact_type === "email"
          ? { ...insertData, phone: `pending-${rand}` }
          : { ...insertData, email: `${contact_value.replace(/[^0-9]/g, "")}-${rand}@pending.invalid` }

        ;({ data: newPatient, error: patientError } = await supabase
          .from("patients")
          .insert(fallbackData)
          .select("id")
          .single())
      }

      if (patientError || !newPatient) {
        console.error("Patient creation error:", patientError)
        return res.status(500).json({
          success: false,
          message: "Failed to create patient profile.",
        })
      }
      patient_id = newPatient.id
    }

    // --- Issue patient JWT (not clinic-scoped — patient is global) ---
    const token = jwt.sign(
      { patient_id, contact_value, contact_type },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    )

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      token,
      patient_id,
    })
  } catch (error) {
    console.error("verifyOtp error:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    })
  }
}

// --- Backward-compatible wrappers (for existing frontend routes) ---
// These delegate to the new functions but accept the old request shape.

export const sendOtp = requestOtp
export const verifyOtpCompat = verifyOtp
