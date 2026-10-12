import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'

// Inject a database stub so these tests never load credentials or contact Supabase.
const writes = []
globalThis.__auditTestDb = { from: () => ({ insert: async row => { writes.push(row); return { error: null } } }) }
const source = (await readFile(new URL('../utils/auditLogger.js', import.meta.url), 'utf8'))
  .replace('import supabase from "../config/supabase.js";', 'const supabase = globalThis.__auditTestDb;')
const { auditMiddleware, logAudit } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
function respond(path, status, { mutatePath = false } = {}) {
  const req = { method: 'POST', path, originalUrl: path, headers: { 'user-agent': 'x'.repeat(1000) },
    admin: { id: 'admin', clinic_id: 'clinic' } }
  const res = new EventEmitter()
  res.statusCode = status
  res.json = body => body
  auditMiddleware()(req, res, () => {})
  if (mutatePath) req.path = '/branding'
  res.json({ success: status === 200, data: { id: 'entity' } })
  res.emit('finish')
  return res
}

test('successful mutations are logged once after completion with the original route and JSON object', async () => {
  writes.length = 0
  const res = respond('/api/admin/branding?debug=true', 200, { mutatePath: true })
  res.emit('finish')
  await Promise.resolve()
  assert.equal(writes.length, 1)
  assert.equal(writes[0].action, 'branding_updated')
  assert.equal(writes[0].clinic_id, 'clinic')
  assert.deepEqual(writes[0].details, { method: 'POST', path: '/api/admin/branding', statusCode: 200 })
  assert.equal(writes[0].user_agent.length, 512)
})

test('failed mutations and all patient OTP aliases do not grow audit storage', async () => {
  writes.length = 0
  for (const status of [400, 401, 429, 500]) respond('/api/appointments/book', status)
  for (const path of ['/request', '/verify', '/send-otp', '/verify-otp']) respond(`/api/auth${path}`, 200)
  await Promise.resolve()
  assert.equal(writes.length, 0)
})


test('missing audit table reports the repair migration without breaking the operation', async t => {
  const originalFrom = globalThis.__auditTestDb.from
  const originalError = console.error
  const errors = []
  t.after(() => { globalThis.__auditTestDb.from = originalFrom; console.error = originalError })
  console.error = (...args) => errors.push(args)
  globalThis.__auditTestDb.from = () => ({ insert: async () => ({ error: { code: 'PGRST205', message: 'missing table' } }) })
  await logAudit({ action: 'clinic_registered', entityType: 'clinic' })
  assert.equal(errors.length, 1)
  assert.match(errors[0][0], /NOT saved.*017_repair_audit_and_auth_cleanup.sql/)
  globalThis.__auditTestDb.from = () => ({ insert: async () => ({ error: { code: '42501', message: 'permission denied' } }) })
  await logAudit({ action: 'clinic_registered', entityType: 'clinic' })
  assert.equal(errors[1][0], 'Audit log write failed:')
  assert.equal(errors[1][1].code, '42501')
})
