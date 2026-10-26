import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEmails, buildClinicDemoEmail, sendClinicDemoEmail, sendClinicDemoEmails, VIDEO_URL } from '../services/clinicDemoEmail.js'

test('normalizes and deduplicates a list; rejects header injection and malformed addresses', () => {
  assert.deepEqual(normalizeEmails('A@example.com, a@example.com\nb@example.com'), ['a@example.com', 'b@example.com'])
  assert.throws(() => normalizeEmails(['ok@example.com', 'bad-address']))
  assert.throws(() => normalizeEmails(['a@example.com\r\nBcc:other@example.com']))
})
test('uses supplied sender and reply-to, actual video URL, plaintext and escaped personalization', () => {
  const p = buildClinicDemoEmail({ clientEmail: 'clinic@example.com', clinicName: '<script>x</script>' })
  assert.equal(p.from, 'Healibrate <noreply@send.healibrate.com>')
  assert.equal(p.replyTo, 'support@healibrate.com')
  assert.ok(p.html.includes(VIDEO_URL) && p.text.includes(VIDEO_URL))
  assert.ok(!p.html.includes('<script>'))
  assert.ok(!p.subject.includes('Appointment Confirmation'))
})
test('sends separately with stable idempotency keys; Resend errors are failures', async () => {
  const calls = []; const resend = { emails: { send: async (...args) => { calls.push(args); return { data: { id: 'test-id' }, error: null } } } }
  await sendClinicDemoEmail({ clientEmail: 'clinic@example.com', resend })
  await sendClinicDemoEmail({ clientEmail: 'clinic@example.com', resend })
  assert.equal(calls[0][0].to, 'clinic@example.com')
  assert.equal(calls[0][1].idempotencyKey, calls[1][1].idempotencyKey)
  await assert.rejects(sendClinicDemoEmail({ clientEmail: 'clinic@example.com', resend: { emails: { send: async () => ({ error: { message: 'Rejected', statusCode: 403 } }) } } }), /Rejected/)
})
test('validates the full list before sending and honors suppression/deduplication', async () => {
  let calls = 0; const sendOne = async () => { calls++; return { id: 'id' } }
  await assert.rejects(sendClinicDemoEmails({ emails: ['a@example.com', 'invalid'], sendOne }))
  assert.equal(calls, 0)
  const result = await sendClinicDemoEmails({ emails: ['a@example.com', 'A@example.com', 'b@example.com'], skipEmails: ['a@example.com'], sendOne })
  assert.equal(calls, 1)
  assert.deepEqual(result.map(r => r.status), ['skipped', 'accepted'])
})
test('retries transient API failures then continues past permanent rejection', async () => {
  let calls = 0; const waits = []
  const result = await sendClinicDemoEmails({ emails: ['a@example.com', 'b@example.com', 'c@example.com'], pause: async ms => waits.push(ms), sendOne: async ({ clientEmail }) => {
    calls++
    if (calls === 1) throw Object.assign(new Error('Rate limited'), { statusCode: 429 })
    if (clientEmail === 'b@example.com') throw Object.assign(new Error('Invalid recipient'), { statusCode: 422 })
    return { id: clientEmail }
  } })
  assert.deepEqual(result.map(r => r.status), ['accepted', 'failed', 'accepted'])
  assert.ok(waits.includes(2000) && waits.includes(650))
})
test('stops if accepted-send journal cannot be saved', async () => {
  let calls = 0
  await assert.rejects(sendClinicDemoEmails({ emails: ['a@example.com', 'b@example.com'], sendOne: async () => { calls++; return { id: 'id' } }, onAccepted: async () => { throw new Error('Disk full') } }), /Disk full/)
  assert.equal(calls, 1)
})

test('founder email includes phone and only claims a website review when explicitly verified', () => {
  const base = buildClinicDemoEmail({clientEmail:'clinic@example.com'})
  assert.ok(base.text.includes('8595946123') && base.html.includes('8595946123'))
  assert.ok(base.text.includes("I'm Rahul, founder of Healibrate."))
  assert.ok(!base.text.includes('came across'))
  assert.ok(!base.text.includes('2-minute'))
  assert.ok(base.headers['List-Unsubscribe'].includes('support@healibrate.com'))
  assert.ok(buildClinicDemoEmail({clientEmail:'clinic@example.com',websiteReviewed:true}).text.includes('came across'))
})


test('bulk sending passes the website-review choice into each individual message', async () => {
  const payloads = []
  const resend = { emails: { send: async payload => { payloads.push(payload); return { data: { id: 'mock-id' }, error: null } } } }
  await sendClinicDemoEmails({ emails: ['reviewed@example.com'], websiteReviewed: true, resend })
  await sendClinicDemoEmails({ emails: ['general@example.com'], resend })
  assert.ok(payloads[0].text.includes("I came across your clinic's website"))
  assert.ok(!payloads[1].text.includes('came across'))
  assert.equal(payloads[0].subject, 'A quick question about appointments at your clinic')
})
