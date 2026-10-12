import { generateSlots, getDayAbb, isSlotBlocked } from '../utils/slotUtils.js'

export class AvailabilityError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
}
export function clockTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(value) ? value.slice(0, 5) : null
}
export function clinicClock(timezone = 'Asia/Kolkata', now = new Date()) {
  let parts
  try { parts = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(now) }
  catch { return clinicClock('Asia/Kolkata', now) }
  const p = Object.fromEntries(parts.map(p => [p.type, p.value]))
  return {date:`${p.year}-${p.month}-${p.day}`, time:`${p.hour}:${p.minute}`}
}
export async function availableAppointments({db, clinicId, doctorId, date, timezone, excludeId, now}) {
  if (!clinicId || !validDate(date)) throw new AvailabilityError('Choose a valid appointment date.')
  const doctorResult = await db.from('doctors').select('id,clinic_id,is_active').eq('id',doctorId).eq('clinic_id',clinicId).maybeSingle()
  if (doctorResult.error) throw new AvailabilityError('Unable to check the doctor. Please try again.',503)
  if (!doctorResult.data || !doctorResult.data.is_active) throw new AvailabilityError('Doctor is not available at this clinic.',404)
  const clock = clinicClock(timezone, now)
  if (date < clock.date) return []
  const {data:schedule,error:scheduleError} = await db.from('doctor_schedules').select('*').eq('doctor_id',doctorId).maybeSingle()
  if (scheduleError) throw new AvailabilityError('Unable to load the doctor schedule. Please try again.',503)
  if (!schedule || !schedule.working_days?.includes(getDayAbb(date))) return []
  let bookedQuery = db.from('appointments').select('appointment_time').eq('clinic_id',clinicId).eq('doctor_id',doctorId).eq('appointment_date',date).in('status',['confirmed','pending'])
  if (excludeId) bookedQuery = bookedQuery.neq('id',excludeId)
  const [blocked,booked] = await Promise.all([
    db.from('doctor_unavailability').select('date,start_time,end_time').eq('doctor_id',doctorId).eq('date',date),
    bookedQuery,
  ])
  if (blocked.error || booked.error) throw new AvailabilityError('Unable to check availability. Please try again.',503)
  const times = new Set((booked.data || []).map(row => clockTime(row.appointment_time)))
  return generateSlots(schedule.start_time,schedule.end_time,schedule.slot_duration_min).filter(time =>
    (date > clock.date || time > clock.time) && !times.has(time) && !isSlotBlocked(time,date,Number(schedule.slot_duration_min),blocked.data || []))
}
export async function requireAvailableAppointment(options) {
  const time = clockTime(options.time)
  if (!time) throw new AvailabilityError('Choose a valid appointment time.')
  const slots = await availableAppointments(options)
  if (!slots.includes(time)) throw new AvailabilityError('This time is no longer available. Please choose another slot.',409)
  return time
}
