import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const messages = []
let response
let call
const db = { rpc: async (...args) => { call = args; return response } }
const log = { error: (...args) => messages.push(args), info: (...args) => messages.push(args) }
globalThis.__maintenanceTest = { db, log }
const source = (await readFile(new URL('../services/databaseMaintenance.js', import.meta.url), 'utf8'))
  .replace('import supabase from "../config/supabase.js"', 'const supabase = globalThis.__maintenanceTest.db')
  .replace('import createLogger from "../utils/logger.js"', 'const createLogger = () => globalThis.__maintenanceTest.log')
const { cleanExpiredAuthRecords } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
test('cleanup reports missing migrations distinctly from database failures and recovers on the next run', async () => {
  response = { error: { code: 'PGRST202', message: 'missing function' } }
  await cleanExpiredAuthRecords()
  assert.deepEqual(call, ['cleanup_expired_auth_records', { p_batch_size: 1000 }])
  assert.match(messages[0][0], /017_repair_audit_and_auth_cleanup.sql/)
  response = { error: { code: '42501', message: 'permission denied' } }
  await cleanExpiredAuthRecords()
  assert.equal(messages[1][0], 'Expired-code cleanup failed')
  response = { data: { otp_verifications: 1, password_resets: 0 }, error: null }
  await cleanExpiredAuthRecords()
  assert.equal(messages[2][0], 'Expired codes removed')
})
