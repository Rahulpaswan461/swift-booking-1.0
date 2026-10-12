import supabase from '../config/supabase.js'
import { createCachedLoader } from '../utils/cachedLoader.js'
import { appointmentChanges } from '../realtime/server.js'

// No SQL migration required. Read compact appointment metadata, never every
// historical note's body. Cache briefly across page/search requests.
const rosterKey = (clinicId, doctorId) => `${clinicId}:${doctorId}`
export async function readAllPages(buildQuery, pageSize = 500) {
  const rows = []
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) return rows
  }
}
// The factory lets tests supply an isolated database and event bus.
export function createDoctorRoster({ db, changes }) {
  let supportsTags = true
  const loadSummary = createCachedLoader(async key => {
    const [clinicId, doctorId] = key.split(':')
    const appointments = await readAllPages(() => db.from('appointments')
      .select('id, patient_id, appointment_date, appointment_time, status')
      .eq('doctor_id', doctorId).eq('clinic_id', clinicId)
      .order('appointment_date', { ascending: false }).order('appointment_time', { ascending: false }).order('id'))
    const byPatient = new Map()
    for (const appt of appointments) {
      if (!appt.patient_id) continue
      let entry = byPatient.get(appt.patient_id)
      if (!entry) {
        entry = { patient: { id: appt.patient_id }, total_appointments: 0, completed_sessions: 0, upcoming: 0,
          last_visit: { date: appt.appointment_date, time: appt.appointment_time, status: appt.status } }
        byPatient.set(appt.patient_id, entry)
      }
      entry.total_appointments++
      if (appt.status === 'completed') entry.completed_sessions++
      if (appt.status === 'confirmed') entry.upcoming++
    }
    const ids = [...byPatient.keys()]
    for (let offset = 0; offset < ids.length; offset += 200) {
      const { data, error } = await db.from('patients').select('id, name, email, phone').in('id', ids.slice(offset, offset + 200))
      if (error) throw error
      for (const patient of data || []) byPatient.get(patient.id).patient = patient
    }
    return [...byPatient.values()]
  }, { ttlMs: 15_000, maxEntries: 50 })

  const invalidate = appt => loadSummary.invalidate(rosterKey(appt.clinic_id, appt.doctor_id))
  changes.on('changed', invalidate)

  async function getRosterPage({ clinicId, doctorId, page, search, pageSize = 25 }) {
    const all = await loadSummary(rosterKey(clinicId, doctorId))
    const query = search.toLowerCase()
    const matching = all.filter(({ patient }) => !query ||
      [patient.name, patient.email, patient.phone].some(value => String(value || '').toLowerCase().includes(query)))
    const entries = matching.slice((page - 1) * pageSize, page * pageSize).map(entry => ({ ...entry, last_notes: null, visit_tags: [] }))
    const byPatient = new Map(entries.map(entry => [entry.patient.id, entry]))
    const latest = new Map()
    if (entries.length) {
      const readNoteMetadata = () => readAllPages(() => db.from('session_notes')
        .select(`id, ${supportsTags ? 'tags, ' : ''}appointment:appointments!inner(patient_id, appointment_date, appointment_time)`)
        .eq('doctor_id', doctorId).eq('clinic_id', clinicId)
        .in('appointment.patient_id', [...byPatient.keys()]).order('id'))
      let notes
      try {
        notes = await readNoteMetadata()
      } catch (error) {
        // Existing installations can predate migration 011. Keep the roster
        // usable there without hiding outages or permission errors. Once the
        // missing column is confirmed, avoid retrying it on every page request.
        if (!['42703', 'PGRST204'].includes(error.code) || !/\btags\b/i.test(error.message || '')) throw error
        supportsTags = false
        notes = await readNoteMetadata()
      }
      for (const note of notes) {
        const appt = Array.isArray(note.appointment) ? note.appointment[0] : note.appointment
        const entry = byPatient.get(appt?.patient_id)
        if (!entry) continue
        for (const tag of note.tags || []) if (!entry.visit_tags.includes(tag)) entry.visit_tags.push(tag)
        const rank = `${appt.appointment_date}T${appt.appointment_time}:${note.id}`
        if (!latest.has(appt.patient_id) || latest.get(appt.patient_id).rank < rank) latest.set(appt.patient_id, { id: note.id, rank })
      }
      if (latest.size) {
        const { data, error } = await db.from('session_notes').select('id, notes, diagnosis, follow_up_date')
          .eq('doctor_id', doctorId).eq('clinic_id', clinicId).in('id', [...latest.values()].map(n => n.id))
        if (error) throw error
        const details = new Map((data || []).map(note => [note.id, note]))
        for (const [patientId, note] of latest) byPatient.get(patientId).last_notes = details.get(note.id) || null
      }
    }
    return { data: entries, pagination: { page, pageSize, total: matching.length, pages: Math.ceil(matching.length / pageSize) } }
  }
  return { getRosterPage, dispose: () => changes.off('changed', invalidate) }
}

export const { getRosterPage } = createDoctorRoster({ db: supabase, changes: appointmentChanges })
