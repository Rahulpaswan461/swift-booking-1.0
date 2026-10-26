import { readFile, writeFile, mkdir, appendFile, open, unlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import dotenv from 'dotenv'
import { normalizeEmails, buildClinicDemoEmail, sendClinicDemoEmails, demoSendKey } from '../services/clinicDemoEmail.js'

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: resolve(backend, '.env'), quiet: true })
const { values } = parseArgs({ options: {
  file: { type: 'string' }, campaign: { type: 'string', default: 'healibrate-demo-v1' },
  'website-reviewed': { type: 'boolean', default: false },
  send: { type: 'boolean', default: false }, help: { type: 'boolean', default: false },
} })
if (values.help || !values.file) {
  console.log('Preview: node scripts/sendClinicDemo.mjs --file clinic-emails.txt\nSend:    node scripts/sendClinicDemo.mjs --file clinic-emails.txt --send\nOptional: --campaign healibrate-demo-v1\n--website-reviewed: include the website observation only when you have checked every clinic in the list\nOne address per line (commas also accepted). No emails are sent without --send.')
  process.exit(values.help ? 0 : 1)
}

const out = resolve(backend, '.clinic-outreach')
const journalPath = resolve(out, `${values.campaign}.jsonl`)
const lockPath = resolve(out, `${values.campaign}.lock`)
demoSendKey('validation@example.com', values.campaign)
const readOptional = async path => { try { return await readFile(path, 'utf8') } catch (error) { if (error.code === 'ENOENT') return ''; throw error } }

async function run() {
  const emails = normalizeEmails(await readFile(resolve(values.file), 'utf8'))
  if (!emails.length) throw new Error('The recipient file is empty')
  const suppressed = normalizeEmails(await readOptional(resolve(backend, 'clinic-unsubscribed.txt')))
  await mkdir(out, { recursive: true, mode: 0o700 })
  const payload = buildClinicDemoEmail({ clientEmail: emails[0], websiteReviewed: values['website-reviewed'] })
  await writeFile(resolve(out, 'preview.html'), payload.html, { mode: 0o600 })
  if (!values.send) {
    console.log(`Preview created: ${resolve(out, 'preview.html')}\n${emails.length} unique recipients; ${emails.filter(e => suppressed.includes(e)).length} suppressed.\nSubject: ${payload.subject}\nNo emails sent. Add --send when ready.`)
    return
  }
  if (!process.env.RESEND_API_KEY) throw new Error('Set RESEND_API_KEY in Backend/.env')
  const lock = await open(lockPath, 'wx', 0o600).catch(error => {
    if (error.code === 'EEXIST') throw new Error(`A run is already locked. If no sender is running, remove ${lockPath} before resuming.`)
    throw error
  })
  try {
    const accepted = (await readOptional(journalPath)).split('\n').filter(Boolean).map(line => JSON.parse(line).email)
    const results = await sendClinicDemoEmails({ emails, websiteReviewed: values['website-reviewed'], campaignId: values.campaign, skipEmails: [...accepted, ...suppressed],
      onAccepted: async record => {
        await appendFile(journalPath, JSON.stringify({ ...record, acceptedAt: new Date().toISOString() }) + '\n', { mode: 0o600, flush: true })
        console.log(`Accepted by Resend: ${record.email}`)
      },
    })
    await writeFile(resolve(out, `${values.campaign}-report.json`), JSON.stringify(results, null, 2), { mode: 0o600 })
    for (const result of results.filter(r => r.status === 'failed')) console.error(`Failed: ${result.email} — ${result.error}`)
    console.log(['accepted', 'skipped', 'failed'].map(s => `${s}: ${results.filter(r => r.status === s).length}`).join(' | '))
    console.log('Accepted means Resend queued the email; check Resend for delivery/bounce status.')
    if (results.some(r => r.status === 'failed')) process.exitCode = 1
  } finally { await lock.close(); await unlink(lockPath) }
}
run().catch(error => { console.error(error.message); process.exitCode = 1 })
