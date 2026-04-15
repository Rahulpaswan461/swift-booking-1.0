import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const res = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  console.log("result is:  ", res)
  return res;
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BookingConfirmation() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const checkRef = useRef(null)

  const appointment = state?.appointment
  const doctor = state?.doctor

  useEffect(() => {
    if (!appointment) navigate('/')
    // animate check circle
    if (checkRef.current) {
      checkRef.current.style.strokeDashoffset = '0'
    }
  }, [])

  if (!appointment) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-brand-50 flex flex-col">
      <header className="px-8 py-5">
        <Logo />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="2" />
                <circle
                  cx="40" cy="40" r="30"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="3"
                  strokeDasharray="188"
                  strokeDashoffset="188"
                  strokeLinecap="round"
                  ref={checkRef}
                  style={{ transition: 'stroke-dashoffset 0.8s ease', strokeDashoffset: '0' }}
                />
                <path
                  d="M26 40l10 10 18-18"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 animate-fade-up text-center mb-4">
            <h1 className="text-2xl font-display font-semibold text-gray-900 mb-1">
              Appointment confirmed!
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              A confirmation has been sent to your email.
            </p>

            {/* Details */}
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Doctor</span>
                <span className="text-sm font-semibold text-gray-800">Dr. {doctor?.fullName || appointment?.doctor}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Specialty</span>
                <span className="text-sm text-gray-700">{doctor?.specialization || '—'}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Date</span>
                <span className="text-sm text-gray-700">{formatDate(appointment.appointment_date)}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Time</span>
                <span className="text-sm font-semibold text-brand-700">{formatTime(appointment.appointment_time)}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Confirmed
                </span>
              </div>
            </div>

            {/* Appointment ID */}
            <div className="bg-brand-50 rounded-lg px-4 py-2.5 mb-5">
              <p className="text-xs text-gray-400 mb-0.5">Appointment ID</p>
              <p className="text-xs font-mono text-brand-700 break-all">{appointment._id || appointment.appointment_id}</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-left mb-2">
              <p className="text-xs text-amber-700 font-medium">📌 Reminder</p>
              <p className="text-xs text-amber-600 mt-0.5">Please arrive 10 minutes before your scheduled time.</p>
            </div>
          </div>

          <button
            onClick={() => {
              navigate('/doctors')
            }}
            className="w-full bg-white hover:bg-gray-50 text-gray-600 font-medium py-3 rounded-xl text-sm transition border border-gray-200"
          >
            Book another appointment
          </button>
        </div>
      </div>
    </div>
  )
}
