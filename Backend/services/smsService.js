import { buildClinicUrl } from "../utils/clinicUrl.js"

/**
 * SMS delivery — Twilio via its plain REST API (no SDK dependency).
 * Configure in .env:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxx
 *   TWILIO_AUTH_TOKEN=xxxxxxxx
 *   TWILIO_FROM=+1xxxxxxxxxx     (your Twilio number)
 *
 * When unconfigured, messages are logged to the console (dev mode)
 * so the flow still works end-to-end locally.
 */

function twilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID)
  )
}

// Map Twilio's error codes to actionable guidance for common setup mistakes
function twilioHint(err) {
  const msg = err?.message || ""
  if (err?.code === 21606 || /'From'.*not a Twilio phone number/i.test(msg)) {
    return " → TWILIO_FROM must be the number TWILIO issued to you (Console → Phone Numbers → Active numbers), NOT your personal number. Your own number belongs in Verified Caller IDs (recipients)."
  }
  if (err?.code === 21608 || /unverified/i.test(msg)) {
    return " → Trial accounts can only send TO numbers listed in Console → Verified Caller IDs. Verify the recipient number there."
  }
  if (err?.code === 21408 || /permission to send.*region/i.test(msg)) {
    return " → SMS to this country is disabled: Console → Messaging → Settings → Geo permissions → enable India."
  }
  return ""
}

export async function sendSms(to, body) {
  if (!twilioConfigured()) {
    console.log(`[SMS stub — set TWILIO_* env vars to send for real]\n  to: ${to}\n  ${body}`)
    return { delivered: false, stub: true }
  }

  const sid = process.env.TWILIO_ACCOUNT_SID
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")

  const params = { To: to, Body: body }
  // Prefer a Messaging Service (production-grade sender pool) when set
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    params.MessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
  } else {
    params.From = process.env.TWILIO_FROM
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Twilio ${res.status}: ${err.message || "send failed"}${twilioHint(err)}`)
  }

  return { delivered: true }
}

// ── Message templates ─────────────────────────────────────────

export async function sendOtpSms({ phone, otp, clinic, ttlSeconds = 30 }) {
  const clinicName = clinic?.branding?.clinic_name || clinic?.name || "MediBook"
  return sendSms(phone, `${otp} is your ${clinicName} verification code. Valid for ${ttlSeconds} seconds.`)
}

export async function sendBookingConfirmationSms({ appointment, doctor, clinic }) {
  const clinicName = clinic?.branding?.clinic_name || clinic?.name || "the clinic"
  const cancelUrl = clinic?.slug
    ? buildClinicUrl(clinic.slug, `/cancel/${appointment.id}/${appointment.cancel_token}`)
    : ""
  return sendSms(
    appointment.patient_phone,
    `Appointment confirmed at ${clinicName}: Dr. ${doctor?.full_name} on ${appointment.appointment_date} at ${appointment.appointment_time}.` +
      (cancelUrl ? ` Manage: ${cancelUrl}` : "")
  )
}
