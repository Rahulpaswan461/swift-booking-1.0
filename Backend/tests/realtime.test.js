import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { io as connect } from 'socket.io-client'
import jwt from 'jsonwebtoken'
import { createRealtimeServer, notifyAppointmentChange } from '../realtime/server.js'
import { createStaffAuthenticator } from '../realtime/auth.js'
import { isAllowedOrigin } from '../config/origins.js'

const secret = 'test-secret-for-local-integration-only'
const sign = (role, clinic_id = 'clinic-a', id = 'doctor-a', expiresIn = '1h') => jwt.sign({ role, clinic_id, id }, secret, { expiresIn })
const db = { from(table) {
  const filters = {}
  return { select() { return this }, eq(key, value) { filters[key] = value; return this }, async single() {
    if (filters.id === 'db-error') return { error: new Error('offline') }
    return { data: { id: filters.id, clinic_id: filters.clinic_id, is_active: filters.id !== 'inactive' } }
  } }
} }
const authenticate = createStaffAuthenticator({ secret, db,
  loadSubscription: async clinic_id => ({ clinic: { is_active: clinic_id !== 'inactive' }, subscription: null }), earlyAccess: true })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

await test('authentication rejects invalid/expired tokens, wrong roles, inactive accounts and distinguishes outages', async () => {
  for (const token of [null, 'invalid', sign('patient'), sign('doctor', '', 'doctor-a'), sign('doctor', 'clinic-a', 'doctor-a', -1)]) {
    await assert.rejects(authenticate(token), error => error.code === 'unauthorized')
  }
  await assert.rejects(authenticate(sign('doctor', 'clinic-a', 'inactive')), error => error.code === 'forbidden')
  await assert.rejects(authenticate(sign('admin', 'inactive', 'admin-a')), error => error.code === 'forbidden')
  await assert.rejects(authenticate(sign('doctor', 'clinic-a', 'db-error')), error => error.code === 'unavailable')
  assert.equal((await authenticate(sign('admin', 'clinic-a', 'admin-a'))).role, 'admin')
  const paid = createStaffAuthenticator({ secret, db, loadSubscription: async () => ({ clinic: { is_active: true }, subscription: null }), earlyAccess: false })
  await assert.rejects(paid(sign('doctor')), error => error.code === 'forbidden')
  const outage = createStaffAuthenticator({ secret, db, loadSubscription: async () => { throw new Error('Database unavailable') }, earlyAccess: true })
  await assert.rejects(outage(sign('doctor')), error => error.code === 'unavailable')
})

await test('WebSocket publications reach only the assigned doctor and clinic admins, including after reconnect', async () => {
  const server = createServer()
  const io = createRealtimeServer(server, { authenticate, allowedOrigin: isAllowedOrigin })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  const sockets = []
  const client = async token => {
    const socket = connect(url, { transports: ['websocket'], forceNew: true, auth: { token }, extraHeaders: { Origin: 'http://localhost:5173' }, reconnection: false })
    sockets.push(socket)
    await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject) })
    return socket
  }
  try {
    const doctor = await client(sign('doctor'))
    const anotherDoctor = await client(sign('doctor', 'clinic-a', 'doctor-b'))
    const admin = await client(sign('admin', 'clinic-a', 'admin-a'))
    const otherClinic = await client(sign('admin', 'clinic-b', 'admin-b'))
    const doctorEvents = [], adminEvents = [], leaks = []
    doctor.on('appointment:changed', e => doctorEvents.push(e))
    admin.on('appointment:changed', e => adminEvents.push(e))
    anotherDoctor.on('appointment:changed', e => leaks.push(e))
    otherClinic.on('appointment:changed', e => leaks.push(e))
    // Client-controlled room requests have no server handler.
    anotherDoctor.emit('join', 'doctor:clinic-a:doctor-a')
    const appt = { id: 'appointment-a', doctor_id: 'doctor-a', clinic_id: 'clinic-a', appointment_date: '2026-10-06', notes: 'private medical notes', cancel_token: 'secret' }
    for (const type of ['booked', 'rescheduled', 'cancelled', 'completed', 'no_show', 'notes_updated']) {
      notifyAppointmentChange(appt, type, { previousDate: '2026-10-05' })
    }
    await delay(100)
    assert.equal(doctorEvents.length, 6)
    assert.equal(adminEvents.length, 6)
    assert.equal(leaks.length, 0)
    assert.equal(doctorEvents[1].previousDate, '2026-10-05')
    assert.equal(JSON.stringify(doctorEvents).includes('private medical notes'), false)
    assert.equal(JSON.stringify(doctorEvents).includes('secret'), false)
    doctor.disconnect()
    doctor.connect()
    await new Promise(resolve => doctor.once('connect', resolve))
    notifyAppointmentChange(appt, 'booked')
    await delay(50)
    assert.equal(doctorEvents.length, 7)
    const expired = await client(sign('doctor', 'clinic-a', 'short-session', 1))
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Expired socket stayed connected')), 2000)
      expired.once('session:expired', () => { clearTimeout(timer); resolve() })
    })
  } finally { sockets.forEach(s => s.disconnect()); await new Promise(resolve => io.close(resolve)) }
})

await test('origin validation rejects lookalike domains and unexpected protocols', () => {
  assert.equal(isAllowedOrigin('https://clinic.healibrate.com'), true)
  assert.equal(isAllowedOrigin('https://healibrate.com.evil.example'), false)
  assert.equal(isAllowedOrigin('ftp://healibrate.com'), false)
})
