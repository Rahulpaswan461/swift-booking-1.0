import supabase from "../config/supabase.js"
import { sendPlainEmail } from "../services/emailService.js"

const SUPPORT_INBOX = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER

/**
 * Public support/contact submission — from the website contact page or
 * the in-app help widget. Stores the request and emails the founder.
 * Storage is best-effort (works before migration 010); the email is the
 * primary delivery.
 */
export const submitSupportRequest = async (req, res) => {
  try {
    const { name, email, clinic_name, subject, message, source } = req.body

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are required.",
      })
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      })
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message is too long (5000 characters max).",
      })
    }

    const record = {
      clinic_id: req.admin?.clinic_id || null,
      name: name.trim().slice(0, 255),
      email: email.trim().slice(0, 255),
      clinic_name: clinic_name?.trim().slice(0, 255) || null,
      subject: subject.trim().slice(0, 255),
      message: message.trim(),
      source: source === "admin_panel" ? "admin_panel" : "website",
    }

    // Best-effort DB insert (table needs migration 010)
    const { error: insertError } = await supabase.from("support_requests").insert(record)
    if (insertError && !/support_requests/i.test(insertError.message || "")) {
      console.error("support request insert failed:", insertError.message)
    }

    // Email the founder in the background
    if (SUPPORT_INBOX) {
      sendPlainEmail({
        to: SUPPORT_INBOX,
        subject: `[MediBook support] ${record.subject}`,
        html: `
          <div style="font-family:sans-serif; max-width:560px;">
            <h2 style="margin:0 0 12px 0;">New support request</h2>
            <table style="border-collapse:collapse; width:100%; font-size:14px;">
              <tr><td style="padding:6px 0; color:#6b7280; width:120px;">From</td><td><strong>${record.name}</strong> &lt;${record.email}&gt;</td></tr>
              ${record.clinic_name ? `<tr><td style="padding:6px 0; color:#6b7280;">Clinic</td><td>${record.clinic_name}</td></tr>` : ""}
              <tr><td style="padding:6px 0; color:#6b7280;">Source</td><td>${record.source}</td></tr>
              <tr><td style="padding:6px 0; color:#6b7280;">Subject</td><td>${record.subject}</td></tr>
            </table>
            <div style="margin-top:14px; padding:14px; background:#f9fafb; border-radius:8px; white-space:pre-wrap; font-size:14px;">${record.message.replace(/</g, "&lt;")}</div>
            <p style="margin-top:14px; font-size:12px; color:#9ca3af;">Reply directly to ${record.email}</p>
          </div>`,
      }).catch((err) => console.error("support email failed:", err.message))
    }

    return res.status(200).json({
      success: true,
      message: "Thanks — we've received your message and will get back to you soon.",
    })
  } catch (error) {
    console.error("submitSupportRequest error:", error)
    return res.status(500).json({ success: false, message: "Internal server error." })
  }
}
