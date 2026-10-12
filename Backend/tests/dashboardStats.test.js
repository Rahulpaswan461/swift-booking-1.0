import test from 'node:test'
import assert from 'node:assert/strict'
import { createDashboardStats, dashboardDates } from '../services/dashboardStats.js'

const current = new Date('2026-10-08T12:00:00Z')
const missing = { code: 'PGRST202' }
function fixture({ rpcError = missing, appointments = [], doctors = [], tableError } = {}) {
  const calls = [], rpcCalls = []
  return { calls, rpcCalls, rpcError, db: {
    async rpc(name, params) { rpcCalls.push({ name, params }); return { error: rpcError, data: rpcError ? null : { fromRpc: true } } },
    from(table) {
      const call = { table }; calls.push(call)
      return {
        select(fields) { call.fields = fields; return this },
        eq(key, value) { call[key] = value; return this },
        order(key) { assert.equal(key, 'id'); return this },
        async range(start, end) {
          call.range = [start, end]
          if (tableError) return { error: tableError }
          const rows = (table === 'appointments' ? appointments : doctors).filter(row => row.clinic_id === call.clinic_id)
          return { data: rows.slice(start, end + 1) }
        },
      }
    },
  } }
}
const appointment = (id, date, status, patient = 'p1', doctor = 'd1', clinic = 'a') => ({ id, appointment_date: date, status, patient_id: patient, doctor_id: doctor, clinic_id: clinic })

test('dashboard date and Monday boundaries use clinic timezone, including UTC midnight and Sunday', () => {
  assert.deepEqual(dashboardDates(new Date('2026-10-04T20:00:00Z')), { today: '2026-10-05', weekStart: '2026-10-05', weekEnd: '2026-10-12' })
  assert.deepEqual(dashboardDates(new Date('2026-10-04T20:00:00Z'), 'UTC'), { today: '2026-10-04', weekStart: '2026-09-28', weekEnd: '2026-10-05' })
})
test('existing database aggregation remains the fast path and receives business dates', async () => {
  const f = fixture({ rpcError: null })
  assert.deepEqual(await createDashboardStats({ db: f.db, now: () => current })('a'), { fromRpc: true })
  assert.equal(f.calls.length, 0)
  assert.deepEqual(f.rpcCalls[0].params, { p_clinic_id: 'a', p_today: '2026-10-08', p_week_start: '2026-10-05' })
})
test('missing RPC returns accurate scoped today, week, lifetime and doctor totals', async () => {
  const f = fixture({ appointments: [
    appointment('1', '2026-10-08', 'confirmed'),
    appointment('2', '2026-10-08', 'completed'),
    appointment('3', '2026-10-08', 'cancelled', 'p2', 'd2'),
    appointment('4', '2026-10-08', 'no_show', 'p2', 'd2'),
    appointment('5', '2026-10-05', 'completed', 'p3'),
    appointment('6', '2026-10-04', 'confirmed', null),
    appointment('7', '2026-10-12', 'confirmed'),
    appointment('8', '2026-10-08', 'completed', 'private', 'other', 'b'),
  ], doctors: [
    { id: 'd1', clinic_id: 'a', full_name: 'Ananya', specialization: 'General', is_active: true },
    { id: 'd2', clinic_id: 'a', full_name: 'Meera', specialization: 'Dermatology', is_active: false },
    { id: 'other', clinic_id: 'b', is_active: true },
  ] })
  const result = await createDashboardStats({ db: f.db, now: () => current })('a')
  assert.deepEqual(result.today, { total: 4, confirmed: 1, completed: 1, cancelled: 1, no_show: 1 })
  assert.deepEqual(result.this_week, { total: 5, completed: 2, cancelled: 1 })
  assert.deepEqual(result.all_time, { total_appointments: 7, total_doctors: 1, total_patients: 3 })
  assert.deepEqual(result.doctor_breakdown, [
    { doctorName: 'Ananya', specialization: 'General', total: 2, pending: 1, completed: 1, no_show: 0 },
    { doctorName: 'Meera', specialization: 'Dermatology', total: 2, pending: 0, completed: 0, no_show: 1 },
  ])
  assert.ok(f.calls.every(call => call.clinic_id === 'a'))
  assert.ok(f.calls.every(call => !/notes|phone|email/.test(call.fields)))
})
test('fallback pages beyond 1000 rows and never fabricates zero totals on read failure', async () => {
  const f = fixture({ appointments: Array.from({ length: 1201 }, (_, i) => appointment(String(i), '2026-10-08', 'confirmed')) })
  const result = await createDashboardStats({ db: f.db, now: () => current })('a')
  assert.equal(result.today.total, 1201)
  assert.equal(result.doctor_breakdown[0].pending, 1201)
  assert.equal(result.all_time.total_patients, 1)
  assert.deepEqual(f.calls.filter(c => c.table === 'appointments').map(c => c.range), [[0, 499], [500, 999], [1000, 1499]])
  const failed = fixture({ tableError: { code: '08006' } })
  await assert.rejects(createDashboardStats({ db: failed.db, now: () => current })('a'), err => err.code === '08006')
})
test('permissions and database outages do not trigger the missing-function fallback', async () => {
  for (const code of ['42501', '08006', 'PGRST301']) {
    const f = fixture({ rpcError: { code } })
    await assert.rejects(createDashboardStats({ db: f.db, now: () => current })('a'), error => error.code === code)
    assert.equal(f.calls.length, 0)
  }
})
test('missing RPC checks back after a minute and empty clinic remains a valid zero snapshot', async () => {
  const f = fixture(), warnings = []
  let time = current
  const load = createDashboardStats({ db: f.db, now: () => time, onFallback: code => warnings.push(code) })
  const result = await load('a')
  await load('a')
  assert.equal(f.rpcCalls.length, 1)
  assert.equal(warnings.length, 1)
  assert.equal(result.today.total, 0)
  assert.equal(result.all_time.total_patients, 0)
  assert.deepEqual(result.doctor_breakdown, [])
  time = new Date(current.getTime() + 60_001)
  await load('a')
  assert.equal(f.rpcCalls.length, 2)
  assert.equal(warnings.length, 1, 'do not repeat the same missing-migration warning every refresh')
})
