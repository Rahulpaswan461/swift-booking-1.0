import { doctorAccessIssue } from '../../utils/doctorAccessIssue'
import { MetricCard } from '../../components/StaffUI'
import { useState, useEffect, useRef, useMemo } from 'react'
import useDoctorSchedule from '../../hooks/useDoctorSchedule'
import useAppointmentRealtime from '../../hooks/useAppointmentRealtime'
import useApiSnapshot from '../../hooks/useApiSnapshot'
import LiveStatus from '../../components/LiveStatus'
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
function PatientHistoryModal({ patient, onClose, revision }) {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const patientId = patient.id || patient.patient_id
    doctorApi.get(`/doctor/patient/${patientId}/history`, { signal: controller.signal })
      .then(res => { setHistory(res.data.data); setError('') })
      .catch(err => { if (err.code !== 'ERR_CANCELED') setError('Could not load patient history. Please reopen it to retry.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [patient, revision])

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
          <div className="flex-shrink-0 border-b border-gray-100 bg-surface-50/60">
            <div className="grid grid-cols-4 divide-x divide-gray-100">
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
            {/* Patient summary: visit reasons aggregated from tags */}
            {summary.visit_tags?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 px-5 py-2.5">
                <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Visit reasons</span>
                {summary.visit_tags.map(tag => (
                  <span key={tag} className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <p role="alert" className="mb-4 text-sm text-amber-700">{error}</p>}
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
                  {appt.session_notes && (
                    <div className="mt-3 rounded-lg bg-purple-50 border border-purple-100 p-3 space-y-1.5">
                      {appt.session_notes.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pb-1">
                          {appt.session_notes.tags.map(tag => (
                            <span key={tag} className="rounded-full border border-purple-200 bg-white px-2 py-0.5 text-[10px] font-bold text-purple-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {appt.session_notes.notes && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold text-purple-700">Notes:</span> {appt.session_notes.notes}
                        </p>
                      )}
                      {appt.session_notes.diagnosis && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold text-purple-700">Diagnosis:</span> {appt.session_notes.diagnosis}
                        </p>
                      )}
                      {appt.session_notes.prescription && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold text-purple-700">Prescription:</span> {appt.session_notes.prescription}
                        </p>
                      )}
                      {appt.session_notes.follow_up_date && (
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold text-purple-700">Follow-up:</span> {formatDate(appt.session_notes.follow_up_date)}
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
const SUGGESTED_TAGS = ['First visit', 'Follow-up', 'Review', 'Back pain', 'Neck pain', 'Knee pain', 'Post-surgery rehab', 'Sports injury']

function SessionNotesModal({ appointment, onClose, onSave }) {
  const [notes, setNotes] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [prescription, setPrescription] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
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
          setTags(res.data.data.tags || [])
        }
      })
      .catch(console.error)
  }, [appointment.id])

  const toggleTag = (tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 6 ? [...prev, tag] : prev)
  }

  const addCustomTag = () => {
    const t = tagInput.trim().slice(0, 30)
    if (t && !tags.includes(t) && tags.length < 6) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await doctorApi.post(`/doctor/appointments/${appointment.id}/notes`, {
        notes,
        diagnosis: diagnosis || undefined,
        prescription: prescription || undefined,
        follow_up_date: followUpDate || undefined,
        tags,
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
          {/* Visit tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Visit tags <span className="text-gray-400 font-normal">(why did the patient come? — up to 6)</span>
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[...new Set([...SUGGESTED_TAGS, ...tags])].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition
                    ${tags.includes(tag)
                      ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                maxLength={30}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
                placeholder="Add your own tag…"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button type="button" onClick={addCustomTag}
                className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
                Add
              </button>
            </div>
          </div>

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
function PatientsView({ onOpenHistory, revision }) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ search: '', page: 1 })
  const { data, error, refresh, refreshing } = useApiSnapshot(doctorApi, '/doctor/patients', query)
  const patients = data?.data || null
  const pagination = data?.pagination
  useEffect(() => {
    const timer = setTimeout(() => setQuery(current => current.search === search.trim() ? current : { search: search.trim(), page: 1 }), 300)
    return () => clearTimeout(timer)
  }, [search])
  useEffect(() => { refresh() }, [revision, refresh])
  if (error && !patients) return <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">{error}<button onClick={refresh} className="ml-3 font-semibold underline">Try again</button></div>

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

  const filtered = patients

  return (
    <div className="overflow-hidden rounded-[24px] border border-surface-100 bg-white shadow-sm">
      <div className="px-6 sm:px-8 py-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 justify-between bg-gray-50">
        <div>
          <h2 className="font-display font-bold text-gray-900 text-lg">My Patients</h2>
          <p className="text-xs text-gray-500 mt-0.5">{pagination?.total ?? patients.length} patient{(pagination?.total ?? patients.length) !== 1 ? 's' : ''} under your care</p>
        </div>
        <div className="relative">
          <label className="sr-only" htmlFor="roster-search">Search patients</label>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            id="roster-search"
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
              className="px-6 sm:px-8 py-5 hover:bg-brand-50/40 transition">
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
                    <p className="text-sm font-semibold text-gray-700 mt-1 whitespace-nowrap">{formatDate(p.last_visit.date)}</p>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Last visit</p>
                  </div>
                </div>

                {/* Last discussed */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={p.last_visit.status} />
                    {p.visit_tags?.slice(0, 4).map(tag => (
                      <span key={tag} className="rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                        {tag}
                      </span>
                    ))}
                    {p.visit_tags?.length > 4 && (
                      <span className="text-[10px] font-semibold text-gray-400">+{p.visit_tags.length - 4}</span>
                    )}
                  </div>
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
      {error && <p role="alert" className="px-6 py-3 text-xs text-amber-700">{error}</p>}
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 text-xs text-gray-500">
        <span>{refreshing ? 'Updating…' : `Page ${query.page} of ${Math.max(1, pagination?.pages || 1)}`}</span>
        <div className="flex gap-3"><button disabled={query.page <= 1} onClick={() => setQuery(q => ({ ...q, page: q.page - 1 }))} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-30">Previous</button><button disabled={query.page >= (pagination?.pages || 1)} onClick={() => setQuery(q => ({ ...q, page: q.page + 1 }))} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-30">Next</button></div>
      </div>
    </div>
  )
}

function DashboardIcon({ name, className = 'h-5 w-5' }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    notes: <><path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8m-8 4h5" /></>,
  }
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export default function DoctorDashboard() {
  const [view, setView] = useState('schedule')
  const [selectedDate, setSelectedDate] = useState(localDateStr())
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState(null)
  const [notesModal, setNotesModal] = useState(null)
  const [patientHistoryModal, setPatientHistoryModal] = useState(null)
  const [revision, setRevision] = useState(0)
  const [notice, setNotice] = useState(null)
  const [socketReason, setSocketReason] = useState(null)
  const [actionError, setActionError] = useState('')
  const [recentIds, setRecentIds] = useState(new Set())
  const [clock, setClock] = useState(new Date())
  const timers = useRef(new Map())
  const navigate = useNavigate()
  const { data, loading, refreshing, error, errorDetails, updatedAt, refresh } = useDoctorSchedule(selectedDate)
  const doctor = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('doctor') || '{}') }
    catch { return {} }
  }, [])

  const liveStatus = useAppointmentRealtime({
    onAccessDenied: setSocketReason,
    onResync: () => { refresh(); setRevision(r => r + 1) },
    onChange: event => {
      setRevision(r => r + 1)
      if (event.date === selectedDate || event.previousDate === selectedDate) refresh()
      if (['booked', 'rescheduled', 'cancelled'].includes(event.type)) setNotice(event)
      if (event.type === 'booked') {
        setRecentIds(ids => new Set([...ids, event.appointmentId]))
        clearTimeout(timers.current.get(event.appointmentId))
        timers.current.set(event.appointmentId, setTimeout(() => {
          setRecentIds(ids => { const next = new Set(ids); next.delete(event.appointmentId); return next })
          timers.current.delete(event.appointmentId)
        }, 15_000))
      }
    },
  })

  useEffect(() => {
    if (doctor.first_login) navigate('/doctor/change-password', { replace: true })
  }, [doctor.first_login, navigate])
  useEffect(() => {
    // Local time affects "Up next"; this timer makes no network requests.
    const timer = setInterval(() => setClock(new Date()), 30_000)
    return () => { clearInterval(timer); timers.current.forEach(clearTimeout) }
  }, [])
  const handleStatusUpdate = async (appointmentId, status) => {
    setUpdating(appointmentId)
    setActionError('')
    try {
      await doctorApi.patch(`/doctor/appointments/${appointmentId}/status`, { status })
      refresh()
      setRevision(r => r + 1)
    } catch (err) { setActionError(err.response?.data?.message || 'Could not update this appointment. Please try again.') }
    finally { setUpdating(null) }
  }
  const appointments = data?.summary?.data || []
  const visibleAppointments = appointments.filter(appt => {
    const query = search.trim().toLowerCase()
    return (statusFilter === 'all' || appt.status === statusFilter) &&
      (!query || `${appt.patient?.name || ''} ${appt.patient?.phone || ''} ${appt.patient?.email || ''}`.toLowerCase().includes(query))
  })
  const today = localDateStr(clock)
  const isToday = selectedDate === today
  const nowHm = `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`
  const upcoming = appointments.find(a => a.status === 'confirmed' && (!isToday || a.appointment_time.slice(0, 5) >= nowHm))
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(`${selectedDate}T12:00:00`)
    d.setDate(d.getDate() - 2 + index)
    return localDateStr(d)
  })
  const showNotice = () => {
    if (notice.date) setSelectedDate(notice.date)
    setView('schedule'); setSearch(''); setStatusFilter('all'); refresh(); setNotice(null)
  }
  const summary = data?.summary
  const accessIssue = doctorAccessIssue({ liveStatus, errorDetails, socketReason })
  const blocked = !!accessIssue
  const button = 'rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-600 transition hover:border-brand-300 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-40'

  return (
    <div className="staff-workspace doctor-workspace flex min-h-screen">
      <DoctorSidebar />
      <main className="staff-content min-w-0 flex-1 px-4 pb-10 pt-20 sm:px-7 md:pt-8 xl:px-10">
        <div className="mx-auto max-w-7xl">
          <header className="staff-heading">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">Doctor dashboard</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">Good {clock.getHours() < 12 ? 'morning' : clock.getHours() < 17 ? 'afternoon' : 'evening'}, Dr. {doctor.fullName?.split(' ')[0] || 'Doctor'}.</h1>
              <p className="mt-2 text-sm text-gray-500">{clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-2 pt-1"><LiveStatus status={errorDetails?.subscription_expired || socketReason === 'subscription_expired' ? 'subscription_expired' : liveStatus} /><button className={button} aria-label="Refresh dashboard" title="Refresh dashboard" onClick={() => { refresh(); setRevision(r => r + 1) }} disabled={refreshing || blocked}><DashboardIcon name="refresh" className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></button></div>
          </header>

          {accessIssue && <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">{accessIssue.title}</p><p className="mt-1">{accessIssue.message}</p>{accessIssue.signIn ? <a href="/doctor/login" className="mt-3 inline-flex min-h-11 items-center font-semibold underline">Sign in again</a> : <button onClick={() => window.location.reload()} className="mt-2 font-semibold underline">Check access again</button>}</div>}
          {liveStatus === 'reconnecting' && <p role="status" className="mb-4 text-xs text-amber-700">Reconnecting to live updates. Your schedule will catch up automatically.</p>}
          {notice && <div role="status" aria-live="polite" className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-600"><DashboardIcon name="calendar" /></span>
            <div className="flex-1"><p className="font-semibold">{notice.type === 'booked' ? 'New appointment booked' : notice.type === 'cancelled' ? 'An appointment was cancelled' : 'An appointment was rescheduled'}</p><p className="mt-0.5 text-xs text-brand-700">{formatDate(notice.date)} · Your schedule updates automatically.</p></div>
            <button onClick={showNotice} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-brand-700">{notice.date === selectedDate ? 'Show schedule' : 'View date'}</button>
            <button aria-label="Dismiss notification" onClick={() => setNotice(null)} className="rounded-lg px-2 py-1 text-xl text-brand-500">×</button>
          </div>}
          {!accessIssue && (error || actionError) && <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>{actionError || error}{data && error ? ' Showing your last loaded schedule.' : ''}</span><button className="font-semibold underline" onClick={() => { setActionError(''); refresh() }}>Try again</button></div>}

          {!accessIssue && <>
          <div className="mb-6 flex items-center justify-between border-b border-gray-200">
            <div className="flex gap-6" aria-label="Dashboard views">
              {['schedule', 'patients'].map(tab => <button key={tab} onClick={() => setView(tab)} aria-pressed={view === tab} className={`border-b-2 px-1 pb-3 text-sm font-semibold transition ${view === tab ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>{tab === 'schedule' ? 'My schedule' : 'My patients'}</button>)}
            </div>
            <span className="hidden pb-3 text-[11px] text-gray-400 sm:block">{updatedAt ? `Schedule synced ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Loading your schedule'}</span>
          </div>

          {view === 'patients' ? <PatientsView revision={revision} onOpenHistory={setPatientHistoryModal} /> : <>
            <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Day summary">
              {[
                ['Appointments', summary?.total, 'calendar', 'blue'],
                ['Awaiting visit', summary?.pending, 'clock', 'amber'],
                ['Completed', summary?.completed, 'check', 'green'],
                ['No-show', summary?.no_show, 'calendar', 'violet'],
              ].map(([label, value, icon, tone]) => <MetricCard key={label} label={label} value={value} tone={tone} sub={isToday ? 'Today' : formatDate(selectedDate)} icon={<DashboardIcon name={icon} className="h-5 w-5" />} />)}
            </section>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
              <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white">
                <div className="border-b border-gray-100 p-4 sm:p-5">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink-900">{isToday ? 'Today’s appointments' : 'Your appointments'}</h2><p className="mt-1 text-xs text-gray-400">{formatDate(selectedDate)}</p></div><div className="flex items-center gap-2"><button className={button} onClick={() => setSelectedDate(today)}>Today</button><label className="sr-only" htmlFor="schedule-date">Choose appointment date</label><input id="schedule-date" type="date" value={selectedDate} onChange={e => e.target.value && setSelectedDate(e.target.value)} className="min-w-0 rounded-xl border border-gray-200 bg-white px-2 py-2.5 text-xs text-gray-600" /></div></div>
                  <div className="grid grid-cols-7 gap-1.5" aria-label="Appointment dates">{days.map(day => {
                    const date = new Date(`${day}T12:00:00`)
                    return <button key={day} onClick={() => setSelectedDate(day)} aria-pressed={day === selectedDate} className={`rounded-xl py-3 text-center transition ${day === selectedDate ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}><span className="block text-[10px] uppercase tracking-wide opacity-75">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span><span className="mt-1 block text-lg font-semibold">{date.getDate()}</span><span className={`mx-auto mt-1 block h-1 w-1 rounded-full ${day === today ? day === selectedDate ? 'bg-white' : 'bg-brand-500' : 'bg-transparent'}`} /></button>
                  })}</div>
                </div>
                <div className="border-b border-gray-100 p-4 sm:px-5">
                  <div className="relative mb-3"><DashboardIcon name="search" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search appointments" placeholder="Find a patient by name, phone or email" className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-3 text-xs focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" /></div>
                  <div className="flex flex-wrap items-center gap-1.5">{[['all', 'All'], ['confirmed', 'Awaiting'], ['completed', 'Completed'], ['no_show', 'No-show']].map(([value, label]) => <button key={value} onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${statusFilter === value ? 'bg-ink-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{label}</button>)}<span className="ml-auto text-[11px] text-gray-400">{refreshing && !loading ? 'Updating…' : `${visibleAppointments.length} shown`}</span></div>
                </div>

                {loading && !data ? <div className="space-y-5 p-6" role="status" aria-label="Loading appointments">{[1, 2, 3].map(i => <div key={i} className="flex gap-4 motion-safe:animate-pulse"><div className="h-14 w-16 rounded-xl bg-gray-100" /><div className="flex-1 py-1"><div className="mb-3 h-3 w-2/5 rounded bg-gray-100" /><div className="h-2.5 w-3/5 rounded bg-gray-50" /></div></div>)}</div>
                  : !visibleAppointments.length ? <div className="px-6 py-16 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500"><DashboardIcon name="calendar" /></div><p className="font-semibold text-gray-800">{error && !data ? 'Schedule unavailable' : appointments.length ? 'No matching appointments' : 'A little breathing room'}</p><p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-gray-400">{error && !data ? 'Please retry when the connection is available.' : appointments.length ? 'Try a different name or status filter.' : 'There are no appointments for this day. New bookings will appear here automatically.'}</p>{appointments.length > 0 && <button onClick={() => { setSearch(''); setStatusFilter('all') }} className="mt-3 text-xs font-semibold text-brand-600">Clear filters</button>}</div>
                  : <div className="divide-y divide-gray-100">{visibleAppointments.map(appt => <article key={appt.id} className={`p-4 transition-colors duration-500 sm:p-5 ${recentIds.has(appt.id) ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : 'hover:bg-gray-50/50'}`}>
                    <div className="flex items-start gap-3 sm:gap-4"><div className="w-20 flex-shrink-0 pt-1 sm:w-24"><p className="text-[17px] font-bold text-ink-900">{formatTime(appt.appointment_time)}</p><p className="mt-1 text-[10px] text-gray-400">Scheduled</p></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold text-gray-800">{appt.patient?.name || 'Patient'}</h3>{recentIds.has(appt.id) && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">New</span>}</div><p className="mt-1 truncate text-xs text-gray-400">{appt.patient?.phone || appt.patient?.email || 'No contact on file'}</p>{appt.notes && <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">{appt.notes}</p>}</div><StatusBadge status={appt.status} /></div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 sm:ml-20"><button onClick={() => setNotesModal(appt)} className={button}>Session notes</button><button onClick={() => setPatientHistoryModal(appt.patient)} disabled={!appt.patient?.id} className={button}>History</button>{appt.status === 'confirmed' && <><button disabled={updating !== null || blocked} onClick={() => handleStatusUpdate(appt.id, 'completed')} className="ml-auto rounded-xl bg-brand-600 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40">{updating === appt.id ? 'Saving…' : 'Mark complete'}</button><button disabled={updating !== null || blocked} onClick={() => handleStatusUpdate(appt.id, 'no_show')} className={button}>No-show</button></>}</div>
                  </article>)}</div>}
              </section>

              <aside className="space-y-4">
                <div className="overflow-hidden rounded-2xl staff-next bg-[#153e50] p-6 text-white"><div className="mb-5 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">{isToday ? 'Up next' : 'First appointment'}</p><DashboardIcon name="clock" className="h-4 w-4 text-white/50" /></div>{upcoming && selectedDate >= today ? <><p className="font-display text-3xl">{formatTime(upcoming.appointment_time)}</p><div className="my-5 h-px bg-white/10" /><p className="text-lg font-semibold">{upcoming.patient?.name}</p><p className="mt-1 text-xs text-white/50">{upcoming.patient?.phone || 'Confirmed appointment'}</p>{upcoming.notes && <p className="mt-4 text-xs leading-6 text-white/70">{upcoming.notes}</p>}<button onClick={() => setNotesModal(upcoming)} className="mt-6 flex w-full items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-xs font-semibold transition hover:bg-white/20">Open session notes<DashboardIcon name="arrow" className="h-4 w-4" /></button></> : <><p className="font-display text-2xl">{selectedDate < today ? 'Past appointments' : 'No upcoming appointments'}</p><p className="mt-3 text-xs leading-6 text-white/60">{selectedDate < today ? 'Review completed visits and patient notes from this day.' : 'No upcoming visits on this day. Your next booking will appear in the schedule.'}</p></>}</div>
                <div className="staff-progress rounded-2xl border border-gray-200/80 bg-white p-5"><h3 className="text-xs font-semibold text-gray-700">Day progress</h3><div className="mb-3 mt-4 flex items-end justify-between"><span className="text-2xl font-semibold text-ink-900">{summary?.completed || 0}<span className="text-sm font-normal text-gray-400"> / {summary?.total || 0}</span></span><span className="text-[11px] text-gray-400">completed</span></div><div role="progressbar" aria-label="Completed appointments" aria-valuemin={0} aria-valuemax={summary?.total || 0} aria-valuenow={summary?.completed || 0} className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${summary?.total ? (summary.completed / summary.total) * 100 : 0}%` }} /></div><p className="mt-3 text-[11px] leading-5 text-gray-400">{summary?.pending || 0} visit{summary?.pending === 1 ? '' : 's'} awaiting completion.</p></div>
                <p className="px-2 text-[11px] leading-5 text-gray-400">Bookings update automatically while this dashboard is open. You can keep taking notes without interruption.</p>
              </aside>
            </div>
          </>}
          </>}
        </div>
      </main>
      {notesModal && <SessionNotesModal appointment={notesModal} onClose={() => setNotesModal(null)} onSave={() => { refresh(); setRevision(r => r + 1) }} />}
      {patientHistoryModal && <PatientHistoryModal patient={patientHistoryModal} revision={revision} onClose={() => setPatientHistoryModal(null)} />}
    </div>
  )
}
