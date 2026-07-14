import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Logo from '../components/Logo'
import StatusBadge from '../components/StatusBadge'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function AppointmentCard({ appointment, animDelay }) {
  const notes = appointment.session_notes?.session_notes
  const isCompleted = appointment.status === 'completed'

  return (
    <div
      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-brand-200 animate-fade-up opacity-0"
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start gap-4">
        {/* Time block */}
        <div className="flex-shrink-0 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-center min-w-[80px]">
          <p className="text-lg font-bold text-brand-700">{formatTime(appointment.appointment_time)}</p>
          <p className="text-xs text-brand-600 font-semibold">Slot</p>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              Dr. {appointment.doctor?.full_name}
            </h3>
            <StatusBadge status={appointment.status} />
            {notes && (
              <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2h6l3 3v6a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                Notes
              </span>
            )}
          </div>
          <p className="text-sm text-brand-700 font-medium">{appointment.doctor?.specialization}</p>
          <p className="text-sm text-gray-500 mt-1">{formatDate(appointment.appointment_date)}</p>
          {appointment.notes && (
            <p className="text-xs text-gray-400 mt-1.5 truncate">{appointment.notes}</p>
          )}

          {/* Session notes for completed appointments */}
          {isCompleted && notes && (
            <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50/50 p-3 space-y-2">
              {notes.diagnosis && (
                <div className="flex gap-2">
                  <span className="text-xs font-semibold text-purple-700 shrink-0">Diagnosis:</span>
                  <span className="text-xs text-gray-700">{notes.diagnosis}</span>
                </div>
              )}
              {notes.prescription && (
                <div className="flex gap-2">
                  <span className="text-xs font-semibold text-purple-700 shrink-0">Prescription:</span>
                  <span className="text-xs text-gray-700">{notes.prescription}</span>
                </div>
              )}
              {notes.follow_up_date && (
                <div className="flex gap-2">
                  <span className="text-xs font-semibold text-purple-700 shrink-0">Follow-up:</span>
                  <span className="text-xs text-gray-700">{formatDate(notes.follow_up_date)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-bold text-gray-900 text-lg">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  )
}

export default function PatientHistory() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/appointments/history')
      .then(res => setData(res.data.data))
      .catch(err => {
        console.error('Failed to fetch history:', err)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo showClinicName />
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:flex">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#059669" strokeWidth="1.5" />
                <path d="M4 7l2 2 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {localStorage.getItem('otp_contact')}
            </span>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-surface-100 hover:text-gray-900"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 12l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        {/* Page title */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700 mb-2">Your records at this clinic</p>
            <h1 className="font-display text-4xl font-semibold text-ink-900">My Appointments</h1>
            <p className="text-gray-600 text-lg mt-2">Everything you've booked here, past and upcoming</p>
          </div>
          <button
            onClick={() => navigate('/doctors')}
            className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
          >
            + Book new appointment
          </button>
        </div>

        {/* Stats summary */}
        {!loading && data && (
          <div className="mb-8 grid grid-cols-3 gap-3 animate-fade-up">
            <div className="rounded-2xl border border-surface-100 bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-brand-700">{data.total || 0}</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Total visits</p>
            </div>
            <div className="rounded-2xl border border-surface-100 bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-600">{data.upcoming?.length || 0}</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Upcoming</p>
            </div>
            <div className="rounded-2xl border border-surface-100 bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-700">{(data.past || []).filter(a => a.status === 'completed').length}</p>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Completed</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 rounded-lg w-2/3" />
                    <div className="h-4 bg-gray-100 rounded-lg w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Upcoming appointments */}
            <section className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h2 className="font-display text-xl font-semibold text-gray-900">Upcoming</h2>
                <span className="text-sm text-gray-500 font-semibold">({data?.upcoming?.length || 0})</span>
              </div>

              {data?.upcoming?.length === 0 ? (
                <EmptyState
                  icon="📅"
                  title="No upcoming appointments"
                  description="Book a new appointment to get started"
                />
              ) : (
                <div className="space-y-3">
                  {data.upcoming.map((appt, i) => (
                    <AppointmentCard key={appt.id} appointment={appt} animDelay={i * 80} />
                  ))}
                </div>
              )}
            </section>

            {/* Past appointments */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <h2 className="font-display text-xl font-semibold text-gray-900">Past</h2>
                <span className="text-sm text-gray-500 font-semibold">({data?.past?.length || 0})</span>
              </div>

              {data?.past?.length === 0 ? (
                <EmptyState
                  icon="🏥"
                  title="No past appointments"
                  description="Your appointment history will appear here"
                />
              ) : (
                <div className="space-y-3">
                  {data.past.map((appt, i) => (
                    <AppointmentCard key={appt.id} appointment={appt} animDelay={(data.upcoming.length + i) * 80} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
