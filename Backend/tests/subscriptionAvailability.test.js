import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

let results = []
globalThis.__subscriptionDb = { from() {
  const query = { then(resolve, reject) { return Promise.resolve(results.shift()).then(resolve, reject) } }
  for (const method of ['select', 'eq', 'maybeSingle', 'order', 'limit']) query[method] = () => query
  return query
} }
const source = (await readFile(new URL('../middleware/tenant.js', import.meta.url), 'utf8'))
  .replace(/^import .*$/gm, '')
  .replace(/^export \{ EARLY_ACCESS \}.*$/gm, '')
const { loadClinicSubscription, invalidateSubscriptionCache } = await import(`data:text/javascript;base64,${Buffer.from(`const supabase = globalThis.__subscriptionDb; const EARLY_ACCESS = true; const planConfig = () => ({});\n${source}`).toString('base64')}`)

test('clinic and subscription outages are retryable and never cached as denied access', async () => {
  for (const failedTable of ['clinic', 'subscription']) {
    invalidateSubscriptionCache()
    results = failedTable === 'clinic'
      ? [{ error: { code: '08006' } }, { data: [] }]
      : [{ data: { id: 'clinic-a', is_active: true } }, { error: { code: '08006' } }]
    await assert.rejects(loadClinicSubscription('clinic-a'), err => err.code === 'unavailable')
    results = [{ data: { id: 'clinic-a', is_active: true } }, { data: [] }]
    assert.equal((await loadClinicSubscription('clinic-a')).clinic.is_active, true)
    assert.equal(results.length, 0)
    assert.equal((await loadClinicSubscription('clinic-a')).clinic.id, 'clinic-a')
  }
})
