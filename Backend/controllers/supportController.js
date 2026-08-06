import supabase from "../config/supabase.js"
import { sendPlainEmail } from "../services/emailService.js"

// Where support/contact submissions are delivered. Defaults to the support
// address (which you can forward to a real inbox); override with SUPPORT_EMAIL.
const SUPPORT_INBOX = process.env.SUPPORT_EMAIL || "support@healibrate.com"

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

    // Notify support in the background (never blocks the response). For a
    // logged-in admin (in-app help widget) look up the verified clinic — a
    // single PK query, only in that rare case — so you can see who's asking at
    // a glance. Website visitors add no query.
    if (SUPPORT_INBOX) {
      (async () => {
        let verifiedRow = ""
        if (req.admin?.clinic_id) {
          const { data: clinic } = await supabase
            .from("clinics")
            .select("name, slug")
            .eq("id", req.admin.clinic_id)
            .single()
            .then((r) => r, () => ({ data: null }))
          const name = clinic?.name || "(name unavailable)"
          const site = clinic?.slug ? ` · ${clinic.slug}.healibrate.com` : ""
          verifiedRow = `
              <tr><td style="padding:6px 0; color:#6b7280; vertical-align:top;">Account</td><td>
                <span style="display:inline-block; background:#ecfdf5; color:#065f46; font-weight:700; padding:2px 9px; border-radius:999px; font-size:12px;">✓ Verified clinic</span>
                &nbsp;<strong>${name}</strong>${site}<br>
                <span style="color:#9ca3af; font-size:12px;">clinic_id: ${req.admin.clinic_id} · admin: ${req.admin.email || "—"}</span>
              </td></tr>`
        }

        await sendPlainEmail({
          to: SUPPORT_INBOX,
          replyTo: record.email,
          subject: `[Healibrate support] ${record.subject}`,
          html: `
          <div style="font-family:sans-serif; max-width:560px;">
            <h2 style="margin:0 0 12px 0;">New support request</h2>
            <table style="border-collapse:collapse; width:100%; font-size:14px;">
              <tr><td style="padding:6px 0; color:#6b7280; width:120px;">From</td><td><strong>${record.name}</strong> &lt;${record.email}&gt;</td></tr>
              ${verifiedRow}
              ${record.clinic_name ? `<tr><td style="padding:6px 0; color:#6b7280;">Clinic (typed)</td><td>${record.clinic_name}</td></tr>` : ""}
              <tr><td style="padding:6px 0; color:#6b7280;">Source</td><td>${record.source}</td></tr>
              <tr><td style="padding:6px 0; color:#6b7280;">Subject</td><td>${record.subject}</td></tr>
            </table>
            <div style="margin-top:14px; padding:14px; background:#f9fafb; border-radius:8px; white-space:pre-wrap; font-size:14px;">${record.message.replace(/</g, "&lt;")}</div>
            <p style="margin-top:14px; font-size:12px; color:#9ca3af;">Reply directly to ${record.email}</p>
          </div>`,
        })
      })().catch((err) => console.error("support email failed:", err.message))
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
