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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col">
      <header className="px-6 sm:px-8 py-6 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <Logo />
        <button 
          onClick={() => navigate('/')}
          className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-4 py-2 transition hover:bg-gray-50 flex items-center gap-2 font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 12l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Success Animation */}
          <div className="flex justify-center mb-8 animate-fade-up">
            <div className="relative w-24 h-24">
              <svg width="96" height="96" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2" />
                <circle
                  cx="40" cy="40" r="30"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray="188"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  ref={checkRef}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <path
                  d="M26 40l10 10 18-18"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0"
                  style={{ animation: 'fadeIn 0.6s ease 0.4s forwards' }}
                />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10 animate-fade-up text-center mb-6">
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-3">
              Appointment confirmed!
            </h1>
            <p className="text-gray-600 text-base mb-8">
              Your booking is complete. A confirmation email has been sent to your inbox with all the details.
            </p>

            {/* Appointment Details Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-left space-y-4 mb-8 border border-green-100">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-green-100">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">🩺 Doctor</span>
                  <span className="text-sm font-bold text-gray-900">Dr. {doctor?.fullName || appointment?.doctor}</span>
                </div>
                
                <div className="flex items-center justify-between pb-4 border-b border-green-100">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">📋 Specialty</span>
                  <span className="text-sm text-gray-700 font-medium">{doctor?.specialization || '—'}</span>
                </div>
                
                <div className="flex items-center justify-between pb-4 border-b border-green-100">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">📅 Date</span>
                  <span className="text-sm font-bold text-green-700">{formatDate(appointment.appointment_date)}</span>
                </div>
                
                <div className="flex items-center justify-between pb-4 border-b border-green-100">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">🕐 Time</span>
                  <span className="text-sm font-bold text-green-700">{formatTime(appointment.appointment_time)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">✓ Status</span>
                  <span className="flex items-center gap-2 text-xs font-bold text-white bg-green-600 rounded-full px-3 py-1.5">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    Confirmed
                  </span>
                </div>
              </div>
            </div>

            {/* Important Reminder */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-6 py-4 mb-6">
              <p className="text-sm text-amber-900 font-semibold mb-1">📌 Important Reminder</p>
              <p className="text-sm text-amber-800">Please arrive <strong>10-15 minutes early</strong> to complete check-in. Bring any relevant medical documents if needed.</p>
            </div>

            {/* What to expect */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 mb-8">
              <p className="text-sm text-blue-900 font-semibold mb-2">💡 What to Expect</p>
              <ul className="text-sm text-blue-800 space-y-1 text-left">
                <li>• Arrive early for check-in</li>
                <li>• Bring your insurance card & ID</li>
                <li>• Prepare a list of medications</li>
                <li>• Share any recent health concerns</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                navigate('/doctors')
              }}
              className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl text-sm transition border-2 border-gray-200"
            >
              ← Back to doctors
            </button>
            <button
              onClick={() => {
                navigate('/')
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-brand-600/20"
            >
              Go to home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
