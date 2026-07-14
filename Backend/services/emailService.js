import nodemailer from "nodemailer"
import { buildClinicUrl } from "../utils/clinicUrl.js"

// Any SMTP relay works — set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS
// (e.g. Brevo: smtp-relay.brevo.com:587, free 300 emails/day).
// Falls back to Gmail via EMAIL_USER/EMAIL_PASSWORD when SMTP_HOST unset.
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

// Sender address: SMTP relays require a verified sender
const FROM_ADDRESS = process.env.EMAIL_FROM || process.env.EMAIL_USER

const DEFAULT_ACCENT = "#1d7f72"

// ── Shared building blocks ────────────────────────────────────
// One consistent, professional layout for every email the platform
// sends. Clinic branding (name + primary color) is applied when known.

function accentOf(clinic) {
  return clinic?.branding?.primary_color || DEFAULT_ACCENT
}

function displayNameOf(clinic) {
  return clinic?.branding?.clinic_name || clinic?.name || "MediBook"
}

function formatTime12h(time) {
  if (!time) return ""
  const [h, m] = String(time).split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

function formatDateLong(dateStr) {
  if (!dateStr) return ""
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })
  } catch {
    return dateStr
  }
}

function detailRow(label, value, { strong = false, accent } = {}) {
  return `
    <tr>
      <td style="padding:12px 0; border-bottom:1px solid #eef1f4; color:#6b7280; font-size:13px; vertical-align:top;">${label}</td>
      <td style="padding:12px 0; border-bottom:1px solid #eef1f4; text-align:right; color:${accent || "#111827"}; font-size:14px; ${strong ? "font-weight:700;" : "font-weight:500;"}">${value}</td>
    </tr>`
}

function button(href, label, { accent, outline = false } = {}) {
  const color = accent || DEFAULT_ACCENT
  const style = outline
    ? `background:#ffffff; color:${color}; border:2px solid ${color};`
    : `background:${color}; color:#ffffff; border:2px solid ${color};`
  return `
    <a href="${href}" style="display:inline-block; ${style} text-decoration:none; border-radius:10px;
       padding:12px 22px; font-size:14px; font-weight:700; margin:4px 6px 4px 0;">${label}</a>`
}

/**
 * Base layout. `bodyHtml` goes inside the white card.
 */
