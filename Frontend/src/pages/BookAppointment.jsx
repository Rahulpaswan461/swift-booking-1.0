import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import api from '../api/axios'
import Logo from '../components/Logo'
import StepIndicator from '../components/StepIndicator'

function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' })
}

function formatDisplayDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// Generate next 14 days starting tomorrow (local time — toISOString is
// UTC and produces the wrong day for IST users around midnight)
function getNextDays(n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function BookAppointment() {
  const { doctorId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const doctor = state?.doctor
  const contactValue = localStorage.getItem('otp_contact')

  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')

  const [form, setForm] = useState({ fullName: '', phone: '', date_of_birth: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const days = getNextDays(14)

  useEffect(() => {
    if (!contactValue || !localStorage.getItem('patient_id')) {
      navigate('/verify')
    }
    if (!doctor) navigate('/doctors')
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setSlotsLoading(true)
    setSelectedSlot('')
    setSlots([])
    api.get(`/doctors/${doctorId}/slots?date=${selectedDate}`)
      .then(res => setSlots(res.data.availableSlots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedDate || !selectedSlot) {
      setError('Please select a date and time slot.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/appointments/book', {
        fullName: form.fullName,
        phone: form.phone,
        date_of_birth: form.date_of_birth,
        doctor_id: doctorId,
        appointment_date: selectedDate,
        appointment_time: selectedSlot,
        notes: form.notes,
      })
      navigate('/confirmation', { state: { appointment: res.data.data, doctor } })
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!doctor) return null

  // Group slots into Morning / Afternoon / Evening
  const grouped = slots.reduce((acc, slot) => {
    const h = parseInt(slot.split(':')[0])
    const group = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'
    if (!acc[group]) acc[group] = []
    acc[group].push(slot)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/70 bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-8">
        <Logo showClinicName />
        <button 
          onClick={() => navigate('/doctors')}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-surface-100 hover:text-gray-900"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 12l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <StepIndicator current={3} />

        {/* Doctor summary card */}
        <div className="mb-6 flex items-center gap-4 rounded-[24px] border border-surface-100 bg-white p-5 shadow-sm animate-fade-up">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-brand-100 bg-brand-50 font-display text-lg font-semibold text-brand-800">
            {(doctor.fullName || doctor.full_name || 'Doctor').split(' ').map(part => part[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl font-semibold text-ink-900">Dr. {doctor.fullName || doctor.full_name}</h2>
            <p className="text-brand-600 text-sm">{doctor.specialization}</p>
            <p className="text-gray-400 text-xs">{doctor.qualification}</p>
          </div>
          <button onClick={() => navigate('/doctors')} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition hover:bg-surface-100 hover:text-gray-700">
            Change
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
          {/* Date Picker */}
          <div className="rounded-[24px] border border-surface-100 bg-white p-5 shadow-sm animate-fade-up delay-100 lg:col-start-1 lg:row-start-1">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">1</span>
              Select a date
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {days.map(day => {
                const d = new Date(day)
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
                const dayNum = d.getDate()
                const month = d.toLocaleDateString('en-US', { month: 'short' })
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
                    <span className="text-xs font-medium opacity-75">{dayName}</span>
                    <span className="text-lg font-bold leading-tight">{dayNum}</span>
                    <span className="text-xs opacity-75">{month}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="rounded-[24px] border border-surface-100 bg-white p-5 shadow-sm animate-fade-up lg:col-start-1 lg:row-start-2">
              <h3 className="mb-1 flex items-center gap-2 font-semibold text-gray-800">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">2</span>
                Select a time
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
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 text-brand-700">
                    <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
                      <rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M6 2v2M12 2v2M2 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
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

          {/* Patient Details */}
          <div className="rounded-[24px] border border-surface-100 bg-white p-5 shadow-sm animate-fade-up delay-200 lg:col-start-2 lg:row-span-3 lg:row-start-1">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">3</span>
              Your details
            </h3>
            <p className="-mt-2 mb-5 text-sm leading-6 text-gray-500">
              Fill in the patient information exactly as it should appear on the clinic record.
            </p>

            <div className="space-y-3">
              {/* Contact — prefilled, readonly */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Verified {localStorage.getItem('otp_contact_type') === 'phone' ? 'Phone' : 'Email'}</label>
                <input
                  type="text"
                  value={contactValue}
                  readOnly
                  className="w-full cursor-not-allowed rounded-2xl border border-gray-100 bg-surface-50 px-4 py-3 text-sm text-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Riya Sharma"
                    required
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone <span className="text-red-400">*</span></label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91-9876543210"
                    required
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date of birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason for visit <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Brief description of your symptoms or reason..."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>
            </div>
          </div>

          {/* Summary + Submit */}
          {selectedDate && selectedSlot && (
            <div className="rounded-[24px] border border-brand-100 bg-brand-50 p-4 animate-fade-in lg:col-start-1 lg:row-start-3">
              <p className="text-xs font-medium text-brand-700 mb-2 uppercase tracking-wider">Appointment summary</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Dr. {doctor.fullName || doctor.full_name}</p>
                  <p className="text-xs text-gray-500">{formatDisplayDate(selectedDate)} at {formatTime(selectedSlot)}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-700">
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                    <path d="M6 2h6l2 2v12H4V4a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M7 8h4M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 lg:col-span-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#dc2626" strokeWidth="1.5" />
                <path d="M7 4v3M7 9.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedDate || !selectedSlot}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-brand-600/20 transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 lg:col-span-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                  <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Confirming appointment...
              </>
            ) : 'Confirm appointment'}
          </button>
        </form>
      </div>
    </div>
  )
}
