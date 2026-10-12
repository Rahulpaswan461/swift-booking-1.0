import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const results = [], notifications = []
const query = () => {
  const q = { then(resolve, reject) { return Promise.resolve(results.shift()).then(resolve, reject) } }
  for (const name of ['select', 'eq', 'neq', 'update', 'insert', 'single', 'maybeSingle']) q[name] = () => q
  return q
}
globalThis.__bookingFixture = { db: { from: query }, notifications }
const source = (await readFile(new URL('../controllers/Appointment.js', import.meta.url), 'utf8'))
  .replace(/^import .*$/gm, line => line.includes('crypto') ? line : '')
const moduleSource = `
const supabase = globalThis.__bookingFixture.db;
const requireAvailableAppointment = async ({time}) => time;
const notifyAppointmentChange = (...args) => globalThis.__bookingFixture.notifications.push(args);
const logAppointmentEvent = () => {};
const sendBookingConfirmationEmail = async () => {};
const sendRescheduleConfirmationEmail = async () => {};
const sendCancellationEmail = async () => {};
const sendBookingConfirmationSms = async () => {};
const createLogger = () => ({info(){},error(){},warn(){}});
${source}`
const { bookAppointment, rescheduleAppointment, getAppointment, cancelAppointment } = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`)
const req = { tenant: { id: 'clinic-a' }, patient: { patient_id: 'patient-a', contact_type: 'email' },
  body: { fullName: 'Example Patient', phone: '12345', doctor_id: 'doctor-a', appointment_date: '2026-10-06', appointment_time: '10:00' } }
const response = () => ({ status(code) { this.code = code; return this }, json(body) { this.body = body; return this } })

await test('successful booking notifies the assigned doctor after the database insert', async () => {
  notifications.length = 0
  const appointment = { id: 'appointment-a', doctor_id: 'doctor-a', clinic_id: 'clinic-a', appointment_date: '2026-10-06' }
  results.push({ data: { id: 'doctor-a', clinic_id: 'clinic-a' } }, {}, { data: appointment }, { data: { name: 'Example Patient' } })
  const res = response()
  await bookAppointment(req, res)
  assert.equal(res.code, 201)
  assert.deepEqual(notifications, [[appointment, 'booked']])
  assert.equal(results.length, 0)
})

await test('failed and conflicting bookings never generate a new-appointment event', async () => {
  notifications.length = 0
  results.push({ data: { id: 'doctor-a', clinic_id: 'clinic-a' } }, {}, { error: new Error('write failed') })
  let res = response()
  await bookAppointment(req, res)
  assert.equal(res.code, 400)
  results.push({ data: { id: 'doctor-a', clinic_id: 'clinic-a' } }, {}, { error: {code:'23505'} })
  res = response()
  await bookAppointment(req, res)
  assert.equal(res.code, 409)
  assert.equal(notifications.length, 0)
  assert.equal(results.length, 0)
})

await test('rescheduling supports schemas without reminder_sent and publishes only after success', async () => {
  notifications.length = 0
  const appointment = { id: 'appointment-a', doctor_id: 'doctor-a', clinic_id: 'clinic-a', appointment_date: '2098-01-01', status: 'confirmed', cancel_token: 'test-token' }
  const request = { ...req, params: { id: appointment.id, token: 'test-token' }, body: { appointment_date: '2099-01-02', appointment_time: '10:00' } }
  results.push({ data: appointment }, { error: { code: 'PGRST204', message: 'Could not find reminder_sent column' } }, {data:{id:appointment.id}})
  const res = response()
  await rescheduleAppointment(request, res)
  assert.equal(res.code, 200)
  assert.equal(notifications.length, 1)
  assert.equal(notifications[0][1], 'rescheduled')
  assert.equal(notifications[0][2].previousDate, '2098-01-01')
  assert.equal(results.length, 0)
  notifications.length = 0
  results.push({ data: appointment }, { error: { code: '08006', message: 'connection lost' } })
  const failed = response()
  await rescheduleAppointment(request, failed)
  assert.equal(failed.code, 400)
  assert.equal(notifications.length, 0)
})

await test('appointment details and cancellation require the private appointment link',async()=>{
 const request={tenant:{id:'clinic-a'},params:{id:'appointment-a'},body:{}}
 for(const handler of [getAppointment,cancelAppointment]){const res=response();await handler(request,res);assert.equal(res.code,403)}
 assert.equal(results.length,0)
})
await test('repeated cancellation does not send another live update',async()=>{
 notifications.length=0;results.push({data:{status:'cancelled'}})
 const res=response();await cancelAppointment({tenant:{id:'clinic-a'},params:{id:'appointment-a',token:'test-token'}},res)
 assert.equal(res.code,200);assert.equal(notifications.length,0);assert.equal(results.length,0)
})
await test('rescheduling cannot mutate an appointment from another clinic',async()=>{
 results.push({data:{id:'a',clinic_id:'other',cancel_token:'test-token',status:'confirmed'}})
 const res=response();await rescheduleAppointment({...req,params:{id:'a',token:'test-token'}},res)
 assert.equal(res.code,403);assert.equal(results.length,0)
})