function emailLayout({ clinic, title, preheader = "", bodyHtml }) {
  const accent = accentOf(clinic)
  const clinicName = displayNameOf(clinic)
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#f4f6f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <span style="display:none; max-height:0; overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8; padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #e7ebef;">

        <!-- Clinic header -->
        <tr><td style="background:${accent}; padding:22px 32px;">
          <p style="margin:0; color:#ffffff; font-size:18px; font-weight:700; letter-spacing:0.2px;">${clinicName}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 6px 0; color:#111827; font-size:22px; font-weight:700;">${title}</h1>
          ${bodyHtml}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px; background:#f9fafb; border-top:1px solid #eef1f4;">
          <p style="margin:0; color:#9ca3af; font-size:12px; line-height:1.7;">
            This message was sent by <strong style="color:#6b7280;">${clinicName}</strong> via MediBook.<br>
            This is an automated email — please do not reply directly.
          </p>
        </td></tr>

      </table>
      <p style="margin:14px 0 0 0; color:#b3bac2; font-size:11px;">Powered by MediBook — clinic appointment management</p>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Plain internal email (founder digests, support notifications) —
 * not clinic-branded.
 */
export async function sendPlainEmail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"MediBook" <${FROM_ADDRESS}>`,
    to,
    subject,
    html,
  })
}

async function send({ to, subject, html, clinic }) {
  const res =  transporter.sendMail({
    from: `"${displayNameOf(clinic)}" <${FROM_ADDRESS}>`,
    to,
    subject,
    html,
  })
  return res;
}

// Links in patient emails point at the clinic's own subdomain when we
// know it; FRONTEND_URL is the legacy fallback.
function patientLink(clinic, path) {
  if (clinic?.slug) return buildClinicUrl(clinic.slug, path)
  return `${process.env.FRONTEND_URL || ""}${path}`
}

// ── OTP verification ──────────────────────────────────────────

export const sendOtpEmail = async ({ email, otp, clinic, ttlSeconds = 600 }) => {
  const accent = accentOf(clinic)
  const clinicName = displayNameOf(clinic)
  const ttlText = ttlSeconds < 120
    ? `${ttlSeconds} seconds`
    : `${Math.round(ttlSeconds / 60)} minutes`
  const html = emailLayout({
    clinic,
    title: "Your verification code",
    preheader: `${otp} is your ${clinicName} verification code`,
    bodyHtml: `
      <p style="margin:0 0 20px 0; color:#4b5563; font-size:14px; line-height:1.7;">
        Use this code to verify your identity and book your appointment at
        <strong>${clinicName}</strong>. It expires in <strong>${ttlText}</strong>.
      </p>
      <div style="text-align:center; margin:0 0 20px 0;">
        <span style="display:inline-block; background:#f4f6f8; border:1px dashed ${accent}; border-radius:12px;
              padding:18px 32px; font-size:32px; font-weight:800; letter-spacing:10px; color:${accent};">${otp}</span>
      </div>
      <p style="margin:0; color:#9ca3af; font-size:12px; line-height:1.7;">
        If you didn't request this code, you can safely ignore this email — no booking will be made without it.
      </p>`,
  })

  await send({ to: email, subject: `${otp} is your ${clinicName} verification code`, html, clinic })
}

// ── Booking confirmation ──────────────────────────────────────

export const sendBookingConfirmationEmail = async ({ appointment, patient, doctor, clinic }) => {
  const accent = accentOf(clinic)
  const clinicName = displayNameOf(clinic)
  const { id, appointment_date, appointment_time, cancel_token } = appointment
  const rescheduleUrl = patientLink(clinic, `/reschedule/${id}/${cancel_token}`)
  const cancelUrl = patientLink(clinic, `/cancel/${id}/${cancel_token}`)

  const html = emailLayout({
    clinic,
    title: "Your appointment is confirmed",
    preheader: `${formatDateLong(appointment_date)} at ${formatTime12h(appointment_time)} with Dr. ${doctor?.full_name || doctor?.fullName}`,
    bodyHtml: `
      <p style="margin:0 0 20px 0; color:#4b5563; font-size:14px; line-height:1.7;">
        Hi <strong>${patient?.name || patient?.full_name || patient?.fullName || "there"}</strong>,
        your appointment at <strong>${clinicName}</strong> is booked. Here are the details:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
        ${detailRow("Doctor", `Dr. ${doctor?.full_name || doctor?.fullName || ""}`, { strong: true })}
        ${detailRow("Specialization", doctor?.specialization || "—")}
        ${detailRow("Date", formatDateLong(appointment_date), { strong: true, accent })}
        ${detailRow("Time", formatTime12h(appointment_time), { strong: true, accent })}
        ${detailRow("Clinic", clinicName)}
      </table>
      <p style="margin:0 0 16px 0; color:#4b5563; font-size:13px; line-height:1.7;">
        Please arrive 10 minutes early. Need to make a change? No login needed — just use the buttons below.
      </p>
      <div style="margin:0 0 8px 0;">
        ${button(rescheduleUrl, "Reschedule", { accent })}
        ${button(cancelUrl, "Cancel appointment", { accent: "#dc2626", outline: true })}
      </div>`,
  })

  await send({
    to: patient?.email,
    subject: `Appointment confirmed — Dr. ${doctor?.full_name || doctor?.fullName}, ${formatDateLong(appointment_date)}`,
    html,
    clinic,
  })
}

// ── Reschedule confirmation ───────────────────────────────────

export const sendRescheduleConfirmationEmail = async ({ appointment, oldTime, patient, doctor, clinic }) => {
  const accent = accentOf(clinic)
  const clinicName = displayNameOf(clinic)
  const { id, appointment_date, appointment_time, cancel_token } = appointment
  const rescheduleUrl = patientLink(clinic, `/reschedule/${id}/${cancel_token}`)
  const cancelUrl = patientLink(clinic, `/cancel/${id}/${cancel_token}`)

  const html = emailLayout({
    clinic,
    title: "Your appointment was rescheduled",
    preheader: `New time: ${formatDateLong(appointment_date)} at ${formatTime12h(appointment_time)}`,
    bodyHtml: `
      <p style="margin:0 0 20px 0; color:#4b5563; font-size:14px; line-height:1.7;">
        Hi <strong>${patient?.name || patient?.full_name || patient?.fullName || "there"}</strong>,
        your appointment at <strong>${clinicName}</strong> has been moved. Your previous slot
        (<span style="text-decoration:line-through;">${formatTime12h(oldTime)}</span>) has been released.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
        ${detailRow("Doctor", `Dr. ${doctor?.full_name || doctor?.fullName || ""}`, { strong: true })}
        ${detailRow("New date", formatDateLong(appointment_date), { strong: true, accent })}
        ${detailRow("New time", formatTime12h(appointment_time), { strong: true, accent })}
        ${detailRow("Clinic", clinicName)}
      </table>
      <div style="margin:0 0 8px 0;">
        ${button(rescheduleUrl, "Reschedule again", { accent })}
        ${button(cancelUrl, "Cancel appointment", { accent: "#dc2626", outline: true })}
      </div>`,
  })

  await send({
    to: patient?.email,
    subject: `Appointment rescheduled — now ${formatDateLong(appointment_date)}, ${formatTime12h(appointment_time)}`,
    html,
    clinic,
  })
}

// ── Cancellation confirmation ─────────────────────────────────

export const sendCancellationEmail = async ({ appointment, patient, doctor, clinic }) => {
  const accent = accentOf(clinic)
  const clinicName = displayNameOf(clinic)
  const bookUrl = patientLink(clinic, "/")

  const html = emailLayout({
    clinic,
    title: "Your appointment was cancelled",
    preheader: `Your appointment on ${formatDateLong(appointment.appointment_date)} has been cancelled`,
    bodyHtml: `
      <p style="margin:0 0 20px 0; color:#4b5563; font-size:14px; line-height:1.7;">
        Hi <strong>${patient?.name || patient?.full_name || patient?.fullName || "there"}</strong>,
        this confirms that your appointment at <strong>${clinicName}</strong> has been cancelled.
        The slot has been released for other patients.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
        ${detailRow("Doctor", `Dr. ${doctor?.full_name || doctor?.fullName || ""}`)}
        ${detailRow("Date", formatDateLong(appointment.appointment_date))}
        ${detailRow("Time", formatTime12h(appointment.appointment_time))}
        ${detailRow("Status", "Cancelled", { strong: true, accent: "#dc2626" })}
      </table>
      <p style="margin:0 0 16px 0; color:#4b5563; font-size:13px; line-height:1.7;">
        Changed your mind? You can book a new appointment any time — it only takes a minute.
      </p>
      <div>${button(bookUrl, "Book a new appointment", { accent })}</div>`,
  })

  await send({
    to: patient?.email,
    subject: `Appointment cancelled — ${formatDateLong(appointment.appointment_date)}`,
    html,
    clinic,
  })
}

// ── Doctor invite (first login credentials) ───────────────────

export const sendWelcomeEmail = async ({ doctor, tempPassword, clinic, loginUrl }) => {
  const accent = accentOf(clinic)
  const clinicName = displayNameOf(clinic)

  const html = emailLayout({
    clinic,
    title: `Welcome to ${clinicName}`,
    preheader: `Your doctor account at ${clinicName} is ready`,
    bodyHtml: `
      <p style="margin:0 0 20px 0; color:#4b5563; font-size:14px; line-height:1.7;">
        Hi <strong>Dr. ${doctor.full_name || doctor.fullName}</strong>,
        <strong>${clinicName}</strong> has created a doctor account for you.
        Use the credentials below for your first sign-in:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        ${detailRow("Clinic", clinicName, { strong: true })}
        ${detailRow("Your login page", `<a href="${loginUrl}" style="color:${accent}; font-weight:600;">${loginUrl}</a>`)}
        ${detailRow("Email", doctor.email)}
        ${detailRow("Temporary password", `<span style="font-family:monospace; font-size:15px; letter-spacing:2px; font-weight:700;">${tempPassword}</span>`)}
      </table>
      <div style="margin:0 0 20px 0;">${button(loginUrl, "Sign in to your portal", { accent })}</div>
      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 16px;">
        <p style="margin:0; color:#92400e; font-size:12px; line-height:1.7;">
          For security, you'll be asked to set a new password the first time you sign in.
          If you weren't expecting this email, contact your clinic administrator.
        </p>
      </div>`,
  })

  await send({ to: doctor.email, subject: `Your doctor account at ${clinicName}`, html, clinic })
  return true
}

// ── Appointment reminder (day before) ─────────────────────────

export const sendReminderEmail = async ({ patient, doctor, appointment, clinic }) => {
  const accent = accentOf(clinic)
  const clinicName = displayNameOf(clinic)
  const cancelUrl = patientLink(clinic, `/cancel/${appointment.id}/${appointment.cancel_token}`)
  const rescheduleUrl = patientLink(clinic, `/reschedule/${appointment.id}/${appointment.cancel_token}`)

  const html = emailLayout({
    clinic,
    title: "Reminder: your appointment is tomorrow",
    preheader: `Tomorrow at ${formatTime12h(appointment.appointment_time)} with Dr. ${doctor.full_name || doctor.fullName}`,
    bodyHtml: `
      <p style="margin:0 0 20px 0; color:#4b5563; font-size:14px; line-height:1.7;">
        Hi <strong>${patient.name || patient.full_name || patient.fullName || "there"}</strong>,
        a quick reminder about your appointment at <strong>${clinicName}</strong> tomorrow.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
        ${detailRow("Doctor", `Dr. ${doctor.full_name || doctor.fullName}`, { strong: true })}
        ${detailRow("Specialization", doctor.specialization || "—")}
        ${detailRow("Date", formatDateLong(appointment.appointment_date), { strong: true, accent })}
        ${detailRow("Time", formatTime12h(appointment.appointment_time), { strong: true, accent })}
      </table>
      <p style="margin:0 0 16px 0; color:#4b5563; font-size:13px; line-height:1.7;">
        Please arrive 10 minutes early. Can't make it? Let the clinic know by cancelling or rescheduling below.
      </p>
      <div>
        ${button(rescheduleUrl, "Reschedule", { accent })}
        ${button(cancelUrl, "Cancel appointment", { accent: "#dc2626", outline: true })}
      </div>`,
  })

  await send({
    to: patient.email,
    subject: `Reminder: appointment tomorrow at ${formatTime12h(appointment.appointment_time)} — ${clinicName}`,
    html,
    clinic,
  })
}
