import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createCachedLoader } from '../utils/cachedLoader.js'

// Evaluate the real service with its external imports replaced, so these
// tests never initialize Supabase, load .env, or make network requests.
globalThis.__rosterFixtureImports = { createCachedLoader, changes: new EventEmitter() }
const source = (await readFile(new URL('../services/doctorRoster.js', import.meta.url), 'utf8')).replace(/^import .*$/gm, '')
const { createDoctorRoster } = await import(`data:text/javascript;base64,${Buffer.from(`
const { createCachedLoader, changes: appointmentChanges } = globalThis.__rosterFixtureImports;
const supabase = null;
${source}`).toString('base64')}`)
delete globalThis.__rosterFixtureImports

const scope = { clinicId: 'clinic-a', doctorId: 'doctor-a', page: 1, search: '' }
const patient = (id, name = id) => ({ id, name, email: `${id}@example.test`, phone: `555-${id}` })
const appointment = (id, patient_id, date, extra = {}) => ({
  id, patient_id, appointment_date: date, appointment_time: '10:00:00', status: 'confirmed',
  clinic_id: 'clinic-a', doctor_id: 'doctor-a', ...extra,
})
const note = (id, appointment_id, extra = {}) => ({
  id, appointment_id, clinic_id: 'clinic-a', doctor_id: 'doctor-a',
  notes: `Body of ${id}`, diagnosis: `Diagnosis ${id}`, follow_up_date: null, tags: [], ...extra,
})

function fixture({ appointments = [], patients = [], notes = [], tagsMissing = false } = {}) {
  const tables = { appointments, patients, session_notes: notes }
  const calls = []
  const changes = new EventEmitter()
  let metadataError
  const db = { from(table) {
    const call = { table, select: '', equals: {}, includes: {}, orders: [], range: null }
    const query = {
      select(value) { call.select = value; return this },
      eq(key, value) { call.equals[key] = value; return this },
      in(key, values) { call.includes[key] = [...values]; return this },
      order(key, { ascending = true } = {}) { call.orders.push([key, ascending]); return this },
      range(start, end) { call.range = [start, end]; return this },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          calls.push(call)
          const metadata = table === 'session_notes' && call.select.includes('appointment:')
          if (metadata && metadataError) return { error: metadataError }
          if (metadata && tagsMissing && /\btags\b/.test(call.select)) {
            return { error: { code: '42703', message: 'column session_notes.tags does not exist' } }
          }
          let rows = tables[table].map(row => ({ ...row }))
          if (table === 'session_notes') {
            rows = rows.map(row => ({ ...row, appointment: appointments.find(a => a.id === row.appointment_id) }))
          }
          const value = (row, path) => path.split('.').reduce((result, key) => result?.[key], row)
          rows = rows.filter(row => Object.entries(call.equals).every(([key, expected]) => value(row, key) === expected) &&
            Object.entries(call.includes).every(([key, expected]) => expected.includes(value(row, key))))
          rows.sort((a, b) => {
            for (const [key, ascending] of call.orders) {
              const compared = a[key] === b[key] ? 0 : a[key] < b[key] ? -1 : 1
              if (compared) return ascending ? compared : -compared
            }
            return 0
          })
          // Emulate the Data API's default 1,000-row cap unless paged.
          rows = rows.slice(call.range?.[0] || 0, call.range ? call.range[1] + 1 : 1000)
          if (metadata) {
            rows = rows.map(row => ({ id: row.id,
              ...(call.select.includes('tags,') ? { tags: row.tags } : {}),
              appointment: row.appointment && {
                patient_id: row.appointment.patient_id,
                appointment_date: row.appointment.appointment_date,
                appointment_time: row.appointment.appointment_time,
              },
            }))
          } else {
            const fields = call.select.split(',').map(field => field.trim())
            rows = rows.map(row => Object.fromEntries(fields.map(field => [field, row[field]])))
          }
          return { data: rows, error: null }
        }).then(resolve, reject)
      },
    }
    return query
  } }
  return { ...createDoctorRoster({ db, changes }), tables, calls, changes,
    failNoteMetadata(error) { metadataError = error },
  }
}

