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

export default function DoctorDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [updating, setUpdating] = useState(null)
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
      const res = await doctorApi.get(`/doctors/appointments?date=${date}`)
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
      await doctorApi.patch(`/doctors/appointments/${appointmentId}/status`, { status })
      fetchAppointments(selectedDate)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.')
    } finally {
      setUpdating(null)
    }
  }

  // Generate last 7 days for date selector
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DoctorSidebar />

      <main className="flex-1 p-6 sm:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Dr. {doctor.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            {isToday ? "Here's your schedule for today" : `Appointments for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {days.map(day => {
            const d = new Date(day)
            const isActive = selectedDate === day
            const todayStr = new Date().toISOString().split('T')[0]
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
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total" value={data.summary.total} color="blue" icon="📊" />
            <StatCard label="Pending" value={data.summary.pending} color="gray" icon="⏳" />
            <StatCard label="Completed" value={data.summary.completed} color="green" icon="✅" />
            <StatCard label="No Show" value={data.summary.no_show} color="amber" icon="❌" />
          </div>
        )}

        {/* Appointments List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
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
          ) : !data?.data?.length ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">📅</div>
              <p className="font-bold text-lg">No appointments scheduled</p>
              <p className="text-sm mt-1">There are no appointments for this day</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.data.map((appt, i) => (
                <div key={appt.id}
                  className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-blue-50 transition animate-fade-up opacity-0"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}>

                  {/* Time Badge */}
                  <div className="flex-shrink-0">
                    <div className="bg-brand-100 rounded-2xl px-4 py-3 text-center border border-brand-200">
                      <p className="text-lg font-bold text-brand-700">{formatTime(appt.appointment_time)}</p>
                      <p className="text-xs text-brand-600 font-semibold mt-1">Scheduled</p>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-900">{appt.patient.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      📞 {appt.patient.phone} {appt.notes && `• ${appt.notes}`}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    <StatusBadge status={appt.status} />
                  </div>

                  {/* Actions */}
                  {appt.status === 'confirmed' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleStatusUpdate(appt.id, 'completed')}
                        disabled={updating === appt.id}
                        className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-bold rounded-lg border-2 border-green-200 transition disabled:opacity-50 shadow-sm hover:shadow-md">
                        {updating === appt.id ? '...' : '✓ Mark Done'}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(appt.id, 'no_show')}
                        disabled={updating === appt.id}
                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-bold rounded-lg border-2 border-amber-200 transition disabled:opacity-50 shadow-sm hover:shadow-md">
                        No Show
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
