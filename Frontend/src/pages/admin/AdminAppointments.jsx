import { useState, useEffect } from 'react'
import { adminApi } from '../../api/axios'
import { AdminSidebar } from '../../components/Sidebar'
import StatusBadge from '../../components/StatusBadge'

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function AdminAppointments() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    status: '',
    doctor: '',
  })
  const [doctors, setDoctors] = useState([])

  useEffect(() => {
    adminApi.get('/doctors')
      .then(res => setDoctors(res.data.data || res.data))
      .catch(console.error)
  }, [])

  const fetchAppointments = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.date) params.append('date', filters.date)
    if (filters.status) params.append('status', filters.status)
    if (filters.doctor) params.append('doctor', filters.doctor)

    adminApi.get(`/admin/appointments?${params}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAppointments() }, [filters])

  const statusOptions = ['', 'confirmed', 'completed', 'cancelled', 'no_show']

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-semibold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm mt-0.5">View and filter all appointments</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Date</label>
            <input type="date" value={filters.date}
              onChange={e => setFilters({ ...filters, date: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Status</label>
            <select value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
              <option value="">All statuses</option>
              {statusOptions.filter(Boolean).map(s => (
                <option key={s} value={s}>{s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Doctor</label>
            <select value={filters.doctor}
              onChange={e => setFilters({ ...filters, doctor: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
              <option value="">All doctors</option>
              {doctors.map(d => (
                <option key={d._id} value={d._id}>{d.fullName}</option>
              ))}
            </select>
          </div>

          {/* Summary pills */}
          {data && (
            <div className="flex items-end gap-2 ml-auto flex-wrap">
              {[
                { label: 'Total', value: data.summary.total, color: 'bg-gray-100 text-gray-600' },
                { label: 'Confirmed', value: data.summary.confirmed, color: 'bg-blue-50 text-blue-700' },
                { label: 'Completed', value: data.summary.completed, color: 'bg-green-50 text-green-700' },
                { label: 'No Show', value: data.summary.no_show, color: 'bg-amber-50 text-amber-700' },
                { label: 'Cancelled', value: data.summary.cancelled, color: 'bg-red-50 text-red-700' },
              ].map(pill => (
                <span key={pill.label} className={`text-xs font-medium px-2.5 py-1.5 rounded-lg ${pill.color}`}>
                  {pill.label}: {pill.value}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Loading...
            </div>
          ) : !data?.data?.length ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium">No appointments found</p>
              <p className="text-xs mt-1">Try changing the filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Patient</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Doctor</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Date & Time</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Notes</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map((appt, i) => (
                    <tr key={appt.id}
                      className="hover:bg-gray-50 transition animate-fade-up opacity-0"
                      style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'forwards' }}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{appt.patient.name}</p>
                        <p className="text-xs text-gray-400">{appt.patient.phone}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800">{appt.doctor.name}</p>
                        <p className="text-xs text-gray-400">{appt.doctor.specialization}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-gray-800">{new Date(appt.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-xs text-brand-600 font-medium">{formatTime(appt.appointment_time)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-gray-500 max-w-xs truncate">{appt.notes || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={appt.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
