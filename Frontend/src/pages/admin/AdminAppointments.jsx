import { StaffHeader } from '../../components/StaffUI'
import useApiSnapshot from '../../hooks/useApiSnapshot'
import useAppointmentRealtime from '../../hooks/useAppointmentRealtime'
import LiveStatus from '../../components/LiveStatus'
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
  const [filters, setFilters] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    status: '',
    doctor: '',
  })
  const [doctors, setDoctors] = useState([])

  useEffect(() => {
    adminApi.get('/admin/doctors')
      .then(res => setDoctors(res.data.data || res.data))
      .catch(console.error)
  }, [])

  const { data, loading, refreshing, error, refresh } = useApiSnapshot(adminApi, '/admin/appointments', filters)
  const liveStatus = useAppointmentRealtime({ role: 'admin', onResync: refresh, onChange: event => {
    if (event.type !== 'notes_updated' && (!filters.date || event.date === filters.date || event.previousDate === filters.date)) refresh()
  } })

  const statusOptions = ['', 'confirmed', 'completed', 'cancelled', 'no_show']

  return (
    <div className="staff-workspace flex min-h-screen">
      <AdminSidebar />

      <main className="staff-content flex-1 overflow-auto p-4 pt-20 sm:p-6 sm:pt-20 md:p-8">
        <StaffHeader title="Appointments" description="View and filter all appointments" />

        <div className="mb-4 flex items-center gap-3"><LiveStatus status={liveStatus} /><span className="text-xs text-gray-500">{refreshing ? 'Updating…' : 'Your appointment list stays up to date.'}</span><button onClick={refresh} className="ml-auto rounded-lg border bg-white px-3 py-2 text-xs font-semibold">Refresh</button></div>
        {(liveStatus === 'expired' || liveStatus === 'forbidden') && <p role="alert" className="mb-4 text-sm text-red-700">Live access is unavailable. <a className="underline" href="/admin/login">Sign in again</a> or contact support.</p>}
        {error && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="adminappointments-field-1" className="text-xs font-medium text-gray-500">Date</label>
            <input id="adminappointments-field-1" type="date" value={filters.date}
              onChange={e => setFilters({ ...filters, date: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="adminappointments-field-2" className="text-xs font-medium text-gray-500">Status</label>
            <select id="adminappointments-field-2" value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
              <option value="">All statuses</option>
              {statusOptions.filter(Boolean).map(s => (
                <option key={s} value={s}>{s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="adminappointments-field-3" className="text-xs font-medium text-gray-500">Doctor</label>
            <select id="adminappointments-field-3" value={filters.doctor}
              onChange={e => setFilters({ ...filters, doctor: e.target.value })}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
              <option value="">All doctors</option>
              {doctors.map(d => (
                <option key={d.id || d._id} value={d.id || d._id}>{d.full_name || d.fullName}</option>
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
              <table className="w-full min-w-[640px] text-sm">
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
                      className="hover:bg-gray-50 transition">
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
