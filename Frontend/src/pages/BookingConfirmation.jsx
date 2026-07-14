import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const res = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
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
    <div className="flex min-h-screen flex-col bg-surface-50">
      <header className="flex items-center justify-between border-b border-white/70 bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-8">
        <Logo showClinicName />
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

          <div className="mb-6 rounded-[28px] border border-surface-100 bg-white p-8 text-center shadow-xl shadow-gray-900/5 animate-fade-up sm:p-10">
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-3">
              Appointment confirmed!
            </h1>
            <p className="text-gray-600 text-base mb-8">
              Your booking is complete. A confirmation email has been sent to your inbox with all the details.
            </p>

            {/* Appointment Details Card */}
            <div className="mb-8 space-y-4 rounded-[24px] border border-emerald-100 bg-emerald-50 p-6 text-left">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-green-100">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Doctor</span>
                  <span className="text-sm font-bold text-gray-900">Dr. {doctor?.fullName || appointment?.doctor}</span>
                </div>
                
                <div className="flex items-center justify-between pb-4 border-b border-green-100">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Specialty</span>
                  <span className="text-sm text-gray-700 font-medium">{doctor?.specialization || '—'}</span>
                </div>
                
                <div className="flex items-center justify-between pb-4 border-b border-green-100">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Date</span>
                  <span className="text-sm font-bold text-green-700">{formatDate(appointment.appointment_date)}</span>
                </div>
                
                <div className="flex items-center justify-between pb-4 border-b border-green-100">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Time</span>
                  <span className="text-sm font-bold text-green-700">{formatTime(appointment.appointment_time)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Status</span>
                  <span className="flex items-center gap-2 text-xs font-bold text-white bg-green-600 rounded-full px-3 py-1.5">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    Confirmed
                  </span>
                </div>
              </div>
            </div>

            <p className="mb-8 text-sm text-gray-500">
              A confirmation with cancel and reschedule links has been sent to you.
            </p>
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
                navigate('/my-appointments')
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-brand-600/20"
            >
              My Appointments
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