test('roster scans more than 1,000 appointments with stable paging and clinic/doctor isolation', async t => {
  const patients = Array.from({ length: 31 }, (_, i) => patient(`patient-${String(i).padStart(2, '0')}`))
  const appointments = Array.from({ length: 1205 }, (_, i) => appointment(`appointment-${String(i).padStart(4, '0')}`,
    patients[i % patients.length].id, new Date(Date.UTC(2023, 0, i + 1)).toISOString().slice(0, 10),
    { status: i % 3 === 0 ? 'completed' : 'confirmed' }))
  const f = fixture({ patients: [...patients, patient('outside')], appointments: [...appointments,
    appointment('outside-clinic', 'outside', '2030-01-01', { clinic_id: 'clinic-b' }),
    appointment('outside-doctor', 'outside', '2030-01-01', { doctor_id: 'doctor-b' }),
  ] })
  t.after(f.dispose)
  const first = await f.getRosterPage(scope)
  const second = await f.getRosterPage({ ...scope, page: 2 })
  const entries = [...first.data, ...second.data]
  assert.deepEqual(first.pagination, { page: 1, pageSize: 25, total: 31, pages: 2 })
  assert.equal(first.data.length, 25)
  assert.equal(second.data.length, 6)
  assert.equal(entries.reduce((sum, p) => sum + p.total_appointments, 0), 1205)
  assert.equal(entries.reduce((sum, p) => sum + p.completed_sessions, 0), 402)
  assert.equal(entries.reduce((sum, p) => sum + p.upcoming, 0), 803)
  assert.equal(new Set(entries.map(p => p.patient.id)).size, 31)
  assert.equal(entries.some(p => p.patient.id === 'outside'), false)
  const reads = f.calls.filter(c => c.table === 'appointments')
  assert.deepEqual(reads.map(c => c.range), [[0, 499], [500, 999], [1000, 1499]])
  for (const read of reads) {
    assert.deepEqual(read.equals, { doctor_id: scope.doctorId, clinic_id: scope.clinicId })
    assert.deepEqual(read.orders, [['appointment_date', false], ['appointment_time', false], ['id', true]])
  }
  assert.equal(entries[0].last_visit.date, appointments.at(-1).appointment_date)
  const profileIds = f.calls.filter(c => c.table === 'patients').flatMap(c => c.includes.id)
  assert.equal(profileIds.includes('outside'), false)
  assert.equal(profileIds.length, 31)
})

test('search matches name, email and phone before pagination and reuses summary reads', async t => {
  const f = fixture({ patients: [patient('one', 'Alice Example'), patient('two', 'Bob Example'), patient('three', 'Carol Example')],
    appointments: ['one', 'two', 'three'].map((id, i) => appointment(`a-${id}`, id, `2026-10-0${i + 1}`)) })
  t.after(f.dispose)
  const name = await f.getRosterPage({ ...scope, search: 'ALICE', pageSize: 1 })
  assert.deepEqual(name.data.map(p => p.patient.id), ['one'])
  assert.equal(name.pagination.total, 1)
  const email = await f.getRosterPage({ ...scope, search: 'two@example.test' })
  assert.deepEqual(email.data.map(p => p.patient.id), ['two'])
  const phone = await f.getRosterPage({ ...scope, search: '555-three' })
  assert.deepEqual(phone.data.map(p => p.patient.id), ['three'])
  const second = await f.getRosterPage({ ...scope, search: 'example', page: 2, pageSize: 1 })
  assert.deepEqual(second.data.map(p => p.patient.id), ['two'])
  assert.deepEqual(second.pagination, { page: 2, pageSize: 1, total: 3, pages: 3 })
  assert.equal(f.calls.filter(c => c.table === 'appointments').length, 1)
})

