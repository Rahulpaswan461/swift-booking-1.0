import { useState, useEffect } from 'react'
import { doctorApi } from '../../api/axios'
import { DoctorSidebar } from '../../components/Sidebar'
import StatusBadge from '../../components/StatusBadge'

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function StatCard({ label, value, color }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
    gray:   'bg-gray-50 text-gray-600 border-gray-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  )
}

export default function DoctorDashboard() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [updating, setUpdating] = useState(null)

  const doctor = JSON.parse(localStorage.getItem('doctor') || '{}')

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
      await doctorApi.patch(`/doctor/appointments/${appointmentId}/status`, { status })
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

      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-display font-semibold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, Dr. {doctor.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isToday ? "Here's your schedule for today" : `Appointments for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {days.map(day => {
            const d        = new Date(day)
            const isActive = selectedDate === day
            const todayStr = new Date().toISOString().split('T')[0]
            return (
              <button key={day} onClick={() => setSelectedDate(day)}
                className={`flex-shrink-0 flex flex-col items-center w-14 py-2.5 rounded-xl border text-sm transition-all
                  ${isActive ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300'}`}>
                <span className="text-xs opacity-75">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="font-bold text-base leading-tight">{d.getDate()}</span>
                {day === todayStr && <span className={`text-xs mt-0.5 ${isActive ? 'opacity-75' : 'text-brand-600'}`}>Today</span>}
              </button>
            )
          })}
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total"     value={data.summary.total}     color="blue"  />
            <StatCard label="Pending"   value={data.summary.pending}   color="gray"  />
            <StatCard label="Completed" value={data.summary.completed} color="green" />
            <StatCard label="No Show"   value={data.summary.no_show}   color="amber" />
          </div>
        )}

        {/* Appointments List */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Appointments</h2>
            {data && <span className="text-xs text-gray-400">{data.summary.total} total</span>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3"/>
                <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Loading appointments...
            </div>
          ) : !data?.data?.length ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-medium">No appointments</p>
              <p className="text-xs mt-1">Nothing scheduled for this day</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.data.map((appt, i) => (
                <div key={appt.id}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition animate-fade-up opacity-0"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}>

                  {/* Time */}
                  <div className="w-16 flex-shrink-0 text-center">
                    <p className="text-sm font-bold text-brand-700">{formatTime(appt.appointment_time)}</p>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-10 bg-gray-200 flex-shrink-0"/>

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{appt.patient.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {appt.notes || 'No notes provided'} · {appt.patient.phone}
                    </p>
                  </div>

                  {/* Status */}
                  <StatusBadge status={appt.status} />

                  {/* Actions — only show for confirmed appointments */}
                  {appt.status === 'confirmed' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleStatusUpdate(appt.id, 'completed')}
                        disabled={updating === appt.id}
                        className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg border border-green-200 transition disabled:opacity-50">
                        {updating === appt.id ? '...' : '✓ Done'}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(appt.id, 'no_show')}
                        disabled={updating === appt.id}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded-lg border border-amber-200 transition disabled:opacity-50">
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
