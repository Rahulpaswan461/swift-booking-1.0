# Send the Healibrate demo to clinics

Uses the existing `RESEND_API_KEY` in `Backend/.env`. Sender is `Healibrate <noreply@send.healibrate.com>`; replies go to `support@healibrate.com`. The sender domain must be verified in Resend. No new API key or database table is required.

The subject describes a product demo, rather than falsely calling the outreach an appointment confirmation. The email contains a simple **Watch demo** link to the supplied S3 MP4, not a large attachment or an embedded video player.

## Run from Backend

Create `clinic-emails.txt` with one recipient per line, for example:

```text
clinic-one@example.com
clinic-two@example.com
```

Preview without sending:

```sh
node scripts/sendClinicDemo.mjs --file clinic-emails.txt
```

Open `.clinic-outreach/preview.html` to review the email. Send when ready:

```sh
node scripts/sendClinicDemo.mjs --file clinic-emails.txt --send
```

Each address receives its own message. Duplicate addresses are removed. Invalid addresses stop the run before sending. The script paces requests and retries temporary API failures; permanent failures appear in `.clinic-outreach/healibrate-demo-v1-report.json`. Successful API acceptance is recorded immediately in `.clinic-outreach/healibrate-demo-v1.jsonl`, so rerunning skips those recipients. Keep this folder to preserve send history. An API acceptance is not proof of inbox delivery; inspect delivery and bounce events in Resend.

Use a new `--campaign` only for a deliberately new outreach email, for example `--campaign healibrate-demo-followup-1`. Resend's idempotency protection lasts 24 hours; the local journal supplies longer-term duplicate prevention. A crash after API acceptance but before journal persistence leaves a small uncertain window: check Resend before retrying more than 24 hours later. Concurrent runs of the same campaign are locked locally.

The footer lets clinics reply to unsubscribe. Add those addresses to `clinic-unsubscribed.txt` (one per line); the sender skips them. This is a manually maintained suppression list, not an automatic unsubscribe service.

## Reuse the function

```js
import { sendClinicDemoEmail, sendClinicDemoEmails } from './services/clinicDemoEmail.js';

await sendClinicDemoEmail({
  clientEmail: 'clinic@example.com',
  clinicName: 'Example Dental Clinic', // optional
  campaignId: 'healibrate-demo-v1',
});

const results = await sendClinicDemoEmails({
  emails: ['clinic-one@example.com', 'clinic-two@example.com'],
  campaignId: 'healibrate-demo-v1',
});
```

The imported functions expect environment variables to be loaded by the caller and do not persist a journal themselves. The CLI loads `.env` and provides persistence, locking and suppression. A preconfigured Resend instance can be supplied through the `resend` option. Keep these functions server-side.

Verification: seven mocked tests passed, preview command passed without sending, and the supplied S3 URL returned HTTP 200 with `video/mp4`. No real outreach emails were sent during implementation.

API reference: [Resend Node SDK](https://github.com/resend/resend-node), [idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Personal copy and sender authentication

The default email is a short note from Rahul, Founder of Healibrate, with phone **8595946123**. It does not claim a clinic's website was inspected. Set `websiteReviewed: true` only in the individual-send function after actually confirming that clinic has no visible online booking option. The video is described as a short demo without an unverified two-minute duration.

Read-only public DNS checks on 22 October 2026 found:

- A DKIM public key at `resend._domainkey.send.healibrate.com`.
- SPF `v=spf1 include:amazonses.com ~all` at `send.send.healibrate.com` (the standard Resend return-path subdomain for this sender).
- No TXT answer at `_dmarc.send.healibrate.com` or `_dmarc.healibrate.com`.

Add a monitoring DMARC TXT record in the DNS provider for the sending subdomain:

| Type | Name (relative to healibrate.com) | Value |
|---|---|---|
| TXT | `_dmarc.send` | `v=DMARC1; p=none;` |

Check for any existing record before adding it; keep one DMARC record per name. This monitoring policy does not request rejection of other mail. DNS was not modified by this task. Public DNS records alone do not prove authentication passes on a sent message: send a test to your own inbox and inspect SPF, DKIM and DMARC results before broader outreach.

No implementation can guarantee inbox placement. Keep outreach relevant, start with a small recipient list, and suppress unsubscribes, bounces and complaints. This template adds no tracking pixel; check Resend's domain settings if you also want open/click tracking disabled. The mailto unsubscribe header is not an automated HTTPS one-click unsubscribe endpoint.

Reference: [Resend's Gmail deliverability guide](https://www.resend.com/guides/email/deliverability/avoid-gmail-spam-folder).


## Updated personal introduction

Subject: **A quick question about appointments at your clinic**.
The message follows Rahul's supplied draft and includes 8595946123 and the existing video URL. It says “short demo” because the exact hosted video's duration has not been verified.

To include “I came across your clinic's website...” for a list of clinics you have personally checked, use `--website-reviewed` for both preview and sending:

```sh
node scripts/sendClinicDemo.mjs --file clinic-emails.txt --website-reviewed
node scripts/sendClinicDemo.mjs --file clinic-emails.txt --website-reviewed --send
```

Without that flag, the introduction remains neutral. This flag applies to every recipient in that file. The recipient list, suppression list and existing campaign history are preserved; editing copy does not resend to previously accepted recipients. Changing the subject or message cannot guarantee Gmail Primary placement.
