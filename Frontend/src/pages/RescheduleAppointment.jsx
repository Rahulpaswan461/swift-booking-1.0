import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Logo from '../components/Logo'

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDisplayDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// Next 14 days starting today (local time)
function getNextDays(n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return localDateStr(d)
  })
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function RescheduleAppointment() {
  const { id, cancelToken } = useParams()
  const navigate = useNavigate()

  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')

  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  const days = getNextDays(14)

  useEffect(() => {
    api.get(`/appointments/${id}`)
      .then(res => setAppointment(res.data.data))
      .catch(err => setLoadError(err.response?.data?.message || 'Failed to load appointment'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!selectedDate || !appointment) return
    setSlotsLoading(true)
    setSelectedSlot('')
    setSlots([])
    api.get(`/doctors/${appointment.doctor_id}/slots?date=${selectedDate}`)
      .then(res => setSlots(res.data.availableSlots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, appointment])

  const handleReschedule = async () => {
    if (!selectedDate || !selectedSlot) return
    setStatus('loading')
    setMessage('')
    try {
      const { data } = await api.patch(`/appointments/${id}/reschedule/${cancelToken}`, {
        appointment_date: selectedDate,
        appointment_time: selectedSlot,
      })
      setStatus('success')
      setMessage(data.message || 'Appointment rescheduled successfully!')
    } catch (err) {
      setStatus('error')
      setMessage(err.response?.data?.message || 'An error occurred while rescheduling.')
    }
  }

  // Group slots into Morning / Afternoon / Evening (same as booking flow)
  const grouped = slots.reduce((acc, slot) => {
    const h = parseInt(slot.split(':')[0])
    const group = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'
    if (!acc[group]) acc[group] = []
    acc[group].push(slot)
    return acc
  }, {})

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo showClinicName />
            <div className="hidden h-8 w-px bg-gray-100 sm:block" />
            <span className="hidden text-xs font-semibold text-gray-600 uppercase tracking-wide sm:block">Reschedule</span>
          </div>
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
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">{children}</div>
    </div>
  )

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
            <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Loading your appointment...
        </div>
      </Shell>
    )
  }

  if (loadError || !appointment) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-[24px] border border-surface-100 bg-white p-8 text-center shadow-sm animate-fade-up">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">Can't open this appointment</h1>
          <p className="mb-6 text-sm text-gray-500">{loadError || 'Appointment not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
          >
            Go to clinic homepage
          </button>
        </div>
      </Shell>
    )
  }

  if (status === 'success') {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-[24px] border border-surface-100 bg-white p-8 text-center shadow-sm animate-fade-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 animate-scale-in">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">Appointment rescheduled</h1>
          <p className="mb-1 text-sm text-gray-600">
            Dr. {appointment.doctor?.full_name} — <span className="font-semibold text-brand-700">{formatDisplayDate(selectedDate)} at {formatTime(selectedSlot)}</span>
          </p>
          <p className="mb-6 text-xs text-gray-400">A confirmation with updated cancel/reschedule links is on its way to you.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full rounded-2xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700"
          >
            Done
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mb-6 animate-fade-up">
        <h1 className="mb-1 font-display text-3xl font-semibold text-ink-900">Reschedule your appointment</h1>
        <p className="text-gray-600">Pick a new date and time — your current slot is released once you confirm.</p>
      </div>

      {/* Current appointment card */}
      <div className="mb-6 flex items-center gap-4 rounded-[24px] border border-surface-100 bg-white p-5 shadow-sm animate-fade-up">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-brand-100 bg-brand-50 font-display text-lg font-semibold text-brand-800">
          {(appointment.doctor?.full_name || 'D').split(' ').map(p => p[0]).join('').slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold text-ink-900">Dr. {appointment.doctor?.full_name}</h2>
          <p className="text-sm text-brand-600">{appointment.doctor?.specialization}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Currently booked</p>
          <p className="text-sm font-semibold text-gray-700">{formatDisplayDate(appointment.appointment_date)}</p>
          <p className="text-sm font-bold text-brand-700">{formatTime(appointment.appointment_time)}</p>
        </div>
      </div>

      <div className="grid items-start gap-5">
        {/* Date Picker */}
        <div className="rounded-[24px] border border-surface-100 bg-white p-5 shadow-sm animate-fade-up delay-100">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">1</span>
            Select a new date
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {days.map(day => {
              const d = new Date(`${day}T00:00:00`)
              const isSelected = selectedDate === day
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`flex w-16 flex-shrink-0 flex-col items-center rounded-2xl border py-3 transition-all
                    ${isSelected
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-brand-300'}`}
                >
                  <span className="text-xs font-medium opacity-75">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
                  <span className="text-xs opacity-75">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div className="rounded-[24px] border border-surface-100 bg-white p-5 shadow-sm animate-fade-up">
            <h3 className="mb-1 flex items-center gap-2 font-semibold text-gray-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">2</span>
              Select a new time
            </h3>
            <p className="text-xs text-gray-400 mb-4 ml-8">{formatDisplayDate(selectedDate)}</p>

            {slotsLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                  <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Loading available slots...
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm font-medium">No slots available</p>
                <p className="text-xs mt-1">Try selecting a different date</p>
              </div>
            ) : (
              <div className="space-y-4">
                {['Morning', 'Afternoon', 'Evening'].map(group => {
                  if (!grouped[group]) return null
                  return (
                    <div key={group}>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{group}</p>
                      <div className="flex flex-wrap gap-2">
                        {grouped[group].map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all
                              ${selectedSlot === slot
                                ? 'bg-brand-600 border-brand-600 text-white'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-brand-400'}`}
                          >
                            {formatTime(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* New appointment summary */}
        {selectedDate && selectedSlot && (
          <div className="rounded-[24px] border border-brand-100 bg-brand-50 p-4 animate-fade-in">
            <p className="text-xs font-medium text-brand-700 mb-2 uppercase tracking-wider">New appointment</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Dr. {appointment.doctor?.full_name}</p>
                <p className="text-xs text-gray-500">
                  <span className="line-through opacity-60">{formatTime(appointment.appointment_time)}, {formatDisplayDate(appointment.appointment_date)}</span>
                  {' → '}
                  <span className="font-semibold text-brand-700">{formatTime(selectedSlot)}, {formatDisplayDate(selectedDate)}</span>
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-700">
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9a6 6 0 016-6c2.5 0 4.6 1.5 5.5 3.5M15 9a6 6 0 01-6 6c-2.5 0-4.6-1.5-5.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M14 3v3.5h-3.5M4 15v-3.5h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.5" />
              <path d="M7 4v3M7 9.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={handleReschedule}
          disabled={!selectedDate || !selectedSlot || status === 'loading'}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-brand-600/20 transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'loading' ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Rescheduling...
            </>
          ) : 'Confirm new time'}
        </button>
      </div>
    </Shell>
  )
}
