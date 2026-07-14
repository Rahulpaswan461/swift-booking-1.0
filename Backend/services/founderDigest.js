import { computePlatformMetrics } from "../controllers/platformController.js"
import { sendPlainEmail } from "./emailService.js"

const FOUNDER_INBOX = process.env.FOUNDER_EMAIL || process.env.SUPPORT_EMAIL || process.env.EMAIL_USER

/**
 * Weekly founder digest — the paid-readiness snapshot, emailed every
 * Monday morning. The star of the report: clinics whose usage already
 * exceeds the future free tier ("upgrade-ready").
 */
export const sendFounderDigest = async () => {
  if (!FOUNDER_INBOX) {
    console.log("[Digest] No FOUNDER_EMAIL/SUPPORT_EMAIL configured — skipping")
    return { success: false, skipped: true }
  }

  try {
    const m = await computePlatformMetrics()
    const t = m.totals
    const upgradeReady = m.clinics.filter((c) => c.upgrade_ready)
    const topActive = m.clinics.filter((c) => c.bookings_30d > 0).slice(0, 10)

    const row = (label, value) =>
      `<tr><td style="padding:8px 0; color:#6b7280; font-size:13px;">${label}</td>
           <td style="padding:8px 0; text-align:right; font-weight:700; font-size:15px;">${value}</td></tr>`

    const clinicRow = (c) => `
      <tr>
        <td style="padding:7px 4px; font-size:13px;"><strong>${c.name}</strong> <span style="color:#9ca3af;">(${c.slug})</span></td>
        <td style="padding:7px 4px; text-align:center; font-size:13px;">${c.doctors}</td>
        <td style="padding:7px 4px; text-align:center; font-size:13px;">${c.bookings_30d}</td>
        <td style="padding:7px 4px; text-align:center; font-size:13px;">${c.bookings_7d}</td>
        <td style="padding:7px 4px; text-align:center;">${c.upgrade_ready ? '<span style="color:#059669; font-weight:700; font-size:12px;">READY</span>' : '<span style="color:#d1d5db; font-size:12px;">—</span>'}</td>
      </tr>`

    const html = `
      <div style="font-family:-apple-system, Segoe UI, Roboto, sans-serif; max-width:600px; margin:auto;">
        <h2 style="margin:0 0 4px 0;">MediBook weekly digest</h2>
        <p style="margin:0 0 20px 0; color:#6b7280; font-size:13px;">${m.date} · Early Access</p>

        <table style="width:100%; border-collapse:collapse; border-bottom:1px solid #eee; margin-bottom:20px;">
          ${row("Total clinics", t.clinics)}
          ${row("New clinics (7 days)", t.new_clinics_7d)}
          ${row("Active clinics (booked in 7 days)", t.active_clinics_7d)}
          ${row("Bookings — last 7 / 30 days", `${t.bookings_7d} / ${t.bookings_30d}`)}
          ${row("Total patients", t.total_patients)}
          ${row("⭐ Upgrade-ready clinics", `<span style="color:#059669;">${t.upgrade_ready_clinics}</span>`)}
        </table>

        ${upgradeReady.length ? `
          <h3 style="margin:0 0 6px 0; font-size:15px;">Upgrade-ready (exceeding future free tier)</h3>
          <p style="margin:0 0 10px 0; color:#6b7280; font-size:12px;">More than 1 doctor or 50+ bookings in 30 days — your first paying customers.</p>` : `
          <p style="color:#6b7280; font-size:13px;">No clinics exceed the future free tier yet.</p>`}

        ${(upgradeReady.length ? upgradeReady : topActive).length ? `
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <tr style="border-bottom:1px solid #eee; color:#9ca3af; font-size:11px; text-transform:uppercase;">
            <td style="padding:6px 4px;">Clinic</td>
            <td style="padding:6px 4px; text-align:center;">Doctors</td>
            <td style="padding:6px 4px; text-align:center;">30d</td>
            <td style="padding:6px 4px; text-align:center;">7d</td>
            <td style="padding:6px 4px; text-align:center;">Status</td>
          </tr>
          ${(upgradeReady.length ? upgradeReady : topActive).map(clinicRow).join("")}
        </table>` : ""}

        <p style="margin-top:24px; font-size:12px; color:#9ca3af;">
          Full live dashboard: your /internal/metrics page. Automated by MediBook.
        </p>
      </div>`

    await sendPlainEmail({
      to: FOUNDER_INBOX,
      subject: `MediBook weekly: ${t.active_clinics_7d} active clinics, ${t.bookings_7d} bookings, ${t.upgrade_ready_clinics} upgrade-ready`,
      html,
    })

    console.log(`[Digest] Weekly digest sent to ${FOUNDER_INBOX}`)
    return { success: true }
  } catch (err) {
    console.error("[Digest] failed:", err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Schedule the digest every Monday at DIGEST_HOUR (default 09:00,
 * server local time). Disable with ENABLE_DIGEST=false.
 */
export const startFounderDigestJob = () => {
  if (process.env.ENABLE_DIGEST === "false") return

  const hour = Number(process.env.DIGEST_HOUR || 9)

  const scheduleNext = () => {
    const now = new Date()
    const next = new Date(now)
    next.setHours(hour, 0, 0, 0)
    // Advance to the coming Monday (day 1)
    while (next.getDay() !== 1 || next <= now) next.setDate(next.getDate() + 1)
    console.log(`[Digest] Next weekly digest: ${next.toLocaleString()}`)
    setTimeout(async () => {
      await sendFounderDigest()
      scheduleNext()
    }, next - now)
  }

  scheduleNext()
}
