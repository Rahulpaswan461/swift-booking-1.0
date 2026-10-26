import { createHash } from 'node:crypto'

export const VIDEO_URL = 'https://s3.ap-south-1.amazonaws.com/healibrate.com/Healibrate-Walkthrough.mp4'
export const SUBJECT = 'A quick question about appointments at your clinic'
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function normalizeEmails(input) {
  const entries = Array.isArray(input) ? input : String(input).split(/[\n,;]/)
  const emails = entries.map(value => String(value).trim()).filter(Boolean)
  const invalid = emails.filter(email => !/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email) || email.length > 254)
  if (invalid.length) throw new Error(`Invalid email address(es): ${invalid.join(', ')}`)
  return [...new Set(emails.map(email => email.toLowerCase()))]
}

export function buildClinicDemoEmail({ clientEmail, clinicName = '', websiteReviewed = false }) {
  const [to] = normalizeEmails([clientEmail])
  if (!to) throw new Error('clientEmail is required')
  const greeting = clinicName ? `Hi ${clinicName} team,` : 'Hi Doctor,'
  // Only use the observation after personally checking this specific clinic's website.
  const observation = websiteReviewed === true
    ? "I came across your clinic's website and noticed that I couldn't find an option for patients to book appointments online."
    : "I'm reaching out to introduce a tool I've built for clinics."
  const paragraphs = [greeting, "I'm Rahul, founder of Healibrate.", observation,
    "I’ve built Healibrate, a platform that helps clinics offer online booking and manage appointments and doctor availability in one place.",
    "I’ve also created a short demo showing how it works."]
  const text = paragraphs.join('\n\n') + `\n\nWatch demo: ${VIDEO_URL}\nWebsite: https://healibrate.com\n\nWould you be open to taking a look and sharing your thoughts?\n\nBest regards,\nRahul\nFounder, Healibrate\nPhone: 8595946123\n\nIf this isn't relevant to your clinic, reply with “unsubscribe” and I won't send further product emails.`
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>A note from Rahul at Healibrate</title></head>
<body style="margin:0;background:#ffffff;color:#263b35;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65">
<div style="max-width:600px;padding:24px 20px">
${paragraphs.map(p => `<p style="margin:0 0 18px">${escapeHtml(p)}</p>`).join('')}
<p style="margin:0 0 20px"><strong>Watch demo:</strong> <a href="${VIDEO_URL}" style="color:#1d7f72">Healibrate product walkthrough</a><br>
<strong>Website:</strong> <a href="https://healibrate.com" style="color:#1d7f72">https://healibrate.com</a></p>
<p style="margin:0 0 22px">Would you be open to taking a look and sharing your thoughts?</p>
<p style="margin:0">Best regards,<br>Rahul<br>Founder, Healibrate<br>Phone: <a href="tel:+918595946123" style="color:#263b35;text-decoration:none">8595946123</a></p>
<p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#66766f">If this isn't relevant to your clinic, reply with “unsubscribe” and I won't send further product emails.</p>
</div></body></html>`
  return { from: 'Healibrate <noreply@send.healibrate.com>', to, subject: SUBJECT, html, text, replyTo: 'support@healibrate.com',
    headers: { 'List-Unsubscribe': '<mailto:support@healibrate.com?subject=Unsubscribe%20from%20Healibrate>' } }
}

export function demoSendKey(email, campaignId) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(campaignId || '')) throw new Error('campaignId must contain 1–80 letters, numbers, hyphens or underscores')
  return `clinic-demo/${campaignId}/${createHash('sha256').update(normalizeEmails([email])[0]).digest('hex')}`
}

/** Send one promotional demo email. Inject a Resend instance when reusing this in the backend. */
export async function sendClinicDemoEmail({ clientEmail, clinicName, websiteReviewed = false, campaignId = 'healibrate-demo-v1', resend }) {
  const payload = buildClinicDemoEmail({ clientEmail, clinicName, websiteReviewed })
  const idempotencyKey = demoSendKey(payload.to, campaignId)
  if (!resend) {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is missing')
    const { Resend } = await import('resend')
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  const { data, error } = await resend.emails.send(payload, { idempotencyKey })
  if (error) throw Object.assign(new Error(error.message || 'Resend rejected the email'), { statusCode: error.statusCode, code: error.name })
  if (!data?.id) throw new Error('Resend did not return an email ID; delivery acceptance is unknown')
  return data
}

/** One private message per recipient. No shared To/CC list. Validate all addresses before sending. */
export async function sendClinicDemoEmails({ emails, websiteReviewed = false, campaignId = 'healibrate-demo-v1', resend, skipEmails = [], onAccepted = async () => {}, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), sendOne = sendClinicDemoEmail }) {
  const recipients = normalizeEmails(emails)
  const skip = new Set(normalizeEmails(skipEmails))
  const results = []
  let attempted = false
  for (const email of recipients) {
    if (skip.has(email)) { results.push({ email, status: 'skipped' }); continue }
    if (attempted) await pause(650)
    attempted = true
    let data
    try {
      for (let attempt = 0; ; attempt++) {
        try { data = await sendOne({ clientEmail: email, websiteReviewed, campaignId, resend }); break }
        catch (error) {
          const retryable = error.statusCode === 429 || error.statusCode >= 500 || error.code === 'rate_limit_exceeded'
          if (!retryable || attempt >= 2) throw error
          await pause(2000 * 2 ** attempt)
        }
      }
    } catch (error) {
      results.push({ email, status: 'failed', error: error.message })
      continue
    }
    // A journal failure must halt the run, not mislabel an accepted email as failed.
    await onAccepted({ email, id: data.id })
    results.push({ email, status: 'accepted', id: data.id })
  }
  return results
}