test('only current-page latest note bodies are loaded; tag metadata is paged and scoped', async t => {
  const appointments = [appointment('a-one', 'one', '2026-10-06'), appointment('a-two', 'two', '2026-10-05'),
    ...Array.from({ length: 1005 }, (_, i) => appointment(`old-${i}`, 'one', '2025-01-01'))]
  const notes = [note('note-latest', 'a-one', { tags: ['Follow-up'] }), note('note-page-two', 'a-two'),
    ...Array.from({ length: 1005 }, (_, i) => note(`old-note-${i}`, `old-${i}`, { tags: ['History'] })),
    note('foreign-clinic', 'a-one', { clinic_id: 'clinic-b', tags: ['PRIVATE'] }),
    note('foreign-doctor', 'a-one', { doctor_id: 'doctor-b', tags: ['PRIVATE'] })]
  const f = fixture({ patients: [patient('one'), patient('two')], appointments, notes })
  t.after(f.dispose)
  const result = await f.getRosterPage({ ...scope, pageSize: 1 })
  assert.deepEqual(result.data.map(p => p.patient.id), ['one'])
  assert.equal(result.data[0].last_notes.notes, 'Body of note-latest')
  assert.deepEqual([...result.data[0].visit_tags].sort(), ['Follow-up', 'History'])
  const metadata = f.calls.filter(c => c.table === 'session_notes' && c.select.includes('appointment:'))
  assert.deepEqual(metadata.map(c => c.range), [[0, 499], [500, 999], [1000, 1499]])
  for (const call of metadata) {
    assert.deepEqual(call.includes['appointment.patient_id'], ['one'])
    assert.deepEqual(call.equals, { doctor_id: 'doctor-a', clinic_id: 'clinic-a' })
    assert.equal(/\bnotes\b|\bdiagnosis\b|\bprescription\b/.test(call.select), false)
  }
  const bodies = f.calls.filter(c => c.table === 'session_notes' && !c.select.includes('appointment:'))
  assert.equal(bodies.length, 1)
  assert.deepEqual(bodies[0].includes.id, ['note-latest'])
  assert.deepEqual(bodies[0].equals, { doctor_id: 'doctor-a', clinic_id: 'clinic-a' })
})

test('older schema without tags still returns last notes and avoids repeat missing-column failures', async t => {
  const f = fixture({ patients: [patient('one')], appointments: [appointment('a-one', 'one', '2026-10-06')],
    notes: [note('n-one', 'a-one')], tagsMissing: true })
  t.after(f.dispose)
  for (let i = 0; i < 2; i++) {
    const result = await f.getRosterPage(scope)
    assert.deepEqual(result.data[0].visit_tags, [])
    assert.equal(result.data[0].last_notes.notes, 'Body of n-one')
  }
  const metadata = f.calls.filter(c => c.table === 'session_notes' && c.select.includes('appointment:'))
  assert.equal(metadata.filter(c => /\btags\b/.test(c.select)).length, 1)
  assert.equal(metadata.filter(c => !/\btags\b/.test(c.select)).length, 2)
})

test('unrelated note failures propagate instead of masquerading as an older schema', async t => {
  const f = fixture({ patients: [patient('one')], appointments: [appointment('a-one', 'one', '2026-10-06')] })
  t.after(f.dispose)
  for (const failure of [{ code: '42501', message: 'permission denied for tags' }, { code: '42703', message: 'column appointment_time does not exist' }]) {
    f.failNoteMetadata(failure)
    await assert.rejects(f.getRosterPage(scope), error => error === failure)
  }
  assert.equal(f.calls.filter(c => c.table === 'session_notes').length, 2)
})

test('concurrent requests can both recover when tags are absent', async t => {
  const f = fixture({ patients: [patient('one')], appointments: [appointment('a-one', 'one', '2026-10-06')],
    notes: [note('n-one', 'a-one')], tagsMissing: true })
  t.after(f.dispose)
  const results = await Promise.all([f.getRosterPage(scope), f.getRosterPage(scope)])
  for (const result of results) {
    assert.equal(result.data[0].last_notes.notes, 'Body of n-one')
    assert.deepEqual(result.data[0].visit_tags, [])
  }
})

test('appointment changes invalidate only the matching clinic/doctor summary', async t => {
  const f = fixture({ patients: [patient('one')], appointments: [appointment('a-one', 'one', '2026-10-06')] })
  t.after(f.dispose)
  await f.getRosterPage(scope)
  f.tables.appointments.push(appointment('new-visit', 'one', '2026-10-07'))
  f.changes.emit('changed', { clinic_id: 'clinic-b', doctor_id: 'doctor-a' })
  f.changes.emit('changed', { clinic_id: 'clinic-a', doctor_id: 'doctor-b' })
  assert.equal((await f.getRosterPage(scope)).data[0].total_appointments, 1)
  f.changes.emit('changed', { clinic_id: 'clinic-a', doctor_id: 'doctor-a' })
  const fresh = await f.getRosterPage(scope)
  assert.equal(fresh.data[0].total_appointments, 2)
  assert.equal(fresh.data[0].last_visit.date, '2026-10-07')
  assert.equal(f.calls.filter(c => c.table === 'appointments').length, 2)
})
