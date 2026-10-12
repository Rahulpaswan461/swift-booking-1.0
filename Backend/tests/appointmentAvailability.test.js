import test from 'node:test'
import assert from 'node:assert/strict'
import {availableAppointments,requireAvailableAppointment,clinicClock} from '../services/appointmentAvailability.js'
import {generateSlots,getDayAbb} from '../utils/slotUtils.js'
const date = '2030-01-07' // Monday
function fixture(overrides={}) {
  const records = {doctors:{id:'doctor',clinic_id:'clinic',is_active:true},doctor_schedules:{working_days:['Mon'],start_time:'09:00:00',end_time:'11:00:00',slot_duration_min:30},doctor_unavailability:[{date,start_time:'10:00:00',end_time:'10:30:00'}],appointments:[{appointment_time:'09:30:00'}],...overrides}
  return {from(table){const q={then(resolve){return Promise.resolve(records[table]?.error ? records[table] : {data:records[table]}).then(resolve)}};for(const op of ['select','eq','neq','in','maybeSingle']) q[op]=()=>q;return q}}
}
const opts=()=>({db:fixture(),clinicId:'clinic',doctorId:'doctor',date,now:new Date('2030-01-07T03:00:00Z')})
test('slots consistently exclude booked HH:mm:ss values, blocked times and past clinic-local times',async()=>{
  assert.deepEqual(await availableAppointments(opts()),['09:00','10:30'])
  assert.deepEqual(await availableAppointments({...opts(),now:new Date('2030-01-07T04:00:00Z')}),['10:30'])
  assert.deepEqual(await availableAppointments({...opts(),date:'2029-12-31'}),[])
})
test('booking rejects invalid dates/times, inactive doctors, off-days and unavailable slots',async()=>{
  for(const time of ['25:00','09:15','09:30','10:00']) await assert.rejects(requireAvailableAppointment({...opts(),time}))
  for(const invalid of ['2030-02-30','invalid','2030-1-7']) await assert.rejects(availableAppointments({...opts(),date:invalid}),{status:400})
  await assert.rejects(availableAppointments({...opts(),db:fixture({doctors:{is_active:false}})}),{status:404})
  assert.deepEqual(await availableAppointments({...opts(),date:'2030-01-08'}),[])
  assert.equal(await requireAvailableAppointment({...opts(),time:'10:30:00'}),'10:30')
})
test('availability fails closed on schedule, blocked-time or booking database errors',async()=>{
  for(const table of ['doctors','doctor_schedules','doctor_unavailability','appointments']) await assert.rejects(availableAppointments({...opts(),db:fixture({[table]:{error:{code:'08006'}}})}),{status:503})
})
test('slot durations cannot loop forever; numeric strings and clinic-local midnight work',()=>{
  for(const value of [0,-1,'bad',Infinity]) assert.deepEqual(generateSlots('09:00','10:00',value),[])
  assert.deepEqual(generateSlots('09:00','10:00','30'),['09:00','09:30'])
  assert.deepEqual(clinicClock('Asia/Kolkata',new Date('2030-01-06T19:00:00Z')),{date:'2030-01-07',time:'00:30'})
  assert.equal(getDayAbb(date),'Mon')
})
