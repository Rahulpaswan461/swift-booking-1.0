import { useState, useEffect } from 'react'
import { doctorApi } from '../../api/axios'
import { useNavigate } from 'react-router-dom'
import { DoctorSidebar } from '../../components/Sidebar'
import StatusBadge from '../../components/StatusBadge'

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Local-timezone date string — toISOString() is UTC and shows the wrong
// day for IST users between midnight and 05:30
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function StatCard({ label, value, color, icon }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', icon: 'text-green-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'text-amber-600' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', icon: 'text-gray-500' },
  }
  const style = colorMap[color]

  return (
    <div className={`rounded-2xl border-2 p-6 ${style.bg} ${style.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-3xl font-bold ${style.text}`}>{value}</p>
          <p className={`text-xs font-semibold mt-1 ${style.text} opacity-80 uppercase tracking-wide`}>{label}</p>
        </div>
        {icon && (
          <div className={`text-2xl ${style.icon}`}>{icon}</div>
        )}
      </div>
    </div>
  )
}

const EVENT_LABELS = {
  booked: { label: 'Booked', color: 'text-blue-600', dot: 'bg-blue-400' },
  rescheduled: { label: 'Rescheduled', color: 'text-amber-600', dot: 'bg-amber-400' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', dot: 'bg-red-400' },
  completed: { label: 'Completed', color: 'text-green-600', dot: 'bg-green-500' },
  no_show: { label: 'Marked no-show', color: 'text-gray-500', dot: 'bg-gray-400' },
}

function eventDescription(ev) {
  if (ev.event_type === 'rescheduled' && ev.details?.from_time) {
    return `${formatTime(ev.details.from_time)}, ${formatDate(ev.details.from_date)} → ${formatTime(ev.details.to_time)}, ${formatDate(ev.details.to_date)}`
  }
  return null
}

/**
 * Patient History Modal — patient profile, visit stats, and the full
 * booking lifecycle (booked → rescheduled → cancelled) per appointment.
 */
function PatientHistoryModal({ patient, onClose }) {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const patientId = patient.id || patient.patient_id
    doctorApi.get(`/doctor/patient/${patientId}/history`)
      .then(res => setHistory(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [patient])

  const p = history?.patient || patient
  const summary = history?.summary

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-scale-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/15 font-bold text-white">
              {(p?.name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{p?.name || 'Patient'}</h2>
              <p className="text-sm text-brand-100 mt-0.5 truncate">
                {[p?.phone, p?.email].filter(Boolean).join(' · ') || 'No contact on file'}
                {p?.date_of_birth && ` · DOB ${formatDate(p.date_of_birth)}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition p-1 rounded-lg hover:bg-white/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Visit stats strip */}
        {summary && (
          <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-surface-50/60 flex-shrink-0">
            {[
              { label: 'Total visits', value: summary.total, cls: 'text-ink-900' },
              { label: 'Completed', value: summary.completed, cls: 'text-green-600' },
              { label: 'Cancelled', value: summary.cancelled, cls: 'text-red-500' },
              { label: 'No-shows', value: summary.no_show, cls: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="px-4 py-3 text-center">
                <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl border border-gray-100 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : !history?.appointments?.length ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No appointments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.appointments.map((appt, i) => (
                <div
                  key={appt.id}
                  className="rounded-xl border border-gray-100 p-4 animate-fade-up opacity-0"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full">
                      {formatTime(appt.appointment_time)}
                    </span>
                    <span className="text-sm text-gray-500">{formatDate(appt.appointment_date)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      appt.status === 'completed' ? 'bg-green-50 text-green-700' :
                      appt.status === 'confirmed' ? 'bg-blue-50 text-blue-700' :
                      appt.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {appt.status}
                    </span>
                  </div>

                  {/* Booking lifecycle timeline */}
                  {appt.events?.length > 0 && (
                    <div className="mt-2 mb-1 space-y-1.5 border-l-2 border-gray-100 pl-3">
                      {appt.events.map((ev, j) => {
                        const meta = EVENT_LABELS[ev.event_type] || { label: ev.event_type, color: 'text-gray-500', dot: 'bg-gray-300' }
                        const desc = eventDescription(ev)
                        return (
                          <div key={j} className="flex items-baseline gap-2 text-xs">
                            <span className={`relative -left-[19px] inline-block h-2 w-2 flex-shrink-0 rounded-full ${meta.dot}`} />
                            <span className={`-ml-3 font-semibold ${meta.color}`}>{meta.label}</span>
                            {desc && <span className="text-gray-500">{desc}</span>}
                            <span className="ml-auto flex-shrink-0 text-gray-300">
                              {new Date(ev.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {appt.session_notes?.session_notes && (
                    <div className="mt-3 rounded-lg bg-purple-50 border border-purple-100 p-3 space-y-1.5">
                      {appt.session_notes.session_notes.notes && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold text-purple-700">Notes:</span> {appt.session_notes.session_notes.notes}
                        </p>
                      )}
                      {appt.session_notes.session_notes.diagnosis && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold text-purple-700">Diagnosis:</span> {appt.session_notes.session_notes.diagnosis}
                        </p>
                      )}
                      {appt.session_notes.session_notes.prescription && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold text-purple-700">Prescription:</span> {appt.session_notes.session_notes.prescription}
                        </p>
                      )}
                      {appt.session_notes.session_notes.follow_up_date && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold text-purple-700">Follow-up:</span> {formatDate(appt.session_notes.session_notes.follow_up_date)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Session Notes Modal — lets the doctor add/view notes for an appointment
 */
function SessionNotesModal({ appointment, onClose, onSave }) {
  const [notes, setNotes] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [prescription, setPrescription] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [existing, setExisting] = useState(null)

  useEffect(() => {
    // Fetch existing notes if any
    doctorApi.get(`/doctor/appointments/${appointment.id}/notes`)
      .then(res => {
        if (res.data.data) {
          setExisting(res.data.data)
          setNotes(res.data.data.notes || '')
          setDiagnosis(res.data.data.diagnosis || '')
          setPrescription(res.data.data.prescription || '')
          setFollowUpDate(res.data.data.follow_up_date || '')
        }
      })
      .catch(console.error)
  }, [appointment.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await doctorApi.post(`/doctor/appointments/${appointment.id}/notes`, {
        notes,
        diagnosis: diagnosis || undefined,
        prescription: prescription || undefined,
        follow_up_date: followUpDate || undefined
      })
      onSave?.()
      onClose()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save session notes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Session Notes</h2>
            <p className="text-sm text-brand-100 mt-0.5">
              {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition p-1 rounded-lg hover:bg-white/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Patient info */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <p className="font-semibold text-gray-900">Patient: {appointment.patient.name}</p>
          <p className="text-sm text-gray-500">{appointment.patient.phone}</p>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Session Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Describe the consultation, symptoms, observations..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 resize-none"
              required
            />
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Diagnosis</label>
            <textarea
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              rows={2}
              placeholder="Diagnosis or assessment..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 resize-none"
            />
          </div>

          {/* Prescription */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prescription</label>
            <textarea
              value={prescription}
              onChange={e => setPrescription(e.target.value)}
              rows={3}
              placeholder="Medications, dosage, duration..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 resize-none"
            />
          </div>

          {/* Follow-up */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Follow-up Date</label>
            <input
              type="date"
              value={followUpDate}
              onChange={e => setFollowUpDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !notes.trim()}
            className="px-5 py-2.5 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : existing ? 'Update Notes' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * My Patients tab — roster of everyone this doctor has treated,
 * with total sessions, last visit, and what was last discussed.
 */
function PatientsView({ onOpenHistory }) {
  const [patients, setPatients] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    doctorApi.get('/doctor/patients')
      .then(res => setPatients(res.data.data || []))
      .catch(() => setPatients([]))
  }, [])

  if (patients === null) {
    return (
      <div className="rounded-[24px] border border-surface-100 bg-white p-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="py-4 border-b border-gray-50 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  const filtered = patients.filter(p =>
    !search ||
    p.patient.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.patient.phone?.includes(search) ||
    p.patient.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="overflow-hidden rounded-[24px] border border-surface-100 bg-white shadow-sm">
      <div className="px-6 sm:px-8 py-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 justify-between bg-gradient-to-r from-gray-50 to-white">
        <div>
          <h2 className="font-display font-bold text-gray-900 text-lg">My Patients</h2>
          <p className="text-xs text-gray-500 mt-0.5">{patients.length} patient{patients.length !== 1 ? 's' : ''} under your care</p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email..."
            className="w-full sm:w-72 rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-bold">{search ? 'No patients match your search' : 'No patients yet'}</p>
          <p className="text-sm mt-1">{search ? 'Try a different name or number' : 'Patients appear here after their first booking with you'}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map((p, i) => (
            <div key={p.patient.id}
              className="px-6 sm:px-8 py-5 hover:bg-brand-50/40 transition animate-fade-up opacity-0"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'forwards' }}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Identity */}
                <div className="flex items-center gap-3 lg:w-64 flex-shrink-0">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-brand-100 bg-brand-50 font-semibold text-brand-800">
                    {(p.patient.name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{p.patient.name || 'Unnamed patient'}</p>
                    <p className="text-xs text-gray-500 truncate">{p.patient.phone || p.patient.email}</p>
                  </div>
                </div>

                {/* Session stats */}
                <div className="flex gap-5 lg:w-64 flex-shrink-0 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{p.total_appointments}</p>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Sessions</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{p.completed_sessions}</p>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Completed</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mt-1">{formatDate(p.last_visit.date)}</p>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Last visit</p>
                  </div>
                  <div className="mt-1"><StatusBadge status={p.last_visit.status} /></div>
                </div>

                {/* Last discussed */}
                <div className="flex-1 min-w-0">
                  {p.last_notes ? (
                    <div className="rounded-xl bg-purple-50/70 border border-purple-100 px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-purple-600 mb-0.5">Last discussed</p>
                      <p className="text-xs text-gray-700 line-clamp-2">
                        {p.last_notes.diagnosis && <span className="font-semibold">{p.last_notes.diagnosis} — </span>}
                        {p.last_notes.notes}
                      </p>
                      {p.last_notes.follow_up_date && (
                        <p className="text-[11px] text-purple-700 font-semibold mt-1">Follow-up: {formatDate(p.last_notes.follow_up_date)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No session notes yet</p>
                  )}
                </div>

                {/* Action */}
                <button
                  onClick={() => onOpenHistory(p.patient)}
                  className="flex-shrink-0 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-lg border border-blue-200 transition"
                >
                  Full history
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DoctorDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('schedule') // 'schedule' | 'patients'
  const [selectedDate, setSelectedDate] = useState(localDateStr())
  const [updating, setUpdating] = useState(null)
  const [notesModal, setNotesModal] = useState(null)
  const [patientHistoryModal, setPatientHistoryModal] = useState(null)
  const navigate = useNavigate()

  const doctor = JSON.parse(localStorage.getItem('doctor') || '{}')

  useEffect(() => {
    if (doctor.first_login) {
      navigate('/doctor/change-password', { replace: true })
    }
  }, [doctor.first_login, navigate])

  const fetchAppointments = async (date) => {
    setLoading(true)
    try {
      const res = await doctorApi.get(`/doctor/appointments?date=${date}`)
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAppointments(selectedDate) }, [selectedDate])

  const handleStatusUpdate = async (appointmentId, status) => {
    setUpdating(appointmentId)
    try {
      await doctorApi.patch(`/doctor/appointments/${appointmentId}/status`, { status })
      fetchAppointments(selectedDate)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.')
    } finally {
      setUpdating(null)
    }
  }

  // Generate today + next 6 days for date selector (local time)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return localDateStr(d)
  })

  const todayStr = localDateStr()
  const isToday = selectedDate === todayStr

  return (
    <div className="flex min-h-screen bg-surface-50">
      <DoctorSidebar />

      <main className="flex-1 p-6 sm:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display text-4xl font-semibold text-ink-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Dr. {doctor.fullName?.split(' ')[0]}
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            {view === 'patients'
              ? 'Your patients, their sessions, and what you last discussed'
              : isToday ? "Here's your schedule for today" : `Appointments for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
          </p>
        </div>

        {/* View switcher */}
        <div className="mb-8 inline-flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
          {[
            { key: 'schedule', label: 'Schedule' },
            { key: 'patients', label: 'My Patients' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition
                ${view === t.key ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {view === 'patients' && (
          <PatientsView onOpenHistory={(patient) => setPatientHistoryModal(patient)} />
        )}

        {view === 'schedule' && (<>
        {/* Date Selector */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {days.map(day => {
            const d = new Date(`${day}T00:00:00`)
            const isActive = selectedDate === day
            return (
              <button key={day} onClick={() => setSelectedDate(day)}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border-2 text-sm transition-all font-semibold
                  ${isActive ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-600/30' : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50'}`}>
                <span className="text-xs opacity-75">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="text-lg leading-tight">{d.getDate()}</span>
                {day === todayStr && <span className={`text-xs ${isActive ? 'opacity-75' : 'text-brand-600 font-bold'}`}>Today</span>}
              </button>
            )
          })}
          {/* Jump to any upcoming date */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1 pl-2">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Jump to date</label>
            <input
              type="date"
              min={todayStr}
              value={selectedDate}
              onChange={e => e.target.value && setSelectedDate(e.target.value)}
              className={`rounded-2xl border-2 px-3 py-2.5 text-sm font-semibold transition
                ${!days.includes(selectedDate) ? 'border-brand-600 text-brand-700 bg-brand-50' : 'border-gray-200 text-gray-700 bg-white'}`}
            />
          </div>
        </div>

        {/* Up next — first confirmed appointment still ahead of now */}
        {isToday && (() => {
          const nowHm = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
          const next = data?.summary?.data?.find(a => a.status === 'confirmed' && a.appointment_time >= nowHm)
          if (!next) return null
          return (
            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-5 shadow-sm">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/25">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="10" cy="10" r="7.5" />
                  <path d="M10 6v4l2.5 2.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Up next</p>
                <p className="truncate font-semibold text-ink-900">
                  {formatTime(next.appointment_time)} — {next.patient?.name}
                </p>
                {next.notes && <p className="truncate text-xs text-gray-500">{next.notes}</p>}
              </div>
              <button
                onClick={() => setPatientHistoryModal(next.patient)}
                className="flex-shrink-0 rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
              >
                View history
              </button>
            </div>
          )
        })()}

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Appointments" value={data.summary.total} color="blue"
              icon={<svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M7 2.5v3M13 2.5v3M3 8.5h14" strokeLinecap="round"/></svg>} />
            <StatCard label="Pending" value={data.summary.pending} color="gray"
              icon={<svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v4l2.5 2.5" strokeLinecap="round"/></svg>} />
            <StatCard label="Completed" value={data.summary.completed} color="green"
              icon={<svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.5"/><path d="M6.5 10l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
            <StatCard label="No Show" value={data.summary.no_show} color="amber"
              icon={<svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.5"/><path d="M7 7l6 6M13 7l-6 6" strokeLinecap="round"/></svg>} />
          </div>
        )}

        {/* Appointments List */}
        <div className="overflow-hidden rounded-[24px] border border-surface-100 bg-white shadow-sm">
          <div className="px-6 sm:px-8 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <h2 className="font-display font-bold text-gray-900 text-lg">Appointments</h2>
            {data && <span className="text-sm text-gray-500 font-semibold">{data.summary.total} total</span>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <div className="text-center">
                <svg className="animate-spin w-8 h-8 mx-auto mb-3" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                  <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="font-medium">Loading appointments...</p>
              </div>
            </div>
          ) : !(data?.summary?.data?.length) ? (
            <div className="text-center py-20 text-gray-400">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 text-gray-300">
                <svg width="26" height="26" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="14" height="13" rx="2"/>
                  <path d="M7 2.5v3M13 2.5v3M3 8.5h14" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="font-bold text-lg text-gray-500">No appointments scheduled</p>
              <p className="text-sm mt-1">You're free on this day</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.summary.data.map((appt, i) => (
                <div key={appt.id}
                  className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-blue-50 transition animate-fade-up opacity-0"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}>

                  {/* Time Badge */}
                  <div className="flex-shrink-0">
                  <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-center">
                      <p className="text-lg font-bold text-brand-700">{formatTime(appt.appointment_time)}</p>
                      <p className="text-xs text-brand-600 font-semibold mt-1">Scheduled</p>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-900">{appt.patient.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {appt.patient.phone} {appt.notes && `• ${appt.notes}`}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    <StatusBadge status={appt.status} />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Session Notes button — always shown */}
                    <button
                      onClick={() => setNotesModal(appt)}
                      className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-bold rounded-lg border-2 border-purple-200 transition shadow-sm hover:shadow-md flex items-center gap-1.5"
                      title="Add / View session notes"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M11 2v3h3M5 9h6M5 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Notes
                    </button>

                    {/* View Patient History button */}
                    <button
                      onClick={() => setPatientHistoryModal(appt.patient)}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-lg border-2 border-blue-200 transition shadow-sm hover:shadow-md flex items-center gap-1.5"
                      title="View patient history"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M5 9h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      History
                    </button>

                    {appt.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(appt.id, 'completed')}
                          disabled={updating === appt.id}
                          className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-bold rounded-lg border-2 border-green-200 transition disabled:opacity-50 shadow-sm hover:shadow-md">
                          {updating === appt.id ? '...' : 'Mark done'}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(appt.id, 'no_show')}
                          disabled={updating === appt.id}
                          className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-bold rounded-lg border-2 border-amber-200 transition disabled:opacity-50 shadow-sm hover:shadow-md">
                          No Show
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>)}
      </main>

      {/* Session Notes Modal */}
      {notesModal && (
        <SessionNotesModal
          appointment={notesModal}
          onClose={() => setNotesModal(null)}
          onSave={() => fetchAppointments(selectedDate)}
        />
      )}

      {/* Patient History Modal */}
      {patientHistoryModal && (
        <PatientHistoryModal
          patient={patientHistoryModal}
          onClose={() => setPatientHistoryModal(null)}
        />
      )}
    </div>
  )
}

