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

// Generate next 14 days starting tomorrow
function getNextDays(n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().split('T')[0]
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
  const email = localStorage.getItem('otp_email')

  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')

  const [form, setForm] = useState({ fullName: '', phone: '', date_of_birth: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const days = getNextDays(14)

  useEffect(() => {
    if (!email) navigate('/')
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
        email
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
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50">
      <header className="px-8 py-5">
        <Logo />
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <StepIndicator current={3} />

        {/* Doctor summary card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 flex items-center gap-4 animate-fade-up">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-2xl flex-shrink-0">
            👨‍⚕️
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-gray-900">Dr. {doctor.fullName}</h2>
            <p className="text-brand-600 text-sm">{doctor.specialization}</p>
            <p className="text-gray-400 text-xs">{doctor.qualification}</p>
          </div>
          <button onClick={() => navigate('/doctors')} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 transition">
            Change
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date Picker */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 animate-fade-up delay-100">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-brand-50 rounded-lg flex items-center justify-center text-xs text-brand-600 font-bold">1</span>
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
                    className={`flex-shrink-0 flex flex-col items-center w-14 py-3 rounded-xl border transition-all
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
            <div className="bg-white border border-gray-100 rounded-2xl p-5 animate-fade-up">
              <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                <span className="w-6 h-6 bg-brand-50 rounded-lg flex items-center justify-center text-xs text-brand-600 font-bold">2</span>
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
                  <div className="text-3xl mb-2">📅</div>
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
                              className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all
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
          <div className="bg-white border border-gray-100 rounded-2xl p-5 animate-fade-up delay-200">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-brand-50 rounded-lg flex items-center justify-center text-xs text-brand-600 font-bold">3</span>
              Your details
            </h3>

            <div className="space-y-3">
              {/* Email — prefilled, readonly */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
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
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
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
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date of birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason for visit <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Brief description of your symptoms or reason..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Summary + Submit */}
          {selectedDate && selectedSlot && (
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 animate-fade-in">
              <p className="text-xs font-medium text-brand-700 mb-2 uppercase tracking-wider">Appointment summary</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{doctor.fullName}</p>
                  <p className="text-xs text-gray-500">{formatDisplayDate(selectedDate)} at {formatTime(selectedSlot)}</p>
                </div>
                <div className="text-2xl">📋</div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
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
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                  <path d="M14 8a6 6 0 00-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Confirming appointment...
              </>
            ) : 'Confirm appointment →'}
          </button>
        </form>
      </div>
    </div>
  )
}
